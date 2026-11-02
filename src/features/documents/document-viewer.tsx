import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { neutral } from '@/theme/tokens';
import { isImageType } from './labels';

export type Viewable = { id: string; view_url: string; content_type: string | null };

/** Links last ~5 minutes; anything fetched longer ago than this is refetched before opening. */
const LINK_FRESH_MS = 3 * 60_000;

type Freshness = {
  /** When the list holding `doc` was fetched (react-query `dataUpdatedAt`). */
  updatedAt: number;
  /** Refetch the list and return its documents (fresh `view_url`s). */
  refetch: () => Promise<Viewable[] | undefined>;
};

/**
 * Opens a document right away: photos in an in-app full-screen viewer, PDFs in the in-app
 * browser. `view_url`s are never kept — a stale one is swapped for a fresh one first.
 * Render `viewer` once in the screen.
 */
export function useDocumentViewer() {
  const t = useT();
  const toast = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const open = useCallback(
    async (doc: Viewable, fresh?: Freshness) => {
      let target = doc;
      if (fresh && Date.now() - fresh.updatedAt > LINK_FRESH_MS) {
        setOpening(doc.id);
        try {
          target = (await fresh.refetch())?.find((d) => d.id === doc.id) ?? doc;
        } catch {
          /* fall through with the link we have */
        } finally {
          setOpening(null);
        }
      }
      if (isImageType(target.content_type)) {
        setImageUrl(target.view_url);
        return;
      }
      try {
        await WebBrowser.openBrowserAsync(target.view_url);
      } catch {
        Linking.openURL(target.view_url).catch(() => toast.show(t('docs.error.viewer'), 'error'));
      }
    },
    [t, toast],
  );

  const viewer = <ImageViewer uri={imageUrl} onClose={() => setImageUrl(null)} />;
  return { open, opening, viewer };
}

function ImageViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!uri} animationType="fade" onRequestClose={onClose} statusBarTranslucent presentationStyle="fullScreen">
      <View style={s.root}>
        {uri ? <ViewerImage key={uri} uri={uri} /> : null}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={[s.close, { top: insets.top + 12 }]}
        >
          <Icon name="x" size={22} color={neutral.white} />
        </Pressable>
      </View>
    </Modal>
  );
}

function ViewerImage({ uri }: { uri: string }) {
  const t = useT();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  return (
    <>
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.flex}
        maximumZoomScale={4}
        minimumZoomScale={1}
        centerContent
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri }}
          style={s.flex}
          contentFit="contain"
          // Medical files behind short-lived links: never write them to the image cache.
          cachePolicy="none"
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
          accessibilityIgnoresInvertColors
        />
      </ScrollView>
      {state === 'loading' ? <ActivityIndicator style={s.center} color={neutral.white} size="large" /> : null}
      {state === 'failed' ? (
        <View style={s.center} pointerEvents="none">
          <Text variant="bodySm" color={neutral.white} align="center">
            {t('docs.error.viewer')}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  center: { position: 'absolute', left: 24, right: 24, top: '50%' },
  close: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
