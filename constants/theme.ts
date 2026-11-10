import { createTheme, useTheme } from '@shopify/restyle';

const palette = {
  white: '#FFFFFF',
  black: '#0A0A0A',

  gray100: '#F2F2F7',
  gray200: '#E5E5EA',
  gray300: '#D1D1D6',
  gray400: '#C7C7CC',
  gray500: '#AEAEB2',
  gray600: '#8E8E93',
  gray700: '#636366',
  gray800: '#3A3A3C',
  gray900: '#1C1C1E',

  green: '#34C759',
  greenDim: '#1A6B2E',
  red: '#FF3B30',
  redDim: '#7A1A14',
  raceRed: '#FF453A',
  blue: '#0A84FF',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  purple: '#BF5AF2',

  zone1: '#6C6C70',
  zone2: '#34C759',
  zone3: '#FFD60A',
  zone4: '#FF9F0A',
  zone5: '#FF6B35',
  zone6: '#FF3B30',
  zone7: '#BF5AF2',

  transparent: 'transparent' as const,
};

const theme = createTheme({
  colors: {
    ...palette,

    // Semantic — backgrounds
    bgPrimary: palette.black,
    bgSecondary: '#121212',
    bgTertiary: palette.gray900,

    // Semantic — text
    textPrimary: palette.gray100,
    textSecondary: palette.gray500,
    textTertiary: palette.gray700,
    textInverse: palette.black,

    // Semantic — borders
    borderDefault: '#2C2C2E',
    borderStrong: palette.gray800,

    // Semantic — overlays
    overlay: 'rgba(0, 0, 0, 0.6)',

    // Semantic — surfaces. Sheen ends on the page colour so cards melt into it.
    sheenFrom: '#1E1E20',
    sheenTo: palette.black,
    hairline: 'rgba(255, 255, 255, 0.08)',
    hairlineStrong: 'rgba(255, 255, 255, 0.30)',
    glassTint: 'rgba(18, 18, 20, 0.85)',
    // Placeholders and code inside a Sheen card: fainter than any control.
    insetFill: 'rgba(255, 255, 255, 0.04)',

    // Semantic — interactive
    interactiveDefault: palette.white,
    interactiveHover: palette.gray100,

    // Status
    success: palette.green,
    successDim: palette.greenDim,
    warning: palette.orange,
    danger: palette.red,
    dangerDim: palette.redDim,
    accent: palette.blue,
    neutral: palette.gray600,

    // Workout states
    workoutPlanned: palette.zone1,
    workoutDone: palette.green,
    workoutMissed: palette.red,

    // Races: one fixed red, never the Race's own Intervals.icu colour
    race: palette.raceRed,

    // Fitness chart series, in intervals.icu's colours
    chartFitness: palette.blue,
    chartFatigue: palette.purple,
    chartForm: palette.yellow,
    chartLoad: palette.gray800,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
  },

  borderRadii: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  shadows: {
    subtle: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    strong: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 15,
      elevation: 10,
    },
    elevated: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  textVariants: {
    // Headings
    display: {
      fontFamily: 'Inter-Bold',
      fontSize: 40,
      lineHeight: 48,
      fontWeight: '700',
      color: 'textPrimary',
    },
    h1: {
      fontFamily: 'Inter-Bold',
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '700',
      color: 'textPrimary',
    },
    h2: {
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700',
      color: 'textPrimary',
    },
    h3: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
      color: 'textPrimary',
    },

    // Body — extra-large
    'body-xl-regular': {
      fontFamily: 'Inter-Regular',
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '400',
      color: 'textPrimary',
    },

    // Body — large (16px)
    'body-l-regular': {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      color: 'textPrimary',
    },
    'body-l-semibold': {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      color: 'textPrimary',
    },

    // Body — small (14px)
    'body-s-regular': {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
      color: 'textPrimary',
    },
    'body-s-medium': {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      color: 'textPrimary',
    },

    // Body — extra-small (12px)
    'body-xs-regular': {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      color: 'textPrimary',
    },
    'body-xs-medium': {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
      color: 'textPrimary',
    },

    defaults: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: 'textPrimary',
    },
  },

  breakpoints: {},
});

export type AppTheme = typeof theme;
export const useAppTheme = () => useTheme<AppTheme>();
export default theme;
