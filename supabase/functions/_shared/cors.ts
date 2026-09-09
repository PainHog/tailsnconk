// Shared CORS helpers for all edge functions.
// Origins are wide-open by design: these endpoints are called from the static
// web build (any origin during preview/deploy) and from email clients.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Answer a CORS preflight request. Returns a Response for OPTIONS, else null so
 * the caller can proceed.
 */
export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}
