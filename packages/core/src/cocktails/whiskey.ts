import type { Cocktail } from '../types';

/**
 * Whiskey-based cocktails. Recipes validated against IBA + reputable sources;
 * proportions chosen as the most-common classic build (see `sources`).
 */
export const WHISKEY_COCKTAILS: Cocktail[] = [
  {
    slug: 'old-fashioned',
    name: 'Old Fashioned',
    description:
      'A whiskey classic built on nothing more than good bourbon, a whisper of sugar, and aromatic bitters, finished with a twist of orange over ice.',
    spiritBase: 'whiskey',
    abvBand: 'high',
    glass: 'rocks',
    method: 'muddle',
    tags: ['classic', 'spirit-forward', 'whiskey', 'iba'],
    ingredients: [
      { ingredientSlug: 'bourbon', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'simple-syrup', amount: '0.25', unit: 'oz', optional: false },
      { ingredientSlug: 'angostura-bitters', amount: '2', unit: 'dash', optional: false },
      { ingredientSlug: 'orange', amount: '1', unit: 'twist', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/old-fashioned/',
      'https://www.liquor.com/recipes/bourbon-old-fashioned/',
    ],
  },
  {
    slug: 'manhattan',
    name: 'Manhattan',
    description:
      'A spirit-forward stirred cocktail that marries rye whiskey with sweet vermouth and a dash of bitters, served up with a cherry.',
    spiritBase: 'whiskey',
    abvBand: 'high',
    glass: 'coupe',
    method: 'stir',
    tags: ['classic', 'spirit-forward', 'whiskey', 'iba'],
    ingredients: [
      { ingredientSlug: 'rye-whiskey', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'sweet-vermouth', amount: '1', unit: 'oz', optional: false },
      { ingredientSlug: 'angostura-bitters', amount: '2', unit: 'dash', optional: false },
      { ingredientSlug: 'maraschino-cherry', amount: '1', unit: 'cherry', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/manhattan/',
      'https://www.liquor.com/recipes/manhattan-2/',
    ],
  },
  {
    slug: 'whiskey-sour',
    name: 'Whiskey Sour',
    description:
      'A bright, balanced shaken drink of whiskey, fresh lemon, and a touch of syrup, with an optional egg white for a silky foam.',
    spiritBase: 'whiskey',
    abvBand: 'medium',
    glass: 'rocks',
    method: 'shake',
    tags: ['classic', 'sour', 'whiskey', 'iba'],
    ingredients: [
      { ingredientSlug: 'bourbon', amount: '2', unit: 'oz', optional: false },
      { ingredientSlug: 'lemon-juice', amount: '0.75', unit: 'oz', optional: false },
      { ingredientSlug: 'simple-syrup', amount: '0.75', unit: 'oz', optional: false },
      { ingredientSlug: 'egg-white', amount: '1', unit: 'each', optional: true },
      { ingredientSlug: 'maraschino-cherry', amount: '1', unit: 'cherry', optional: true },
      { ingredientSlug: 'orange', amount: '1', unit: 'half-wheel', optional: true },
    ],
    sources: [
      'https://iba-world.com/iba-cocktail/whiskey-sour/',
      'https://www.seriouseats.com/cocktails-whiskey-sour',
    ],
  },
];
