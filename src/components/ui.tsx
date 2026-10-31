import React, { useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, radii, space } from '@/constants/theme';
import { Icon, type IconName } from './icons';

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          styles.clickable,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function Body({
  children,
  muted = false,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.body, muted && styles.muted, style]}>
      {children}
    </Text>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconName;
  iconRight?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight = false,
  style,
  textStyle,
  ...rest
}: ButtonProps) {
  const iconColor =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'secondary'
      ? colors.brand700
      : colors.brand600;

  const iconComponent = icon ? (
    <Icon
      name={icon}
      size={size === 'sm' ? 15 : size === 'lg' ? 20 : 18}
      color={iconColor}
      strokeWidth={2.2}
    />
  ) : null;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`btn_${size}`],
        styles[`btn_${variant}`],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        styles.clickable,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {!iconRight && iconComponent}
          <Text
            style={[
              styles.buttonText,
              styles[`btnText_${size}`],
              styles[`btnText_${variant}`],
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconRight && iconComponent}
        </View>
      )}
    </Pressable>
  );
}

export type BadgeTone = 'brand' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'gray';

const BADGE_COLORS: Record<BadgeTone, { bg: string; text: string; border: string }> = {
  brand: { bg: colors.brand50, text: colors.brand700, border: colors.brand200 },
  blue: { bg: colors.infoBg, text: colors.info, border: colors.infoBorder },
  green: { bg: colors.successBg, text: colors.success, border: colors.successBorder },
  amber: { bg: colors.warningBg, text: colors.warning, border: colors.warningBorder },
  red: { bg: colors.dangerBg, text: colors.danger, border: colors.dangerBorder },
  violet: { bg: colors.violetBg, text: colors.violet, border: colors.violetBorder },
  gray: { bg: '#F1F5F9', text: colors.muted, border: '#E2E8F0' },
};

export function BlinkingDot({
  color = colors.warning,
  size = 7,
  style,
}: {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.2],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const ringScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });

  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        }}
      />
    </View>
  );
}

export function Badge({
  tone = 'gray',
  children,
  icon,
  style,
  pulseDot,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  pulseDot?: boolean;
}) {
  const c = BADGE_COLORS[tone];
  const shouldPulse = pulseDot ?? (typeof children === 'string' && children.toLowerCase().includes('finding'));
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      {shouldPulse && <BlinkingDot color={c.text} size={7} />}
      {icon && <Icon name={icon} size={13} color={c.text} strokeWidth={2.4} />}
      <Text style={[styles.badgeText, { color: c.text }]}>{children}</Text>
    </View>
  );
}

export function Field({
  label,
  error,
  hint,
  optional,
  style,
  ...props
}: {
  label: string;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  style?: StyleProp<ViewStyle>;
} & TextInputProps) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional && <Text style={styles.optionalText}>(optional)</Text>}
      </View>
      <TextInput
        placeholderTextColor="#94A3B8"
        style={[styles.input, error ? styles.inputError : null]}
        {...props}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Notice({
  children,
  tone = 'info',
  icon,
}: {
  children: ReactNode;
  tone?: 'info' | 'error' | 'success' | 'warning';
  icon?: IconName;
}) {
  const iconName =
    icon ??
    (tone === 'success'
      ? 'checkCircle'
      : tone === 'error'
      ? 'x'
      : tone === 'warning'
      ? 'info'
      : 'info');

  const iconColor =
    tone === 'success'
      ? colors.success
      : tone === 'error'
      ? colors.danger
      : tone === 'warning'
      ? colors.warning
      : colors.info;

  return (
    <View style={[styles.notice, styles[`notice_${tone}`]]}>
      <Icon name={iconName} size={18} color={iconColor} strokeWidth={2.2} />
      <Text style={[styles.noticeText, { color: iconColor }]}>{children}</Text>
    </View>
  );
}

export function Avatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0]?.[0] ?? '?').toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.4) }]}>
        {initials}
      </Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: space.md,
    gap: space.sm,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  clickable: {
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  title: {
    fontSize: 26,
    lineHeight: 33,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  muted: {
    color: colors.muted,
  },
  button: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btn_sm: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  btn_md: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  btn_lg: {
    minHeight: 54,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  btn_primary: {
    backgroundColor: colors.brand600,
  },
  btn_secondary: {
    backgroundColor: colors.brand50,
  },
  btn_outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  btn_danger: {
    backgroundColor: colors.danger,
  },
  btn_ghost: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontWeight: '700',
  },
  btnText_sm: {
    fontSize: 13,
  },
  btnText_md: {
    fontSize: 15,
  },
  btnText_lg: {
    fontSize: 16,
  },
  btnText_primary: {
    color: '#FFFFFF',
  },
  btnText_secondary: {
    color: colors.brand700,
  },
  btnText_outline: {
    color: colors.ink,
  },
  btnText_danger: {
    color: '#FFFFFF',
  },
  btnText_ghost: {
    color: colors.brand600,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldWrap: {
    gap: 6,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  optionalText: {
    fontSize: 12,
    color: colors.muted,
  },
  input: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    color: colors.muted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
  },
  notice_info: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  notice_success: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  notice_warning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  notice_error: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  avatar: {
    backgroundColor: colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand200,
  },
  avatarText: {
    fontWeight: '800',
    color: colors.brand700,
  },
});
