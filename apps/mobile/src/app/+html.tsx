import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { BACKDROP_CSS } from '@/constants/backdrop';

/**
 * The server-render-only HTML shell for the static web export. Per-page <head>
 * (title, meta, canonical, JSON-LD) is injected by the <Seo> component; this is
 * the document scaffold + fonts + the committed dark ground so there's no flash
 * before hydration.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,900&family=Inter:wght@400;500;600;700&display=swap"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS }} />
        <style dangerouslySetInnerHTML={{ __html: BACKDROP_CSS }} />
        {/* Cloudflare Web Analytics beacon is edge-injected at the CDN — nothing to add here. */}
      </head>
      <body>
        {/* All-over-print cocktail backdrop, fixed behind all content. */}
        <div id="tnc-backdrop" />
        {children}
      </body>
    </html>
  );
}

const BASE_CSS = `
:root { color-scheme: dark; }
html, body { margin: 0; padding: 0; }
body { background-color: #151019; }
#root { display: flex; min-height: 100vh; }
/* Base font for any raw text / form controls; RN components set their own. */
html, body, input, textarea, button, select { font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
::placeholder { color: #ABA0B6; }
`;
