import { createTheme, useTheme } from '@shopify/restyle';

const palette = {
  // Backgrounds
  black: '#0A0A0A',
  surfaceDark: '#121212',
  surfaceElevated: '#1C1C1E',
  surfaceCard: '#242426',

  // Brand / accent
  green: '#34C759',
  greenDim: '#1A6B2E',
  red: '#FF3B30',
  redDim: '#7A1A14',
  blue: '#0A84FF',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  purple: '#BF5AF2',

  // Power zones
  zone1: '#6C6C70',
  zone2: '#34C759',
  zone3: '#FFD60A',
  zone4: '#FF9F0A',
  zone5: '#FF6B35',
  zone6: '#FF3B30',
  zone7: '#BF5AF2',

  // Text
  white: '#FFFFFF',
  textPrimary: '#F2F2F7',
  textSecondary: '#AEAEB2',
  textTertiary: '#636366',

  // Borders / dividers
  borderSubtle: '#2C2C2E',
  borderDefault: '#3A3A3C',
  transparent: 'transparent',
};

const theme = createTheme({
  colors: {
    ...palette,

    // Semantic aliases
    background: palette.black,
    surface: palette.surfaceDark,
    surfaceElevated: palette.surfaceElevated,
    surfaceCard: palette.surfaceCard,

    textPrimary: palette.textPrimary,
    textSecondary: palette.textSecondary,
    textTertiary: palette.textTertiary,

    accent: palette.blue,
    success: palette.green,
    successDim: palette.greenDim,
    warning: palette.orange,
    danger: palette.red,
    dangerDim: palette.redDim,

    workoutPlanned: palette.zone1,
    workoutDone: palette.green,
    workoutMissed: palette.red,

    borderSubtle: palette.borderSubtle,
    borderDefault: palette.borderDefault,
  },

  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  borderRadii: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    full: 9999,
  },

  textVariants: {
    // Display
    hero: {
      fontSize: 34,
      fontWeight: '700',
      color: 'textPrimary',
      letterSpacing: 0.4,
    },
    // Headings
    h1: {
      fontSize: 28,
      fontWeight: '700',
      color: 'textPrimary',
      letterSpacing: 0.35,
    },
    h2: {
      fontSize: 22,
      fontWeight: '600',
      color: 'textPrimary',
      letterSpacing: 0.35,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600',
      color: 'textPrimary',
    },
    // Body
    body: {
      fontSize: 16,
      fontWeight: '400',
      color: 'textPrimary',
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600',
      color: 'textPrimary',
    },
    // Supporting
    caption: {
      fontSize: 13,
      fontWeight: '400',
      color: 'textSecondary',
    },
    captionBold: {
      fontSize: 13,
      fontWeight: '600',
      color: 'textSecondary',
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      color: 'textTertiary',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    // Tab bar
    tabLabel: {
      fontSize: 10,
      fontWeight: '500',
      color: 'textTertiary',
    },
    defaults: {
      fontSize: 16,
      color: 'textPrimary',
    },
  },

  breakpoints: {},
});

export type AppTheme = typeof theme;

// Pre-typed hook so consumers avoid `import type` (which breaks the sort-imports plugin)
export const useAppTheme = () => useTheme<AppTheme>();

export default theme;
