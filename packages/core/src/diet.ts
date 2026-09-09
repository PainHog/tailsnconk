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
function zp(replacementSlug: string, replacementName: string): Record<string, SwapTarget> {
  return { 'zero-proof': { replacementSlug, replacementName } };
}

const NA_WHISKEY = zp('na-whiskey', 'Non-alcoholic whiskey');
const NA_GIN = zp('na-gin', 'Non-alcoholic gin');
const NA_CLEAR = zp('na-clear-spirit', 'Non-alcoholic clear spirit');
const NA_RUM = zp('na-rum', 'Non-alcoholic rum');
const NA_AGAVE = zp('na-agave', 'Non-alcoholic agave spirit');
const NA_BRANDY = zp('na-brandy', 'Non-alcoholic brandy');
const NA_ORANGE = zp('na-orange', 'Non-alcoholic orange liqueur');

const SWAPS: Record<string, Record<string, SwapTarget>> = {
  // Whiskey family
  bourbon: NA_WHISKEY, 'rye-whiskey': NA_WHISKEY, scotch: NA_WHISKEY, 'islay-scotch': NA_WHISKEY,
  'irish-whiskey': NA_WHISKEY, 'canadian-whisky': NA_WHISKEY, whiskey: NA_WHISKEY,
  // Gin family
  gin: NA_GIN, 'old-tom-gin': NA_GIN,
  // Vodka family
  vodka: NA_CLEAR, 'vodka-citron': NA_CLEAR, 'vanilla-vodka': NA_CLEAR,
  // Rum family
  'white-rum': NA_RUM, 'gold-rum': NA_RUM, 'aged-rum': NA_RUM, 'dark-rum': NA_RUM,
  'overproof-rum': NA_RUM, cachaca: NA_RUM,
  // Agave
  'tequila-blanco': NA_AGAVE, 'tequila-reposado': NA_AGAVE, mezcal: NA_AGAVE,
  // Brandy family
  brandy: NA_BRANDY, cognac: NA_BRANDY, calvados: NA_BRANDY, pisco: NA_BRANDY, grappa: NA_BRANDY,
  // Liqueurs
  'orange-liqueur': NA_ORANGE, 'orange-curacao': NA_ORANGE, 'grand-marnier': NA_ORANGE,
  campari: zp('na-bitter-aperitif', 'Non-alcoholic bitter aperitif'),
  aperol: zp('na-orange-aperitif', 'Non-alcoholic orange aperitif'),
  'coffee-liqueur': zp('na-coffee', 'Non-alcoholic coffee liqueur'),
  amaretto: zp('na-amaretto', 'Non-alcoholic almond (orgeat) syrup'),
  'st-germain': zp('elderflower-cordial', 'Elderflower cordial'),
  // Fortified / sparkling
  'sweet-vermouth': zp('na-sweet-vermouth', 'Non-alcoholic sweet vermouth'),
  'dry-vermouth': zp('na-dry-vermouth', 'Non-alcoholic dry vermouth'),
  'lillet-blanc': zp('na-aperitif-wine', 'Non-alcoholic aperitif wine'),
  prosecco: zp('na-sparkling', 'Non-alcoholic sparkling'),
  champagne: zp('na-sparkling', 'Non-alcoholic sparkling'),
  // Allergen
  'egg-white': { 'egg-free': { replacementSlug: 'aquafaba', replacementName: 'Aquafaba' } },
  egg: { 'egg-free': { replacementSlug: 'aquafaba', replacementName: 'Aquafaba' } },
  'egg-yolk': { 'egg-free': { replacementSlug: 'aquafaba', replacementName: 'Aquafaba' } },
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
