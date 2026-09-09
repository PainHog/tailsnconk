/**
 * Theme tokens — a single, committed "after-hours bar" look: a deep plum-ink
 * ground, warm off-white text, and a fresh chartreuse accent (think green
 * Chartreuse / lime / absinthe), paired with an editorial serif display face.
 *
 * Committed to one dark theme on purpose: it fits the subject, reads as
 * designed rather than defaulted, and avoids the static-export light/dark
 * desync. Type comes from Google Fonts (loaded in app/+html.tsx).
 */

export const palette = {
  gold: '#E8C15A',
  goldDim: '#C9A23F',
  coral: '#FF7A6B',
  teal: '#7FC9B8',
  plum: '#151019',
};

const theme = {
  bg: '#151019', // deep plum-ink ground
  surface: '#1E1826', // cards
  surfaceAlt: '#2A2233', // inputs, inactive chips
  border: '#392F49',
  text: '#F5EFEA', // warm off-white
  textMuted: '#ABA0B6',
  accent: '#E8C15A', // champagne gold — logo, links, buttons, active chips
  accentText: '#17121C', // ink on gold
  // Secondary highlights (used sparingly). `amber` = coral for stars / "one away"
  // nudge; `lime` = muted teal for the zero-proof swap indicator (token names
  // kept so existing references restyle cleanly).
  amber: '#FF7A6B',
  lime: '#7FC9B8',
  cranberry: '#FF6B6B',
};

export type ThemeColors = typeof theme;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const font = {
  family: {
    display: '"Fraunces", Georgia, "Times New Roman", serif',
    body: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  size: { xs: 12, sm: 14, md: 16, lg: 21, xl: 28, xxl: 40 },
  weight: { regular: '400', medium: '600', bold: '800' },
} as const;

export function useTheme(): ThemeColors {
  return theme;
}

export const themes = { dark: theme, light: theme };
