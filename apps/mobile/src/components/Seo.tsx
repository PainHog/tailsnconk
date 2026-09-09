import React from 'react';
import Head from 'expo-router/head';
import { buildMeta } from '@tailsnconk/core';
import { ENV } from '@/lib/env';

/**
 * Per-page SEO head. `expo-router/head` handles the title/meta/link tags.
 *
 * schema.org JSON-LD is NOT emitted here: `expo-router/head` drops <script>
 * children and react-native-web strips raw DOM <script> from the tree. Instead
 * it is injected into each page's <head> at build time by
 * `scripts/inject-jsonld.mjs` (run during `export:web`), which rebuilds the same
 * structured data from `@tailsnconk/core`. The `jsonLd` prop is kept so callers
 * document, at the page, what structured data that page carries.
 */
export function Seo({
  path,
  title,
  description,
  ogImage,
  noindex,
  jsonLd: _jsonLd,
}: {
  path: string;
  title: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Array<Record<string, unknown>>;
}) {
  const meta = buildMeta({ origin: ENV.siteUrl, path, title, description, ogImage, noindex });
  return (
    <Head>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={meta.canonical} />
      <meta name="robots" content={meta.robots} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={meta.canonical} />
      {meta.ogImage ? <meta property="og:image" content={meta.ogImage} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
  );
}
