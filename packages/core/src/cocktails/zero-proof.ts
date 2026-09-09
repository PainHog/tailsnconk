import type { Cocktail } from '../types';

/** Zero-proof (mocktail) recipes — no base spirit, ABV band 'zero'. */
export const ZERO_PROOF_COCKTAILS: Cocktail[] = [
  {
    slug: 'virgin-mojito',
    name: 'Virgin Mojito',
    description:
      'A zero-proof cooler of muddled fresh mint and lime sweetened with simple syrup and lengthened with soda water over crushed ice.',
    spiritBase: 'none',
    abvBand: 'zero',
    glass: 'highball',
    method: 'muddle',
    tags: ['mocktail', 'zero-proof', 'refreshing', 'non-alcoholic'],
    ingredients: [
      { ingredientSlug: 'mint', amount: '10', unit: 'leaves', optional: false },
      { ingredientSlug: 'lime-juice', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'simple-syrup', amount: '0.75', unit: 'oz', optional: false },
      { ingredientSlug: 'soda-water', amount: '1', unit: 'top', optional: false },
      { ingredientSlug: 'lime', amount: '1', unit: 'wedge', optional: true },
    ],
    sources: [
      'https://www.drinklab.org/virgin-mojito-classic/',
      'https://www.thirstybear.com/virgin-mojito-recipe/',
    ],
  },
];
