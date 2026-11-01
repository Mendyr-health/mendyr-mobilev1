import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api';
import { useTheme } from '@/theme';
import { Button } from './button';
import { Text } from './text';

export function EmptyState({
  icon = 'clipboard',
  title,
  body,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={s.wrap}>
      <View style={[s.icon, { backgroundColor: c.primarySoft }]}>
        <Icon name={icon} size={26} color={c.primary} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="bodySm" color="muted" align="center">
          {body}
        </Text>
      ) : null}
      {action && onAction ? <Button title={action} onPress={onAction} full={false} style={s.action} /> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const t = useT();
  const { colors: c } = useTheme();
  const offline = error instanceof ApiError && error.code === 'network';
  const message = error instanceof Error ? error.message : t('error.generic');
  return (
    <View style={s.wrap}>
      <View style={[s.icon, { backgroundColor: c.dangerSoft }]}>
        <Icon name={offline ? 'offline' : 'alert'} size={26} color={c.danger} />
      </View>
      <Text variant="h3" align="center">
        {offline ? t('error.offlineTitle') : t('error.title')}
      </Text>
      <Text variant="bodySm" color="muted" align="center">
        {message}
      </Text>
      {onRetry ? (
        <Button title={t('common.retry')} icon="refresh" variant="outline" onPress={onRetry} full={false} style={s.action} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  action: { marginTop: 8 },
});
