import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './text';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  prefix?: string;
};

export const Field = forwardRef<TextInput, Props>(function Field(
  { label, error, hint, prefix, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const t = useTheme();
  const c = t.colors;
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.wrap}>
      {label ? (
        <Text variant="label" color="inkSoft">
          {label}
        </Text>
      ) : null}
      <View
        style={[
          s.box,
          {
            borderRadius: t.radius.input,
            borderColor: error ? c.danger : focused ? c.primary : c.border,
            backgroundColor: c.surface,
            minHeight: multiline ? 96 : 50,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {prefix ? (
          <Text variant="body" color="muted" style={s.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.faint}
          multiline={multiline}
          accessibilityLabel={label}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            t.type.body,
            s.input,
            { color: c.ink, textAlignVertical: multiline ? 'top' : 'center' },
            style,
          ]}
        />
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="subtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { gap: 6 },
  box: { flexDirection: 'row', borderWidth: 1, paddingHorizontal: 14 },
  prefix: { marginRight: 6 },
  input: { flex: 1, paddingVertical: 12 },
});
