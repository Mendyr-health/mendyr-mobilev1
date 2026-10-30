export const colors = {
  brand50: '#EEF5FE', brand100: '#DBE9FD', brand400: '#63B0F2', brand600: '#1262E2', brand700: '#0F4ABF',
  background: '#F7F9FC', surface: '#FFFFFF', ink: '#0F172A', muted: '#64748B', border: '#E2E8F0',
  success: '#059669', warning: '#D97706', danger: '#DC2626', dark: '#0F172A',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

// Compatibility exports for unused Expo starter files; new Mendyr UI uses `colors` and `space`.
export const Colors={light:{text:colors.ink,background:colors.background,backgroundElement:colors.surface,backgroundSelected:colors.brand50,textSecondary:colors.muted},dark:{text:colors.ink,background:colors.background,backgroundElement:colors.surface,backgroundSelected:colors.brand50,textSecondary:colors.muted}} as const;
export type ThemeColor=keyof typeof Colors.light;
export const Fonts={sans:'normal',serif:'serif',rounded:'normal',mono:'monospace'};
export const Spacing={half:2,one:4,two:8,three:16,four:24,five:32,six:64}; export const BottomTabInset=80; export const MaxContentWidth=800;
