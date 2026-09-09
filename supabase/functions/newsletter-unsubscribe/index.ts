// newsletter-unsubscribe (opened from an email inbox; verify_jwt = false)
//
// GET  -> interstitial with an "Unsubscribe" button.
// POST -> sets unsubscribed=true server-side, matching on (email, token).
//         Also handles RFC 8058 one-click unsubscribe: mail clients POST with
//         body "List-Unsubscribe=One-Click" and no interaction, so POST must
//         unsubscribe immediately (which it does).

import { handlePreflight } from "../_shared/cors.ts";
import { html } from "../_shared/json.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { escapeHtml } from "../_shared/links.ts";

function page(title: string, body: string, status = 200): Response {
  return html(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<meta name="robots" content="noindex">` +
      `<title>${escapeHtml(title)}</title></head>` +
      `<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f9fafb;margin:0">` +
      `<div style="max-width:520px;margin:10vh auto;padding:28px;background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08)">` +
      body +
      `</div></body></html>`,
    status,
  );
}

async function readParams(req: Request): Promise<{ email: string; token: string }> {
  const url = new URL(req.url);
  let email = url.searchParams.get("email") ?? "";
  let token = url.searchParams.get("token") ?? "";
  if (req.method === "POST") {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      email = (form.get("email") as string) ?? email;
      token = (form.get("token") as string) ?? token;
    } else if (ct.includes("application/json")) {
      const b = await req.json().catch(() => ({}));
      email = b.email ?? email;
      token = b.token ?? token;
    }
    // One-click clients (RFC 8058) send email/token only in the query string,
    // which we already read above — nothing more to do.
  }
  return { email: email.trim().toLowerCase(), token: token.trim() };
}

async function doUnsubscribe(email: string, token: string): Promise<boolean> {
  const db = serviceClient();
  const { data, error } = await db
    .from("subscribers")
    .update({ unsubscribed: true })
    .eq("email", email)
    .eq("token", token)
    .select("email")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  const { email, token } = await readParams(req);

  if (!email || !token) {
    return page("Invalid link", `<h2>Invalid unsubscribe link</h2><p>This link is missing information.</p>`, 400);
  }

  // GET: interstitial only.
  if (req.method === "GET") {
    const action = new URL(req.url).pathname;
    return page(
      "Unsubscribe",
      `<h2 style="margin:0 0 12px">Unsubscribe</h2>` +
        `<p>Stop receiving the tailsnconk newsletter at <strong>${escapeHtml(email)}</strong>?</p>` +
        `<form method="POST" action="${escapeHtml(action)}">` +
        `<input type="hidden" name="email" value="${escapeHtml(email)}">` +
        `<input type="hidden" name="token" value="${escapeHtml(token)}">` +
        `<button type="submit" style="padding:10px 18px;background:#b91c1c;color:#fff;border:0;border-radius:8px;cursor:pointer">Unsubscribe</button>` +
        `</form>`,
    );
  }

  if (req.method !== "POST") {
    return page("Method not allowed", `<h2>Method not allowed</h2>`, 405);
  }

  try {
    const matched = await doUnsubscribe(email, token);
    if (!matched) {
      // Idempotent / anti-enumeration: report success either way.
      return page("Unsubscribed", `<h2>You're unsubscribed</h2><p>You won't receive further emails.</p>`);
    }
    return page(
      "Unsubscribed",
      `<h2 style="margin:0 0 12px">You're unsubscribed</h2>` +
        `<p><strong>${escapeHtml(email)}</strong> has been removed from the tailsnconk newsletter.</p>`,
    );
  } catch (err) {
    console.error("newsletter-unsubscribe error:", err);
    return page("Something went wrong", `<h2>Something went wrong</h2><p>Please try again later.</p>`, 500);
  }
});
