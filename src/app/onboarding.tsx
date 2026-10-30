import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/constants/theme';

/* ------------------------------------------------------------------ */
/*  Content for each onboarding slide                                 */
/* ------------------------------------------------------------------ */

interface Slide {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  highlights: string[];
  gradient: [string, string]; // top & bottom accent colours
}

const slides: Slide[] = [
  {
    id: 'welcome',
    emoji: '🏥',
    title: 'Healthcare,\nright at your doorstep',
    subtitle:
      'Mendyr connects you with verified nurses, caregivers & physiotherapists — so expert care comes home to you.',
    highlights: ['Verified professionals', 'Background checked', 'Trusted by families'],
    gradient: [colors.brand50, '#E0EDFF'],
  },
  {
    id: 'services',
    emoji: '💊',
    title: 'Every service\nyou need',
    subtitle:
      'From post-surgery nursing to elder care, physiotherapy, baby care & lab sample collection — all in one app.',
    highlights: ['Home nursing', 'Physiotherapy', 'Elder & baby care', 'Lab collection'],
    gradient: ['#F0FFF4', '#DCFCE7'],
  },
  {
    id: 'booking',
    emoji: '📅',
    title: 'Book in\nseconds',
    subtitle:
      'Pick a service, choose a time slot and get matched with the right professional near you — instantly.',
    highlights: ['Instant matching', 'Flexible scheduling', 'Live tracking'],
    gradient: ['#FFFBEB', '#FEF3C7'],
  },
  {
    id: 'trust',
    emoji: '🛡️',
    title: 'Safe, transparent\n& affordable',
    subtitle:
      'Upfront pricing with no hidden fees. Every professional is ID-verified and trained to clinical standards.',
    highlights: ['Upfront pricing', 'ID-verified staff', 'Rated by patients'],
    gradient: ['#F5F3FF', '#EDE9FE'],
  },
];

const STORAGE_KEY = 'mendyr.onboarding-complete';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  /* Track the currently visible slide */
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  /* Finish onboarding */
  const finish = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    router.replace('/login');
  }, []);

  /* Next slide or finish */
  const handleNext = useCallback(() => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  }, [activeIndex, finish]);

  /* Render a single slide */
  const renderSlide = useCallback(
    ({ item, index }: ListRenderItemInfo<Slide>) => (
      <View style={[slideStyles.container, { width: SCREEN_WIDTH }]}>
        {/* Coloured card */}
        <View style={[slideStyles.card, { backgroundColor: item.gradient[0] }]}>
          <Text style={slideStyles.emoji}>{item.emoji}</Text>
          <View
            style={[slideStyles.accentBar, { backgroundColor: item.gradient[1] }]}
          />
        </View>

        {/* Text content */}
        <View style={slideStyles.textBlock}>
          <Text style={slideStyles.title}>{item.title}</Text>
          <Text style={slideStyles.subtitle}>{item.subtitle}</Text>

          {/* Highlight pills */}
          <View style={slideStyles.pills}>
            {item.highlights.map((h) => (
              <View key={h} style={slideStyles.pill}>
                <Text style={slideStyles.pillText}>{h}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    ),
    [],
  );

  const isLast = activeIndex === slides.length - 1;

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button */}
      {!isLast && (
        <Pressable style={s.skipBtn} onPress={finish} hitSlop={12}>
          <Text style={s.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Swipeable slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        style={s.list}
        contentContainerStyle={s.listContent}
      />

      {/* Bottom controls */}
      <View style={s.footer}>
        {/* Dots */}
        <View style={s.dots}>
          {slides.map((_, i) => {
            const inputRange = [
              (i - 1) * SCREEN_WIDTH,
              i * SCREEN_WIDTH,
              (i + 1) * SCREEN_WIDTH,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i}
                style={[s.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        {/* Primary CTA button */}
        <Pressable
          style={({ pressed }) => [s.ctaBtn, pressed && s.ctaPressed]}
          onPress={handleNext}
        >
          <Text style={s.ctaText}>{isLast ? 'Get started' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    right: space.lg,
    zIndex: 10,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  list: {
    flex: 1,
  },
  listContent: {
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    gap: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand600,
  },
  ctaBtn: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.82,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});

const slideStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    gap: 32,
  },
  card: {
    borderRadius: 28,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 80,
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  textBlock: {
    gap: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    backgroundColor: colors.brand50,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand700,
  },
});
