// trigger-deploy (verify_jwt = true; admin-only)
//
// Lets an admin kick a static rebuild by calling the configured deploy hook.
// The caller's JWT is validated by the platform (verify_jwt=true); this handler
// additionally checks that the caller is an admin (via the is_admin() RPC, run
// as the caller so RLS/identity apply) before firing the hook.
//
// The hook is fully env-driven so no URL/secret is ever committed:
//   DEPLOY_HOOK_URL           (required) — the deploy hook endpoint
//   DEPLOY_HOOK_METHOD        (optional) — defaults to POST
//   DEPLOY_HOOK_AUTHORIZATION (optional) — value for the Authorization header
//   DEPLOY_HOOK_BODY          (optional) — raw request body to send

import { handlePreflight } from "../_shared/cors.ts";
import { forbidden, json, serverError, unauthorized } from "../_shared/json.ts";
import { requireEnv, userClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (req.method !== "POST") return forbidden("POST required");

  try {
    // Identify the caller and confirm admin. userClient forwards their JWT, so
    // is_admin() resolves for auth.uid() under RLS.
    const supa = userClient(req);

    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return unauthorized("sign-in required");

    const { data: admin, error: adminErr } = await supa.rpc("is_admin");
    if (adminErr) throw adminErr;
    if (admin !== true) return forbidden("admin only");

    // Fire the configured deploy hook.
    const hookUrl = requireEnv("DEPLOY_HOOK_URL");
    const method = (Deno.env.get("DEPLOY_HOOK_METHOD") ?? "POST").toUpperCase();
    const authorization = Deno.env.get("DEPLOY_HOOK_AUTHORIZATION");
    const hookBody = Deno.env.get("DEPLOY_HOOK_BODY");

    const headers: Record<string, string> = {};
    if (authorization) headers["Authorization"] = authorization;
    if (hookBody) headers["Content-Type"] = "application/json";

    const hookRes = await fetch(hookUrl, {
      method,
      headers,
      // GET/HEAD cannot carry a body; only attach for other methods.
      body: method === "GET" || method === "HEAD" ? undefined : hookBody,
    });

    const detail = await hookRes.text().catch(() => "");
    if (!hookRes.ok) {
      console.error("trigger-deploy hook failed:", hookRes.status, detail);
      return json({ ok: false, error: "deploy hook failed", status: hookRes.status }, 502);
    }

    return json({ ok: true, status: hookRes.status });
  } catch (err) {
    console.error("trigger-deploy error:", err);
    return serverError("could not trigger deploy");
  }
});
