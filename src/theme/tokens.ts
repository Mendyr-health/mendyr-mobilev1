import type { TextStyle } from 'react-native';
import type { ThemeConfig } from '@/config/types';

/** Static design tokens. Brand colours come from `app.theme` at runtime (see `buildTheme`). */
export const neutral = {
  ink: '#0F172A',
  inkSoft: '#334155',
  muted: '#475569',
  subtle: '#64748B',
  faint: '#94A3B8',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  background: '#F7F9FC',
  white: '#FFFFFF',
  black: '#000000',
  scrim: 'rgba(15, 23, 42, 0.45)',
} as const;

/** Soft category colours for profession icons (not brand-driven). */
export const professionPalette = {
  nurse: { bg: '#FFF1F2', fg: '#E11D48' },
  physiotherapist: { bg: '#F0F9FF', fg: '#0284C7' },
  caretaker: { bg: '#FFFBEB', fg: '#B45309' },
  baby_care_specialist: { bg: '#FDF2F8', fg: '#DB2777' },
  lab_technician: { bg: '#F5F3FF', fg: '#7C3AED' },
  doctor: { bg: '#ECFDF5', fg: '#059669' },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Outfit_600SemiBold',
  displayBold: 'Outfit_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 40 },
  h1: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Blend `hex` towards white (amount 0–1). Used to derive soft tints from brand colours. */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

/** Hex colour with alpha, e.g. alpha('#1262E2', 0.12). */
export function alpha(hex: string, value: number): string {
  const a = Math.round(Math.min(1, Math.max(0, value)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export function buildTheme(config: ThemeConfig) {
  const colors = {
    ...neutral,
    primary: config.primary,
    primaryDark: config.primary_dark,
    primarySoft: tint(config.primary, 0.92),
    primaryMuted: tint(config.primary, 0.75),
    accent: config.accent,
    accentSoft: tint(config.accent, 0.9),
    success: config.success,
    successSoft: tint(config.success, 0.9),
    warning: config.warning,
    warningSoft: tint(config.warning, 0.88),
    warningInk: '#92400E',
    danger: config.danger,
    dangerSoft: tint(config.danger, 0.9),
    onPrimary: neutral.white,
  };
  const radius = {
    card: config.radius,
    input: 12,
    sm: 8,
    lg: config.radius + 4,
    pill: 999,
  };
  return { colors, radius, space, type, fonts };
}

export type Theme = ReturnType<typeof buildTheme>;
export type ThemeColors = Theme['colors'];
