import { Redirect, Tabs } from 'expo-router';
import { TabBar, type TabSpec } from '@/components/tab-bar';
import { useProProfile, useRequests } from '@/features/pro/api';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api';
import { neutral } from '@/theme/tokens';

export default function ProTabs() {
  const t = useT();
  const profile = useProProfile();
  const ready = profile.data?.verification_status === 'approved' && !!profile.data.is_accepting_bookings;
  const requests = useRequests(ready);

  // M4: an account without a professional profile finishes onboarding first.
  if (profile.error instanceof ApiError && profile.error.status === 404) return <Redirect href="/onboard" />;

  const tabs: TabSpec[] = [
    { name: 'dashboard', label: t('tabs.home'), icon: 'home' },
    { name: 'requests', label: t('tabs.requests'), icon: 'clipboard', badge: requests.data?.length || undefined },
    { name: 'visits', label: t('tabs.visits'), icon: 'calendar' },
    { name: 'earnings', label: t('tabs.earnings'), icon: 'wallet' },
    { name: 'profile', label: t('tabs.profile'), icon: 'account' },
  ];
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} tabs={tabs} />}
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, animation: 'none', sceneStyle: { backgroundColor: neutral.background } }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="requests" />
      <Tabs.Screen name="visits" />
      <Tabs.Screen name="earnings" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
