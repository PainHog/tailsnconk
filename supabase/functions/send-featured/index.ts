// send-featured (scheduled broadcast; verify_jwt = false)
//
// Guarded by the CRON_SECRET header (x-cron-secret). FAILS CLOSED: if
// CRON_SECRET is unset in the environment, every request is rejected.
//
// Idempotency: the function CLAIMS the current period by inserting its week_key
// into newsletter_log BEFORE sending. The PK on newsletter_log.week_key makes a
// concurrent/retried run fail the insert (23505) and return early, so an issue
// is never double-sent.
//
// Recipients: confirmed = true AND unsubscribed = false.
// Sending: Resend batch endpoint, chunked to BATCH_SIZE (<= 100).
//
// Featured-cocktail details (name/slug/blurb/url) are passed in the POST body
// by the caller (a GitHub Action that computes them from packages/core, since
// cocktail content lives in code, not the DB). Sensible fallbacks are used if
// absent so the job never hard-fails on a missing field.

import { handlePreflight } from "../_shared/cors.ts";
import { forbidden, ok, serverError } from "../_shared/json.ts";
import { requireEnv, serviceClient } from "../_shared/supabase.ts";
import { sendEmailBatch, type EmailMessage } from "../_shared/email.ts";
import { escapeHtml, periodKey, siteBase, unsubscribeUrl } from "../_shared/links.ts";

// Resend batch cap is 100; keep headroom.
const BATCH_SIZE = 90;

interface FeaturedInput {
  week_key?: string;
  cocktail?: { slug?: string; name?: string; blurb?: string; url?: string };
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (req.method !== "POST") return forbidden("POST required");

  // --- Auth gate: constant-ish comparison against CRON_SECRET, fail closed ---
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    console.error("send-featured: CRON_SECRET is unset — refusing to run");
    return forbidden("broadcast disabled");
  }
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (provided !== expected) return forbidden("bad cron secret");

  let body: FeaturedInput = {};
  try {
    body = (await req.json()) as FeaturedInput;
  } catch {
    body = {};
  }

  const week = (body.week_key ?? periodKey()).trim();
  const name = body.cocktail?.name ?? "This period's featured cocktail";
  const slug = body.cocktail?.slug ?? "";
  const blurb = body.cocktail?.blurb ?? "";
  const url = body.cocktail?.url ?? (slug ? `${siteBase()}/cocktail/${slug}` : siteBase());

  try {
    const db = serviceClient();

    // --- CLAIM the period BEFORE sending (idempotency guard) ---
    const { error: claimErr } = await db
      .from("newsletter_log")
      .insert({ week_key: week, sent_at: null, count: 0 });
    if (claimErr) {
      // 23505 = unique_violation => already claimed/sent this period.
      if ((claimErr as { code?: string }).code === "23505") {
        return ok({ week_key: week, status: "already_claimed", count: 0 });
      }
      throw claimErr;
    }

    // --- Gather recipients: confirmed AND not unsubscribed ---
    const { data: subs, error: subErr } = await db
      .from("subscribers")
      .select("email, token")
      .eq("confirmed", true)
      .eq("unsubscribed", false);
    if (subErr) throw subErr;

    const recipients = subs ?? [];
    const from = requireEnv("NEWSLETTER_FROM");
    const postal = Deno.env.get("NEWSLETTER_POSTAL_ADDRESS") ?? "";

    const safeName = escapeHtml(name);
    const safeUrl = escapeHtml(url);
    const safeBlurb = escapeHtml(blurb);

    // Build one message per recipient (per-recipient unsubscribe link/headers).
    let sent = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);
      const messages: EmailMessage[] = chunk.map((r) => {
        const unsub = unsubscribeUrl(r.email, r.token);
        const safeUnsub = escapeHtml(unsub);
        return {
          from,
          to: r.email,
          subject: `tailsnconk — featured: ${name}`,
          text:
            `${name}\n\n${blurb}\n\nMake it: ${url}\n\n` +
            (postal ? `${postal}\n\n` : "") +
            `Unsubscribe: ${unsub}`,
          html:
            `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto">` +
            `<p style="color:#6b7280;font-size:13px;margin:0 0 6px">Featured this period</p>` +
            `<h1 style="margin:0 0 12px;font-size:26px">${safeName}</h1>` +
            (safeBlurb ? `<p style="font-size:16px;line-height:1.5">${safeBlurb}</p>` : "") +
            `<p><a href="${safeUrl}" style="display:inline-block;padding:11px 20px;background:#1f2937;color:#fff;border-radius:8px;text-decoration:none">Make it tonight</a></p>` +
            `<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">` +
            (postal ? `<p style="color:#9ca3af;font-size:12px">${escapeHtml(postal)}</p>` : "") +
            `<p style="color:#9ca3af;font-size:12px">Don't want these? <a href="${safeUnsub}" style="color:#9ca3af">Unsubscribe</a>.</p>` +
            `</div>`,
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      });

      await sendEmailBatch(messages);
      sent += chunk.length;
    }

    // --- Finalize the claim with real numbers ---
    const { error: finErr } = await db
      .from("newsletter_log")
      .update({ sent_at: new Date().toISOString(), count: sent })
      .eq("week_key", week);
    if (finErr) throw finErr;

    return ok({ week_key: week, status: "sent", count: sent });
  } catch (err) {
    console.error("send-featured error:", err);
    // NOTE: the period stays claimed on failure to avoid a double-send storm on
    // retry. An operator can clear the newsletter_log row to intentionally resend.
    return serverError("broadcast failed");
  }
});
