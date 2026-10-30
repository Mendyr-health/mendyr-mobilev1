import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useAuth } from '@/providers/auth';
import { api } from '@/lib/api';
import { addressLine, dateTime, inr, statusLabel } from '@/lib/format';
import type { Address, BookingListItem, Service } from '@/lib/types';
import { colors, radii, space } from '@/constants/theme';
import { Icon, ProfessionIcon } from '@/components/icons';
import { Avatar, Badge, type BadgeTone, Button, Card, Notice, Title, Body } from '@/components/ui';

type Tab = 'home' | 'book' | 'bookings' | 'account';

const STATUS_TONES: Record<string, BadgeTone> = {
  created: 'gray',
  searching: 'amber',
  assigned: 'blue',
  confirmed: 'blue',
  en_route: 'violet',
  in_progress: 'violet',
  completed: 'green',
  cancelled: 'red',
  failed: 'red',
  no_show: 'red',
};

export default function Patient() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const qc = useQueryClient();

  const services = useQuery({
    queryKey: ['services'],
    queryFn: () => api<Service[]>('/services'),
  });

  const bookings = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api<BookingListItem[]>('/bookings?page_size=100'),
  });

  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api<Address[]>('/addresses'),
  });

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function book() {
    if (!selectedService) {
      setMessage('Please select a service first.');
      return;
    }
    if (!when) {
      setMessage('Please choose a time for the visit.');
      return;
    }
    if (!addresses.data || addresses.data.length === 0) {
      setMessage('Please add an address first in your account before booking.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const defaultAddress =
        addresses.data.find((a) => a.is_default) ?? addresses.data[0];

      await api('/bookings', {
        method: 'POST',
        body: {
          service_id: selectedService.id,
          address_id: defaultAddress.id,
          scheduled_start_at: new Date(when).toISOString(),
          patient_notes: null,
        },
      });

      setMessage('Booking requested! We are matching you with a professional nearby.');
      qc.invalidateQueries({ queryKey: ['bookings'] });
      setTab('bookings');
      setSelectedService(null);
      setWhen('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Booking could not be created.');
    } finally {
      setBusy(false);
    }
  }

  const activeBookings = (bookings.data ?? []).filter(
    (b) => !['completed', 'cancelled', 'failed'].includes(b.status),
  );

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Avatar name={user?.full_name ?? 'User'} size={38} />
          <View>
            <Text style={s.headerGreeting}>
              Hello, {user?.full_name?.split(' ')[0] ?? 'there'}
            </Text>
            <Text style={s.headerSub}>What care do you need?</Text>
          </View>
        </View>

        <Pressable
          onPress={() => setTab('book')}
          style={({ pressed }) => [s.headerAction, pressed && s.pressed]}
        >
          <Icon name="plus" size={16} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={s.headerActionText}>Book</Text>
        </Pressable>
      </View>

      {/* Main Tab Content */}
      <View style={s.content}>
        {tab === 'home' && (
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Bookings Card if any */}
            {activeBookings.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Upcoming visits</Text>
                  <Pressable onPress={() => setTab('bookings')}>
                    <Text style={s.sectionLink}>View all</Text>
                  </Pressable>
                </View>

                {activeBookings.slice(0, 2).map((b) => (
                  <Card key={b.id} style={s.bookingCard}>
                    <View style={s.bookingCardTop}>
                      <Text style={s.bookingServiceName}>
                        {b.service_name_snapshot}
                      </Text>
                      <Badge tone={STATUS_TONES[b.status] ?? 'blue'}>
                        {statusLabel(b.status)}
                      </Badge>
                    </View>
                    <View style={s.bookingMetaRow}>
                      <Icon name="clock" size={14} color={colors.muted} />
                      <Text style={s.bookingMetaText}>
                        {dateTime(b.scheduled_start_at)}
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Quick Hero Banner */}
            <View style={s.heroBanner}>
              <Badge tone="brand" icon="sparkles" style={s.heroBadge}>
                Mendyr Verified Care
              </Badge>
              <Text style={s.heroTitle}>Nurses & Caregivers at Home</Text>
              <Text style={s.heroSubtitle}>
                Verified professionals available today. Pay after the visit.
              </Text>
              <Button
                title="Book a home visit"
                onPress={() => setTab('book')}
                icon="calendar"
                style={s.heroBtn}
              />
            </View>

            {/* Services Grid */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Care we bring home</Text>
              <View style={s.servicesRow}>
                {services.isLoading ? (
                  <ActivityIndicator color={colors.brand600} />
                ) : (
                  (services.data ?? []).slice(0, 6).map((srv) => (
                    <Pressable
                      key={srv.id}
                      onPress={() => {
                        setSelectedService(srv);
                        setTab('book');
                      }}
                      style={({ pressed }) => [
                        s.serviceTile,
                        pressed && s.pressed,
                      ]}
                    >
                      <ProfessionIcon
                        type={srv.required_professional_type}
                        size={40}
                        iconSize={20}
                      />
                      <Text style={s.serviceTileName} numberOfLines={2}>
                        {srv.name}
                      </Text>
                      <Text style={s.serviceTilePrice}>
                        {inr(srv.base_price)}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          </ScrollView>
        )}

        {tab === 'book' && (
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Title>Book a home visit</Title>
            <Body muted>Pay after the visit. All times in India time (IST).</Body>

            {message ? (
              <Notice tone={message.includes('requested') ? 'success' : 'error'}>
                {message}
              </Notice>
            ) : null}

            {/* Step 1: Select Service */}
            <Text style={s.fieldHeading}>1. Choose a service</Text>
            {services.isLoading ? (
              <ActivityIndicator color={colors.brand600} />
            ) : (
              <View style={s.servicesList}>
                {(services.data ?? []).map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <Pressable
                      key={srv.id}
                      onPress={() => setSelectedService(srv)}
                      style={({ pressed }) => [
                        s.serviceSelectCard,
                        isSelected && s.serviceSelectCardActive,
                        pressed && s.pressed,
                      ]}
                    >
                      <ProfessionIcon
                        type={srv.required_professional_type}
                        size={38}
                        iconSize={19}
                      />
                      <View style={s.serviceSelectContent}>
                        <Text style={s.serviceSelectName}>{srv.name}</Text>
                        <Text style={s.serviceSelectMeta}>
                          {srv.duration_minutes} mins · Verified clinician
                        </Text>
                      </View>
                      <View style={s.serviceSelectRight}>
                        <Text style={s.serviceSelectPrice}>
                          {inr(srv.base_price)}
                        </Text>
                        <Text style={s.gstLabel}>+ GST</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Step 2: Time Selection */}
            <Text style={s.fieldHeading}>2. Choose time</Text>
            <Button
              title={
                when
                  ? `Scheduled: ${new Date(when).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}`
                  : 'Select soonest available slot (in 2 hours)'
              }
              variant={when ? 'secondary' : 'outline'}
              icon="clock"
              onPress={() => {
                const soonest = new Date(Date.now() + 2 * 60 * 60 * 1000);
                setWhen(soonest.toISOString());
              }}
            />

            {/* Step 3: Address Selection */}
            <Text style={s.fieldHeading}>3. Service address</Text>
            {addresses.data && addresses.data.length > 0 ? (
              <Card style={s.addressCard}>
                <View style={s.addressRow}>
                  <Icon name="pin" size={18} color={colors.brand600} />
                  <View style={s.addressTexts}>
                    <Text style={s.addressLabel}>
                      {addresses.data[0].label || 'Home'}
                    </Text>
                    <Text style={s.addressDetails}>
                      {addressLine(addresses.data[0])}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <Notice tone="warning">
                No address found. Please add your home address first in the Account tab.
              </Notice>
            )}

            {/* Confirm CTA */}
            <Button
              title="Confirm & request booking"
              onPress={book}
              loading={busy}
              size="lg"
              icon="check"
              style={s.confirmBtn}
            />
          </ScrollView>
        )}

        {tab === 'bookings' && (
          <View style={s.tabWrapper}>
            <Title style={s.screenHeading}>Your bookings</Title>
            {bookings.isLoading ? (
              <ActivityIndicator color={colors.brand600} style={s.loader} />
            ) : (
              <FlatList
                data={bookings.data ?? []}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.scrollContainer}
                ListEmptyComponent={
                  <Notice tone="info">
                    No bookings yet. Pick a service above to book your first home healthcare visit.
                  </Notice>
                }
                renderItem={({ item }) => (
                  <Card style={s.bookingItemCard}>
                    <View style={s.bookingCardTop}>
                      <Text style={s.bookingServiceName}>
                        {item.service_name_snapshot}
                      </Text>
                      <Badge tone={STATUS_TONES[item.status] ?? 'gray'}>
                        {statusLabel(item.status)}
                      </Badge>
                    </View>

                    <View style={s.bookingMetaRow}>
                      <Icon name="clock" size={14} color={colors.muted} />
                      <Text style={s.bookingMetaText}>
                        {dateTime(item.scheduled_start_at)}
                      </Text>
                    </View>

                    <View style={s.bookingFooterRow}>
                      <Text style={s.bookingPrice}>
                        {inr(item.total_amount)}
                      </Text>
                      {item.professional_name ? (
                        <View style={s.proAssignedChip}>
                          <Icon name="user" size={13} color={colors.brand700} />
                          <Text style={s.proAssignedText}>
                            {item.professional_name}
                          </Text>
                        </View>
                      ) : (
                        <Text style={s.findingProText}>Matching caregiver…</Text>
                      )}
                    </View>
                  </Card>
                )}
              />
            )}
          </View>
        )}

        {tab === 'account' && (
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Title>Account</Title>

            {/* Profile Summary Card */}
            <Card style={s.profileCard}>
              <Avatar name={user?.full_name ?? 'User'} size={52} />
              <View style={s.profileDetails}>
                <Text style={s.profileName}>{user?.full_name}</Text>
                <Text style={s.profileEmail}>{user?.email}</Text>
                <Text style={s.profilePhone}>{user?.phone_number}</Text>
              </View>
            </Card>

            {/* Saved Addresses */}
            <Text style={s.fieldHeading}>Saved addresses</Text>
            {addresses.data && addresses.data.length > 0 ? (
              addresses.data.map((a) => (
                <Card key={a.id} style={s.addressCard}>
                  <View style={s.addressRow}>
                    <Icon name="pin" size={18} color={colors.brand600} />
                    <View style={s.addressTexts}>
                      <Text style={s.addressLabel}>{a.label}</Text>
                      <Text style={s.addressDetails}>{addressLine(a)}</Text>
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <Notice tone="info">
                No addresses saved yet. Addresses can be added via the web portal or during checkout.
              </Notice>
            )}

            {/* Logout CTA */}
            <Button
              title="Log out"
              variant="outline"
              icon="logout"
              onPress={async () => {
                await logout();
                router.replace('/login');
              }}
              style={s.logoutBtn}
            />
          </ScrollView>
        )}
      </View>

      {/* Bottom Tabs */}
      <View style={s.bottomTabBar}>
        <Pressable
          onPress={() => setTab('home')}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="heart"
            size={20}
            color={tab === 'home' ? colors.brand600 : colors.muted}
          />
          <Text
            style={[
              s.tabLabel,
              tab === 'home' && s.tabLabelActive,
            ]}
          >
            Home
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab('book')}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="calendar"
            size={20}
            color={tab === 'book' ? colors.brand600 : colors.muted}
          />
          <Text
            style={[
              s.tabLabel,
              tab === 'book' && s.tabLabelActive,
            ]}
          >
            Book
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab('bookings')}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="list"
            size={20}
            color={tab === 'bookings' ? colors.brand600 : colors.muted}
          />
          <Text
            style={[
              s.tabLabel,
              tab === 'bookings' && s.tabLabelActive,
            ]}
          >
            Visits
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab('account')}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="user"
            size={20}
            color={tab === 'account' ? colors.brand600 : colors.muted}
          />
          <Text
            style={[
              s.tabLabel,
              tab === 'account' && s.tabLabelActive,
            ]}
          >
            Account
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  headerSub: {
    fontSize: 12,
    color: colors.muted,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand600,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  tabWrapper: {
    flex: 1,
    paddingTop: 12,
  },
  screenHeading: {
    paddingHorizontal: space.md,
    marginBottom: 12,
  },
  scrollContainer: {
    padding: space.md,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand600,
  },
  heroBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.brand200,
    padding: 16,
    gap: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  heroBtn: {
    marginTop: 6,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceTile: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  serviceTileName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  serviceTilePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand600,
  },
  fieldHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 4,
  },
  servicesList: {
    gap: 8,
  },
  serviceSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  serviceSelectCardActive: {
    borderColor: colors.brand600,
    backgroundColor: colors.brand50,
  },
  serviceSelectContent: {
    flex: 1,
  },
  serviceSelectName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  serviceSelectMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  serviceSelectRight: {
    alignItems: 'flex-end',
  },
  serviceSelectPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  gstLabel: {
    fontSize: 10,
    color: colors.muted,
  },
  addressCard: {
    padding: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressTexts: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  addressDetails: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  confirmBtn: {
    marginTop: 12,
  },
  bookingCard: {
    padding: 14,
    gap: 8,
  },
  bookingItemCard: {
    padding: 14,
    gap: 10,
  },
  bookingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bookingServiceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    flex: 1,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingMetaText: {
    fontSize: 13,
    color: colors.muted,
  },
  bookingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  bookingPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  proAssignedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brand50,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proAssignedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand700,
  },
  findingProText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  profileDetails: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.muted,
  },
  profilePhone: {
    fontSize: 13,
    color: colors.muted,
  },
  logoutBtn: {
    marginTop: 16,
  },
  loader: {
    marginTop: 32,
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: space.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  tabLabelActive: {
    color: colors.brand600,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});
