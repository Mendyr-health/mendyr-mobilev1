import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Card, Text } from '@/components/ui';
import { useT, type CopyKey } from '@/i18n';
import { useTheme } from '@/theme';
import type { UploadPhase } from './upload';

const LABEL: Record<Exclude<UploadPhase, 'idle'>, CopyKey> = {
  preparing: 'docs.phase.preparing',
  uploading: 'docs.phase.uploading',
  saving: 'docs.phase.saving',
};
const STEP: Record<Exclude<UploadPhase, 'idle'>, number> = { preparing: 1, uploading: 2, saving: 3 };

/** Upload state: spinner, the current step and a three-step bar. */
export function UploadProgress({ phase, label, inline }: { phase: UploadPhase; label?: string; inline?: boolean }) {
  const t = useT();
  const { colors: c } = useTheme();
  if (phase === 'idle') return null;
  const body = (
    <View style={s.wrap} accessibilityRole="progressbar" accessibilityLiveRegion="polite" accessibilityLabel={t(LABEL[phase])}>
      <View style={s.row}>
        <ActivityIndicator size="small" color={c.primary} />
        <View style={s.flex}>
          {label ? (
            <Text variant="title" numberOfLines={1}>
              {label}
            </Text>
          ) : null}
          <Text variant="bodySm" color="muted">
            {t(LABEL[phase])}
          </Text>
        </View>
      </View>
      <View style={s.bars}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[s.bar, { backgroundColor: n <= STEP[phase] ? c.primary : c.border }]} />
        ))}
      </View>
    </View>
  );
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
      {inline ? body : <Card flat>{body}</Card>}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
});
