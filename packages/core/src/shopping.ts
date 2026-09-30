/**
 * Shopping intelligence (blueprint's shopping.ts). Pure functions over the
 * catalog + the user's owned set that power the "what should I buy next" tools:
 * which single bottle unlocks the most new cocktails, and overall ingredient
 * frequency for someone starting from an empty shelf.
 */

import type { Cocktail } from './types';
import { requiredSlugs, NON_SHOPPABLE } from './spin';

export interface Unlock {
  ingredientSlug: string;
  /** How many cocktails become makeable if you add ONLY this ingredient. */
  unlocks: number;
  cocktailSlugs: string[];
}

/**
 * For each not-owned ingredient that is the SOLE missing required ingredient of
 * one or more cocktails, how many cocktails buying it alone would unlock.
 * Ranked most-unlocks first. This is the core "best next bottle" signal.
 */
export function ingredientUnlocks(cocktails: readonly Cocktail[], owned: readonly string[]): Unlock[] {
  const O = new Set(owned);
  const map = new Map<string, string[]>();
  for (const c of cocktails) {
    const missing = requiredSlugs(c).filter((s) => !O.has(s));
    if (missing.length === 1) {
      const x = missing[0]!;
      if (NON_SHOPPABLE.has(x)) continue; // can't buy a house-prep — don't suggest it
      if (!map.has(x)) map.set(x, []);
      map.get(x)!.push(c.slug);
    }
  }
  return [...map.entries()]
    .map(([ingredientSlug, cocktailSlugs]) => ({ ingredientSlug, unlocks: cocktailSlugs.length, cocktailSlugs }))
    .sort((a, b) => b.unlocks - a.unlocks || a.ingredientSlug.localeCompare(b.ingredientSlug));
}

export function topUnlocks(cocktails: readonly Cocktail[], owned: readonly string[], limit = 8): Unlock[] {
  return ingredientUnlocks(cocktails, owned).slice(0, limit);
}

export interface IngredientFreq {
  ingredientSlug: string;
  count: number;
}

/** How many cocktails each required ingredient appears in (optionally excluding
 *  some slugs, e.g. what you already own). Good "start here" guidance. */
export function ingredientFrequency(cocktails: readonly Cocktail[], exclude: readonly string[] = []): IngredientFreq[] {
  const ex = new Set(exclude);
  const m = new Map<string, number>();
  for (const c of cocktails) {
    for (const s of requiredSlugs(c)) {
      if (ex.has(s)) continue;
      m.set(s, (m.get(s) ?? 0) + 1);
    }
  }
  return [...m.entries()]
    .map(([ingredientSlug, count]) => ({ ingredientSlug, count }))
    .sort((a, b) => b.count - a.count || a.ingredientSlug.localeCompare(b.ingredientSlug));
}

/** Given the user's shopping list, how many cocktails they'd be able to make if
 *  they bought everything on it (owned ∪ list). */
export function makeableAfterShopping(
  cocktails: readonly Cocktail[],
  owned: readonly string[],
  shopping: readonly string[],
): number {
  const have = new Set([...owned, ...shopping]);
  return cocktails.filter((c) => requiredSlugs(c).every((s) => have.has(s))).length;
}
