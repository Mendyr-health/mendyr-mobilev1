import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { PressableScale, Screen, Text } from '@/components/ui';
import { useConfig, useConfigState } from '@/config/provider';
import type { HomeSection } from '@/config/types';
import { defaultAddress, useAddresses } from '@/features/addresses/api';
import { useBookings } from '@/features/booking/api';
import { ActiveBookingCard } from '@/features/booking/active-booking-card';
import { useCategories, useServices } from '@/features/catalog/api';
import { BellButton } from '@/features/notifications/bell-button';
import { useInbox } from '@/features/notifications/api';
import { useRefresh } from '@/hooks/use-refresh';
import { useT, type CopyKey } from '@/i18n';
import { firstName, MARKET_TZ } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';
import { BannerCarousel } from './banners';
import { CategoriesSection } from './categories-section';
import { BookAgain, HowItWorks, SupportCard, TrustStrip } from './info-sections';

function greetingKey(): CopyKey {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: MARKET_TZ }).format(new Date()));
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 17) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function Section({ section }: { section: HomeSection }) {
  const banners = useConfig('app.banners');
  switch (section.type) {
    case 'banners':
      return <BannerCarousel items={banners.items} />;
    case 'categories':
      return <CategoriesSection title={section.title} />;
    case 'book_again':
      return <BookAgain title={section.title} />;
    case 'trust':
      return <TrustStrip />;
    case 'how_it_works':
      return <HowItWorks title={section.title} />;
    case 'support':
      return <SupportCard />;
    default:
      // `offers` (and any type a newer portal adds) has no content source yet.
      return null;
  }
}

/** Server-driven home: sections render in `app.home.sections` order. */
export function HomeScreen() {
  const t = useT();
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const home = useConfig('app.home');
  const config = useConfigState();
  const addresses = useAddresses();
  const address = defaultAddress(addresses.data);
  const refresh = useRefresh(useServices(), useCategories(), useBookings(), addresses, useInbox());

  return (
    <Screen safeTop onRefresh={() => Promise.all([refresh(), config.refresh()])}>
      <View style={s.top}>
        <View style={s.flex}>
          <Text variant="h2" numberOfLines={1}>
            {t(greetingKey(), { name: firstName(user?.full_name) })}
          </Text>
          <PressableScale
            onPress={() => router.push(address ? '/addresses' : '/address-form')}
            accessibilityLabel={address ? t('home.addressLabel', { label: address.label }) : t('home.addAddress')}
            style={s.address}
          >
            <Icon name="pin" size={14} color={c.primary} />
            <Text variant="label" color="inkSoft" numberOfLines={1} style={s.addressText}>
              {address ? `${address.label} · ${address.line1}, ${address.city}` : t('home.addAddress')}
            </Text>
            <Icon name="chevronDown" size={14} color={c.subtle} />
          </PressableScale>
        </View>
        <BellButton />
      </View>
      <ActiveBookingCard />
      {home.sections
        .filter((section) => section.enabled)
        .map((section) => (
          <Section key={section.type} section={section} />
        ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  address: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start', maxWidth: '100%' },
  addressText: { flexShrink: 1 },
});
