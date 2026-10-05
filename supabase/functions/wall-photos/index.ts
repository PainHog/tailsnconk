// wall-photos (verify_jwt = true; runs the query with the service role)
//
// Returns short-lived SIGNED URLs for APPROVED made_photos only. Nothing
// user-uploaded is ever public: the bucket is private, and this function is the
// single controlled read path for the community "wall". A valid JWT is required
// to call it (enforced by the platform via verify_jwt).
//
// Optional filters cocktail_id, week_key, limit — as a query string
// (?cocktail_id=<slug>&week_key=<key>&limit=<n>) and/or a JSON body
// ({ "cocktail_id": "<slug>", ... }), which is what the app sends via
// functions.invoke. Parsing lives in params.ts.

import { handlePreflight } from "../_shared/cors.ts";
import { badRequest, json, serverError } from "../_shared/json.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { readWallParams } from "./params.ts";

const BUCKET = "made-photos";
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  const params = await readWallParams(req);
  if (!params) return badRequest("body must be a JSON object");
  const { cocktailId, weekKey, limit } = params;

  try {
    const db = serviceClient();

    let q = db
      .from("made_photos")
      .select("id, week_key, cocktail_id, user_name, storage_path, caption, created_at, approved_at")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(limit);

    if (cocktailId) q = q.eq("cocktail_id", cocktailId);
    if (weekKey) q = q.eq("week_key", weekKey);

    const { data: rows, error } = await q;
    if (error) throw error;

    const photos = [];
    for (const row of rows ?? []) {
      const { data: signed, error: signErr } = await db.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
      // Skip rows whose object is missing/unsignable rather than failing the batch.
      if (signErr || !signed?.signedUrl) continue;
      photos.push({
        id: row.id,
        week_key: row.week_key,
        cocktail_id: row.cocktail_id,
        user_name: row.user_name,
        caption: row.caption,
        created_at: row.created_at,
        url: signed.signedUrl,
      });
    }

    return json({ ok: true, count: photos.length, ttl: SIGNED_URL_TTL_SECONDS, photos });
  } catch (err) {
    console.error("wall-photos error:", err);
    return serverError("could not load photos");
  }
});
