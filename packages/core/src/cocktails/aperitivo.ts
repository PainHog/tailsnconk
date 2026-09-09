import type { Cocktail } from '../types';

/** Aperitivo / low-ABV sparkling cocktails. Validated against IBA + brand specs. */
export const APERITIVO_COCKTAILS: Cocktail[] = [
  {
    slug: 'aperol-spritz',
    name: 'Aperol Spritz',
    description:
      'A light, bittersweet Italian aperitivo built over ice from prosecco, Aperol and a splash of soda, finished with an orange slice.',
    spiritBase: 'aperitivo',
    abvBand: 'low',
    glass: 'wine',
    method: 'build',
    tags: ['classic', 'iba', 'aperitivo', 'refreshing', 'sparkling'],
    ingredients: [
      { ingredientSlug: 'prosecco', amount: '3', unit: 'oz', optional: false },
      { ingredientSlug: 'aperol', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'soda-water', amount: '1', unit: 'top', optional: false },
      { ingredientSlug: 'orange', amount: '1', unit: 'slice', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/spritz/',
      'https://www.aperol.com/en-us/aperol-spritz-cocktail/',
    ],
  },
];
