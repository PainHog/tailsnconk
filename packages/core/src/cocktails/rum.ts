import type { Cocktail } from '../types';

/** Rum-based cocktails. Recipes validated against IBA + reputable sources. */
export const RUM_COCKTAILS: Cocktail[] = [
  {
    slug: 'daiquiri',
    name: 'Daiquiri',
    description:
      'A crisp, three-ingredient Cuban sour of white rum, fresh lime, and sugar, shaken cold and served straight up.',
    spiritBase: 'rum',
    abvBand: 'medium',
    glass: 'coupe',
    method: 'shake',
    tags: ['classic', 'sour', 'rum', 'iba'],
    ingredients: [
      { ingredientSlug: 'white-rum', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'lime-juice', amount: '0.75', unit: 'oz', optional: false },
      { ingredientSlug: 'simple-syrup', amount: '0.75', unit: 'oz', optional: false },
      { ingredientSlug: 'lime', amount: '1', unit: 'wheel', optional: true },
    ],
    sources: ['https://iba-world.com/iba-cocktail/daiquiri/', 'https://www.liquor.com/recipes/daiquiri/'],
  },
  {
    slug: 'mojito',
    name: 'Mojito',
    description:
      'A refreshing Cuban highball of white rum, lime, and sugar lengthened with soda water and lifted by gently muddled fresh mint.',
    spiritBase: 'rum',
    abvBand: 'medium',
    glass: 'collins',
    method: 'muddle',
    tags: ['classic', 'refreshing', 'iba', 'summer'],
    ingredients: [
      { ingredientSlug: 'white-rum', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'lime-juice', amount: '0.75', unit: 'oz', optional: false },
      { ingredientSlug: 'simple-syrup', amount: '0.5', unit: 'oz', optional: false },
      { ingredientSlug: 'mint', amount: '6', unit: 'leaves', optional: false },
      { ingredientSlug: 'soda-water', amount: '1', unit: 'top', optional: false },
    ],
    sources: ['https://iba-world.com/iba-cocktail/mojito/', 'https://www.liquor.com/recipes/mojito/'],
  },
];
