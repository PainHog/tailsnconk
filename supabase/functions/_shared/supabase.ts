// Supabase client factories for edge functions.
//
// serviceClient() — full-privilege (service-role) client. Bypasses RLS; use it
//   only for server-trusted work (flipping newsletter confirmation, signing
//   URLs, claiming the broadcast period). NEVER expose the key to a browser.
//
// userClient(req) — anon-key client that forwards the caller's Authorization
//   header, so RLS applies as that user (auth.uid() resolves). Used to check
//   the caller's identity / admin status.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Read a required environment variable or throw a clear error. */
export function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing required env var: ${name}`);
  return v;
}

/** Service-role client: bypasses RLS. Server-trusted only. */
export function serviceClient(): SupabaseClient {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Anon client that runs as the calling user (RLS enforced via their JWT). */
export function userClient(req: Request): SupabaseClient {
  const authorization = req.headers.get("Authorization") ?? "";
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    },
  );
}
