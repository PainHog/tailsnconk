/**
 * LIGHT barrel — everything the browse / spin / hub pages need. No heavy
 * per-item content and (deliberately) NOT the constraint engine, so browse and
 * hub pages never pull that weight. The cocktail item page imports `@tailsnconk/core/full`.
 */

export * from './types';
export * from './ingredients';
export * from './spin';
export * from './collections';
export * from './passport';
export * from './featured';
export * from './facets';
export * from './seo';
export * from './jsonld';

export { COCKTAILS, getCocktail, allCocktailSlugs } from './cocktails/index';
export { COCKTAIL_META } from './cocktails-meta.gen';
