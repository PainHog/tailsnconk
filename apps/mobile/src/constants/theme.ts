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
  chartreuse: '#CDEB5B',
  chartreuseDim: '#A9C63F',
  coral: '#FF7A6B',
  plum: '#151019',
};

const theme = {
  bg: '#151019', // deep plum-ink ground
  surface: '#1E1826', // cards
  surfaceAlt: '#2A2233', // inputs, inactive chips
  border: '#392F49',
  text: '#F5EFEA', // warm off-white
  textMuted: '#ABA0B6',
  accent: '#CDEB5B', // chartreuse
  accentText: '#17121C', // ink on chartreuse
  // Secondary highlight (used sparingly, e.g. the "one ingredient away" nudge).
  amber: '#FF7A6B', // coral (kept the token name so existing refs restyle cleanly)
  lime: '#CDEB5B',
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
