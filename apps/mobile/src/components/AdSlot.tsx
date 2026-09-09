/**
 * AdSlot (blueprint §5.5) — a single provider-configurable ad component,
 * rendered at a few fixed placements. Gated to WEB + PRODUCTION so admin/dev
 * views stay clean, with the provider id coming from EXPO_PUBLIC_AD_CLIENT_ID.
 *
 * Renders nothing during SSR/first paint (avoids hydration mismatch), then
 * mounts client-side. In development it shows a labelled placeholder so you can
 * see where ads land; in production it renders the real unit only when a
 * provider + client id are configured. Keep the provider host on the CSP
 * allowlist in public/_headers.
 *
 * Built-in provider: "adsense" (Google AdSense). Any other provider value falls
 * back to the placeholder until wired.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { ENV, IS_PROD, IS_WEB } from '@/lib/env';
import { radius, spacing, useTheme } from '@/constants/theme';

export type AdPlacement = 'in-feed' | 'mid-content';

const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

function ensureAdsenseScript(clientId: string) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[data-tnc-ads="1"]`)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `${ADSENSE_SRC}?client=${encodeURIComponent(clientId)}`;
  s.crossOrigin = 'anonymous';
  s.setAttribute('data-tnc-ads', '1');
  document.head.appendChild(s);
}

export function AdSlot({ placement }: { placement: AdPlacement }) {
  const t = useTheme();
  const [mounted, setMounted] = useState(false);
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => setMounted(true), []);

  const provider = ENV.adProvider;
  const clientId = ENV.adClientId;
  const live = IS_WEB && IS_PROD && provider === 'adsense' && Boolean(clientId);

  useEffect(() => {
    if (!mounted || !live) return;
    ensureAdsenseScript(clientId);
    try {
      // @ts-expect-error adsbygoogle is injected by the provider script.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* provider not ready yet */
    }
  }, [mounted, live, clientId]);

  if (!mounted) return null; // SSR + first client render: nothing.

  // Dev / unconfigured: labelled placeholder (never in a configured prod build).
  if (!live) {
    if (IS_PROD) return null;
    return (
      <View
        accessibilityElementsHidden
        style={{
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: t.border,
          borderRadius: radius.md,
          paddingVertical: spacing.xl,
          alignItems: 'center',
          marginVertical: spacing.lg,
        }}
      >
        <Text style={{ color: t.textMuted, fontSize: 12 }}>Ad · {placement} (set EXPO_PUBLIC_AD_PROVIDER to enable)</Text>
      </View>
    );
  }

  // Live AdSense unit. react-native-web renders View->div; we drop to a raw
  // <ins> via dangerouslySetInnerHTML-free ref for the provider to fill.
  return (
    <View style={{ marginVertical: spacing.lg, alignItems: 'center' }}>
      {React.createElement('ins', {
        ref: insRef,
        className: 'adsbygoogle',
        style: { display: 'block', width: '100%' },
        'data-ad-client': clientId,
        'data-ad-slot': placement === 'in-feed' ? 'auto' : 'auto',
        'data-ad-format': 'auto',
        'data-full-width-responsive': 'true',
      })}
    </View>
  );
}
