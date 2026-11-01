import { useMemo } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { useConfig } from '@/config/provider';
import { buildTheme, type Theme } from './tokens';

export * from './tokens';

/** The runtime theme: brand colours and card radius from `app.theme`, plus static tokens. */
export function useTheme(): Theme {
  const config = useConfig('app.theme');
  return useMemo(() => buildTheme(config), [config]);
}

/** Build a themed StyleSheet once per theme: `const useStyles = makeStyles((t) => ({...}))`. */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}

/** Soft, single-layer card shadow. */
export const shadow: ViewStyle = Platform.select<ViewStyle>({
  web: { boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)' } as ViewStyle,
  default: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
}) as ViewStyle;
