#!/usr/bin/env node
/**
 * fetch-overrides.mjs — bake editorial TEXT OVERRIDES into the build so the
 * static pages can show moderator-approved copy (e.g. a hand-tuned cocktail
 * description) without a client fetch.
 *
 * Writes apps/mobile/src/lib/baked-overrides.ts, keeping the module's existing
 * public contract intact (the app imports `override()`), and injecting the
 * fetched data into BAKED_OVERRIDES:
 *   export const BAKED_OVERRIDES: Record<string, string> = { ... }
 *
 * Keys are opaque override ids (the app decides the convention, e.g.
 * `cocktail:<slug>:story`). Same shape as fetch-ratings: it WOULD fetch when
 * Supabase env is set, and falls back to an EMPTY snapshot otherwise. NEVER
 * throws, so `expo export` never breaks.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const OUT = join(HERE, '..', 'src', 'lib', 'baked-overrides.ts');

/**
 * Emit the whole module. We KEEP the existing public API (the override()
 * accessor the app imports) and only swap in the data, so regenerating never
 * breaks importers.
 */
function write(map) {
  mkdirSync(dirname(OUT), { recursive: true });
  const contents =
    '/**\n' +
    ' * GENERATED FILE — DO NOT EDIT BY HAND.\n' +
    ' * Produced by apps/mobile/scripts/fetch-overrides.mjs during the web export.\n' +
    ' * Empty when Supabase env is absent; that is expected on local/PR builds.\n' +
    ' */\n\n' +
    `export const BAKED_OVERRIDES: Record<string, string> = ${JSON.stringify(map, null, 2)};\n\n` +
    'export function override(key: string, fallback: string): string {\n' +
    '  return BAKED_OVERRIDES[key] ?? fallback;\n' +
    '}\n';
  writeFileSync(OUT, contents);
}

/**
 * Best-effort fetch of approved text overrides. Expects a public REST
 * view/table shaped like: [{ key, value }, ...]. Returns {} on any problem.
 */
async function fetchOverrides() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log('fetch-overrides: no Supabase env — writing empty overrides snapshot.');
    return {};
  }
  try {
    const endpoint = `${url.replace(/\/$/, '')}/rest/v1/text_overrides?select=key,value`;
    const res = await fetch(endpoint, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`fetch-overrides: fetch returned ${res.status}; writing empty snapshot.`);
      return {};
    }
    const rows = await res.json();
    const map = {};
    for (const r of Array.isArray(rows) ? rows : []) {
      if (typeof r.key === 'string' && typeof r.value === 'string' && r.key) map[r.key] = r.value;
    }
    console.log(`fetch-overrides: baked ${Object.keys(map).length} override(s).`);
    return map;
  } catch (err) {
    console.warn(`fetch-overrides: fetch failed (${err.message}); writing empty snapshot.`);
    return {};
  }
}

try {
  write(await fetchOverrides());
} catch (err) {
  console.error(`fetch-overrides: ${err.message}; writing empty snapshot.`);
  try { write({}); } catch { /* never break the export */ }
}
process.exit(0);
