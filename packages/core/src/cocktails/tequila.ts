import type { Cocktail } from '../types';

/** Tequila-based cocktails. Recipes validated against IBA + reputable sources. */
export const TEQUILA_COCKTAILS: Cocktail[] = [
  {
    slug: 'margarita',
    name: 'Margarita',
    description:
      "Mexico's most famous sour, shaking blanco tequila with orange liqueur and fresh lime juice for a tart, salt-rimmed refresher.",
    spiritBase: 'tequila',
    abvBand: 'medium',
    glass: 'coupe',
    method: 'shake',
    tags: ['classic', 'sour', 'tequila', 'iba'],
    ingredients: [
      { ingredientSlug: 'tequila-blanco', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'orange-liqueur', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'lime-juice', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'salt', amount: '1', unit: 'rim', optional: true },
      { ingredientSlug: 'lime', amount: '1', unit: 'wedge', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/margarita/',
      'https://www.diffordsguide.com/cocktails/recipe/7884/the-original-margarita',
    ],
  },
];
