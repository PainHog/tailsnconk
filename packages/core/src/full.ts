/**
 * FULL barrel — the light barrel plus the constraint/variant engine (diet.ts).
 * Imported only by the cocktail detail page (where the zero-proof / allergen
 * rewriting is offered), keeping that weight off browse and hub pages.
 */

export * from './index';
export * from './diet';
export { AUDIT } from './cocktails-audit.gen';
