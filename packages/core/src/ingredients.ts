/**
 * The canonical ingredient table (the "bar shelf").
 *
 * Every cocktail references these by slug. This is the single source of truth
 * for the availability engine: the bar checklist is built from the ingredients
 * that cocktails actually use, and `owned` sets are compared against these slugs.
 *
 * Slugs are normalized across all recipes so the same real-world ingredient is
 * ONE slug everywhere (e.g. every "Fresh lime juice" line -> `lime-juice`).
 * Garnish forms are consolidated to their base pantry item (a "lime wedge" and
 * a "lime wheel" are both just `lime`) so the checklist reads the way a person
 * stocks a bar.
 *
 * `contains` drives the constraint engine (diet.ts). Only ingredients that
 * carry a meaningful amount of alcohol are tagged `alcohol`; bitters are dashes
 * and treated as negligible (the common industry treatment for "zero-proof").
 */

import type { Ingredient } from './types';

export const INGREDIENTS: Ingredient[] = [
  // --- Base spirits ---
  { slug: 'bourbon', name: 'Bourbon', type: 'spirit', contains: ['alcohol'] },
  { slug: 'rye-whiskey', name: 'Rye whiskey', type: 'spirit', contains: ['alcohol'] },
  { slug: 'tequila-blanco', name: 'Tequila (blanco)', type: 'spirit', contains: ['alcohol'] },
  { slug: 'white-rum', name: 'White rum', type: 'spirit', contains: ['alcohol'] },
  { slug: 'london-dry-gin', name: 'London dry gin', type: 'spirit', contains: ['alcohol'] },
  { slug: 'vodka', name: 'Vodka', type: 'spirit', contains: ['alcohol'] },

  // --- Liqueurs ---
  { slug: 'orange-liqueur', name: 'Orange liqueur', type: 'liqueur', contains: ['alcohol'] },
  { slug: 'campari', name: 'Campari', type: 'liqueur', contains: ['alcohol'] },
  { slug: 'coffee-liqueur', name: 'Coffee liqueur', type: 'liqueur', contains: ['alcohol'] },
  { slug: 'aperol', name: 'Aperol', type: 'liqueur', contains: ['alcohol'] },

  // --- Wine / fortified / sparkling ---
  { slug: 'sweet-vermouth', name: 'Sweet vermouth', type: 'wine', contains: ['alcohol'] },
  { slug: 'dry-vermouth', name: 'Dry vermouth', type: 'wine', contains: ['alcohol'] },
  { slug: 'prosecco', name: 'Prosecco', type: 'wine', contains: ['alcohol'] },

  // --- Bitters (dashes; alcohol treated as negligible for zero-proof) ---
  { slug: 'angostura-bitters', name: 'Angostura bitters', type: 'bitters' },
  { slug: 'orange-bitters', name: 'Orange bitters', type: 'bitters' },

  // --- Juices ---
  { slug: 'lime-juice', name: 'Fresh lime juice', type: 'juice' },
  { slug: 'lemon-juice', name: 'Fresh lemon juice', type: 'juice' },
  { slug: 'cranberry-juice', name: 'Cranberry juice', type: 'juice' },

  // --- Syrups ---
  { slug: 'simple-syrup', name: 'Simple syrup', type: 'syrup' },

  // --- Carbonated / mixers ---
  { slug: 'soda-water', name: 'Soda water', type: 'mixer' },
  { slug: 'tonic-water', name: 'Tonic water', type: 'mixer' },
  { slug: 'ginger-beer', name: 'Ginger beer', type: 'mixer' },

  // --- Other required components ---
  { slug: 'mint', name: 'Mint', type: 'other' },
  { slug: 'egg-white', name: 'Egg white', type: 'other', contains: ['egg'] },
  { slug: 'espresso', name: 'Fresh espresso', type: 'other' },

  // --- Garnishes (optional; never block availability) ---
  { slug: 'orange', name: 'Orange', type: 'garnish' },
  { slug: 'lime', name: 'Lime', type: 'garnish' },
  { slug: 'lemon', name: 'Lemon', type: 'garnish' },
  { slug: 'maraschino-cherry', name: 'Maraschino cherry', type: 'garnish' },
  { slug: 'salt', name: 'Salt', type: 'garnish' },
  { slug: 'coffee-beans', name: 'Coffee beans', type: 'garnish' },
];

const BY_SLUG: Map<string, Ingredient> = new Map(INGREDIENTS.map((i) => [i.slug, i]));

export function getIngredient(slug: string): Ingredient | undefined {
  return BY_SLUG.get(slug);
}

export function ingredientName(slug: string): string {
  return BY_SLUG.get(slug)?.name ?? slug;
}

/** True when the ingredient carries a meaningful amount of alcohol. */
export function isAlcoholic(slug: string): boolean {
  return (BY_SLUG.get(slug)?.contains ?? []).includes('alcohol');
}
