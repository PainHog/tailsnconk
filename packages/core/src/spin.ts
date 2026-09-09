/**
 * THE DISCOVERY ENGINE (adapted from the blueprint's spin.ts).
 *
 * The blueprint walks a fixed category tree (Continent → Country → Region →
 * Recipe). For cocktails we deliberately chose a FLAT CATALOG WITH FACETS
 * because the primary tool is set-containment over owned ingredients, which
 * cuts across any spirit hierarchy. So the star function here is
 * `eligibleItems` (returns the FULL matching list — the "what's in your bar"
 * tool), and the single-pick `trySpin` is the secondary "spin me one" tool.
 *
 * `base_spirit` is kept as a single shallow grouping used for SEO hubs and as
 * the optional spin "pin" — preserving the blueprint's "a pinned category
 * bypasses eligibility" behaviour and the no-repeat variety rule.
 *
 * Pure and framework-free. `rng` is injectable for deterministic tests and for
 * the "featured cocktail of the period" selection.
 */

import type { Cocktail, SpiritBase, SpinFilters, SpinResult } from './types';

export type Rng = () => number;

/** Distinct Level-1 (base spirit) lockout window, matching the blueprint (=2). */
export const NO_REPEAT_WINDOW = 2;

/** Non-optional ingredient slugs — the set availability is tested against. */
export function requiredSlugs(c: Cocktail): string[] {
  return c.ingredients.filter((i) => !i.optional).map((i) => i.ingredientSlug);
}

/** Optional ingredient slugs (garnishes, top-offs) — never block availability. */
export function optionalSlugs(c: Cocktail): string[] {
  return c.ingredients.filter((i) => i.optional).map((i) => i.ingredientSlug);
}

/** True when the owner's set contains every non-optional ingredient. */
export function canMakeWith(c: Cocktail, owned: ReadonlySet<string>): boolean {
  return requiredSlugs(c).every((slug) => owned.has(slug));
}

/**
 * THE CORE PREDICATE. Facets are ANDed; availability is applied only when
 * `filters.owned` is provided (undefined = browse mode, availability ignored).
 */
export function cocktailMatches(c: Cocktail, filters: SpinFilters): boolean {
  if (filters.spiritBase && c.spiritBase !== filters.spiritBase) return false;
  if (filters.zeroProof && c.abvBand !== 'zero') return false;
  if (filters.abvBand && c.abvBand !== filters.abvBand) return false;
  if (filters.maxIngredients !== undefined && requiredSlugs(c).length > filters.maxIngredients) {
    return false;
  }
  if (filters.owned !== undefined) {
    const owned = new Set(filters.owned);
    if (!canMakeWith(c, owned)) return false;
  }
  return true;
}

/**
 * PRIMARY TOOL — every cocktail the user can make right now under the filters.
 * Returns the FULL list (not a single pick), sorted for stable display.
 */
export function eligibleItems(cocktails: readonly Cocktail[], filters: SpinFilters): Cocktail[] {
  return cocktails.filter((c) => cocktailMatches(c, filters)).sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct base spirits among the eligible set (drives never-dead-end facet UI). */
export function eligibleSpiritBases(cocktails: readonly Cocktail[], filters: SpinFilters): SpiritBase[] {
  // Ignore an existing spiritBase pin so the facet can still offer alternatives.
  const { spiritBase: _pinned, ...rest } = filters;
  const bases = new Set<SpiritBase>();
  for (const c of eligibleItems(cocktails, rest)) bases.add(c.spiritBase);
  return [...bases].sort();
}

/** Distinct ABV bands among the eligible set. */
export function eligibleAbvBands(cocktails: readonly Cocktail[], filters: SpinFilters): string[] {
  const { abvBand: _pinned, ...rest } = filters;
  const bands = new Set<string>();
  for (const c of eligibleItems(cocktails, rest)) bands.add(c.abvBand);
  return [...bands];
}

// --- No-repeat variety (blueprint pattern: rememberCountry/withoutRecentCountries) ---

/** Keep a short history of the last base spirits rolled. */
export function rememberBase(recent: SpiritBase[], base: SpiritBase): SpiritBase[] {
  const next = [base, ...recent.filter((b) => b !== base)];
  return next.slice(0, NO_REPEAT_WINDOW);
}

/**
 * Drop cocktails whose base spirit was in the recent window — UNLESS that would
 * empty the pool, in which case the lockout stands down (so a single-base
 * filter still works).
 */
export function withoutRecentBases(pool: Cocktail[], recent: SpiritBase[]): Cocktail[] {
  const locked = new Set(recent.slice(0, NO_REPEAT_WINDOW));
  const filtered = pool.filter((c) => !locked.has(c.spiritBase));
  return filtered.length > 0 ? filtered : pool;
}

function pick<T>(arr: readonly T[], rng: Rng): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * SECONDARY TOOL — spin one makeable cocktail. Returns `undefined` (never
 * throws) when nothing qualifies, so the UI can explain why.
 */
export function trySpin(
  cocktails: readonly Cocktail[],
  filters: SpinFilters,
  rng: Rng = Math.random,
  recent: SpiritBase[] = [],
): SpinResult | undefined {
  const pool = eligibleItems(cocktails, filters);
  if (pool.length === 0) return undefined;
  const varied = withoutRecentBases(pool, recent);
  const cocktail = pick(varied, rng);
  if (!cocktail) return undefined;
  return { spiritBase: cocktail.spiritBase, cocktail };
}

/** Throwing form for callers that already proved a match exists. */
export function spin(
  cocktails: readonly Cocktail[],
  filters: SpinFilters,
  rng: Rng = Math.random,
  recent: SpiritBase[] = [],
): SpinResult {
  const result = trySpin(cocktails, filters, rng, recent);
  if (!result) throw new Error('spin(): no cocktail matches the given filters');
  return result;
}

// --- "Almost there" helper (availability-based shopping nudge) ---

export interface AlmostMakeable {
  cocktail: Cocktail;
  /** The single missing non-optional ingredient slug. */
  missing: string;
}

/**
 * Cocktails the user could make by buying exactly ONE more non-optional
 * ingredient. Facets still apply; availability is recomputed against `owned`.
 */
export function almostMakeable(cocktails: readonly Cocktail[], filters: SpinFilters): AlmostMakeable[] {
  if (filters.owned === undefined) return [];
  const owned = new Set(filters.owned);
  const out: AlmostMakeable[] = [];
  const facetOnly: SpinFilters = { ...filters, owned: undefined };
  for (const c of cocktails) {
    if (!cocktailMatches(c, facetOnly)) continue;
    const missing = requiredSlugs(c).filter((slug) => !owned.has(slug));
    if (missing.length === 1) out.push({ cocktail: c, missing: missing[0]! });
  }
  return out.sort((a, b) => a.cocktail.name.localeCompare(b.cocktail.name));
}
