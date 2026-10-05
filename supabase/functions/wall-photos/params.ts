// Request parsing for wall-photos, kept free of Deno/Supabase imports so it can
// be unit-tested under Node (see params.test.ts).
//
// Filters may come from the query string (GET, or POST with a query) and/or a
// JSON body (POST — what supabase-js `functions.invoke(..., { body })` sends).
// A body value wins over the same query parameter.

export const DEFAULT_LIMIT = 60;
export const MAX_LIMIT = 200;

export interface WallParams {
  cocktailId: string | null;
  weekKey: string | null;
  limit: number;
}

/** A non-empty string filter, or null for anything else. */
function asFilter(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : null;
}

/** Clamp a requested limit to [1, MAX_LIMIT]; DEFAULT_LIMIT when not a number. */
export function clampLimit(raw: unknown): number {
  const n = typeof raw === "number" ? Math.trunc(raw) : parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), MAX_LIMIT) : DEFAULT_LIMIT;
}

/**
 * Read cocktail_id / week_key / limit from the query string and JSON body.
 * Returns null when the request carries a body that is not a JSON object.
 */
export async function readWallParams(req: Request): Promise<WallParams | null> {
  const url = new URL(req.url);
  let body: Record<string, unknown> = {};

  if (req.method === "POST") {
    const text = await req.text();
    if (text.trim() !== "") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return null;
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      body = parsed as Record<string, unknown>;
    }
  }

  const pick = (key: string): unknown => (key in body ? body[key] : url.searchParams.get(key));

  return {
    cocktailId: asFilter(pick("cocktail_id")),
    weekKey: asFilter(pick("week_key")),
    limit: clampLimit(pick("limit")),
  };
}
