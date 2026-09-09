/**
 * Structured data (schema.org) — built into static HTML by the app's +html
 * shell. Blueprint's recipe-jsonld.ts, with the @type swapped for the cocktail
 * niche: a cocktail is modeled as a `Recipe` (Google supports rich results for
 * Recipe, and cocktails map cleanly onto recipeIngredient / recipeInstructions
 * / recipeCategory). `Product` would be the alternative if we sold bottles.
 */

import type { Cocktail } from './types';
import { ingredientName } from './ingredients';
import { SITE_AUTHOR, SITE_NAME, SOCIAL_LINKS, joinUrl } from './seo';

/** A human ingredient line, e.g. "2 oz Bourbon" / "2 dash Angostura bitters". */
export function ingredientLine(slug: string, amount: string, unit: string): string {
  const name = ingredientName(slug);
  return `${amount} ${unit} ${name}`.replace(/\s+/g, ' ').trim();
}

const METHOD_INSTRUCTION: Record<Cocktail['method'], string> = {
  stir: 'Add all ingredients to a mixing glass with ice, stir until well chilled, and strain into the glass.',
  shake: 'Add all ingredients to a shaker with ice, shake hard until chilled, and strain into the glass.',
  build: 'Build the ingredients directly in the glass over fresh ice and stir briefly to combine.',
  muddle: 'Gently muddle the fresh ingredients, add the remaining ingredients and ice, then stir to combine.',
  blend: 'Add all ingredients to a blender with ice and blend until smooth.',
};

export interface AggregateRatingInput {
  ratingValue: number;
  reviewCount: number;
}

/** schema.org Recipe JSON-LD for a cocktail. */
export function cocktailJsonLd(
  cocktail: Cocktail,
  origin: string,
  rating?: AggregateRatingInput,
): Record<string, unknown> {
  const url = joinUrl(origin, `/cocktail/${cocktail.slug}`);
  const jsonld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: cocktail.name,
    description: cocktail.description,
    url,
    recipeCategory: 'Cocktail',
    recipeCuisine: 'Cocktail',
    keywords: cocktail.tags.join(', '),
    recipeYield: '1 cocktail',
    recipeIngredient: cocktail.ingredients
      .filter((i) => !i.optional)
      .map((i) => ingredientLine(i.ingredientSlug, i.amount, i.unit)),
    recipeInstructions: [
      { '@type': 'HowToStep', text: METHOD_INSTRUCTION[cocktail.method] },
    ],
    author: { '@type': 'Organization', name: SITE_AUTHOR.name || SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {}),
    },
  };
  if (rating && rating.reviewCount > 0) {
    jsonld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.ratingValue,
      reviewCount: rating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return jsonld;
}

export function organizationJsonLd(origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: origin,
    ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {}),
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(origin: string, items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: joinUrl(origin, it.path),
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  };
}
