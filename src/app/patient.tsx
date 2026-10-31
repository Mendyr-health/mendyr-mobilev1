import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useAuth } from '@/providers/auth';
import { api } from '@/lib/api';
import {
  addressLine,
  dateTime,
  inr,
  statusLabel,
  istDateKey,
  istIso,
  slotLabel,
  MARKET_TZ,
  toE164India,
  isValidIndianMobile,
  displayPhone,
} from '@/lib/format';
import { getCurrentDeviceLocation } from '@/lib/location';
import { hasColdSplashShown, markColdSplashShown } from '@/lib/splash';
import type { Address, Booking, BookingListItem, Service, User } from '@/lib/types';
import { colors, radii, space } from '@/constants/theme';
import { Icon, ProfessionIcon } from '@/components/icons';
import { Avatar, Badge, type BadgeTone, Button, Card, Notice, Title, Body } from '@/components/ui';

type Tab = 'home' | 'book' | 'bookings' | 'account';

const TAB_REASSURANCES: Record<Tab, { title: string; subtitle: string }> = {
  home: {
    title: "We are with you, don't worry",
    subtitle: 'Dedicated healthcare specialists ready to support you at home.',
  },
  book: {
    title: "We are with you, don't worry",
    subtitle: 'Connecting you with verified doctors, nurses & caregivers.',
  },
  bookings: {
    title: "We are with you, don't worry",
    subtitle: 'Fetching your care visits and verified specialist updates.',
  },
  account: {
    title: "We are with you, don't worry",
    subtitle: 'Securing your healthcare profile and medical preferences.',
  },
};

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

const FIRST_SLOT_HOUR = 6;
const LAST_SLOT_HOUR = 22;
const LEAD_MINUTES = 60; // earliest bookable time is 60 minutes from now
const DAYS_SHOWN = 14;

const BOOKING_SLOTS = Array.from(
  { length: (LAST_SLOT_HOUR - FIRST_SLOT_HOUR) * 2 + 1 },
  (_, i) => {
    const minutes = FIRST_SLOT_HOUR * 60 + i * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  },
);

function slotsFor(dateKey: string, now: Date): string[] {
  const earliest = now.getTime() + LEAD_MINUTES * 60_000;
  return BOOKING_SLOTS.filter((slot) => new Date(istIso(dateKey, slot)).getTime() >= earliest);
}

function buildDates(now: Date) {
  const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: MARKET_TZ, weekday: 'short' });
  const day = new Intl.DateTimeFormat('en-IN', { timeZone: MARKET_TZ, day: 'numeric' });
  const month = new Intl.DateTimeFormat('en-IN', { timeZone: MARKET_TZ, month: 'short' });
  return Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const date = new Date(now.getTime() + i * 86_400_000);
    return {
      key: istDateKey(date),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday.format(date),
      day: day.format(date),
      month: month.format(date),
    };
  });
}

