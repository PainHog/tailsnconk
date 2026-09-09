/**
 * Domain types for the cocktail discovery engine.
 *
 * These are the niche-specific replacement for the blueprint's
 * Continent/Country/Region/Recipe vocabulary. The engine (spin.ts) and the
 * constraint engine (diet.ts) are written against these types only.
 *
 * Identity convention (from the blueprint): every entity is keyed by a stable
 * text SLUG, never a database id. Content lives here in code; the database only
 * stores user-generated data keyed by these slugs.
 */

/** Base spirit family — the single shallow grouping used for hubs + spin pinning. */
export type SpiritBase =
  | 'whiskey'
  | 'gin'
  | 'vodka'
  | 'rum'
  | 'tequila'
  | 'brandy'
  | 'aperitivo'
  | 'other'
  | 'none'; // zero-proof / no base spirit

/** Approximate ABV of the *finished* drink, bucketed into bands for filtering. */
export type AbvBand =
  | 'high' // spirit-forward / stirred, ~>25% ABV
  | 'medium' // ~12-25% ABV
  | 'low' // session, ~<12% ABV
  | 'zero'; // 0% — mocktail / zero-proof

/** How the drink is made. */
export type Method = 'stir' | 'shake' | 'build' | 'muddle' | 'blend';

/** Ingredient taxonomy — used for facets and shopping grouping. */
export type IngredientType =
  | 'spirit'
  | 'liqueur'
  | 'wine'
  | 'mixer'
  | 'juice'
  | 'syrup'
  | 'bitters'
  | 'garnish'
  | 'other';

/**
 * "Contains" categories — properties a component carries, consumed by the
 * constraint engine (diet.ts). For cocktails the only category that matters
 * today is `alcohol` (drives the zero-proof / low-abv variants). Extra
 * categories (dairy, egg, nut) are here so the engine generalizes without a
 * rewrite, and can be promoted out of `pending` once the dataset is tagged.
 */
export type ContainsCategory = 'alcohol' | 'dairy' | 'egg' | 'nut' | 'gluten';

/** A pantry/bar ingredient. `slug` is the availability key the bar tool checks. */
export interface Ingredient {
  slug: string;
  name: string;
  type: IngredientType;
  /** Categories this ingredient inherently carries (default: []). */
  contains?: ContainsCategory[];
}

/** A per-constraint replacement for one ingredient, honestly re-expressed. */
export interface IngredientSwap {
  /** Slug of the replacement ingredient (must exist in the ingredient table). */
  replacementSlug: string;
  /**
   * Categories the replacement carries. When omitted, the engine infers
   * `original.contains − constraint.forbids`.
   */
  contains?: ContainsCategory[];
}

/** A line in a cocktail's build: which ingredient, how much, and whether optional. */
export interface CocktailIngredient {
  ingredientSlug: string;
  amount: string; // kept as string to preserve "0.75", "2", "1" exactly
  unit: string; // "oz" | "dash" | "top" | "twist" | ...
  optional: boolean;
  /**
   * Keyed swaps for the constraint engine, e.g. { 'zero-proof': { ... } }.
   * Absent for ingredients that never need swapping (juice, syrup, garnish).
   */
  swaps?: Record<string, IngredientSwap>;
}

/** A cocktail — the discoverable item. Lives in code (packages/core). */
export interface Cocktail {
  slug: string;
  name: string;
  description: string;
  spiritBase: SpiritBase;
  abvBand: AbvBand;
  glass: string;
  method: Method;
  tags: string[];
  ingredients: CocktailIngredient[];
  /** Original source URLs the recipe was validated against (provenance). */
  sources?: string[];
}

/**
 * A constraint the user can select (the diet.ts model). A constraint forbids a
 * set of `contains` categories; a component that carries any forbidden category
 * must be swapped or the drink is flagged unresolvable.
 */
export interface Constraint {
  id: string;
  label: string;
  forbids: ContainsCategory[];
  /** Withheld from UI until the dataset is fully tagged for it. */
  pending?: boolean;
}

/**
 * Filters for the discovery engine. The PRIMARY filter is `owned` (bar
 * availability); the rest are optional facets. All facets are ANDed.
 */
export interface SpinFilters {
  /** Ingredient slugs the user owns. A cocktail matches only if every
   *  non-optional ingredient is in this set. Omit/empty = availability ignored. */
  owned?: string[];
  /** Pin to a base spirit family (bypasses eligibility, like a pinned category). */
  spiritBase?: SpiritBase;
  /** Restrict to an ABV band. */
  abvBand?: AbvBand;
  /** Only zero-proof drinks (shortcut for abvBand === 'zero'). */
  zeroProof?: boolean;
  /** Only include cocktails whose non-optional build is <= this many ingredients. */
  maxIngredients?: number;
}

/** The result of a single spin (secondary tool). */
export interface SpinResult {
  spiritBase: SpiritBase;
  cocktail: Cocktail;
}

/** Precomputed, cheap filter metadata per cocktail (written by gen:meta). */
export interface CocktailMeta {
  slug: string;
  spiritBase: SpiritBase;
  abvBand: AbvBand;
  /** Non-optional ingredient slugs — the set the bar tool tests containment against. */
  required: string[];
  /** Optional ingredient slugs (do not block availability). */
  optional: string[];
  /** Constraint ids this cocktail can satisfy (fully swappable), from diet.ts. */
  supportedConstraints: string[];
}
