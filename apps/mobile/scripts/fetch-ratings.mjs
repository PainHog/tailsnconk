#!/usr/bin/env node
/**
 * fetch-ratings.mjs — bake aggregate cocktail ratings into the build so the
 * static pages can render <AggregateRating> JSON-LD without a client fetch.
 *
 * Writes apps/mobile/src/lib/baked-ratings.ts, keeping the module's existing
 * public contract intact (the app imports `bakedRating()`), and injecting the
 * fetched data into BAKED_RATINGS:
 *   export const BAKED_RATINGS: Record<string, BakedRating> = { ... }
 *
 * If Supabase env is configured it WOULD fetch aggregates; any failure (or no
 * env at all — the common case on a fresh scaffold / PR build) falls back to an
 * EMPTY snapshot. This script NEVER throws, so `expo export` never breaks.
 *
 * Server never required: uses the anon/publishable key if present; the ratings
 * aggregate is public read-only data.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const OUT = join(HERE, '..', 'src', 'lib', 'baked-ratings.ts');

/**
 * Emit the whole module. We KEEP the existing public API (the BakedRating type
 * and the bakedRating() accessor the app imports) and only swap in the data, so
 * regenerating never breaks importers.
 */
function write(map) {
  mkdirSync(dirname(OUT), { recursive: true });
  const contents =
    '/**\n' +
    ' * GENERATED FILE — DO NOT EDIT BY HAND.\n' +
    ' * Produced by apps/mobile/scripts/fetch-ratings.mjs during the web export.\n' +
    ' * Empty when Supabase env is absent; that is expected on local/PR builds.\n' +
    ' */\n\n' +
    'export interface BakedRating {\n' +
    '  ratingValue: number;\n' +
    '  reviewCount: number;\n' +
    '}\n\n' +
    `export const BAKED_RATINGS: Record<string, BakedRating> = ${JSON.stringify(map, null, 2)};\n\n` +
    'export function bakedRating(cocktailId: string): BakedRating | undefined {\n' +
    '  return BAKED_RATINGS[cocktailId];\n' +
    '}\n';
  writeFileSync(OUT, contents);
}

/**
 * Best-effort fetch of aggregate ratings. Expects a public REST view/table
 * shaped like: [{ slug, rating_value, review_count }, ...]. Returns {} on any
 * problem — this is a bake-time convenience, not a hard dependency.
 */
async function fetchRatings() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log('fetch-ratings: no Supabase env — writing empty ratings snapshot.');
    return {};
  }
  try {
    const endpoint = `${url.replace(/\/$/, '')}/rest/v1/cocktail_rating_aggregates?select=slug,rating_value,review_count`;
    const res = await fetch(endpoint, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`fetch-ratings: fetch returned ${res.status}; writing empty snapshot.`);
      return {};
    }
    const rows = await res.json();
    const map = {};
    for (const r of Array.isArray(rows) ? rows : []) {
      const slug = r.slug;
      const ratingValue = Number(r.rating_value);
      const reviewCount = Number(r.review_count);
      if (!slug || !Number.isFinite(ratingValue) || !Number.isFinite(reviewCount) || reviewCount <= 0) continue;
      map[slug] = { ratingValue: Math.round(ratingValue * 100) / 100, reviewCount };
    }
    console.log(`fetch-ratings: baked ${Object.keys(map).length} rating(s).`);
    return map;
  } catch (err) {
    console.warn(`fetch-ratings: fetch failed (${err.message}); writing empty snapshot.`);
    return {};
  }
}

try {
  write(await fetchRatings());
} catch (err) {
  // Absolute last resort — still leave a valid, empty module behind.
  console.error(`fetch-ratings: ${err.message}; writing empty snapshot.`);
  try { write({}); } catch { /* give up silently, never break the export */ }
}
process.exit(0);
