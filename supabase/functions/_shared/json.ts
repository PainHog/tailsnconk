// Shared JSON + HTML response helpers (CORS headers folded in).

import { corsHeaders } from "./cors.ts";

/** A JSON response with CORS headers. */
export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

/** An HTML response with CORS headers (used for the email interstitials). */
export function html(markup: string, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(markup, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function ok(body: Record<string, unknown> = {}): Response {
  return json({ ok: true, ...body }, 200);
}

export function badRequest(message: string): Response {
  return json({ ok: false, error: message }, 400);
}

export function unauthorized(message = "unauthorized"): Response {
  return json({ ok: false, error: message }, 401);
}

export function forbidden(message = "forbidden"): Response {
  return json({ ok: false, error: message }, 403);
}

export function tooManyRequests(message = "rate limited"): Response {
  return json({ ok: false, error: message }, 429);
}

export function serverError(message = "internal error"): Response {
  return json({ ok: false, error: message }, 500);
}
