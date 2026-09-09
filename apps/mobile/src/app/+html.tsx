import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * The server-render-only HTML shell for the static web export. Per-page <head>
 * (title, meta, canonical, JSON-LD) is injected by the <Seo> component using
 * expo-router/head; this file is just the document scaffold + a theme-aware
 * background so there's no flash before hydration.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS }} />
        {/* Cloudflare Web Analytics beacon is edge-injected at the CDN — nothing to add here. */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const BASE_CSS = `
:root { color-scheme: light dark; }
html, body { margin: 0; padding: 0; }
body { background-color: #FBF7F0; }
@media (prefers-color-scheme: dark) { body { background-color: #12100E; } }
#root { display: flex; min-height: 100vh; }
`;
