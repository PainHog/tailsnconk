// newsletter-subscribe (public; verify_jwt = false)
//
// POST { email, source? }
//   * inserts/keeps an UNCONFIRMED subscriber row (confirmed=false),
//   * rate-limits confirmation resends via confirm_sent_at,
//   * emails a tokenized confirm link via Resend.
//
// Never reveals whether an address is already on the list (anti-enumeration):
// the response is a generic "check your inbox" either way.

import { handlePreflight } from "../_shared/cors.ts";
import { badRequest, ok, serverError, tooManyRequests } from "../_shared/json.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/email.ts";
import { confirmUrl, escapeHtml, unsubscribeUrl } from "../_shared/links.ts";

// Minimum gap between confirmation emails to the same address.
const RESEND_COOLDOWN_MS = 60_000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (req.method !== "POST") return badRequest("POST required");

  let payload: { email?: string; source?: string };
  try {
    payload = await req.json();
  } catch {
    return badRequest("invalid JSON body");
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const source = (payload.source ?? "web").slice(0, 120);

  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return badRequest("a valid email is required");
  }

  try {
    const db = serviceClient();

    // Look up any existing row (service role bypasses RLS).
    const { data: existing, error: selErr } = await db
      .from("subscribers")
      .select("email, confirmed, unsubscribed, token, confirm_sent_at")
      .eq("email", email)
      .maybeSingle();
    if (selErr) throw selErr;

    // Already confirmed and active — nothing to do (but respond generically).
    if (existing && existing.confirmed && !existing.unsubscribed) {
      return ok({ message: "check your inbox to confirm" });
    }

    // Rate-limit confirmation resends.
    if (existing?.confirm_sent_at) {
      const last = new Date(existing.confirm_sent_at).getTime();
      if (Date.now() - last < RESEND_COOLDOWN_MS) {
        return tooManyRequests("please wait a moment before requesting another confirmation email");
      }
    }

    // Reuse the existing per-subscriber token, or mint one for a new row.
    const token = existing?.token ?? crypto.randomUUID();

    // Upsert an unconfirmed, non-unsubscribed row and stamp confirm_sent_at.
    const { error: upErr } = await db
      .from("subscribers")
      .upsert(
        {
          email,
          source,
          confirmed: false,
          unsubscribed: false,
          token,
          confirm_sent_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    if (upErr) throw upErr;

    // Email the tokenized confirmation link.
    const confirm = confirmUrl(email, token);
    const unsub = unsubscribeUrl(email, token);
    const safeConfirm = escapeHtml(confirm);
    await sendEmail({
      to: email,
      subject: "Confirm your tailsnconk subscription",
      text:
        `Thanks for subscribing to tailsnconk.\n\n` +
        `Confirm your subscription:\n${confirm}\n\n` +
        `If you didn't request this, ignore this email — you won't be subscribed.`,
      html:
        `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:auto">` +
        `<h2 style="margin:0 0 12px">One more step</h2>` +
        `<p>Thanks for subscribing to <strong>tailsnconk</strong>. Please confirm your subscription:</p>` +
        `<p><a href="${safeConfirm}" style="display:inline-block;padding:10px 18px;background:#1f2937;color:#fff;border-radius:8px;text-decoration:none">Confirm subscription</a></p>` +
        `<p style="color:#6b7280;font-size:13px">If the button doesn't work, paste this link into your browser:<br>${safeConfirm}</p>` +
        `<p style="color:#9ca3af;font-size:12px">If you didn't request this, ignore this email — you won't be subscribed.</p>` +
        `</div>`,
      headers: {
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    return ok({ message: "check your inbox to confirm" });
  } catch (err) {
    console.error("newsletter-subscribe error:", err);
    return serverError("could not process subscription");
  }
});
