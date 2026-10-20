import { Platform } from 'react-native';
import * as Application from 'expo-application';

/**
 * "BPD Capture Floor" (APP_VARIANT=floor, package ending .floor) is the
 * workshop-floor build: light concrete grey, charcoal, one safety yellow,
 * Barlow / Barlow Condensed, glove-sized controls. Every other build keeps
 * Ink & ember. Decided once at startup from the installed package name.
 */
export const isFloor = (Application.applicationId ?? '').endsWith('.floor');

const inkAndEmber = {
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
  /** The accent when it is text (links, highlighted words) on the screen background. */
  accentText: '#E98B60',

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
};

type Palette = { [K in keyof typeof inkAndEmber]: string };

/** Floor Mode: concrete grey ground, charcoal ink, safety yellow only for "do this now". */
const floorDay: Palette = {
  background: '#D5D7D3',
  backgroundTop: '#D5D7D3',
  surface: '#ECEDEA',
  surfaceMuted: '#E1E3DF',
  border: '#B9BCB7',

  textPrimary: '#202326',
  textSecondary: '#3B4045',
  textMuted: '#5A5F64',
  textOnDark: '#F1F2EE',

  accent: '#F2C12E',
  accentPressed: '#DDAE1F',
  accentTint: '#F5E3A8',
  accentInk: '#202326',
  /** Yellow text is unreadable on concrete grey: dark amber instead. */
  accentText: '#7A5600',

  selected: '#202326',
  selectedText: '#F1F2EE',

  secondary: '#2F5DB5',

  success: '#2E7D4F',
  successTint: '#CFE5D6',
  warning: '#9A6411',
  warningTint: '#F1E0BF',
  danger: '#B83A22',
  dangerTint: '#F1D2CB',

  dark: '#000000',
};

/** Floor "Night Shift": the same layout dark and high-contrast, for installers in store at night or in sun glare. */
export const nightColors: Palette = {
  ...floorDay,
  background: '#15171A',
  backgroundTop: '#15171A',
  surface: '#23262B',
  surfaceMuted: '#2E3238',
  border: '#3A3F46',
  textPrimary: '#F1F2EE',
  textSecondary: '#D2D5D8',
  textMuted: '#A2A7AD',
  accentText: '#F2C12E',
  selected: '#F1F2EE',
  selectedText: '#15171A',
  success: '#5FBF8A',
  successTint: '#1D3528',
  danger: '#F06A4E',
  dangerTint: '#3D1E18',
};

/**
 * Single source of truth for color/spacing/type so every screen reads as
 * one system. Default palette: "Ink & ember" (2026-10 redesign) — deep navy
 * surfaces, soft blue-white text, and one warm orange accent used only for the
 * main action on a screen. The Floor build swaps in floorDay. See DESIGN_SYSTEM.md.
 */
export const colors: Palette = isFloor ? floorDay : inkAndEmber;

/** Floor Mode stage colours (the stage band on an order, the job's stage bar). Never yellow: yellow means "act". */
export const stageColors = ['#6B5CA5', '#2F5DB5', '#2E8063', '#202326'] as const;

/**
 * Kept for screens that still draw a two-stop fill: both stops are the accent,
 * so nothing renders the old cyan-to-purple gradient.
 */
export const gradientAccent = [colors.accent, colors.accent] as const;

/**
 * Outfit (Ink & ember) or Barlow + Barlow Condensed (Floor), embedded at build
 * time by the expo-font plugin. `condensed` is for labels and the big step name.
 */
export const fonts = {
  family: isFloor ? 'Barlow' : 'Outfit',
  condensed: isFloor ? 'Barlow Condensed' : 'Outfit',
};

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
