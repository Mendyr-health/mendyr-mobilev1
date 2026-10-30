import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { colors, radii, space } from '@/constants/theme';
import { Icon, ProfessionIcon } from '@/components/icons';
import { Badge } from '@/components/ui';

const STORAGE_KEY = 'mendyr.onboarding-complete';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // Constrain width to 480 on web/desktop, full width on phones
  const contentWidth = Math.min(windowWidth, 480);

  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const TOTAL_SLIDES = 4;

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // storage fallback
    }
    router.replace('/login');
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, TOTAL_SLIDES - 1));
      setActiveIndex(clamped);
      scrollViewRef.current?.scrollTo({
        x: clamped * contentWidth,
        animated: true,
      });
    },
    [contentWidth],
  );

  const handleNext = useCallback(() => {
    if (activeIndex < TOTAL_SLIDES - 1) {
      goToSlide(activeIndex + 1);
    } else {
      finish();
    }
  }, [activeIndex, finish, goToSlide]);

  const handleBack = useCallback(() => {
    if (activeIndex > 0) {
      goToSlide(activeIndex - 1);
    }
  }, [activeIndex, goToSlide]);

  // Sync index on manual scroll / swipe
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / contentWidth);
    if (newIndex >= 0 && newIndex < TOTAL_SLIDES && newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  // Web keyboard navigation
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handleBack]);

  const isLast = activeIndex === TOTAL_SLIDES - 1;

  return (
    <View
      style={[
        s.root,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      {/* Top Navigation Bar */}
      <View style={s.topBar}>
        <View style={s.brandLogoRow}>
          <Image
            source={require('@/assets/branding/mendyr.png')}
            style={s.logoImg}
            resizeMode="contain"
          />
          <Text style={s.brandTitle}>Mendyr</Text>
        </View>

        {!isLast ? (
          <Pressable
            style={({ pressed }) => [s.skipBtn, pressed && s.pressed]}
            onPress={finish}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={s.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={s.skipPlaceholder} />
        )}
      </View>

      {/* Main Slide Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={32}
        onMomentumScrollEnd={handleScroll}
        style={s.carousel}
        contentContainerStyle={s.carouselContent}
      >
        {/* SLIDE 1: Welcome & Doorstep Healthcare */}
        <View style={[s.slide, { width: contentWidth }]}>
          <View style={s.slideInner}>
            <Badge tone="brand" icon="sparkles" style={s.badge}>
              Home healthcare, on demand
            </Badge>

            <Text style={s.slideTitle}>
              Nurses and caregivers,{'\n'}
              <Text style={s.brandHighlight}>at your doorstep</Text>
            </Text>

            <Text style={s.slideSubtitle}>
              Book a nurse, physiotherapist, elder-care attendant or lab technician for home visits in minutes. Pay after the visit.
            </Text>

            {/* Visual: Real Booking Preview Card */}
            <View style={s.previewCard}>
              <View style={s.cardHeaderRow}>
                <View style={s.cardLeft}>
                  <ProfessionIcon type="nurse" size={40} iconSize={20} />
                  <View style={s.cardTextWrap}>
                    <Text style={s.bookingTitle}>General nursing visit</Text>
                    <Text style={s.bookingTime}>Today · 6:00 pm · Indiranagar</Text>
                  </View>
                </View>
                <Badge tone="blue">Confirmed</Badge>
              </View>

              <View style={s.proInfoRow}>
                <View style={s.avatarCircle}>
                  <Text style={s.avatarInitial}>PS</Text>
                </View>
                <View style={s.proMeta}>
                  <Text style={s.proName}>Priya Sharma</Text>
                  <Text style={s.proExp}>Nurse · 6 yrs experience · ★ 4.9</Text>
                </View>
                <View style={s.callButton}>
                  <Icon name="phone" size={15} color="#FFFFFF" />
                </View>
              </View>

              <View style={s.earningSnippet}>
                <View style={s.rupeeIconBox}>
                  <Icon name="rupee" size={15} color={colors.success} />
                </View>
                <Text style={s.earningText}>Affordable clinical care at home</Text>
                <Text style={s.checkMark}>✓</Text>
              </View>
            </View>

            {/* Feature Pills */}
            <View style={s.pillsRow}>
              {['Book in 2 minutes', 'Pay after the visit', 'Verified staff'].map(
                (text) => (
                  <View key={text} style={s.pill}>
                    <Icon name="check" size={13} color={colors.brand600} strokeWidth={2.5} />
                    <Text style={s.pillText}>{text}</Text>
                  </View>
                ),
              )}
            </View>
          </View>
        </View>

        {/* SLIDE 2: Services We Provide */}
        <View style={[s.slide, { width: contentWidth }]}>
          <View style={s.slideInner}>
            <Badge tone="brand" icon="activity" style={s.badge}>
              Comprehensive Services
            </Badge>

            <Text style={s.slideTitle}>
              Care we bring{'\n'}
              <Text style={s.brandHighlight}>right to your home</Text>
            </Text>

            <Text style={s.slideSubtitle}>
              From post-surgery recovery to routine checkups and diagnostics — clinical care for every member of your family.
            </Text>

            {/* 6 Services Grid */}
            <View style={s.servicesGrid}>
              <View style={s.serviceItem}>
                <ProfessionIcon type="nurse" size={36} iconSize={18} />
                <View style={s.serviceTexts}>
                  <Text style={s.serviceTitle}>Home Nursing</Text>
                  <Text style={s.serviceDesc}>Wound care, IVs & injections</Text>
                </View>
              </View>

              <View style={s.serviceItem}>
                <ProfessionIcon type="physiotherapist" size={36} iconSize={18} />
                <View style={s.serviceTexts}>
                  <Text style={s.serviceTitle}>Physiotherapy</Text>
                  <Text style={s.serviceDesc}>Rehab & pain management</Text>
                </View>
              </View>

              <View style={s.serviceItem}>
                <ProfessionIcon type="caretaker" size={36} iconSize={18} />
                <View style={s.serviceTexts}>
                  <Text style={s.serviceTitle}>Elder Care</Text>
                  <Text style={s.serviceDesc}>Daily living & companionship</Text>
                </View>
              </View>

              <View style={s.serviceItem}>
                <ProfessionIcon type="baby_care_specialist" size={36} iconSize={18} />
                <View style={s.serviceTexts}>
                  <Text style={s.serviceTitle}>Mother & Baby</Text>
                  <Text style={s.serviceDesc}>Postnatal & infant bathing</Text>
                </View>
              </View>

              <View style={s.serviceItem}>
                <ProfessionIcon type="lab_technician" size={36} iconSize={18} />
                <View style={s.serviceTexts}>
                  <Text style={s.serviceTitle}>Lab Sample Pick</Text>
                  <Text style={s.serviceDesc}>Blood & diagnostic tests</Text>
                </View>
              </View>

              <View style={s.serviceItem}>
                <ProfessionIcon type="doctor" size={36} iconSize={18} />
                <View style={s.serviceTexts}>
                  <Text style={s.serviceTitle}>Doctor Visits</Text>
                  <Text style={s.serviceDesc}>In-home clinical review</Text>
                </View>
              </View>
            </View>

            <View style={s.noticeStrip}>
              <Icon name="shieldCheck" size={16} color={colors.brand600} />
              <Text style={s.noticeStripText}>
                Every service delivered by council-registered specialists.
              </Text>
            </View>
          </View>
        </View>

        {/* SLIDE 3: How It Works */}
        <View style={[s.slide, { width: contentWidth }]}>
          <View style={s.slideInner}>
            <Badge tone="brand" icon="calendar" style={s.badge}>
              How It Works
            </Badge>

            <Text style={s.slideTitle}>
              Book care in{'\n'}
              <Text style={s.brandHighlight}>3 simple steps</Text>
            </Text>

            <Text style={s.slideSubtitle}>
              Experience home healthcare with zero friction, upfront transparency, and complete safety.
            </Text>

            {/* Steps List */}
            <View style={s.stepsList}>
              <View style={s.stepCard}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>1</Text>
                </View>
                <View style={s.stepContent}>
                  <Text style={s.stepTitle}>Pick a service</Text>
                  <Text style={s.stepDesc}>
                    Choose from nursing, physio, elder care, baby care, or lab diagnostics.
                  </Text>
                </View>
              </View>

              <View style={s.stepCard}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>2</Text>
                </View>
                <View style={s.stepContent}>
                  <Text style={s.stepTitle}>Choose time and address</Text>
                  <Text style={s.stepDesc}>
                    Schedule for today or any day in the next 14 days, for you or a loved one.
                  </Text>
                </View>
              </View>

              <View style={s.stepCard}>
                <View style={s.stepNum}>
                  <Text style={s.stepNumText}>3</Text>
                </View>
                <View style={s.stepContent}>
                  <Text style={s.stepTitle}>Professional arrives</Text>
                  <Text style={s.stepDesc}>
                    Track their arrival, meet your verified caregiver, and pay securely after the visit.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SLIDE 4: Safe & Trusted for Everyone */}
        <View style={[s.slide, { width: contentWidth }]}>
          <View style={s.slideInner}>
            <Badge tone="green" icon="shieldCheck" style={s.badge}>
              Safe, Verified & Trusted
            </Badge>

            <Text style={s.slideTitle}>
              Built with trust,{'\n'}
              <Text style={s.brandHighlight}>for everyone</Text>
            </Text>

            <Text style={s.slideSubtitle}>
              Whether you need care for your family or want to grow your professional healthcare practice.
            </Text>

            {/* Two Ecosystem Cards */}
            <View style={s.trustCard}>
              <View style={s.trustCardHeader}>
                <Icon name="heart" size={20} color={colors.brand600} />
                <Text style={s.trustCardTitle}>For Patients & Families</Text>
              </View>
              <Text style={s.trustCardBody}>
                • Background-checked & clinical council verified{'\n'}
                • Upfront transparent pricing with no hidden charges{'\n'}
                • Direct phone contact & live arrival updates
              </Text>
            </View>

            <View style={[s.trustCard, s.trustCardPro]}>
              <View style={s.trustCardHeader}>
                <Icon name="rupee" size={20} color={colors.success} />
                <Text style={s.trustCardTitle}>For Healthcare Professionals</Text>
              </View>
              <Text style={s.trustCardBody}>
                • Keep 80% of every visit you complete{'\n'}
                • Choose your own hours around hospital shifts{'\n'}
                • Only accept visits near you (3 to 30 km radius)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Controls Bar */}
      <View style={s.footer}>
        {/* Pagination Dots */}
        <View style={s.dotsRow}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => {
            const isActive = i === activeIndex;
            return (
              <Pressable
                key={i}
                onPress={() => goToSlide(i)}
                style={({ pressed }) => [
                  s.dotTouch,
                  pressed && s.pressed,
                ]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${i + 1}`}
              >
                <View style={[s.dot, isActive && s.dotActive]} />
              </Pressable>
            );
          })}
        </View>

        {/* Action Buttons: Back + Next/Get Started */}
        <View style={s.actionRow}>
          {activeIndex > 0 && (
            <Pressable
              style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Previous slide"
            >
              <Icon name="chevronLeft" size={20} color={colors.ink} />
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              s.nextBtn,
              activeIndex > 0 && s.nextBtnExpanded,
              pressed && s.pressed,
            ]}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Get started' : 'Next slide'}
          >
            <Text style={s.nextBtnText}>
              {isLast ? 'Get started' : 'Next'}
            </Text>
            <Icon
              name={isLast ? 'check' : 'arrowRight'}
              size={18}
              color="#FFFFFF"
              strokeWidth={2.4}
            />
          </Pressable>
        </View>
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
    width: '100%',
    maxWidth: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    width: '100%',
    zIndex: 10,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImg: {
    width: 32,
    height: 32,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  skipPlaceholder: {
    width: 50,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  carousel: {
    flex: 1,
    width: '100%',
  },
  carouselContent: {
    alignItems: 'center',
  },
  slide: {
    flex: 1,
    maxWidth: '100%',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  slideInner: {
    width: '100%',
    gap: 12,
    justifyContent: 'center',
  },
  badge: {
    marginBottom: 2,
  },
  slideTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  brandHighlight: {
    color: colors.brand600,
  },
  slideSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
    marginBottom: 4,
  },
  /* Booking Preview Card */
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(18, 98, 226, 0.08)',
      },
      default: {
        shadowColor: colors.brand600,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardTextWrap: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  bookingTime: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  proInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand700,
  },
  proMeta: {
    flex: 1,
  },
  proName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  proExp: {
    fontSize: 11,
    color: colors.muted,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  rupeeIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.success,
  },
  /* Pills */
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brand50,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.brand100,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand700,
  },
  /* Services Grid */
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  serviceItem: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  serviceTexts: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  serviceDesc: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  noticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand50,
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  noticeStripText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand700,
  },
  /* Steps List */
  stepsList: {
    gap: 10,
    marginTop: 4,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  /* Trust Cards */
  trustCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  trustCardPro: {
    borderColor: colors.successBorder,
    backgroundColor: '#FAFCFA',
  },
  trustCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  trustCardBody: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  /* Footer Controls */
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: 16,
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dotTouch: {
    padding: 4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.brand600,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  backBtn: {
    width: 50,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  nextBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.brand600,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(18, 98, 226, 0.25)',
      },
      default: {
        shadowColor: colors.brand600,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  nextBtnExpanded: {
    flex: 1,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
