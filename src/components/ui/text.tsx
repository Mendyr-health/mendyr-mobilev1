import { Text as RNText, type TextProps } from 'react-native';
import { useTheme, type ThemeColors, type TypeVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TypeVariant;
  color?: keyof ThemeColors | (string & {});
  align?: 'left' | 'center' | 'right';
};

/** Every piece of copy goes through this so it uses Inter/Outfit and the type scale. */
export function Text({ variant = 'body', color = 'ink', align, style, ...rest }: AppTextProps) {
  const t = useTheme();
  const resolved = (t.colors as Record<string, string>)[color] ?? color;
  return (
    <RNText
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[t.type[variant], { color: resolved }, align ? { textAlign: align } : null, style]}
    />
  );
}
