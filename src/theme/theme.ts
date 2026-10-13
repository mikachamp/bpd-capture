import { Platform } from 'react-native';

/**
 * Single source of truth for color/spacing/type so every screen reads as
 * one system. Palette: "Ink & ember" (2026-10 redesign) — deep navy surfaces,
 * soft blue-white text, and one warm orange accent used only for the main
 * action on a screen. See DESIGN_SYSTEM.md.
 */
export const colors = {
  background: '#0F141C',
  backgroundTop: '#141C27',
  surface: '#172030',
  surfaceMuted: '#1E2939',
  border: '#22304A',

  textPrimary: '#DAE2EE',
  textSecondary: '#B3BFD0',
  textMuted: '#7F8EA5',
  textOnDark: '#E4ECF7',

  accent: '#E98B60',
  accentPressed: '#D2774E',
  accentTint: '#3A2618',
  accentInk: '#2B1206',

  /** Selected state for tabs, chips and segments (a tint, never white). */
  selected: '#26344B',
  selectedText: '#E4ECF7',

  secondary: '#7C9CC8',

  success: '#6FBF9A',
  successTint: '#15302A',
  warning: '#E9B45F',
  warningTint: '#33270F',
  danger: '#F2546B',
  dangerTint: '#3A1820',

  dark: '#000000',
} as const;

/**
 * Kept for screens that still draw a two-stop fill: both stops are the accent,
 * so nothing renders the old cyan-to-purple gradient.
 */
export const gradientAccent = [colors.accent, colors.accent] as const;

/** Outfit, embedded at build time by the expo-font plugin (weights 300–600). */
export const fonts = {
  family: 'Outfit',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

export const typography = {
  display: { fontFamily: fonts.family, fontSize: 32, fontWeight: '400' as const, letterSpacing: -0.6, color: colors.textPrimary },
  title: { fontFamily: fonts.family, fontSize: 20, fontWeight: '500' as const, color: colors.textPrimary },
  subtitle: { fontFamily: fonts.family, fontSize: 16, fontWeight: '500' as const, color: colors.textPrimary },
  body: { fontFamily: fonts.family, fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary },
  caption: { fontFamily: fonts.family, fontSize: 13, fontWeight: '400' as const, color: colors.textMuted },
  label: { fontFamily: fonts.family, fontSize: 12, fontWeight: '500' as const, color: colors.textMuted, letterSpacing: 0.3 },
};

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  android: {
    elevation: 6,
  },
  default: {},
});
