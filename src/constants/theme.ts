export const colors = {
  brand50: '#EEF5FE',
  brand100: '#DBE9FD',
  brand200: '#BED7FB',
  brand300: '#91C1F7',
  brand400: '#63B0F2',
  brand500: '#3A86EA',
  brand600: '#1262E2',
  brand700: '#0F4ABF',
  brand800: '#123F99',
  brand900: '#14377A',

  background: '#F7F9FC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  ink: '#0F172A',
  inkSecondary: '#334155',
  muted: '#64748B',
  mutedLight: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  success: '#059669',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',

  warning: '#D97706',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',

  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',

  info: '#0284C7',
  infoBg: '#F0F9FF',
  infoBorder: '#BAE6FD',

  violet: '#7C3AED',
  violetBg: '#F5F3FF',
  violetBorder: '#DDD6FE',

  rose: '#E11D48',
  roseBg: '#FFF1F2',
  roseBorder: '#FECDD3',

  dark: '#0F172A',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

// Compatibility exports for existing imports
export const Colors = {
  light: {
    text: colors.ink,
    background: colors.background,
    backgroundElement: colors.surface,
    backgroundSelected: colors.brand50,
    textSecondary: colors.muted,
  },
  dark: {
    text: colors.ink,
    background: colors.background,
    backgroundElement: colors.surface,
    backgroundSelected: colors.brand50,
    textSecondary: colors.muted,
  },
} as const;
export type ThemeColor = keyof typeof Colors.light;
export const Fonts = { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' };
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 };
export const BottomTabInset = 80;
export const MaxContentWidth = 800;
