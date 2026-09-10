import { Platform } from 'react-native';

/**
 * Single source of truth for color/spacing/type so every screen reads as
 * one system instead of each having its own hand-picked hex values.
 */
export const colors = {
  background: '#131316',
  surface: '#1C1C21',
  surfaceMuted: '#26262C',
  border: '#333238',

  textPrimary: '#F5F5F7',
  textSecondary: '#9C9BA3',
  textMuted: '#6E6D74',
  textOnDark: '#FFFFFF',

  accent: '#6C5CE7',
  accentPressed: '#5443C4',
  accentTint: '#221D3D',

  success: '#3ECF8E',
  successTint: '#123326',
  warning: '#E8B93C',
  warningTint: '#332A12',
  danger: '#F2545B',
  dangerTint: '#331518',

  dark: '#000000',
} as const;

/** Cyan-to-purple hero gradient (primary buttons, hero accents). */
export const gradientAccent = ['#4FC3F7', '#7C4DFF'] as const;

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
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 26, fontWeight: '800' as const, color: colors.textPrimary },
  title: { fontSize: 19, fontWeight: '700' as const, color: colors.textPrimary },
  subtitle: { fontSize: 15, fontWeight: '600' as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary },
  label: { fontSize: 12, fontWeight: '700' as const, color: colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.6 },
};

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1B2233',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: {
    elevation: 2,
  },
  default: {},
});
