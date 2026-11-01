import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { PressableScale, Sheet, Text } from '@/components/ui';
import { useI18n, type Lang } from '@/i18n';
import { useTheme } from '@/theme';

const OPTIONS: { value: Lang; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { lang, setLang, t } = useI18n();
  const { colors: c, radius } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('account.language')}>
      {OPTIONS.map((o) => {
        const active = o.value === lang;
        return (
          <PressableScale
            key={o.value}
            onPress={() => {
              setLang(o.value);
              onClose();
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={[s.option, { borderRadius: radius.input, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.surface }]}
          >
            <View style={s.flex}>
              <Text variant="title">{o.native}</Text>
              <Text variant="caption" color="subtle">
                {o.label}
              </Text>
            </View>
            {active ? <Icon name="checkCircle" size={20} color={c.primary} /> : null}
          </PressableScale>
        );
      })}
    </Sheet>
  );
}

export const languageName = (lang: Lang) => OPTIONS.find((o) => o.value === lang)?.native ?? 'English';

const s = StyleSheet.create({
  flex: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1.5 },
});
