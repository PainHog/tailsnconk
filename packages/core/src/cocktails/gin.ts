import type { Cocktail } from '../types';

/** Gin-based cocktails. Recipes validated against IBA + reputable sources. */
export const GIN_COCKTAILS: Cocktail[] = [
  {
    slug: 'negroni',
    name: 'Negroni',
    description:
      'An equal-parts Italian aperitivo of gin, Campari, and sweet vermouth stirred over ice into a bittersweet, orange-scented sip.',
    spiritBase: 'gin',
    abvBand: 'high',
    glass: 'rocks',
    method: 'stir',
    tags: ['classic', 'bitter', 'aperitivo', 'iba', 'stirred'],
    ingredients: [
      { ingredientSlug: 'london-dry-gin', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'campari', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'sweet-vermouth', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'orange', amount: '1', unit: 'slice', optional: true },
    ],
    sources: ['https://iba-world.com/iba-cocktail/negroni/', 'https://www.liquor.com/recipes/negroni/'],
  },
  {
    slug: 'dry-martini',
    name: 'Dry Martini',
    description:
      'A crisp, spirit-forward classic of gin stirred with a small measure of dry vermouth and strained ice-cold with a lemon twist or olive.',
    spiritBase: 'gin',
    abvBand: 'high',
    glass: 'martini',
    method: 'stir',
    tags: ['classic', 'spirit-forward', 'iba', 'stirred'],
    ingredients: [
      { ingredientSlug: 'london-dry-gin', amount: '2.5', unit: 'oz', optional: false },
      { ingredientSlug: 'dry-vermouth', amount: '0.5', unit: 'oz', optional: false },
      { ingredientSlug: 'orange-bitters', amount: '1', unit: 'dash', optional: true },
      { ingredientSlug: 'lemon', amount: '1', unit: 'twist', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/dry-martini/',
      'https://www.liquor.com/recipes/dry-martini/',
    ],
  },
  {
    slug: 'gimlet',
    name: 'Gimlet',
    description:
      'A bracing, botanical gin sour balancing the spirit against fresh lime juice and an equal measure of simple syrup.',
    spiritBase: 'gin',
    abvBand: 'medium',
    glass: 'coupe',
    method: 'shake',
    tags: ['classic', 'sour', 'citrus', 'refreshing'],
    ingredients: [
      { ingredientSlug: 'london-dry-gin', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'lime-juice', amount: '0.75', unit: 'oz', optional: false },
      { ingredientSlug: 'simple-syrup', amount: '0.75', unit: 'oz', optional: false },
      { ingredientSlug: 'lime', amount: '1', unit: 'wheel', optional: true },
    ],
    sources: [
      'https://www.liquor.com/recipes/gimlet/',
      'https://cooking.nytimes.com/recipes/1024628-gimlet',
    ],
  },
  {
    slug: 'gin-and-tonic',
    name: 'Gin and Tonic',
    description:
      'A crisp, effervescent highball of gin lengthened with chilled tonic water over ice and brightened by a squeeze of lime.',
    spiritBase: 'gin',
    abvBand: 'medium',
    glass: 'highball',
    method: 'build',
    tags: ['classic', 'refreshing', 'build', 'highball'],
    ingredients: [
      { ingredientSlug: 'london-dry-gin', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'tonic-water', amount: '4', unit: 'oz', optional: false },
      { ingredientSlug: 'lime', amount: '1', unit: 'wedge', optional: true },
    ],
    sources: [
      'https://www.diffordsguide.com/cocktails/recipe/835/gin-and-tonic',
      'https://vinepair.com/cocktail-recipe/gin-tonic/',
    ],
  },
];
