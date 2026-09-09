/**
 * Theme tokens (placeholder brand — a dark "speakeasy" palette with an amber
 * accent). Swap colors/type for the real brand before launch.
 */

import { useColorScheme } from 'react-native';

export const palette = {
  amber: '#C8892B',
  amberBright: '#E8A93C',
  lime: '#8FB339',
  cranberry: '#8E2B4B',
};

const dark = {
  bg: '#12100E',
  surface: '#1C1916',
  surfaceAlt: '#262019',
  border: '#3A3128',
  text: '#F4EEE4',
  textMuted: '#B3A793',
  accent: palette.amber,
  accentText: '#12100E',
  ...palette,
};

const light = {
  bg: '#FBF7F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F3ECE0',
  border: '#E3D8C6',
  text: '#2A2019',
  textMuted: '#6F6355',
  accent: palette.amber,
  accentText: '#FFFFFF',
  ...palette,
};

export type ThemeColors = typeof dark;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 26, xxl: 34 },
  weight: { regular: '400', medium: '600', bold: '800' },
} as const;

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'light' ? light : dark;
}

export const themes = { dark, light };
