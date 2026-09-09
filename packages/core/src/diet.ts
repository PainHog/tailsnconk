/**
 * THE VARIANT / CONSTRAINT ENGINE (adapted from the blueprint's diet.ts).
 *
 * This is the SECONDARY feature (kept deliberately small): re-express a cocktail
 * to satisfy user-selected constraints, honestly. The headline use is
 * "zero-proof" (make me a mocktail version), plus an allergen example
 * ("egg-free") to exercise the combinable-rewrite correctness the blueprint
 * calls out. Constraints combine: selecting two at once must never leave a
 * component that violates either.
 *
 * Blueprint fidelity notes / niche adaptation:
 * - Categories are the `contains` tags on an ingredient (here: alcohol, egg...).
 * - A Constraint forbids a set of categories.
 * - Swaps for cocktails are the SAME everywhere for a given base ingredient
 *   (gin -> non-alcoholic gin, whatever the drink), so instead of repeating
 *   swap metadata on every recipe line we keep a global registry keyed by
 *   ingredient slug + constraint id. The rewrite logic is otherwise identical
 *   to the blueprint: choose a swap whose RESULT is disjoint from the combined
 *   forbidden set, else flag the part unresolvable.
 */

import type { Cocktail, Constraint, ContainsCategory } from './types';
import { getIngredient } from './ingredients';

/** The constraints the UI can offer. `pending` ones are withheld until tagged. */
export const CONSTRAINTS: Constraint[] = [
  { id: 'zero-proof', label: 'Zero-proof (mocktail)', forbids: ['alcohol'] },
  { id: 'egg-free', label: 'Egg-free', forbids: ['egg'] },
  // Defined + tested but withheld from UI until the dataset carries dairy tags.
  { id: 'dairy-free', label: 'Dairy-free', forbids: ['dairy'], pending: true },
];

const CONSTRAINT_BY_ID: Map<string, Constraint> = new Map(CONSTRAINTS.map((c) => [c.id, c]));

/** Constraints available to the UI (non-pending). */
export function activeConstraints(): Constraint[] {
  return CONSTRAINTS.filter((c) => !c.pending);
}

interface SwapTarget {
  replacementSlug: string;
  replacementName: string;
  /** Categories the replacement carries (default []). */
  contains?: ContainsCategory[];
}

/**
 * Global swap registry: ingredientSlug -> constraintId -> replacement.
 * Replacements are real non-alcoholic / allergen-free product categories, not
 * invented cocktail ingredients.
 */
const SWAPS: Record<string, Record<string, SwapTarget>> = {
  bourbon: { 'zero-proof': { replacementSlug: 'na-whiskey', replacementName: 'Non-alcoholic whiskey' } },
  'rye-whiskey': { 'zero-proof': { replacementSlug: 'na-whiskey', replacementName: 'Non-alcoholic whiskey' } },
  'tequila-blanco': { 'zero-proof': { replacementSlug: 'na-agave', replacementName: 'Non-alcoholic agave spirit' } },
  'white-rum': { 'zero-proof': { replacementSlug: 'na-rum', replacementName: 'Non-alcoholic white rum' } },
  'london-dry-gin': { 'zero-proof': { replacementSlug: 'na-gin', replacementName: 'Non-alcoholic gin' } },
  vodka: { 'zero-proof': { replacementSlug: 'na-clear-spirit', replacementName: 'Non-alcoholic clear spirit' } },
  'orange-liqueur': { 'zero-proof': { replacementSlug: 'na-orange', replacementName: 'Non-alcoholic orange liqueur' } },
  campari: { 'zero-proof': { replacementSlug: 'na-bitter-aperitif', replacementName: 'Non-alcoholic bitter aperitif' } },
  'coffee-liqueur': { 'zero-proof': { replacementSlug: 'na-coffee', replacementName: 'Non-alcoholic coffee liqueur' } },
  aperol: { 'zero-proof': { replacementSlug: 'na-orange-aperitif', replacementName: 'Non-alcoholic orange aperitif' } },
  'sweet-vermouth': { 'zero-proof': { replacementSlug: 'na-sweet-vermouth', replacementName: 'Non-alcoholic sweet vermouth' } },
  'dry-vermouth': { 'zero-proof': { replacementSlug: 'na-dry-vermouth', replacementName: 'Non-alcoholic dry vermouth' } },
  prosecco: { 'zero-proof': { replacementSlug: 'na-sparkling', replacementName: 'Sparkling grape juice' } },
  'egg-white': { 'egg-free': { replacementSlug: 'aquafaba', replacementName: 'Aquafaba' } },
};

