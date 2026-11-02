import { Platform, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { PressableScale, Sheet, Text } from '@/components/ui';
import { useT, type CopyKey } from '@/i18n';
import { useTheme } from '@/theme';
import type { UploadSource } from './upload';

const OPTIONS: { source: UploadSource; icon: IconName; title: CopyKey; body: CopyKey }[] = [
  { source: 'camera', icon: 'camera', title: 'docs.source.camera', body: 'docs.source.cameraBody' },
  { source: 'library', icon: 'image', title: 'docs.source.library', body: 'docs.source.libraryBody' },
  { source: 'file', icon: 'file', title: 'docs.source.file', body: 'docs.source.fileBody' },
];

// iOS can't present the camera/picker while our sheet's modal is still animating away.
const AFTER_CLOSE_MS = Platform.OS === 'ios' ? 450 : 50;

/** "Add a document": camera, photo library or a PDF/file. Extra fields (type, title) go in
 * `children`; `disabled` blocks picking until they're valid. */
export function SourceSheet({
  visible,
  onClose,
  onPick,
  title,
  subtitle,
  disabled,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (source: UploadSource) => void;
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const options = Platform.OS === 'web' ? OPTIONS.filter((o) => o.source !== 'camera') : OPTIONS;
  return (
    <Sheet visible={visible} onClose={onClose} title={title ?? t('docs.source.title')} subtitle={subtitle ?? t('docs.form.uploadSubtitle')}>
      {children}
      {children ? (
        <Text variant="label" color="inkSoft">
          {t('docs.form.addFrom')}
        </Text>
      ) : null}
      <View style={s.list}>
        {options.map((o) => (
          <PressableScale
            key={o.source}
            disabled={disabled}
            onPress={() => {
              onClose();
              setTimeout(() => onPick(o.source), AFTER_CLOSE_MS);
            }}
            accessibilityRole="button"
            accessibilityLabel={t(o.title)}
            style={[s.option, { borderColor: c.border, borderRadius: radius.input, backgroundColor: c.surface }]}
          >
            <View style={[s.icon, { backgroundColor: c.primarySoft }]}>
              <Icon name={o.icon} size={20} color={c.primary} />
            </View>
            <View style={s.flex}>
              <Text variant="title">{t(o.title)}</Text>
              <Text variant="caption" color="subtle">
                {t(o.body)}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={c.faint} />
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  list: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
