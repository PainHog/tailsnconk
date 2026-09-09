import type { Cocktail } from '../types';

/** Vodka-based cocktails. Recipes validated against IBA + reputable sources. */
export const VODKA_COCKTAILS: Cocktail[] = [
  {
    slug: 'moscow-mule',
    name: 'Moscow Mule',
    description:
      'A bright, fizzy highball of vodka lengthened with spicy ginger beer and a squeeze of fresh lime, traditionally served ice-cold in a copper mug.',
    spiritBase: 'vodka',
    abvBand: 'low',
    glass: 'copper-mug',
    method: 'build',
    tags: ['classic', 'refreshing', 'iba', 'highball'],
    ingredients: [
      { ingredientSlug: 'vodka', amount: '1.5', unit: 'oz', optional: false },
      { ingredientSlug: 'lime-juice', amount: '0.5', unit: 'oz', optional: false },
      { ingredientSlug: 'ginger-beer', amount: '4', unit: 'oz', optional: false },
      { ingredientSlug: 'lime', amount: '1', unit: 'slice', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/moscow-mule/',
      'https://en.wikipedia.org/wiki/Moscow_mule',
    ],
  },
  {
    slug: 'cosmopolitan',
    name: 'Cosmopolitan',
    description:
      'A tart, blush-pink martini-style cocktail of vodka, orange liqueur, cranberry and fresh lime, shaken cold and served straight up.',
    spiritBase: 'vodka',
    abvBand: 'medium',
    glass: 'martini',
    method: 'shake',
    tags: ['classic', 'iba', 'sour'],
    ingredients: [
      { ingredientSlug: 'vodka', amount: '1.5', unit: 'oz', optional: false },
      { ingredientSlug: 'orange-liqueur', amount: '0.5', unit: 'oz', optional: false },
      { ingredientSlug: 'cranberry-juice', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'lime-juice', amount: '0.5', unit: 'oz', optional: false },
      { ingredientSlug: 'lime', amount: '1', unit: 'slice', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/cosmopolitan/',
      'https://en.wikipedia.org/wiki/Cosmopolitan_(cocktail)',
    ],
  },
  {
    slug: 'espresso-martini',
    name: 'Espresso Martini',
    description:
      'A rich, cold coffee cocktail of vodka, coffee liqueur and fresh espresso shaken hard to raise a signature foamy crema on top.',
    spiritBase: 'vodka',
    abvBand: 'high',
    glass: 'coupe',
    method: 'shake',
    tags: ['classic', 'iba', 'coffee', 'after-dinner'],
    ingredients: [
      { ingredientSlug: 'vodka', amount: '1.75', unit: 'oz', optional: false },
      { ingredientSlug: 'coffee-liqueur', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'espresso', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'simple-syrup', amount: '0.25', unit: 'oz', optional: false },
      { ingredientSlug: 'coffee-beans', amount: '3', unit: 'beans', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/espresso-martini/',
      'https://en.wikipedia.org/wiki/Espresso_martini',
    ],
  },
];
