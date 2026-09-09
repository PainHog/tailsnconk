/**
 * Deterministic "featured cocktail of the period" rotation (blueprint's
 * featured.ts / seasonal.ts pattern). Uses the injectable-rng discovery engine
 * so the pick is reproducible for a given period key — the same value the
 * newsletter broadcast and the homepage banner both derive from.
 */

import type { Cocktail } from './types';

/** ISO week-ish period key, e.g. "2026-W37". Deterministic bucket for a date. */
export function periodKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Stable string hash → 32-bit unsigned int. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The featured cocktail for a period — deterministic from the period key. */
export function featuredCocktail(cocktails: readonly Cocktail[], key: string = periodKey()): Cocktail | undefined {
  if (cocktails.length === 0) return undefined;
  const idx = hashString(key) % cocktails.length;
  return cocktails[idx];
}
