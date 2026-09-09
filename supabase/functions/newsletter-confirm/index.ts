// newsletter-confirm (opened from an email inbox; verify_jwt = false)
//
// GET  -> shows an interstitial with a "Confirm subscription" button. GET never
//         mutates (email-scanner prefetches must not confirm).
// POST -> flips confirmed=true server-side, matching on (email, token).
//
// email + token arrive as query params (GET) and are echoed as hidden fields in
// the interstitial form (POST).

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
  }
  return { email: email.trim().toLowerCase(), token: token.trim() };
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  const { email, token } = await readParams(req);

  if (!email || !token) {
    return page("Invalid link", `<h2>Invalid confirmation link</h2><p>This link is missing information. Please subscribe again.</p>`, 400);
  }

  // GET: interstitial only (no mutation).
  if (req.method === "GET") {
    const action = new URL(req.url).pathname;
    return page(
      "Confirm subscription",
      `<h2 style="margin:0 0 12px">Confirm your subscription</h2>` +
        `<p>Click below to start receiving the tailsnconk newsletter.</p>` +
        `<form method="POST" action="${escapeHtml(action)}">` +
        `<input type="hidden" name="email" value="${escapeHtml(email)}">` +
        `<input type="hidden" name="token" value="${escapeHtml(token)}">` +
        `<button type="submit" style="padding:10px 18px;background:#1f2937;color:#fff;border:0;border-radius:8px;cursor:pointer">Confirm subscription</button>` +
        `</form>`,
    );
  }

  if (req.method !== "POST") {
    return page("Method not allowed", `<h2>Method not allowed</h2>`, 405);
  }

  try {
    const db = serviceClient();

    // Flip confirmed server-side, but only for a matching (email, token) that
    // isn't unsubscribed. Return the row so we can tell matched vs not.
    const { data, error } = await db
      .from("subscribers")
      .update({ confirmed: true, confirmed_at: new Date().toISOString() })
      .eq("email", email)
      .eq("token", token)
      .eq("unsubscribed", false)
      .select("email")
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return page(
        "Link expired",
        `<h2>We couldn't confirm that</h2><p>The link may have expired or already been used. Try subscribing again.</p>`,
        400,
      );
    }

    return page(
      "Subscription confirmed",
      `<h2 style="margin:0 0 12px">You're in 🍸</h2>` +
        `<p>Your subscription to <strong>tailsnconk</strong> is confirmed. Cheers!</p>`,
    );
  } catch (err) {
    console.error("newsletter-confirm error:", err);
    return page("Something went wrong", `<h2>Something went wrong</h2><p>Please try again later.</p>`, 500);
  }
});