export type PartStatus = 'kept' | 'swapped' | 'unresolvable';

export interface AdaptedPart {
  ingredientSlug: string;
  name: string;
  amount: string;
  unit: string;
  optional: boolean;
  status: PartStatus;
  /** Present when status === 'swapped'. */
  replacementSlug?: string;
  replacementName?: string;
}

export interface AdaptedCocktail {
  slug: string;
  name: string;
  constraints: string[];
  parts: AdaptedPart[];
  /** True when every non-optional part is kept or swapped (nothing unresolvable). */
  fullyResolved: boolean;
}

function forbiddenSet(constraintIds: string[]): Set<ContainsCategory> {
  const out = new Set<ContainsCategory>();
  for (const id of constraintIds) {
    const c = CONSTRAINT_BY_ID.get(id);
    if (c) for (const cat of c.forbids) out.add(cat);
  }
  return out;
}

function intersects(cats: readonly ContainsCategory[], forbidden: Set<ContainsCategory>): boolean {
  return cats.some((c) => forbidden.has(c));
}

/**
 * Re-express a cocktail under the given constraints. Swaps are chosen against
 * the COMBINED forbidden set (blueprint's key correctness property), so
 * selecting two constraints together never leaves a violating component.
 */
export function adaptCocktail(cocktail: Cocktail, constraintIds: string[]): AdaptedCocktail {
  const forbidden = forbiddenSet(constraintIds);
  const parts: AdaptedPart[] = [];
  let fullyResolved = true;

  for (const line of cocktail.ingredients) {
    const ing = getIngredient(line.ingredientSlug);
    const contains = ing?.contains ?? [];
    const base: AdaptedPart = {
      ingredientSlug: line.ingredientSlug,
      name: ing?.name ?? line.ingredientSlug,
      amount: line.amount,
      unit: line.unit,
      optional: line.optional,
      status: 'kept',
    };

    if (!intersects(contains, forbidden)) {
      parts.push(base);
      continue;
    }

    // This part violates at least one selected constraint — find a swap whose
    // RESULT is disjoint from the whole forbidden set.
    const perConstraint = SWAPS[line.ingredientSlug] ?? {};
    let resolved: SwapTarget | undefined;
    for (const id of constraintIds) {
      const swap = perConstraint[id];
      if (!swap) continue;
      const resultContains =
        swap.contains ?? (contains.filter((c) => !CONSTRAINT_BY_ID.get(id)?.forbids.includes(c)) as ContainsCategory[]);
      if (!intersects(resultContains, forbidden)) {
        resolved = swap;
        break;
      }
    }

    if (resolved) {
      parts.push({
        ...base,
        status: 'swapped',
        replacementSlug: resolved.replacementSlug,
        replacementName: resolved.replacementName,
      });
    } else {
      parts.push({ ...base, status: 'unresolvable' });
      if (!line.optional) fullyResolved = false;
    }
  }

  return { slug: cocktail.slug, name: cocktail.name, constraints: constraintIds, parts, fullyResolved };
}

/** Which single constraints this cocktail can fully satisfy (for gen:meta). */
export function supportedConstraints(cocktail: Cocktail): string[] {
  return activeConstraints()
    .filter((c) => adaptCocktail(cocktail, [c.id]).fullyResolved)
    .map((c) => c.id);
}

/** Can this cocktail be turned into a proper zero-proof drink? */
export function canGoZeroProof(cocktail: Cocktail): boolean {
  return adaptCocktail(cocktail, ['zero-proof']).fullyResolved;
}
