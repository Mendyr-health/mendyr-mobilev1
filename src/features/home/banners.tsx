import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { PressableScale, Text } from '@/components/ui';
import type { Banner } from '@/config/types';
import { openDeeplink } from '@/lib/linking';
import { useTheme } from '@/theme';

/** `app.banners` carousel. The server already filters by role, platform and date; we also
 * respect `enabled` and the window in case a cached bundle is stale. */
export function BannerCarousel({ items }: { items: Banner[] }) {
  const { width: windowWidth } = useWindowDimensions();
  const { colors: c, radius } = useTheme();
  const [index, setIndex] = useState(0);
  const now = Date.now();
  const banners = items.filter(
    (b) =>
      b.enabled &&
      b.roles.includes('patient') &&
      (!b.starts_at || new Date(b.starts_at).getTime() <= now) &&
      (!b.ends_at || new Date(b.ends_at).getTime() >= now),
  );
  if (banners.length === 0) return null;
  const width = Math.min(windowWidth, 480) - 32;

  return (
    <View style={s.wrap}>
      <FlatList
        data={banners}
        horizontal
        keyExtractor={(b) => b.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + 12}
        decelerationRate="fast"
        contentContainerStyle={s.list}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (width + 12)))}
        renderItem={({ item }) => (
          <PressableScale
            onPress={() => openDeeplink(item.deeplink)}
            disabled={!item.deeplink}
            accessibilityLabel={item.title}
            accessibilityRole={item.deeplink ? 'link' : 'image'}
            style={[s.banner, { width, backgroundColor: item.bg_color, borderRadius: radius.card }]}
          >
            <View style={s.copy}>
              <Text variant="h3" color={item.text_color} numberOfLines={2}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text variant="bodySm" color={item.text_color} style={s.sub} numberOfLines={3}>
                  {item.subtitle}
                </Text>
              ) : null}
              {item.cta_label ? (
                <View style={[s.cta, { borderColor: item.text_color }]}>
                  <Text variant="label" color={item.text_color}>
                    {item.cta_label}
                  </Text>
                </View>
              ) : null}
            </View>
            {item.image_url ? <Image source={{ uri: item.image_url }} style={s.image} contentFit="contain" /> : null}
          </PressableScale>
        )}
      />
      {banners.length > 1 ? (
        <View style={s.dots}>
          {banners.map((b, i) => (
            <View key={b.id} style={[s.dot, { backgroundColor: i === index ? c.primary : c.border, width: i === index ? 16 : 6 }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: -16, gap: 8 },
  list: { paddingHorizontal: 16, gap: 12 },
  banner: { minHeight: 140, padding: 18, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  copy: { flex: 1, gap: 6 },
  sub: { opacity: 0.9 },
  cta: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 },
  image: { width: 96, height: 96, marginLeft: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3 },
});
