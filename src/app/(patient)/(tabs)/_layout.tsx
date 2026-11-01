import { Tabs } from 'expo-router';
import { TabBar, type TabSpec } from '@/components/tab-bar';
import { useBookings } from '@/features/booking/api';
import { isActive } from '@/features/booking/status';
import { useT } from '@/i18n';
import { neutral } from '@/theme/tokens';

export default function PatientTabs() {
  const t = useT();
  const bookings = useBookings();
  const live = bookings.data?.filter((b) => isActive(b.status)).length ?? 0;
  const tabs: TabSpec[] = [
    { name: 'home', label: t('tabs.home'), icon: 'home' },
    { name: 'bookings', label: t('tabs.bookings'), icon: 'calendar', badge: live || undefined },
    { name: 'account', label: t('tabs.account'), icon: 'account' },
  ];
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} tabs={tabs} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        animation: 'none',
        sceneStyle: { backgroundColor: neutral.background },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
