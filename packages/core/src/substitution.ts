/**
 * SPIRIT SUBSTITUTION LAYER.
 *
 * The core promise is "what can I make" — but a bar rarely stocks every subtype
 * a spec names. Bartending consensus is that many spirits stand in for one
 * another (bourbon for rye, blanco for reposado, cognac for brandy, triple sec
 * for curaçao…). This module models ONLY those broadly-accepted swaps as
 * mutual-equivalence groups, so owning bourbon surfaces the rye Manhattan —
 * clearly labelled as makeable *with a substitution*, never silently mixed into
 * the exact-match list.
 *
 * Deliberately conservative: swaps that change a drink's character (mezcal for
 * tequila, Islay/Scotch for bourbon, flavoured vodka in a savoury drink,
 * overproof rum) are NOT included. Tune the groups below to taste.
 */

import type { Cocktail, SpinFilters } from './types';
import { requiredSlugs, cocktailMatches } from './spin';

/** Mutually-substitutable ingredient groups (each member can stand in for any
 *  other in the same group). A slug may appear in more than one group (e.g.
 *  gold rum bridges the light and dark rum families). */
export const SUBSTITUTION_GROUPS: readonly (readonly string[])[] = [
  // American / Canadian whiskeys interchange in most specs.
  ['bourbon', 'rye-whiskey', 'whiskey', 'tennessee-whiskey', 'canadian-whisky'],
  // Rum: light family, dark family, with gold rum bridging both.
  ['white-rum', 'gold-rum'],
  ['aged-rum', 'dark-rum', 'gold-rum'],
  // Tequila: blanco and reposado swap freely (mezcal deliberately excluded).
  ['tequila-blanco', 'tequila-reposado'],
  // Gin styles.
  ['gin', 'old-tom-gin'],
  // Grape brandies.
  ['brandy', 'cognac'],
  // Orange liqueurs: triple sec / curaçao / Grand Marnier.
  ['orange-liqueur', 'orange-curacao', 'grand-marnier'],
  // Neutral vodkas (flavoured vodkas excluded).
  ['vodka', 'vodka-citron'],
];

/** slug -> set of acceptable substitute slugs (union of its group-mates). */
const SUBSTITUTES: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const m = new Map<string, Set<string>>();
  for (const group of SUBSTITUTION_GROUPS) {
    for (const slug of group) {
      if (!m.has(slug)) m.set(slug, new Set());
      for (const other of group) if (other !== slug) m.get(slug)!.add(other);
    }
  }
  return m;
})();

/** Acceptable substitutes for a required ingredient (empty if none). */
export function substitutesFor(slug: string): string[] {
  return [...(SUBSTITUTES.get(slug) ?? [])];
}

/** One "use X where the recipe calls for Y" swap. */
export interface Substitution {
  /** The ingredient the recipe asks for (not owned). */
  required: string;
  /** The owned ingredient to use in its place. */
  use: string;
}

export type Makeability =
  | { status: 'exact' }
  | { status: 'substitute'; substitutions: Substitution[] }
  | { status: 'no'; missing: string[] };

/**
 * Whether `owned` can make `c`: exactly, with one or more accepted spirit
 * substitutions, or not (with the required slugs that have no owned equivalent).
 */
export function makeability(c: Cocktail, owned: ReadonlySet<string>): Makeability {
  const subs: Substitution[] = [];
  const missing: string[] = [];
  for (const r of requiredSlugs(c)) {
    if (owned.has(r)) continue;
    const alt = substitutesFor(r).find((s) => owned.has(s));
    if (alt) subs.push({ required: r, use: alt });
    else missing.push(r);
  }
  if (missing.length > 0) return { status: 'no', missing };
  if (subs.length > 0) return { status: 'substitute', substitutions: subs };
  return { status: 'exact' };
}

export interface SubstituteMatch {
  cocktail: Cocktail;
  substitutions: Substitution[];
}

/**
 * Cocktails makeable ONLY via substitution (never the exact-match ones), with
 * the facets in `filters` still applied. Sorted for stable display. Empty when
 * `filters.owned` is undefined (browse mode).
 */
export function eligibleWithSubstitutions(cocktails: readonly Cocktail[], filters: SpinFilters): SubstituteMatch[] {
  if (filters.owned === undefined) return [];
  const owned = new Set(filters.owned);
  const facetOnly: SpinFilters = { ...filters, owned: undefined };
  const out: SubstituteMatch[] = [];
  for (const c of cocktails) {
    if (!cocktailMatches(c, facetOnly)) continue;
    const m = makeability(c, owned);
    if (m.status === 'substitute') out.push({ cocktail: c, substitutions: m.substitutions });
  }
  return out.sort((a, b) => a.cocktail.name.localeCompare(b.cocktail.name));
}