export default function Patient() {
  const { user, setUser, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const qc = useQueryClient();

  const services = useQuery({
    queryKey: ['services'],
    queryFn: () => api<Service[]>('/services'),
  });

  const bookings = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api<BookingListItem[]>('/bookings?page_size=100'),
    refetchInterval: 5000,
  });

  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api<Address[]>('/addresses'),
  });

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // Date and slot selection state
  const [now] = useState(() => new Date());
  const dates = useMemo(() => buildDates(now), [now]);

  // Default to today if slots remaining, otherwise tomorrow
  const defaultDateKey = useMemo(() => {
    return dates.find((d) => slotsFor(d.key, now).length > 0)?.key ?? dates[1].key;
  }, [dates, now]);

  const [pickedDate, setPickedDate] = useState<string>(defaultDateKey);
  const activeSlots = useMemo(() => slotsFor(pickedDate, now), [pickedDate, now]);

  // Selected time slot (e.g. "10:30")
  const [pickedTime, setPickedTime] = useState<string | null>(null);

  // Exact ISO string carrying +05:30 IST offset
  const scheduledAt = pickedTime ? istIso(pickedDate, pickedTime) : null;

  // Selected address ID
  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null);

  // Patient clinical notes
  const [notes, setNotes] = useState('');

  // Profile update state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.full_name ?? '');
  const [profilePhone, setProfilePhone] = useState(
    user?.phone_number ? user.phone_number.replace(/^\+91/, '') : '',
  );
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Sync profile fields when user changes
  useEffect(() => {
    if (user && !isEditingProfile) {
      setProfileName(user.full_name ?? '');
      setProfilePhone(user.phone_number ? user.phone_number.replace(/^\+91/, '') : '');
      setProfileEmail(user.email ?? '');
    }
  }, [user, isEditingProfile]);

  // Address creation and edit state
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('Home');
  const [newAddressLine1, setNewAddressLine1] = useState('');
  const [newAddressLine2, setNewAddressLine2] = useState('');
  const [newAddressLandmark, setNewAddressLandmark] = useState('');
  const [newAddressCity, setNewAddressCity] = useState('Bengaluru');
  const [newAddressState, setNewAddressState] = useState('Karnataka');
  const [newAddressPincode, setNewAddressPincode] = useState('');
  const [newAddressIsDefault, setNewAddressIsDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);

  // Cancellation state
  const CANCEL_REASONS = [
    'Change of plans',
    'Booked by mistake',
    'Patient feeling better',
    'Need a different time',
    'Caregiver took too long',
    'Other reason',
  ];
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);

  // Patient opened booking detail
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const bookingDetail = useQuery({
    queryKey: ['booking-detail', selectedBookingId],
    queryFn: () => (selectedBookingId ? api<Booking>(`/bookings/${selectedBookingId}`) : null),
    enabled: !!selectedBookingId,
    refetchInterval: 5000,
  });

  // Tab transition state (< 0.5s calming medical screen)
  const [transitionTargetTab, setTransitionTargetTab] = useState<Tab | null>(null);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const tabTransitionFade = useRef(new Animated.Value(0)).current;
  const tabPulseAnim = useRef(new Animated.Value(1)).current;
  const tabProgressAnim = useRef(new Animated.Value(0)).current;
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cold start splash state (~0.25s blue screen)
  const [showColdSplash, setShowColdSplash] = useState(() => !hasColdSplashShown());
  const coldFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showColdSplash) {
      markColdSplashShown();
      const timer = setTimeout(() => {
        Animated.timing(coldFadeAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start(() => {
          setShowColdSplash(false);
        });
      }, 260); // 0.25s
      return () => clearTimeout(timer);
    }
  }, [showColdSplash, coldFadeAnim]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const handleSwitchTab = useCallback(
    (
      targetTab: Tab,
      targetBookingId: string | null = null,
      targetService: Service | null = null,
    ) => {
      if (
        tab === targetTab &&
        selectedBookingId === targetBookingId &&
        (!targetService || selectedService?.id === targetService?.id) &&
        !isTabTransitioning
      ) {
        return;
      }

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      setTransitionTargetTab(targetTab);
      setIsTabTransitioning(true);

      tabTransitionFade.setValue(1);
      tabProgressAnim.setValue(0);
      tabPulseAnim.setValue(1);

      Animated.timing(tabProgressAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: false,
      }).start();

      Animated.sequence([
        Animated.timing(tabPulseAnim, {
          toValue: 1.15,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(tabPulseAnim, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();

      transitionTimerRef.current = setTimeout(() => {
        setTab(targetTab);
        setSelectedBookingId(targetBookingId);
        if (targetService) setSelectedService(targetService);

        Animated.timing(tabTransitionFade, {
          toValue: 0,
          duration: 90,
          useNativeDriver: true,
        }).start(() => {
          setIsTabTransitioning(false);
          setTransitionTargetTab(null);
        });
      }, 280);
    },
    [
      tab,
      selectedBookingId,
      selectedService,
      isTabTransitioning,
      tabTransitionFade,
      tabProgressAnim,
      tabPulseAnim,
    ],
  );

  const handlePickSoonest = () => {
    const earliestDay = dates.find((d) => slotsFor(d.key, now).length > 0);
    if (earliestDay) {
      setPickedDate(earliestDay.key);
      const daySlots = slotsFor(earliestDay.key, now);
      if (daySlots.length > 0) {
        setPickedTime(daySlots[0]);
      }
    }
  };

  const handleOpenEditProfile = () => {
    setProfileName(user?.full_name ?? '');
    setProfilePhone(user?.phone_number ? user.phone_number.replace(/^\+91/, '') : '');
    setProfileEmail(user?.email ?? '');
    setProfileMessage(null);
    setIsEditingProfile(true);
  };

  async function handleSaveProfile() {
    if (profileName.trim().length < 2) {
      Alert.alert('Full name required', 'Please enter your full name (at least 2 characters).');
      return;
    }
    if (!isValidIndianMobile(profilePhone)) {
      Alert.alert('Invalid phone number', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (profileEmail.trim() && !/^\S+@\S+\.\S+$/.test(profileEmail.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const updated = await api<User>('/users/me', {
        method: 'PATCH',
        body: {
          full_name: profileName.trim(),
          phone_number: toE164India(profilePhone),
          email: profileEmail.trim() || null,
        },
      });
      setUser(updated);
      setIsEditingProfile(false);
      setProfileMessage('Profile details updated successfully.');
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  function handleStartAddAddress() {
    setEditingAddressId(null);
    setNewAddressLabel('Home');
    setNewAddressLine1('');
    setNewAddressLine2('');
    setNewAddressLandmark('');
    setNewAddressCity('Bengaluru');
    setNewAddressState('Karnataka');
    setNewAddressPincode('');
    setNewAddressIsDefault((addresses.data ?? []).length === 0);
    setShowAddAddress(true);
  }

  function handleStartEditAddress(a: Address) {
    setEditingAddressId(a.id);
    setNewAddressLabel(a.label || 'Home');
    setNewAddressLine1(a.line1 || '');
    setNewAddressLine2(a.line2 || '');
    setNewAddressLandmark(a.landmark || '');
    setNewAddressCity(a.city || 'Bengaluru');
    setNewAddressState(a.state || 'Karnataka');
    setNewAddressPincode(a.pincode || '');
    setNewAddressIsDefault(a.is_default);
    setShowAddAddress(true);
  }

  function handleCancelAddressForm() {
    setShowAddAddress(false);
    setEditingAddressId(null);
  }

  async function handleSetDefaultAddress(a: Address) {
    try {
      await api(`/addresses/${a.id}`, {
        method: 'PATCH',
        body: { is_default: true },
      });
      await qc.invalidateQueries({ queryKey: ['addresses'] });
      setAddressMessage(`"${a.label}" set as default address.`);
      setTimeout(() => setAddressMessage(null), 3000);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not set default address.');
    }
  }

  function handleDeleteAddress(a: Address) {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete the "${a.label}" address?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/addresses/${a.id}`, { method: 'DELETE' });
              await qc.invalidateQueries({ queryKey: ['addresses'] });
              setAddressMessage('Address deleted.');
              setTimeout(() => setAddressMessage(null), 3000);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete address.');
            }
          },
        },
      ],
    );
  }

  async function handleUseCurrentLocation() {
    setLocatingAddress(true);
    try {
      const loc = await getCurrentDeviceLocation();
      if (loc.area) setNewAddressLine2(loc.area);
      if (loc.city) setNewAddressCity(loc.city);
      if (loc.state) setNewAddressState(loc.state);
      if (loc.pincode) setNewAddressPincode(loc.pincode);
    } catch {
      Alert.alert('GPS Notice', 'Could not detect current location.');
    } finally {
      setLocatingAddress(false);
    }
  }

  async function handleSaveNewAddress() {
    if (!newAddressLine1.trim()) {
      Alert.alert('Address required', 'Please enter Flat / House / Street details.');
      return;
    }
    if (!newAddressPincode.trim() || newAddressPincode.length < 6) {
      Alert.alert('Pincode required', 'Please enter a valid 6-digit postal pincode.');
      return;
    }
    setSavingAddress(true);
    setAddressMessage(null);
    try {
      let loc = { latitude: 12.9716, longitude: 77.5946 };
      try {
        loc = await getCurrentDeviceLocation();
      } catch {
        // Fallback default coordinates
      }

      if (editingAddressId) {
        await api<Address>(`/addresses/${editingAddressId}`, {
          method: 'PATCH',
          body: {
            label: newAddressLabel.trim(),
            line1: newAddressLine1.trim(),
            line2: newAddressLine2.trim() || null,
            landmark: newAddressLandmark.trim() || null,
            city: newAddressCity.trim(),
            state: newAddressState.trim(),
            pincode: newAddressPincode.trim(),
            is_default: newAddressIsDefault,
            location: { latitude: loc.latitude, longitude: loc.longitude },
          },
        });
        setAddressMessage('Address updated successfully.');
      } else {
        const saved = await api<Address>('/addresses', {
          method: 'POST',
          body: {
            label: newAddressLabel.trim(),
            line1: newAddressLine1.trim(),
            line2: newAddressLine2.trim() || null,
            landmark: newAddressLandmark.trim() || null,
            city: newAddressCity.trim(),
            state: newAddressState.trim(),
            pincode: newAddressPincode.trim(),
            location: { latitude: loc.latitude, longitude: loc.longitude },
            is_default: newAddressIsDefault || (addresses.data ?? []).length === 0,
          },
        });
        setPickedAddressId(saved.id);
        setAddressMessage('New address saved successfully.');
      }

      await qc.invalidateQueries({ queryKey: ['addresses'] });
      setShowAddAddress(false);
      setEditingAddressId(null);
      setNewAddressLine1('');
      setNewAddressLine2('');
      setNewAddressLandmark('');
      setNewAddressPincode('');
      setTimeout(() => setAddressMessage(null), 3000);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save address.');
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    setCancelling(true);
    try {
      await api<Booking>(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason },
      });
      setShowCancelModal(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bookings'] }),
        qc.invalidateQueries({ queryKey: ['booking-detail', bookingId] }),
        qc.invalidateQueries({ queryKey: ['pro-bookings'] }),
      ]);
      Alert.alert('Booking Cancelled', 'Your appointment has been cancelled successfully.');
    } catch (e) {
      Alert.alert(
        'Cancellation failed',
        e instanceof Error ? e.message : 'Could not cancel booking.',
      );
    } finally {
      setCancelling(false);
    }
  }

  async function book() {
    if (!selectedService) {
      setMessage('Please choose a care service in Step 1.');
      return;
    }
    if (!scheduledAt) {
      setMessage('Please select an appointment date & time slot in Step 2.');
      return;
    }
    const currentAddressList = addresses.data ?? [];
    const activeAddress =
      currentAddressList.find((a) => a.id === pickedAddressId) ??
      currentAddressList.find((a) => a.is_default) ??
      currentAddressList[0];

    if (!activeAddress) {
      setMessage('Please add your home address in Step 3 before booking.');
      setShowAddAddress(true);
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await api('/bookings', {
        method: 'POST',
        body: {
          service_id: selectedService.id,
          address_id: activeAddress.id,
          scheduled_start_at: scheduledAt,
          patient_notes: notes.trim() || null,
        },
      });

      setMessage('Booking requested! We are matching you with a professional nearby.');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bookings'] }),
        qc.invalidateQueries({ queryKey: ['pro-bookings'] }),
      ]);
      handleSwitchTab('bookings');
      setSelectedService(null);
      setPickedTime(null);
      setNotes('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Booking could not be created.');
    } finally {
      setBusy(false);
    }
  }

  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert('Phone unavailable', 'Caregiver contact number not available yet.');
      return;
    }
    const clean = phone.replace(/[\s-]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('Dialer error', `Please call ${phone} manually.`);
    });
  };

  const activeBookings = (bookings.data ?? []).filter(
    (b) => !['completed', 'cancelled', 'failed'].includes(b.status),
  );

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar style={showColdSplash ? 'light' : 'dark'} />
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
          onPress={() => {
            handleSwitchTab('book');
          }}
          style={({ pressed }) => [s.headerAction, pressed && s.pressed]}
        >
          <Icon name="plus" size={16} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={s.headerActionText}>Book</Text>
        </Pressable>
      </View>

      {/* Main Tab Content */}
      <View style={s.content}>
        {/* BOOKING DETAIL VIEW */}
        {selectedBookingId ? (
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => setSelectedBookingId(null)}
              style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
            >
              <Icon name="chevronLeft" size={18} color={colors.ink} />
              <Text style={s.backBtnText}>Back to all bookings</Text>
            </Pressable>

            {bookingDetail.isLoading ? (
              <ActivityIndicator color={colors.brand600} style={s.loader} />
            ) : bookingDetail.data ? (
              <View style={s.detailStack}>
                {/* Hero Card */}
                <Card style={s.detailHeroCard}>
                  <View style={s.detailHeroTop}>
                    <View style={s.detailHeroText}>
                      <Text style={s.detailServiceName}>
                        {bookingDetail.data.service_name_snapshot}
                      </Text>
                      <Text style={s.detailCode}>
                        Booking #{bookingDetail.data.booking_code}
                      </Text>
                    </View>
                    <Badge
                      tone={STATUS_TONES[bookingDetail.data.status] ?? 'blue'}
                    >
                      {statusLabel(bookingDetail.data.status)}
                    </Badge>
                  </View>

                  <View style={s.detailPriceRow}>
                    <Text style={s.detailPriceLabel}>Total visit amount</Text>
                    <Text style={s.detailPriceValue}>
                      {inr(bookingDetail.data.total_amount)}
                    </Text>
                  </View>
                </Card>

                {/* CAREGIVER CARD */}
                {bookingDetail.data.professional ? (
                  <Card style={s.proDetailCard}>
                    <Text style={s.sectionCardTitle}>Assigned Healthcare Professional</Text>
                    <View style={s.proInfoRow}>
                      <Avatar
                        name={bookingDetail.data.professional.full_name}
                        size={48}
                      />
                      <View style={s.proMeta}>
                        <Text style={s.proName}>
                          {bookingDetail.data.professional.full_name}
                        </Text>
                        <Text style={s.proRole}>
                          {bookingDetail.data.professional.professional_type?.replace(/_/g, ' ')} · {bookingDetail.data.professional.years_of_experience} yrs exp
                        </Text>
                        {bookingDetail.data.professional.average_rating ? (
                          <Text style={s.proRating}>
                            ★ {bookingDetail.data.professional.average_rating.toFixed(1)} rating
                          </Text>
                        ) : null}
                      </View>

                      {/* Call Caregiver Button */}
                      <Pressable
                        onPress={() =>
                          handleCall(bookingDetail.data?.professional?.phone_number ?? '')
                        }
                        style={({ pressed }) => [s.callBtn, pressed && s.pressed]}
                      >
                        <Icon name="phone" size={16} color="#FFFFFF" strokeWidth={2.4} />
                        <Text style={s.callBtnText}>Call</Text>
                      </Pressable>
                    </View>
                  </Card>
                ) : (
                  <Card style={s.searchingProCard}>
                    <Icon name="clock" size={24} color={colors.warning} />
                    <View style={s.searchingProTexts}>
                      <Text style={s.searchingProTitle}>Finding your caregiver…</Text>
                      <Text style={s.searchingProDesc}>
                        A verified professional near your area is reviewing this booking. We will notify you once accepted.
                      </Text>
                    </View>
                  </Card>
                )}

                {/* VISIT ADDRESS & TIME */}
                <Card style={s.addressDetailCard}>
                  <Text style={s.sectionCardTitle}>Visit Details</Text>
                  <View style={s.detailRow}>
                    <Icon name="clock" size={16} color={colors.muted} />
                    <Text style={s.detailRowText}>
                      {dateTime(bookingDetail.data.scheduled_start_at)}
                    </Text>
                  </View>
                  <View style={s.detailRow}>
                    <Icon name="pin" size={16} color={colors.muted} />
                    <Text style={s.detailRowText}>
                      {bookingDetail.data.address_snapshot}
                    </Text>
                  </View>
                </Card>

                {/* CANCELLED STATUS CARD */}
                {bookingDetail.data.status === 'cancelled' && (
                  <Card style={s.cancelledCard}>
                    <View style={s.cancelledHeader}>
                      <Icon name="x" size={20} color="#DC2626" strokeWidth={2.4} />
                      <Text style={s.cancelledTitle}>Booking Cancelled</Text>
                    </View>
                    <Text style={s.cancelledDesc}>
                      {bookingDetail.data.cancellation_reason
                        ? `Reason: ${bookingDetail.data.cancellation_reason}`
                        : 'This booking has been cancelled.'}
                    </Text>
                  </Card>
                )}

                {/* CANCEL BOOKING BUTTON / PANEL */}
                {bookingDetail.data &&
                  ['created', 'searching', 'assigned', 'confirmed'].includes(
                    bookingDetail.data.status,
                  ) && (
                    <Card style={s.cancelPanelCard}>
                      {!showCancelModal ? (
                        <Button
                          title="Cancel visit"
                          variant="outline"
                          onPress={() => setShowCancelModal(true)}
                        />
                      ) : (
                        <View style={s.cancelForm}>
                          <Text style={s.cancelFormTitle}>Cancel this visit?</Text>
                          <Text style={s.cancelFormSub}>Please select a reason:</Text>
                          <View style={s.cancelReasonsWrap}>
                            {CANCEL_REASONS.map((r) => (
                              <Pressable
                                key={r}
                                onPress={() => setCancelReason(r)}
                                style={[
                                  s.cancelReasonChip,
                                  cancelReason === r && s.cancelReasonChipActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    s.cancelReasonChipText,
                                    cancelReason === r && s.cancelReasonChipTextActive,
                                  ]}
                                >
                                  {r}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                          <View style={s.cancelActionButtonsRow}>
                            <Button
                              title="Yes, cancel visit"
                              onPress={() => {
                                if (bookingDetail.data) {
                                  handleCancelBooking(bookingDetail.data.id);
                                }
                              }}
                              loading={cancelling}
                              style={s.confirmCancelBtn}
                            />
                            <Button
                              title="Keep booking"
                              variant="ghost"
                              onPress={() => setShowCancelModal(false)}
                            />
                          </View>
                        </View>
                      )}
                    </Card>
                  )}

                {/* CLINICAL SUMMARY NOTES (If completed) */}
                {bookingDetail.data.visit_summary_notes && (
                  <Card style={s.summaryNotesCard}>
                    <Text style={s.sectionCardTitle}>Caregiver Visit Notes</Text>
                    <Text style={s.summaryNotesText}>
                      {bookingDetail.data.visit_summary_notes}
                    </Text>
                  </Card>
                )}
              </View>
            ) : (
              <Notice tone="error">Could not load booking details.</Notice>
            )}
          </ScrollView>
        ) : tab === 'home' ? (
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Bookings Card if any */}
            {activeBookings.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Upcoming visits</Text>
                  <Pressable onPress={() => handleSwitchTab('bookings')}>
                    <Text style={s.sectionLink}>View all</Text>
                  </Pressable>
                </View>

                {activeBookings.slice(0, 2).map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => {
                      handleSwitchTab('bookings', b.id);
                    }}
                    style={({ pressed }) => [s.bookingTouch, pressed && s.pressed]}
                  >
                    <Card style={s.bookingCard}>
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
                      <View style={s.bookingFooterRow}>
                        <Text style={s.tapToViewText}>Tap to view details & caregiver →</Text>
                      </View>
                    </Card>
                  </Pressable>
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
                onPress={() => handleSwitchTab('book')}
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
                        handleSwitchTab('book', null, srv);
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
        ) : tab === 'book' ? (
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
            <View style={s.stepSectionHeader}>
              <View style={s.stepNumberBadge}>
                <Text style={s.stepNumberText}>1</Text>
              </View>
              <View style={s.stepHeaderTexts}>
                <Text style={s.fieldHeading}>Choose a service</Text>
                <Text style={s.fieldSub}>Verified professional at home. Pay after visit.</Text>
              </View>
            </View>

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

            {/* Step 2: Date & Time Selection */}
            <View style={s.stepSectionHeader}>
              <View style={s.stepNumberBadge}>
                <Text style={s.stepNumberText}>2</Text>
              </View>
              <View style={s.stepHeaderTexts}>
                <Text style={s.fieldHeading}>Choose Date & Time</Text>
                <Text style={s.fieldSub}>Pick any date and 30-min slot in India Time (IST).</Text>
              </View>
            </View>

            {/* Quick Soonest Slot Shortcut */}
            <Pressable
              onPress={handlePickSoonest}
              style={({ pressed }) => [s.soonestShortcutBtn, pressed && s.pressed]}
            >
              <Icon name="sparkles" size={15} color={colors.brand700} />
              <Text style={s.soonestShortcutText}>
                ⚡ Select soonest available appointment
              </Text>
            </Pressable>

            {/* 14-Day Horizontal Date Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.dateStripContainer}
            >
              {dates.map((d) => {
                const daySlots = slotsFor(d.key, now);
                const isFull = daySlots.length === 0;
                const isSelected = d.key === pickedDate;

                return (
                  <Pressable
                    key={d.key}
                    disabled={isFull}
                    onPress={() => {
                      setPickedDate(d.key);
                      if (pickedTime && !daySlots.includes(pickedTime)) {
                        setPickedTime(null);
                      }
                    }}
                    style={({ pressed }) => [
                      s.dateChip,
                      isSelected && s.dateChipActive,
                      isFull && s.dateChipDisabled,
                      pressed && s.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        s.dateChipLabel,
                        isSelected && s.dateChipLabelActive,
                        isFull && s.dateChipTextDisabled,
                      ]}
                    >
                      {d.label}
                    </Text>
                    <Text
                      style={[
                        s.dateChipDay,
                        isSelected && s.dateChipDayActive,
                        isFull && s.dateChipTextDisabled,
                      ]}
                    >
                      {d.day}
                    </Text>
                    <Text
                      style={[
                        s.dateChipMonth,
                        isSelected && s.dateChipMonthActive,
                        isFull && s.dateChipTextDisabled,
                      ]}
                    >
                      {d.month}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Time Slots Grid */}
            <View style={s.slotsWrapper}>
              <Text style={s.slotsSectionTitle}>
                Available slots for{' '}
                {dates.find((d) => d.key === pickedDate)?.label === 'Today' ||
                dates.find((d) => d.key === pickedDate)?.label === 'Tomorrow'
                  ? dates.find((d) => d.key === pickedDate)?.label
                  : dates.find((d) => d.key === pickedDate)?.label +
                    ', ' +
                    dates.find((d) => d.key === pickedDate)?.day +
                    ' ' +
                    dates.find((d) => d.key === pickedDate)?.month}
                :
              </Text>

              {activeSlots.length === 0 ? (
                <Notice tone="info">
                  No slots remaining for this date. Please pick another date above.
                </Notice>
              ) : (
                <View style={s.slotsGrid}>
                  {activeSlots.map((slot) => {
                    const isSelected = slot === pickedTime;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setPickedTime(slot)}
                        style={({ pressed }) => [
                          s.slotButton,
                          isSelected && s.slotButtonActive,
                          pressed && s.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            s.slotButtonText,
                            isSelected && s.slotButtonTextActive,
                          ]}
                        >
                          {slotLabel(slot)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Selected Date & Time Preview Card */}
            {scheduledAt && (
              <Card style={s.scheduledPreviewCard}>
                <View style={s.scheduledPreviewRow}>
                  <Icon name="calendar" size={18} color={colors.brand600} />
                  <View style={s.scheduledPreviewTexts}>
                    <Text style={s.scheduledPreviewLabel}>Appointment Time</Text>
                    <Text style={s.scheduledPreviewValue}>
                      {dateTime(scheduledAt)}
                    </Text>
                  </View>
                  <Icon name="checkCircle" size={18} color={colors.success} />
                </View>
              </Card>
            )}

            {/* Step 3: Address Selection */}
            <View style={s.stepSectionHeader}>
              <View style={s.stepNumberBadge}>
                <Text style={s.stepNumberText}>3</Text>
              </View>
              <View style={s.stepHeaderTexts}>
                <Text style={s.fieldHeading}>Service address</Text>
                <Text style={s.fieldSub}>Where should the professional visit?</Text>
              </View>
            </View>

            {/* Address list */}
            {addresses.data && addresses.data.length > 0 ? (
              <View style={s.addressesList}>
                {addresses.data.map((addr) => {
                  const currentSelected =
                    (pickedAddressId ??
                      addresses.data?.find((a) => a.is_default)?.id ??
                      addresses.data?.[0]?.id) === addr.id;
                  return (
                    <Pressable
                      key={addr.id}
                      onPress={() => setPickedAddressId(addr.id)}
                      style={({ pressed }) => [
                        s.addressSelectCard,
                        currentSelected && s.addressSelectCardActive,
                        pressed && s.pressed,
                      ]}
                    >
                      <View style={s.addressRow}>
                        <Icon
                          name="pin"
                          size={18}
                          color={currentSelected ? colors.brand600 : colors.muted}
                        />
                        <View style={s.addressTexts}>
                          <View style={s.addressTitleRow}>
                            <Text style={s.addressLabel}>{addr.label}</Text>
                            {addr.is_default && (
                              <Badge tone="gray">Default</Badge>
                            )}
                          </View>
                          <Text style={s.addressDetails}>{addressLine(addr)}</Text>
                        </View>
                        <View
                          style={[
                            s.radioCircle,
                            currentSelected && s.radioCircleActive,
                          ]}
                        >
                          {currentSelected && <View style={s.radioInner} />}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* Add New Address Button / Form */}
            {!showAddAddress ? (
              <Button
                title={addresses.data?.length ? '+ Add another address' : '+ Add your home address'}
                variant="outline"
                icon="plus"
                onPress={handleStartAddAddress}
                style={s.addAddressBtn}
              />
            ) : (
              <Card style={s.newAddressCard}>
                <Text style={s.newAddressTitle}>
                  {editingAddressId ? 'Edit Address' : 'Add New Home Address'}
                </Text>

                <Pressable
                  onPress={handleUseCurrentLocation}
                  style={({ pressed }) => [s.gpsLocateBtn, pressed && s.pressed]}
                >
                  <Icon name="pin" size={16} color={colors.brand700} />
                  <Text style={s.gpsLocateBtnText}>
                    {locatingAddress ? 'Detecting GPS...' : 'Autofill with device location'}
                  </Text>
                </Pressable>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Label (Home, Work, Parents)</Text>
                  <TextInput
                    style={s.textInput}
                    value={newAddressLabel}
                    onChangeText={setNewAddressLabel}
                    placeholder="Home"
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Flat / House / Building *</Text>
                  <TextInput
                    style={s.textInput}
                    value={newAddressLine1}
                    onChangeText={setNewAddressLine1}
                    placeholder="e.g. Flat 402, Green Glen Apartments"
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Street / Area / Sector</Text>
                  <TextInput
                    style={s.textInput}
                    value={newAddressLine2}
                    onChangeText={setNewAddressLine2}
                    placeholder="e.g. 12th Main, Indiranagar"
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Landmark</Text>
                  <TextInput
                    style={s.textInput}
                    value={newAddressLandmark}
                    onChangeText={setNewAddressLandmark}
                    placeholder="e.g. Near Metro Station"
                  />
                </View>

                <View style={s.inputRow2}>
                  <View style={[s.inputGroup, { flex: 1 }]}>
                    <Text style={s.inputLabel}>City</Text>
                    <TextInput
                      style={s.textInput}
                      value={newAddressCity}
                      onChangeText={setNewAddressCity}
                      placeholder="Bengaluru"
                    />
                  </View>
                  <View style={[s.inputGroup, { flex: 1 }]}>
                    <Text style={s.inputLabel}>Pincode *</Text>
                    <TextInput
                      style={s.textInput}
                      value={newAddressPincode}
                      onChangeText={setNewAddressPincode}
                      placeholder="560038"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <View style={s.addressActionsRow}>
                  <Button
                    title={editingAddressId ? 'Update address' : 'Save address'}
                    onPress={handleSaveNewAddress}
                    loading={savingAddress}
                    icon="check"
                    style={{ flex: 1 }}
                  />
                  {addresses.data && addresses.data.length > 0 && (
                    <Button
                      title="Cancel"
                      variant="ghost"
                      onPress={handleCancelAddressForm}
                    />
                  )}
                </View>
              </Card>
            )}

            {/* Step 4: Notes for professional */}
            <View style={s.stepSectionHeader}>
              <View style={s.stepNumberBadge}>
                <Text style={s.stepNumberText}>4</Text>
              </View>
              <View style={s.stepHeaderTexts}>
                <Text style={s.fieldHeading}>Notes for the professional (optional)</Text>
                <Text style={s.fieldSub}>Any patient conditions, mobility needs, or supplies.</Text>
              </View>
            </View>

            <TextInput
              style={s.notesTextArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. 72-year-old father, dressing change after knee surgery. Bring sterile gauze and gloves."
              multiline
              numberOfLines={3}
            />

            {/* Summary card before confirm */}
            {selectedService && (
              <Card style={s.summaryCard}>
                <Text style={s.summaryTitle}>Booking Summary</Text>
                <View style={s.summaryRow}>
                  <Text style={s.summaryItemName}>{selectedService.name}</Text>
                  <Text style={s.summaryItemPrice}>{inr(selectedService.base_price)}</Text>
                </View>
                <View style={s.summaryRowSub}>
                  <Text style={s.summaryGstLabel}>Estimated GST (18%)</Text>
                  <Text style={s.summaryGstPrice}>
                    {inr(Math.round(selectedService.base_price * 0.18))}
                  </Text>
                </View>
                <View style={s.summaryTotalRow}>
                  <Text style={s.summaryTotalLabel}>Total payable after visit</Text>
                  <Text style={s.summaryTotalPrice}>
                    {inr(Math.round(selectedService.base_price * 1.18))}
                  </Text>
                </View>
              </Card>
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
        ) : tab === 'bookings' ? (
          <View style={s.tabWrapper}>
            <View style={s.bookingsHeaderBar}>
              <View style={s.headerTextsWrap}>
                <Title>Your bookings</Title>
                <Body muted>Tap on any booking to view caregiver contact and details.</Body>
              </View>
              <Pressable
                onPress={() => bookings.refetch()}
                style={({ pressed }) => [s.refreshIconBtn, pressed && s.pressed]}
                accessibilityLabel="Refresh bookings"
              >
                <Icon
                  name="refresh"
                  size={18}
                  color={bookings.isFetching ? colors.brand600 : colors.muted}
                />
              </Pressable>
            </View>

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
                  <Pressable
                    onPress={() => setSelectedBookingId(item.id)}
                    style={({ pressed }) => [s.bookingTouch, pressed && s.pressed]}
                  >
                    <Card style={s.bookingItemCard}>
                      <View style={s.bookingCardTop}>
                        <Text style={s.bookingServiceName}>
                          {item.service_name_snapshot}
                        </Text>
                        <Badge tone={STATUS_TONES[item.status] ?? 'gray'}>
                          {statusLabel(item.status)}
                        </Badge>
                      </View>

                      {item.status === 'cancelled' && (
                        <View style={s.cancelledMiniTag}>
                          <Icon name="x" size={12} color="#DC2626" strokeWidth={2.4} />
                          <Text style={s.cancelledMiniTagText}>Cancelled</Text>
                        </View>
                      )}

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

                      <View style={s.viewDetailsHintRow}>
                        <Text style={s.viewDetailsHintText}>Tap to view details & contact →</Text>
                      </View>
                    </Card>
                  </Pressable>
                )}
              />
            )}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Title>Account</Title>

            {/* Profile Update Feedback */}
            {profileMessage && (
              <View style={s.accountNotice}>
                <Notice tone="success">
                  {profileMessage}
                </Notice>
              </View>
            )}

            {/* User Profile Details Card (View Mode) */}
            {!isEditingProfile ? (
              <Card style={s.profileCard}>
                <View style={s.profileTopRow}>
                  <Avatar name={user?.full_name ?? 'User'} size={54} />
                  <View style={s.profileDetails}>
                    <Text style={s.profileName}>{user?.full_name || 'Mendyr Patient'}</Text>
                    <Badge tone="blue" style={s.roleBadge}>Patient Account</Badge>
                  </View>
                  <Pressable
                    onPress={handleOpenEditProfile}
                    style={({ pressed }) => [s.editProfileIconBtn, pressed && s.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile"
                  >
                    <Icon name="edit" size={15} color={colors.brand600} />
                    <Text style={s.editProfileIconBtnText}>Edit</Text>
                  </Pressable>
                </View>

                <View style={s.profileDivider} />

                <View style={s.profileInfoStack}>
                  <View style={s.profileInfoRow}>
                    <Icon name="phone" size={16} color={colors.muted} />
                    <Text style={s.profileInfoLabel}>Mobile:</Text>
                    <Text style={s.profileInfoValue}>
                      {displayPhone(user?.phone_number ?? '')}
                    </Text>
                  </View>

                  <View style={s.profileInfoRow}>
                    <Icon name="mail" size={16} color={colors.muted} />
                    <Text style={s.profileInfoLabel}>Email:</Text>
                    <Text style={s.profileInfoValue}>
                      {user?.email || 'No email provided'}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              /* User Profile Details Form (Edit Mode) */
              <Card style={s.editProfileCard}>
                <View style={s.editProfileHeader}>
                  <Text style={s.editProfileTitle}>Edit Profile Details</Text>
                  <Text style={s.editProfileSub}>
                    Update your full name, mobile number, and email address
                  </Text>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={s.textInput}
                    value={profileName}
                    onChangeText={setProfileName}
                    placeholder="Enter full name"
                    autoCapitalize="words"
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Mobile Number *</Text>
                  <View style={s.phoneInputWrap}>
                    <View style={s.phonePrefixBadge}>
                      <Text style={s.phonePrefixText}>+91</Text>
                    </View>
                    <TextInput
                      style={s.phoneTextInput}
                      value={profilePhone}
                      onChangeText={(t) => setProfilePhone(t.replace(/\D/g, ''))}
                      placeholder="10-digit mobile number"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Email Address</Text>
                  <TextInput
                    style={s.textInput}
                    value={profileEmail}
                    onChangeText={setProfileEmail}
                    placeholder="name@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={s.profileActionsRow}>
                  <Button
                    title="Save changes"
                    onPress={handleSaveProfile}
                    loading={savingProfile}
                    icon="check"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={() => setIsEditingProfile(false)}
                    disabled={savingProfile}
                  />
                </View>
              </Card>
            )}

            {/* Saved Addresses Section Header */}
            <View style={s.addressSectionHeader}>
              <Text style={s.fieldHeading}>Saved addresses</Text>
              {!showAddAddress && (
                <Button
                  title="+ Add address"
                  variant="outline"
                  size="sm"
                  onPress={handleStartAddAddress}
                />
              )}
            </View>

            {/* Address Notice */}
            {addressMessage && (
              <View style={s.accountNotice}>
                <Notice tone="info">
                  {addressMessage}
                </Notice>
              </View>
            )}

            {/* Add or Edit Address Form */}
            {showAddAddress ? (
              <Card style={s.newAddressCard}>
                <View style={s.newAddressHeaderRow}>
                  <Text style={s.newAddressTitle}>
                    {editingAddressId ? 'Edit Saved Address' : 'Add New Home Address'}
                  </Text>
                  <Pressable
                    onPress={handleCancelAddressForm}
                    hitSlop={8}
                  >
                    <Icon name="x" size={18} color={colors.muted} />
                  </Pressable>
                </View>

                {/* GPS Autofill */}
                <Pressable
                  onPress={handleUseCurrentLocation}
                  style={({ pressed }) => [s.gpsLocateBtn, pressed && s.pressed]}
                >
                  <Icon name="pin" size={16} color={colors.brand700} />
                  <Text style={s.gpsLocateBtnText}>
                    {locatingAddress ? 'Detecting GPS...' : 'Autofill with device location'}
                  </Text>
                </Pressable>

                {/* Address Label Chips */}
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Address Label</Text>
                  <View style={s.addressLabelChipsRow}>
                    {['Home', 'Work', 'Parents', 'Other'].map((lbl) => (
                      <Pressable
                        key={lbl}
                        onPress={() => setNewAddressLabel(lbl)}
                        style={[
                          s.addressLabelChip,
                          newAddressLabel.toLowerCase() === lbl.toLowerCase() &&
                            s.addressLabelChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            s.addressLabelChipText,
                            newAddressLabel.toLowerCase() === lbl.toLowerCase() &&
                              s.addressLabelChipTextActive,
                          ]}
                        >
                          {lbl}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Flat / House / Building *</Text>
                  <TextInput
                    style={s.textInput}
                    value={newAddressLine1}
                    onChangeText={setNewAddressLine1}
                    placeholder="e.g. Flat 402, Green Glen Apartments"
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Street / Area / Sector</Text>
                  <TextInput
                    style={s.textInput}
                    value={newAddressLine2}
                    onChangeText={setNewAddressLine2}
                    placeholder="e.g. 12th Main, Indiranagar"
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Landmark</Text>
                  <TextInput
                    style={s.textInput}
                    value={newAddressLandmark}
                    onChangeText={setNewAddressLandmark}
                    placeholder="e.g. Near Metro Station"
                  />
                </View>

                <View style={s.inputRow2}>
                  <View style={[s.inputGroup, { flex: 1 }]}>
                    <Text style={s.inputLabel}>City</Text>
                    <TextInput
                      style={s.textInput}
                      value={newAddressCity}
                      onChangeText={setNewAddressCity}
                      placeholder="Bengaluru"
                    />
                  </View>
                  <View style={[s.inputGroup, { flex: 1 }]}>
                    <Text style={s.inputLabel}>Pincode *</Text>
                    <TextInput
                      style={s.textInput}
                      value={newAddressPincode}
                      onChangeText={setNewAddressPincode}
                      placeholder="560038"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                {/* Default Address Checkbox */}
                <Pressable
                  onPress={() => setNewAddressIsDefault(!newAddressIsDefault)}
                  style={s.defaultCheckboxRow}
                >
                  <View
                    style={[
                      s.checkboxBox,
                      newAddressIsDefault && s.checkboxBoxChecked,
                    ]}
                  >
                    {newAddressIsDefault && (
                      <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                  <Text style={s.defaultCheckboxLabel}>Set as default delivery address</Text>
                </Pressable>

                <View style={s.addressActionsRow}>
                  <Button
                    title={editingAddressId ? 'Update address' : 'Save address'}
                    onPress={handleSaveNewAddress}
                    loading={savingAddress}
                    icon="check"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={handleCancelAddressForm}
                  />
                </View>
              </Card>
            ) : null}

            {/* Saved Addresses List */}
            {addresses.data && addresses.data.length > 0 ? (
              addresses.data.map((a) => (
                <Card key={a.id} style={s.addressCard}>
                  <View style={s.addressRow}>
                    <View style={s.addressPinWrap}>
                      <Icon name="pin" size={18} color={colors.brand600} />
                    </View>
                    <View style={s.addressTexts}>
                      <View style={s.addressTitleRow}>
                        <Text style={s.addressLabel}>{a.label}</Text>
                        {a.is_default && <Badge tone="brand">Default</Badge>}
                      </View>
                      <Text style={s.addressDetails}>{addressLine(a)}</Text>
                      {a.landmark ? (
                        <Text style={s.addressLandmarkText}>Landmark: {a.landmark}</Text>
                      ) : null}

                      {/* Address Actions Row */}
                      <View style={s.addressCardActionRow}>
                        <Pressable
                          onPress={() => handleStartEditAddress(a)}
                          style={({ pressed }) => [s.addressActionBtn, pressed && s.pressed]}
                        >
                          <Icon name="edit" size={13} color={colors.brand600} />
                          <Text style={s.addressActionBtnText}>Edit</Text>
                        </Pressable>

                        {!a.is_default && (
                          <Pressable
                            onPress={() => handleSetDefaultAddress(a)}
                            style={({ pressed }) => [s.addressActionBtn, pressed && s.pressed]}
                          >
                            <Icon name="star" size={13} color={colors.muted} />
                            <Text style={s.addressActionBtnText}>Make default</Text>
                          </Pressable>
                        )}

                        <Pressable
                          onPress={() => handleDeleteAddress(a)}
                          style={({ pressed }) => [
                            s.addressActionBtn,
                            s.addressDeleteBtn,
                            pressed && s.pressed,
                          ]}
                        >
                          <Icon name="trash" size={13} color="#DC2626" />
                          <Text style={[s.addressActionBtnText, s.addressDeleteBtnText]}>
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Card>
              ))
            ) : !showAddAddress ? (
              <Notice tone="info">
                No addresses saved yet. Add your home address to easily schedule visits.
              </Notice>
            ) : null}

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
          onPress={() => {
            handleSwitchTab('home');
          }}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="heart"
            size={20}
            color={
              (transitionTargetTab ?? tab) === 'home' && (!selectedBookingId || isTabTransitioning)
                ? colors.brand600
                : colors.muted
            }
          />
          <Text
            style={[
              s.tabLabel,
              (transitionTargetTab ?? tab) === 'home' && (!selectedBookingId || isTabTransitioning) && s.tabLabelActive,
            ]}
          >
            Home
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            handleSwitchTab('book');
          }}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="calendar"
            size={20}
            color={
              (transitionTargetTab ?? tab) === 'book' && (!selectedBookingId || isTabTransitioning)
                ? colors.brand600
                : colors.muted
            }
          />
          <Text
            style={[
              s.tabLabel,
              (transitionTargetTab ?? tab) === 'book' && (!selectedBookingId || isTabTransitioning) && s.tabLabelActive,
            ]}
          >
            Book
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            handleSwitchTab('bookings');
          }}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="list"
            size={20}
            color={
              (transitionTargetTab ?? tab) === 'bookings' || (selectedBookingId && !isTabTransitioning)
                ? colors.brand600
                : colors.muted
            }
          />
          <Text
            style={[
              s.tabLabel,
              ((transitionTargetTab ?? tab) === 'bookings' || (selectedBookingId && !isTabTransitioning)) &&
                s.tabLabelActive,
            ]}
          >
            Visits
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            handleSwitchTab('account');
          }}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="user"
            size={20}
            color={
              (transitionTargetTab ?? tab) === 'account' && (!selectedBookingId || isTabTransitioning)
                ? colors.brand600
                : colors.muted
            }
          />
          <Text
            style={[
              s.tabLabel,
              (transitionTargetTab ?? tab) === 'account' && (!selectedBookingId || isTabTransitioning) &&
                s.tabLabelActive,
            ]}
          >
            Account
          </Text>
        </Pressable>
      </View>

      {/* White Medical Tab Transition Overlay (<0.5s calming screen) */}
      {isTabTransitioning && (
        <Animated.View
          style={[
            s.tabTransitionOverlay,
            { opacity: tabTransitionFade },
          ]}
          pointerEvents="auto"
        >
          <View style={s.medicalTransitionCard}>
            {/* Pulsing Medical Heartbeat Ring */}
            <Animated.View
              style={[
                s.pulseIconWrap,
                { transform: [{ scale: tabPulseAnim }] },
              ]}
            >
              <View style={s.pulseIconInner}>
                <Icon name="heart" size={24} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </Animated.View>

            {/* Reassuring Medical Title */}
            <Text style={s.reassureTitle}>{"We are with you, don't worry"}</Text>

            {/* Contextual Healthcare Subtitle */}
            <Text style={s.reassureSub}>
              {TAB_REASSURANCES[transitionTargetTab ?? tab].subtitle}
            </Text>

            {/* Medical Trust Widgets */}
            <View style={s.trustRow}>
              <View style={s.trustBadge}>
                <Icon name="shieldCheck" size={15} color="#10B981" strokeWidth={2.2} />
                <Text style={s.trustBadgeText}>Verified Caregivers</Text>
              </View>
              <View style={s.trustDivider} />
              <View style={s.trustBadge}>
                <Icon name="activity" size={15} color="#1262E2" strokeWidth={2.2} />
                <Text style={s.trustBadgeText}>Clinical Support</Text>
              </View>
            </View>

            {/* Smooth Progress Bar */}
            <View style={s.progressBarTrack}>
              <Animated.View
                style={[
                  s.progressBarFill,
                  {
                    width: tabProgressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {/* Cold Start 0.25s Blue Screen of Mendyr */}
      {showColdSplash && (
        <Animated.View
          style={[
            s.coldSplashOverlay,
            { opacity: coldFadeAnim },
          ]}
          pointerEvents="auto"
        >
          <View style={s.coldSplashCenter}>
            <View style={s.coldSplashLogoWrap}>
              <Image
                source={require('@/assets/branding/mendyr.png')}
                style={s.coldSplashLogo}
                contentFit="contain"
              />
            </View>
            <Text style={s.coldSplashTitle}>Mendyr</Text>
            <Text style={s.coldSplashTagline}>Healthcare delivered at home</Text>
            <ActivityIndicator color="#FFFFFF" size="small" style={s.coldSplashSpinner} />
          </View>
          <View style={s.coldSplashFooter}>
            <Text style={s.coldSplashFooterText}>
              Certified Caregivers · Doorstep Support
            </Text>
          </View>
        </Animated.View>
      )}
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
  },
  screenHeadingWrap: {
    paddingHorizontal: space.md,
    paddingTop: 12,
    gap: 4,
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
  bookingTouch: {
    width: '100%',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  bookingCard: {
    padding: 14,
    gap: 8,
  },
  bookingItemCard: {
    padding: 14,
    gap: 8,
    borderWidth: 1.5,
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
  viewDetailsHintRow: {
    paddingTop: 4,
  },
  viewDetailsHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand600,
  },
  tapToViewText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand600,
  },
  accountNotice: {
    marginBottom: space.sm,
  },
  profileCard: {
    padding: space.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  editProfileIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brand50,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand200,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  editProfileIconBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.brand700,
  },
  profileDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  profileInfoStack: {
    gap: 8,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileInfoLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.muted,
    width: 60,
  },
  profileInfoValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
  },
  editProfileCard: {
    padding: space.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.brand300,
    borderRadius: radii.lg,
    gap: 12,
  },
  editProfileHeader: {
    gap: 2,
  },
  editProfileTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  editProfileSub: {
    fontSize: 12,
    color: colors.muted,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  phonePrefixBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  phonePrefixText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  phoneTextInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.ink,
  },
  profileActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  addressSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  newAddressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressLabelChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addressLabelChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  addressLabelChipActive: {
    backgroundColor: colors.brand50,
    borderColor: colors.brand600,
  },
  addressLabelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  addressLabelChipTextActive: {
    color: colors.brand700,
    fontWeight: '700',
  },
  defaultCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600,
  },
  defaultCheckboxLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  addressPinWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLandmarkText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  addressCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  addressActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  addressActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  addressDeleteBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    marginLeft: 'auto',
  },
  addressDeleteBtnText: {
    color: '#DC2626',
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
  /* Detail view styles */
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  detailStack: {
    gap: 14,
  },
  detailHeroCard: {
    padding: 16,
    gap: 12,
  },
  detailHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailHeroText: {
    flex: 1,
  },
  detailServiceName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  detailCode: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  detailPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  detailPriceLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  detailPriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  proDetailCard: {
    padding: 16,
    gap: 12,
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  proInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proMeta: {
    flex: 1,
  },
  proName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  proRole: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  proRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EAB308',
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  callBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchingProCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  searchingProTexts: {
    flex: 1,
    gap: 2,
  },
  searchingProTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  searchingProDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSecondary,
  },
  addressDetailCard: {
    padding: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailRowText: {
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  summaryNotesCard: {
    padding: 16,
    gap: 8,
    backgroundColor: colors.brand50,
    borderColor: colors.brand200,
  },
  summaryNotesText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSecondary,
  },
  cancelledCard: {
    padding: 16,
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  cancelledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelledTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  cancelledDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#991B1B',
  },
  cancelPanelCard: {
    padding: 16,
    gap: 12,
  },
  cancelForm: {
    gap: 10,
  },
  cancelFormTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  cancelFormSub: {
    fontSize: 12,
    color: colors.muted,
  },
  cancelReasonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  cancelReasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  cancelReasonChipActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  cancelReasonChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSecondary,
  },
  cancelReasonChipTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  cancelActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  confirmCancelBtn: {
    backgroundColor: '#DC2626',
  },
  bookingsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: 12,
  },
  headerTextsWrap: {
    flex: 1,
    gap: 4,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  cancelledMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  cancelledMiniTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  stepSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepHeaderTexts: {
    flex: 1,
  },
  fieldSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  soonestShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand200,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  soonestShortcutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand700,
  },
  dateStripContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  dateChip: {
    width: 66,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 2,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  dateChipActive: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600,
  },
  dateChipDisabled: {
    opacity: 0.35,
    backgroundColor: colors.surfaceSubtle,
  },
  dateChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  dateChipLabelActive: {
    color: '#E0E7FF',
    fontWeight: '700',
  },
  dateChipDay: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 22,
  },
  dateChipDayActive: {
    color: '#FFFFFF',
  },
  dateChipMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  dateChipMonthActive: {
    color: '#E0E7FF',
    fontWeight: '700',
  },
  dateChipTextDisabled: {
    color: colors.muted,
  },
  slotsWrapper: {
    gap: 10,
    marginTop: 4,
  },
  slotsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotButton: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  slotButtonActive: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600,
  },
  slotButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  slotButtonTextActive: {
    color: '#FFFFFF',
  },
  scheduledPreviewCard: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    padding: 12,
  },
  scheduledPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduledPreviewTexts: {
    flex: 1,
  },
  scheduledPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
    textTransform: 'uppercase',
  },
  scheduledPreviewValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 1,
  },
  addressesList: {
    gap: 8,
  },
  addressSelectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  addressSelectCardActive: {
    borderColor: colors.brand600,
    backgroundColor: colors.brand50,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.brand600,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand600,
  },
  addAddressBtn: {
    marginTop: 4,
  },
  newAddressCard: {
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.brand300,
  },
  newAddressTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  gpsLocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand50,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  gpsLocateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand700,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
  },
  inputRow2: {
    flexDirection: 'row',
    gap: 10,
  },
  addressActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  notesTextArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  summaryRowSub: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryGstLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  summaryGstPrice: {
    fontSize: 12,
    color: colors.muted,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  summaryTotalPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand600,
  },
  tabTransitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 56,
    backgroundColor: '#FFFFFF',
    zIndex: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  medicalTransitionCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px rgba(18, 98, 226, 0.08)',
      },
      default: {
        shadowColor: '#1262E2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
  pulseIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  pulseIconInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1262E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reassureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  reassureSub: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: space.xs,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 18,
    gap: 10,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.ink,
  },
  trustDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#EDF2F7',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 18,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1262E2',
    borderRadius: 1.5,
  },
  coldSplashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1262E2',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  coldSplashCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coldSplashLogoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  coldSplashLogo: {
    width: 60,
    height: 60,
  },
  coldSplashTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  coldSplashTagline: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  coldSplashSpinner: {
    marginTop: 8,
  },
  coldSplashFooter: {
    position: 'absolute',
    bottom: 36,
  },
  coldSplashFooterText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
