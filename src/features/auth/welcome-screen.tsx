import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, iconFromConfig } from '@/components/icons';
import { Button, Text } from '@/components/ui';
import { useConfig } from '@/config/provider';
import type { OnboardingSlide } from '@/config/types';
import { markOnboardingSeen } from '@/features/app/onboarding-seen';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/** First-launch intro, driven by `app.onboarding.slides`. */
export function WelcomeScreen() {
  const t = useT();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, 480);
  const slides = useConfig('app.onboarding').slides;
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<OnboardingSlide>>(null);
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const finish = async (to: '/login' | '/register') => {
    await markOnboardingSeen();
    router.replace(to);
  };
  const last = index >= slides.length - 1;

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={s.top}>
        <Image source={require('@/assets/branding/mendyr.png')} style={s.logo} contentFit="contain" />
        <Text variant="h3" style={s.flex}>
          Mendyr
        </Text>
        {!last ? (
          <Text variant="label" color="muted" onPress={() => finish('/login')} accessibilityRole="button">
            {t('common.skip')}
          </Text>
        ) : null}
      </View>
      <FlatList
        ref={list}
        data={slides}
        style={s.flex}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[s.slide, { width }]}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={s.image} contentFit="contain" />
            ) : (
              <View style={[s.art, { backgroundColor: c.primarySoft }]}>
                <Icon name={iconFromConfig(item.icon)} size={72} color={c.primary} strokeWidth={1.6} />
              </View>
            )}
            <Text variant="h1" align="center">
              {item.title}
            </Text>
            <Text variant="body" color="muted" align="center">
              {item.body}
            </Text>
          </View>
        )}
      />
      <View style={s.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[s.dot, { backgroundColor: i === index ? c.primary : c.border, width: i === index ? 20 : 8 }]} />
        ))}
      </View>
      <View style={s.actions}>
        {last ? (
          <>
            <Button title={t('auth.createAccount')} size="lg" onPress={() => finish('/register')} />
            <Button title={t('auth.haveAccountLogin')} variant="ghost" onPress={() => finish('/login')} />
          </>
        ) : (
          <Button
            title={t('common.next')}
            size="lg"
            icon="arrowRight"
            iconRight
            onPress={() => list.current?.scrollToIndex({ index: index + 1, animated: true })}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  slide: { paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center', gap: 14 },
  art: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  image: { width: 240, height: 240, marginBottom: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 20 },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: 20, gap: 8 },
});
