/**
 * SEO scaffolding (blueprint's seo.ts). Framework-free: functions take the
 * site origin as an argument (the app passes EXPO_PUBLIC_SITE_URL at build).
 *
 * BRAND COPY BELOW IS PLACEHOLDER — replace SITE_* and SOCIAL_LINKS with the
 * real brand identity before launch (blueprint §7 "niche-specific").
 */

export const SITE_NAME = "Tails 'n Conk";
export const SITE_TAGLINE = "What's in your bar?";
export const SITE_DESCRIPTION =
  'Check off the bottles and mixers you own and instantly see every cocktail you can make right now — plus a one-tap random pick.';

/** Author identity (placeholder). */
export const SITE_AUTHOR = {
  name: 'Tails ’n Conk',
  url: '',
};

/** Social profiles for schema.org `sameAs` (placeholder — fill or leave empty). */
export const SOCIAL_LINKS: string[] = [];

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  robots: string;
}

function joinUrl(origin: string, path: string): string {
  const o = origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${o}${p === '/' ? '' : p}`;
}

/** og images use a `.jpg` twin of the app `.webp` asset (blueprint `ogJpg()`). */
export function ogJpg(path: string): string {
  return path.replace(/\.webp$/, '.jpg');
}

export function buildMeta(opts: {
  origin: string;
  path: string;
  title: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
}): PageMeta {
  const fullTitle = opts.path === '/' ? `${SITE_NAME} — ${SITE_TAGLINE}` : `${opts.title} · ${SITE_NAME}`;
  return {
    title: fullTitle,
    description: opts.description ?? SITE_DESCRIPTION,
    canonical: joinUrl(opts.origin, opts.path),
    ogImage: opts.ogImage ? joinUrl(opts.origin, ogJpg(opts.ogImage)) : undefined,
    robots: opts.noindex ? 'noindex, nofollow' : 'index, follow',
  };
}

export { joinUrl };
