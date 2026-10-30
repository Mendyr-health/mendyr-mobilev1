import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useAuth } from '@/providers/auth';
import { api } from '@/lib/api';
import { dateTime, inr, statusLabel } from '@/lib/format';
import type { BookingRequest, ProBooking, ProfessionalProfile } from '@/lib/types';
import { colors, radii, space } from '@/constants/theme';
import { Icon, ProfessionIcon } from '@/components/icons';
import { Avatar, Badge, Button, Card, Notice, Title, Body } from '@/components/ui';
import {
  ProNotificationBanner,
  requestNotificationPermission,
} from '@/components/pro-notification-banner';

type Tab = 'home' | 'requests' | 'bookings' | 'profile';
type BookingFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function Pro() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ['pro'],
    queryFn: () => api<ProfessionalProfile>('/professionals/me'),
  });

  const requests = useQuery({
    queryKey: ['requests'],
    queryFn: () => api<BookingRequest[]>('/bookings/professional/requests'),
    refetchInterval: 5000,
  });

  const bookings = useQuery({
    queryKey: ['pro-bookings'],
    queryFn: () => api<ProBooking[]>('/bookings/professional/mine?page_size=100'),
    refetchInterval: 5000,
  });

  const [msg, setMsg] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');
  const [togglingAccepting, setTogglingAccepting] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(true);

  // Currently opened visit detail
  const [selectedBooking, setSelectedBooking] = useState<ProBooking | null>(null);

  // Visit action states
  const [actionBusy, setActionBusy] = useState<'start' | 'complete' | 'release' | null>(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [vitalsRecorded, setVitalsRecorded] = useState('');

  const isVerified = profile.data?.verification_status === 'approved';

  // Check Web/PWA Notification Permission
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableSystemNotifications = async () => {
    const granted = await requestNotificationPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      Alert.alert(
        'System Notifications Active! 🔔',
        'You will now get alerts outside the app on your device when bookings are requested or cancelled.',
      );
    }
  };

  // Keep selectedBooking in sync when bookings refetches (e.g. if patient cancels)
  useEffect(() => {
    if (selectedBooking && bookings.data) {
      const latest = bookings.data.find((b) => b.id === selectedBooking.id);
      if (
        latest &&
        (latest.status !== selectedBooking.status ||
          latest.completed_at !== selectedBooking.completed_at)
      ) {
        setSelectedBooking(latest);
      }
    }
  }, [bookings.data, selectedBooking]);

  // Toggle accepting incoming requests
  async function handleToggleAccepting(newValue: boolean) {
    setTogglingAccepting(true);
    try {
      await api<ProfessionalProfile>('/professionals/me', {
        method: 'PATCH',
        body: { is_accepting_bookings: newValue },
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['pro'] }),
        qc.invalidateQueries({ queryKey: ['requests'] }),
      ]);
      Alert.alert(
        newValue ? 'Requests Turned On' : 'Requests Paused',
        newValue
          ? 'You are now live and accepting visit requests near you!'
          : 'You have paused incoming visit requests.',
      );
    } catch (e) {
      Alert.alert('Unable to update', e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setTogglingAccepting(false);
    }
  }

  // Handle incoming notification banner click
  const handleViewNotificationRequest = (_request: BookingRequest) => {
    setTab('requests');
  };

  const handleViewNotificationBooking = (booking: ProBooking) => {
    setSelectedBooking(booking);
    setTab('bookings');
  };

  // Dial patient phone
  const handleCallPatient = (phone: string) => {
    if (!phone) {
      Alert.alert('Phone number unavailable', 'No phone number provided for this patient.');
      return;
    }
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const url = `tel:${cleanPhone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to open dialer', `Please dial ${phone} manually.`);
    });
  };

  // Open location in Google Maps / Navigation
  const handleOpenGoogleMaps = (lat: number, lng: number, addressTitle?: string) => {
    if (!lat || !lng) {
      Alert.alert('Coordinates unavailable', 'No GPS location coordinates for this visit.');
      return;
    }
    const label = encodeURIComponent(addressTitle || 'Patient Visit');
    const url = Platform.select({
      ios: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });

    Linking.openURL(url).catch(() => {
      // Fallback directly to universal web maps
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {
        Alert.alert('Unable to open Google Maps', 'Please check your internet connection.');
      });
    });
  };

  // Accept a new visit request
  async function accept(id: string) {
    setAcceptingId(id);
    setMsg('');
    try {
      await api(`/bookings/${id}/accept`, { method: 'POST' });
      setMsg('Visit accepted! It is now in your active bookings list.');
      qc.invalidateQueries({ queryKey: ['requests'] });
      const updatedBookings = await qc.fetchQuery({
        queryKey: ['pro-bookings'],
        queryFn: () => api<ProBooking[]>('/bookings/professional/mine?page_size=100'),
      });
      // Find the newly accepted booking and open it immediately
      const accepted = updatedBookings.find((b) => b.id === id);
      if (accepted) {
        setSelectedBooking(accepted);
      }
      setTab('bookings');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Unable to accept request.');
    } finally {
      setAcceptingId(null);
    }
  }

  // Start the visit (Check-in)
  async function handleStartVisit(bookingId: string) {
    setActionBusy('start');
    try {
      const updated = await api<ProBooking>(`/bookings/${bookingId}/check-in`, {
        method: 'POST',
      });
      setSelectedBooking(updated);
      qc.invalidateQueries({ queryKey: ['pro-bookings'] });
      Alert.alert('Visit Started', 'You have checked in at the patient’s home.');
    } catch (e) {
      Alert.alert('Could not start visit', e instanceof Error ? e.message : 'Failed to check-in.');
    } finally {
      setActionBusy(null);
    }
  }

  // Mark visit completed (Check-out)
  async function handleCompleteVisit(bookingId: string) {
    setActionBusy('complete');
    try {
      const updated = await api<ProBooking>(`/bookings/${bookingId}/check-out`, {
        method: 'POST',
        body: {
          visit_summary_notes: visitNotes.trim() || null,
          vitals_recorded: vitalsRecorded.trim() || null,
        },
      });
      setSelectedBooking(updated);
      qc.invalidateQueries({ queryKey: ['pro-bookings'] });
      qc.invalidateQueries({ queryKey: ['pro'] });
      Alert.alert(
        'Visit Completed! 🎉',
        `Visit marked as completed. Payout earned: ${inr(updated.earning_amount)}`,
      );
      setVisitNotes('');
      setVitalsRecorded('');
    } catch (e) {
      Alert.alert('Could not complete visit', e instanceof Error ? e.message : 'Failed to complete.');
    } finally {
      setActionBusy(null);
    }
  }

  // Release booking (Can't make it)
  async function handleReleaseVisit(bookingId: string) {
    Alert.alert(
      'Release Visit',
      'Are you sure you cannot attend this visit? It will be re-assigned to another professional.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            setActionBusy('release');
            try {
              await api(`/bookings/${bookingId}/release`, { method: 'POST' });
              qc.invalidateQueries({ queryKey: ['pro-bookings'] });
              setSelectedBooking(null);
              Alert.alert('Booking Released', 'The visit has been handed back.');
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not release visit.');
            } finally {
              setActionBusy(null);
            }
          },
        },
      ],
    );
  }

  // Filter bookings
  const allBookings = bookings.data ?? [];
  const filteredBookings = allBookings.filter((b) => {
    if (bookingFilter === 'upcoming') {
      return ['assigned', 'confirmed', 'en_route', 'in_progress'].includes(b.status);
    }
    if (bookingFilter === 'completed') {
      return b.status === 'completed';
    }
    if (bookingFilter === 'cancelled') {
      return ['cancelled', 'no_show', 'failed'].includes(b.status);
    }
    return true;
  });

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Floating In-App Live Notification Banner for New Requests & Cancellations */}
      <ProNotificationBanner
        requests={requests.data}
        bookings={bookings.data}
        onViewRequest={handleViewNotificationRequest}
        onViewBooking={handleViewNotificationBooking}
      />

      {/* Header bar */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Avatar name={user?.full_name ?? 'Pro'} size={38} />
          <View>
            <Text style={s.headerGreeting}>
              {user?.full_name?.split(' ')[0] ?? 'Professional'}
            </Text>
            <Text style={s.headerSub}>
              {profile.data?.professional_type?.replace(/_/g, ' ') ?? 'Healthcare Pro'}
            </Text>
          </View>
        </View>

        <Badge tone={isVerified ? 'green' : 'amber'}>
          {isVerified ? 'Verified Pro' : 'Under Review'}
        </Badge>
      </View>

      {/* Main Content Area */}
      <View style={s.content}>
        {/* DETAIL VIEW: When a specific booking is selected */}
        {selectedBooking ? (
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Back Nav Button */}
            <Pressable
              onPress={() => setSelectedBooking(null)}
              style={({ pressed }) => [s.backToVisitsBtn, pressed && s.pressed]}
            >
              <Icon name="chevronLeft" size={18} color={colors.ink} />
              <Text style={s.backToVisitsText}>Back to all visits</Text>
            </Pressable>

            {/* Visit Title Card */}
            <View style={s.visitHeroCard}>
              <View style={s.visitHeroTop}>
                <View style={s.visitHeroLeft}>
                  <Text style={s.visitHeroTitle}>
                    {selectedBooking.service_name}
                  </Text>
                  <Text style={s.visitHeroCode}>
                    Booking #{selectedBooking.booking_code}
                  </Text>
                </View>
                <Badge
                  tone={
                    selectedBooking.status === 'completed'
                      ? 'green'
                      : selectedBooking.status === 'in_progress'
                      ? 'violet'
                      : selectedBooking.status === 'cancelled'
                      ? 'red'
                      : 'blue'
                  }
                >
                  {statusLabel(selectedBooking.status)}
                </Badge>
              </View>

              <View style={s.earningBox}>
                <Icon name="rupee" size={16} color={colors.success} />
                <Text style={s.earningBoxText}>
                  Your payout: {inr(selectedBooking.earning_amount)}
                </Text>
              </View>
            </View>

            {selectedBooking.status === 'cancelled' && (
              <Notice tone="error">
                The patient cancelled this booking. No visit or travel is required.
              </Notice>
            )}

            {/* PATIENT CONTACT CARD */}
            <Card style={s.patientDetailCard}>
              <View style={s.cardSectionHeader}>
                <Icon name="user" size={18} color={colors.brand600} />
                <Text style={s.cardSectionTitle}>Patient Information</Text>
              </View>

              <View style={s.patientInfoRow}>
                <Avatar name={selectedBooking.patient_name || 'Patient'} size={48} />
                <View style={s.patientMetaTexts}>
                  <Text style={s.patientNameText}>
                    {selectedBooking.patient_name}
                  </Text>
                  <Text style={s.patientPhoneText}>
                    {selectedBooking.patient_phone}
                  </Text>
                </View>

                {/* Call Button: Opens Dialer */}
                <Pressable
                  onPress={() => handleCallPatient(selectedBooking.patient_phone)}
                  style={({ pressed }) => [s.callActionBtn, pressed && s.pressed]}
                >
                  <Icon name="phone" size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={s.callActionText}>Call</Text>
                </Pressable>
              </View>
            </Card>

            {/* LOCATION & GOOGLE MAPS NAVIGATION CARD */}
            <Card style={s.locationDetailCard}>
              <View style={s.cardSectionHeader}>
                <Icon name="pin" size={18} color={colors.brand600} />
                <Text style={s.cardSectionTitle}>Visit Address & Location</Text>
              </View>

              <Text style={s.addressText}>{selectedBooking.address}</Text>

              {selectedBooking.landmark ? (
                <Text style={s.landmarkText}>
                  Landmark: {selectedBooking.landmark}
                </Text>
              ) : null}

              {selectedBooking.instructions ? (
                <View style={s.instructionsBox}>
                  <Text style={s.instructionsText}>
                    &quot;{selectedBooking.instructions}&quot;
                  </Text>
                </View>
              ) : null}

              {/* Google Maps Navigation Button */}
              <Pressable
                onPress={() =>
                  handleOpenGoogleMaps(
                    selectedBooking.latitude,
                    selectedBooking.longitude,
                    selectedBooking.patient_name,
                  )
                }
                style={({ pressed }) => [s.mapsActionBtn, pressed && s.pressed]}
              >
                <Icon name="pin" size={18} color="#FFFFFF" />
                <Text style={s.mapsActionText}>Open in Google Maps Navigation</Text>
              </Pressable>
            </Card>

            {/* SCHEDULE TIME CARD */}
            <Card style={s.timingCard}>
              <View style={s.timingRow}>
                <Icon name="clock" size={18} color={colors.muted} />
                <View style={s.timingTexts}>
                  <Text style={s.timingLabel}>Scheduled Appointment</Text>
                  <Text style={s.timingValue}>
                    {dateTime(selectedBooking.scheduled_start_at)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* PATIENT CLINICAL NOTES */}
            {selectedBooking.patient_notes ? (
              <Card style={s.notesCard}>
                <Text style={s.notesTitle}>Patient Notes</Text>
                <Text style={s.notesBody}>{selectedBooking.patient_notes}</Text>
              </Card>
            ) : null}

            {/* VISIT WORKFLOW ACTIONS */}
            {['assigned', 'confirmed', 'en_route'].includes(selectedBooking.status) && (
              <Card style={s.actionsCard}>
                <Text style={s.actionsTitle}>Visit Actions</Text>
                <Text style={s.actionsSubtitle}>
                  Tap &quot;Start visit&quot; when you reach the patient&apos;s home.
                </Text>

                <View style={s.actionButtonsRow}>
                  <Button
                    title="Start visit (Check-in)"
                    onPress={() => handleStartVisit(selectedBooking.id)}
                    loading={actionBusy === 'start'}
                    icon="check"
                    style={s.flexButton}
                  />

                  <Button
                    title="Can't make it"
                    variant="outline"
                    onPress={() => handleReleaseVisit(selectedBooking.id)}
                    loading={actionBusy === 'release'}
                    style={s.releaseButton}
                  />
                </View>
              </Card>
            )}

            {/* IN-PROGRESS FORM: Complete Visit */}
            {selectedBooking.status === 'in_progress' && (
              <Card style={s.completeVisitCard}>
                <Text style={s.completeVisitTitle}>Complete Visit</Text>
                <Text style={s.completeVisitSub}>
                  Record clinical summary notes and patient vitals before finishing.
                </Text>

                <View style={s.formFields}>
                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>Visit summary notes</Text>
                    <TextInput
                      style={s.notesInput}
                      placeholder="e.g. Wound cleaned and dressed with sterile gauze. Patient comfortable."
                      value={visitNotes}
                      onChangeText={setVisitNotes}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>Recorded vitals</Text>
                    <TextInput
                      style={s.vitalsInput}
                      placeholder="e.g. BP 120/80, SpO2 98%, Pulse 74, Temp 98.4°F"
                      value={vitalsRecorded}
                      onChangeText={setVitalsRecorded}
                    />
                  </View>

                  <Button
                    title="Mark visit completed"
                    onPress={() => handleCompleteVisit(selectedBooking.id)}
                    loading={actionBusy === 'complete'}
                    icon="check"
                    size="lg"
                  />
                </View>
              </Card>
            )}

            {/* COMPLETED CARD */}
            {selectedBooking.status === 'completed' && (
              <Card style={s.completedSummaryCard}>
                <View style={s.completedTop}>
                  <Icon name="checkCircle" size={20} color={colors.success} />
                  <Text style={s.completedTitle}>Visit Successfully Completed</Text>
                </View>
                {selectedBooking.completed_at ? (
                  <Text style={s.completedTime}>
                    Finished on {dateTime(selectedBooking.completed_at)}
                  </Text>
                ) : null}
                {selectedBooking.visit_summary_notes ? (
                  <View style={s.recordedNotesBox}>
                    <Text style={s.recordedNotesLabel}>Recorded notes:</Text>
                    <Text style={s.recordedNotesText}>
                      {selectedBooking.visit_summary_notes}
                    </Text>
                  </View>
                ) : null}
              </Card>
            )}
          </ScrollView>
        ) : tab === 'home' ? (
          /* OVERVIEW TAB */
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Card: Explaining "Under Review" clearly */}
            {!isVerified ? (
              <Card style={s.reviewCard}>
                <View style={s.reviewHeaderRow}>
                  <View style={s.reviewIconBox}>
                    <Icon name="clock" size={20} color={colors.warning} />
                  </View>
                  <View style={s.reviewHeaderText}>
                    <Text style={s.reviewTitle}>Credentials Under Clinical Review</Text>
                    <Text style={s.reviewStatus}>Verification Pending</Text>
                  </View>
                </View>

                <Text style={s.reviewExplanation}>
                  Your council registration / license number and clinical credentials are being verified by Mendyr&apos;s Clinical Operations team.
                </Text>

                <Pressable
                  onPress={() => setShowReviewDetails(!showReviewDetails)}
                  style={s.reviewToggle}
                >
                  <Icon
                    name={showReviewDetails ? 'x' : 'info'}
                    size={14}
                    color={colors.brand700}
                  />
                  <Text style={s.reviewToggleText}>
                    {showReviewDetails
                      ? 'Hide details'
                      : 'Why is my profile under review?'}
                  </Text>
                </Pressable>

                {showReviewDetails && (
                  <View style={s.reviewDetailsBox}>
                    <Text style={s.reviewDetailPoint}>
                      • Mendyr strictly verifies all nurses, physiotherapists, and caretakers to protect patient safety.
                    </Text>
                    <Text style={s.reviewDetailPoint}>
                      • Review usually takes 2–4 business hours.
                    </Text>
                    <Text style={s.reviewDetailPoint}>
                      • Once approved, your status becomes &quot;Verified Pro&quot; and you can immediately accept home visits.
                    </Text>
                  </View>
                )}
              </Card>
            ) : (
              <Card style={s.verifiedCard}>
                <View style={s.verifiedRow}>
                  <Icon name="checkCircle" size={20} color={colors.success} />
                  <View style={s.verifiedTexts}>
                    <Text style={s.verifiedTitle}>You are a Verified Professional</Text>
                    <Text style={s.verifiedDesc}>
                      Your credentials are approved. You can accept visit requests near you.
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Live Accepting Requests Toggle Card */}
            <Card style={s.acceptingToggleCard}>
              <View style={s.acceptingToggleTexts}>
                <View style={s.acceptingStatusDotRow}>
                  <View
                    style={[
                      s.statusDot,
                      {
                        backgroundColor: profile.data?.is_accepting_bookings
                          ? colors.success
                          : colors.muted,
                      },
                    ]}
                  />
                  <Text style={s.acceptingToggleTitle}>
                    {profile.data?.is_accepting_bookings
                      ? 'Accepting new requests'
                      : 'Not accepting new requests'}
                  </Text>
                </View>
                <Text style={s.acceptingToggleDesc}>
                  {profile.data?.is_accepting_bookings
                    ? 'Requests near you, inside your timings, show up in Requests.'
                    : 'Turn this on when you are ready to take visits.'}
                </Text>
              </View>
              <Switch
                value={profile.data?.is_accepting_bookings ?? false}
                onValueChange={handleToggleAccepting}
                disabled={togglingAccepting}
                trackColor={{ false: colors.border, true: colors.brand600 }}
                thumbColor="#FFFFFF"
              />
            </Card>

            {/* Outside-the-App Notification Permission Banner */}
            {Platform.OS === 'web' && !hasNotificationPermission && (
              <Card style={s.permissionBannerCard}>
                <View style={s.permissionBannerRow}>
                  <View style={s.permissionIconWrap}>
                    <Icon name="sparkles" size={18} color={colors.brand600} />
                  </View>
                  <View style={s.permissionBannerTexts}>
                    <Text style={s.permissionBannerTitle}>Get Alerts Outside The App</Text>
                    <Text style={s.permissionBannerSub}>
                      Receive lock-screen alerts & chimes even when your phone or browser is in the background.
                    </Text>
                  </View>
                  <Button
                    title="Enable"
                    size="sm"
                    onPress={handleEnableSystemNotifications}
                  />
                </View>
              </Card>
            )}

            {/* Profession summary tile */}
            {profile.data?.professional_type && (
              <Card style={s.proSummaryCard}>
                <View style={s.proSummaryRow}>
                  <ProfessionIcon
                    type={profile.data.professional_type}
                    size={44}
                    iconSize={22}
                  />
                  <View style={s.proSummaryTexts}>
                    <Text style={s.proSummaryName}>
                      {profile.data.professional_type.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    <Text style={s.proSummaryExp}>
                      {profile.data.years_of_experience} years clinical experience
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Earnings / Platform Share Banner */}
            <View style={s.shareBanner}>
              <Badge tone="green" icon="rupee">
                80% Payout Share
              </Badge>
              <Text style={s.shareTitle}>Keep 80% of every home visit</Text>
              <Text style={s.shareSubtitle}>
                You receive direct payouts after every completed visit. No upfront listing fees.
              </Text>
            </View>

            {/* Metrics Grid */}
            <View style={s.metricsRow}>
              <Card style={s.metricCard}>
                <Text style={s.metricValue}>
                  {profile.data?.total_visits_completed ?? 0}
                </Text>
                <Text style={s.metricLabel}>Visits completed</Text>
              </Card>

              <Card style={s.metricCard}>
                <View style={s.ratingRow}>
                  <Text style={s.metricValue}>
                    {profile.data?.average_rating?.toFixed(1) ?? '—'}
                  </Text>
                  <Icon name="star" size={18} color="#EAB308" />
                </View>
                <Text style={s.metricLabel}>
                  {profile.data?.total_ratings ?? 0} reviews
                </Text>
              </Card>
            </View>

            {/* Travel Radius Card */}
            <Card style={s.infoCard}>
              <View style={s.infoCardRow}>
                <Icon name="pin" size={20} color={colors.brand600} />
                <View style={s.infoCardTexts}>
                  <Text style={s.infoCardTitle}>Service Area Radius</Text>
                  <Text style={s.infoCardDesc}>
                    Visits within {profile.data?.service_radius_km ?? 15} km of your registered location
                  </Text>
                </View>
              </View>
            </Card>

            {/* Requests CTA */}
            <Button
              title={`View Open Requests (${requests.data?.length ?? 0})`}
              onPress={() => setTab('requests')}
              icon="arrowRight"
              iconRight
              size="lg"
            />
          </ScrollView>
        ) : tab === 'requests' ? (
          /* REQUESTS TAB */
          <View style={s.tabWrapper}>
            <View style={s.requestsHeaderBar}>
              <View style={s.requestsHeaderTexts}>
                <Title>Requests near you</Title>
                <Body muted>
                  Visits inside your {profile.data?.service_radius_km ?? 15} km travel radius.
                </Body>
              </View>
              <Pressable
                onPress={() => requests.refetch()}
                style={({ pressed }) => [s.refreshIconBtn, pressed && s.pressed]}
                accessibilityLabel="Refresh requests"
              >
                <Icon
                  name="refresh"
                  size={18}
                  color={requests.isFetching ? colors.brand600 : colors.muted}
                />
              </Pressable>
            </View>

            {/* Paused Requests Warning Card */}
            {profile.data && !profile.data.is_accepting_bookings && (
              <View style={s.noticeWrap}>
                <Card style={s.pausedWarningCard}>
                  <View style={s.pausedWarningRow}>
                    <Icon name="info" size={20} color={colors.warning} />
                    <View style={s.pausedWarningTexts}>
                      <Text style={s.pausedWarningTitle}>Requests are paused</Text>
                      <Text style={s.pausedWarningSub}>
                        Turn on requests to start receiving nearby patient bookings.
                      </Text>
                    </View>
                    <Switch
                      value={false}
                      onValueChange={handleToggleAccepting}
                      disabled={togglingAccepting}
                      trackColor={{ false: colors.border, true: colors.brand600 }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </Card>
              </View>
            )}

            {/* Verification Pending Notice */}
            {!isVerified && (
              <View style={s.noticeWrap}>
                <Notice tone="warning">
                  Your profile is under clinical review. Patient requests become visible as soon as your council credentials are approved by our team.
                </Notice>
              </View>
            )}

            {msg ? (
              <View style={s.noticeWrap}>
                <Notice tone={msg.includes('accepted') ? 'success' : 'error'}>
                  {msg}
                </Notice>
              </View>
            ) : null}

            {requests.isLoading ? (
              <ActivityIndicator color={colors.brand600} style={s.loader} />
            ) : (
              <FlatList
                data={requests.data ?? []}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.scrollContainer}
                ListEmptyComponent={
                  <Card style={s.emptyRequestsCard}>
                    <View style={s.emptyRequestsHeader}>
                      <View style={s.emptyClockIconWrap}>
                        <Icon name="clock" size={22} color={colors.brand600} />
                      </View>
                      <Text style={s.emptyRequestsTitle}>No open requests right now</Text>
                      <Text style={s.emptyRequestsSub}>
                        Auto-checking every 5s. As soon as a patient books near you, an alert will sound and pop up.
                      </Text>
                    </View>

                    <View style={s.diagnosticList}>
                      <Text style={s.diagnosticListTitle}>Things that decide what you see:</Text>

                      <View style={s.diagnosticItem}>
                        <Icon
                          name={profile.data?.is_accepting_bookings ? 'check' : 'info'}
                          size={16}
                          color={profile.data?.is_accepting_bookings ? colors.success : colors.warning}
                        />
                        <Text style={s.diagnosticItemText}>
                          {profile.data?.is_accepting_bookings
                            ? "You're accepting new requests"
                            : "You've paused new requests — switch it on above"}
                        </Text>
                      </View>

                      <View style={s.diagnosticItem}>
                        <Icon
                          name={isVerified ? 'check' : 'info'}
                          size={16}
                          color={isVerified ? colors.success : colors.warning}
                        />
                        <Text style={s.diagnosticItemText}>
                          {isVerified
                            ? 'Verification status: Approved'
                            : 'Verification status: Under Review (Backend activates requests upon approval)'}
                        </Text>
                      </View>

                      <View style={s.diagnosticItem}>
                        <Icon name="check" size={16} color={colors.success} />
                        <Text style={s.diagnosticItemText}>
                          Matching profession:{' '}
                          {profile.data?.professional_type
                            ? profile.data.professional_type.replace(/_/g, ' ')
                            : 'Healthcare Specialist'}
                        </Text>
                      </View>

                      <View style={s.diagnosticItem}>
                        <Icon name="check" size={16} color={colors.success} />
                        <Text style={s.diagnosticItemText}>
                          Travel radius: Visits within {profile.data?.service_radius_km ?? 15} km
                        </Text>
                      </View>
                    </View>

                    <Button
                      title={requests.isFetching ? 'Refreshing...' : 'Check now'}
                      variant="outline"
                      icon="refresh"
                      onPress={() => requests.refetch()}
                      loading={requests.isFetching}
                      size="sm"
                      style={s.manualRefreshBtn}
                    />
                  </Card>
                }
                renderItem={({ item }) => (
                  <Card style={s.requestCard}>
                    <View style={s.requestTopRow}>
                      <Text style={s.requestService}>{item.service_name}</Text>
                      <View style={s.earningBadge}>
                        <Icon name="rupee" size={13} color={colors.success} />
                        <Text style={s.earningBadgeText}>
                          Earn {inr(item.earning_amount)}
                        </Text>
                      </View>
                    </View>

                    <View style={s.requestMetaRow}>
                      <Icon name="pin" size={14} color={colors.muted} />
                      <Text style={s.requestMetaText}>
                        {item.area} · {item.distance_km.toFixed(1)} km away
                      </Text>
                    </View>

                    <View style={s.requestMetaRow}>
                      <Icon name="clock" size={14} color={colors.muted} />
                      <Text style={s.requestMetaText}>
                        {dateTime(item.scheduled_start_at)}
                      </Text>
                    </View>

                    {item.patient_notes ? (
                      <View style={s.patientNotesBox}>
                        <Text style={s.patientNotesText}>
                          &quot;{item.patient_notes}&quot;
                        </Text>
                      </View>
                    ) : null}

                    <Button
                      title="Accept visit"
                      onPress={() => accept(item.id)}
                      loading={acceptingId === item.id}
                      icon="check"
                      style={s.acceptBtn}
                    />
                  </Card>
                )}
              />
            )}
          </View>
        ) : tab === 'bookings' ? (
          /* YOUR VISITS TAB (Interactive List) */
          <View style={s.tabWrapper}>
            <View style={s.requestsHeaderBar}>
              <View style={s.requestsHeaderTexts}>
                <Title>Your visits</Title>
                <Body muted>Tap on any visit to see patient details, call, or open Google Maps.</Body>
              </View>
              <Pressable
                onPress={() => bookings.refetch()}
                style={({ pressed }) => [s.refreshIconBtn, pressed && s.pressed]}
                accessibilityLabel="Refresh visits"
              >
                <Icon
                  name="refresh"
                  size={18}
                  color={bookings.isFetching ? colors.brand600 : colors.muted}
                />
              </Pressable>
            </View>

            <View style={s.screenHeadingWrap}>
              {/* Filter Chips */}
              <View style={s.filterChipsRow}>
                {(['all', 'upcoming', 'completed', 'cancelled'] as BookingFilter[]).map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setBookingFilter(f)}
                    style={[
                      s.filterChip,
                      bookingFilter === f && s.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.filterChipText,
                        bookingFilter === f && s.filterChipTextActive,
                      ]}
                    >
                      {f === 'all'
                        ? `All (${allBookings.length})`
                        : f === 'upcoming'
                        ? 'Upcoming'
                        : f === 'completed'
                        ? 'Completed'
                        : 'Cancelled'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {bookings.isLoading ? (
              <ActivityIndicator color={colors.brand600} style={s.loader} />
            ) : (
              <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.scrollContainer}
                ListEmptyComponent={
                  <Notice tone="info">
                    {bookingFilter === 'cancelled'
                      ? 'No cancelled visits.'
                      : `You have no ${bookingFilter !== 'all' ? bookingFilter : ''} visits yet. Accept open requests from the Requests tab to start taking visits.`}
                  </Notice>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedBooking(item)}
                    style={({ pressed }) => [s.bookingRowTouch, pressed && s.pressed]}
                  >
                    <Card style={s.bookingCardInteractive}>
                      <View style={s.requestTopRow}>
                        <Text style={s.requestService}>{item.service_name}</Text>
                        <Badge
                          tone={
                            item.status === 'completed'
                              ? 'green'
                              : item.status === 'in_progress'
                              ? 'violet'
                              : item.status === 'cancelled'
                              ? 'red'
                              : 'blue'
                          }
                        >
                          {statusLabel(item.status)}
                        </Badge>
                      </View>

                      {item.status === 'cancelled' && (
                        <View style={s.cancelledBannerMini}>
                          <Icon name="x" size={13} color="#DC2626" strokeWidth={2.4} />
                          <Text style={s.cancelledBannerMiniText}>The patient cancelled this booking</Text>
                        </View>
                      )}

                      <View style={s.requestMetaRow}>
                        <Icon name="clock" size={14} color={colors.muted} />
                        <Text style={s.requestMetaText}>
                          {dateTime(item.scheduled_start_at)}
                        </Text>
                      </View>

                      <View style={s.requestMetaRow}>
                        <Icon name="user" size={14} color={colors.brand600} />
                        <Text style={s.bookingPatientName}>
                          {item.patient_name}
                        </Text>
                      </View>

                      <View style={s.requestMetaRow}>
                        <Icon name="pin" size={14} color={colors.muted} />
                        <Text style={s.requestMetaText} numberOfLines={1}>
                          {item.address}
                        </Text>
                      </View>

                      <View style={s.bookingFooterInteractive}>
                        <Text style={s.bookingEarningText}>
                          Payout: {inr(item.earning_amount)}
                        </Text>
                        <View style={s.viewDetailsHint}>
                          <Text style={s.viewDetailsText}>Open details</Text>
                          <Icon name="chevronRight" size={14} color={colors.brand600} />
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                )}
              />
            )}
          </View>
        ) : (
          /* PROFILE TAB */
          <ScrollView
            contentContainerStyle={s.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            <Title>Professional Profile</Title>

            <Card style={s.profileCard}>
              <Avatar name={user?.full_name ?? 'Pro'} size={52} />
              <View style={s.profileDetails}>
                <Text style={s.profileName}>{user?.full_name}</Text>
                <Text style={s.profileSpecialty}>
                  {profile.data?.professional_type
                    ?.replace(/_/g, ' ')
                    .toUpperCase() ?? 'NURSE'}
                </Text>
                <Text style={s.profileExp}>
                  {profile.data?.years_of_experience ?? 0} years experience
                </Text>
              </View>
            </Card>

            <Card style={s.profileMetaCard}>
              <View style={s.profileMetaRow}>
                <Text style={s.metaKey}>Verification</Text>
                <Badge tone={isVerified ? 'green' : 'amber'}>
                  {isVerified ? 'Approved' : 'Under Review'}
                </Badge>
              </View>
              <View style={s.profileMetaRow}>
                <Text style={s.metaKey}>Profession</Text>
                <Text style={s.metaValue}>
                  {profile.data?.professional_type?.replace(/_/g, ' ') ?? 'Nurse'}
                </Text>
              </View>
              <View style={s.profileMetaRow}>
                <Text style={s.metaKey}>Email</Text>
                <Text style={s.metaValue}>{user?.email}</Text>
              </View>
              <View style={s.profileMetaRow}>
                <Text style={s.metaKey}>Phone</Text>
                <Text style={s.metaValue}>{user?.phone_number}</Text>
              </View>
              <View style={s.profileMetaRow}>
                <Text style={s.metaKey}>Travel Radius</Text>
                <Text style={s.metaValue}>
                  {profile.data?.service_radius_km ?? 10} km
                </Text>
              </View>
              <View style={s.profileMetaRow}>
                <Text style={s.metaKey}>Accepting Requests</Text>
                <Switch
                  value={profile.data?.is_accepting_bookings ?? false}
                  onValueChange={handleToggleAccepting}
                  disabled={togglingAccepting}
                  trackColor={{ false: colors.border, true: colors.brand600 }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={s.profileMetaRow}>
                <Text style={s.metaKey}>Payout Share</Text>
                <Text style={s.metaValue}>80% (Mendyr 20%)</Text>
              </View>
            </Card>

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
            setSelectedBooking(null);
            setTab('home');
          }}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="activity"
            size={20}
            color={tab === 'home' && !selectedBooking ? colors.brand600 : colors.muted}
          />
          <Text
            style={[
              s.tabLabel,
              tab === 'home' && !selectedBooking && s.tabLabelActive,
            ]}
          >
            Overview
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setSelectedBooking(null);
            setTab('requests');
          }}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="clock"
            size={20}
            color={tab === 'requests' && !selectedBooking ? colors.brand600 : colors.muted}
          />
          <Text
            style={[
              s.tabLabel,
              tab === 'requests' && !selectedBooking && s.tabLabelActive,
            ]}
          >
            Requests
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setTab('bookings');
          }}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="calendar"
            size={20}
            color={tab === 'bookings' || selectedBooking ? colors.brand600 : colors.muted}
          />
          <Text
            style={[
              s.tabLabel,
              (tab === 'bookings' || selectedBooking) && s.tabLabelActive,
            ]}
          >
            Visits
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setSelectedBooking(null);
            setTab('profile');
          }}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="user"
            size={20}
            color={tab === 'profile' && !selectedBooking ? colors.brand600 : colors.muted}
          />
          <Text
            style={[
              s.tabLabel,
              tab === 'profile' && !selectedBooking && s.tabLabelActive,
            ]}
          >
            Profile
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
    textTransform: 'capitalize',
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
    gap: 6,
  },
  noticeWrap: {
    paddingHorizontal: space.md,
    paddingTop: 10,
  },
  scrollContainer: {
    padding: space.md,
    gap: 16,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  filterChip: {
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
  filterChipActive: {
    backgroundColor: colors.brand600,
    borderColor: colors.brand600,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bookingRowTouch: {
    width: '100%',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  bookingCardInteractive: {
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
  },
  bookingPatientName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  bookingFooterInteractive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  viewDetailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand600,
  },
  /* Visit Detail View Styles */
  backToVisitsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  backToVisitsText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  visitHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  visitHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  visitHeroLeft: {
    flex: 1,
  },
  visitHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  visitHeroCode: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  earningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  earningBoxText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.success,
  },
  patientDetailCard: {
    padding: 16,
    gap: 14,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientMetaTexts: {
    flex: 1,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  patientPhoneText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  callActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  callActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  locationDetailCard: {
    padding: 16,
    gap: 10,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.ink,
  },
  landmarkText: {
    fontSize: 13,
    color: colors.muted,
  },
  instructionsBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    padding: 8,
  },
  instructionsText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.muted,
  },
  mapsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand600,
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: 6,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  mapsActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timingCard: {
    padding: 14,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timingTexts: {
    flex: 1,
  },
  timingLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  timingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 1,
  },
  notesCard: {
    padding: 14,
    gap: 6,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  notesBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSecondary,
  },
  actionsCard: {
    padding: 16,
    gap: 8,
  },
  actionsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  actionsSubtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  flexButton: {
    flex: 2,
  },
  releaseButton: {
    flex: 1,
  },
  completeVisitCard: {
    padding: 16,
    gap: 10,
  },
  completeVisitTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  completeVisitSub: {
    fontSize: 12,
    color: colors.muted,
  },
  formFields: {
    gap: 12,
    marginTop: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
    minHeight: 70,
  },
  vitalsInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
    height: 48,
  },
  completedSummaryCard: {
    padding: 16,
    gap: 8,
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  completedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
  },
  completedTime: {
    fontSize: 12,
    color: colors.inkSecondary,
  },
  recordedNotesBox: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: colors.successBorder,
    gap: 2,
  },
  recordedNotesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  recordedNotesText: {
    fontSize: 13,
    color: colors.inkSecondary,
  },
  /* Existing Styles */
  reviewCard: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  reviewStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  reviewExplanation: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSecondary,
  },
  reviewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  reviewToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand700,
  },
  reviewDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  reviewDetailPoint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  verifiedCard: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    padding: 14,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verifiedTexts: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.success,
  },
  verifiedDesc: {
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 2,
  },
  proSummaryCard: {
    padding: 14,
  },
  proSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proSummaryTexts: {
    flex: 1,
  },
  proSummaryName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  proSummaryExp: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  shareBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.successBorder,
    padding: 16,
    gap: 6,
  },
  shareTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  shareSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoCard: {
    padding: 14,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCardTexts: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  infoCardDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  requestCard: {
    padding: 16,
    gap: 10,
  },
  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  requestService: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    flex: 1,
  },
  earningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBg,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  earningBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  requestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestMetaText: {
    fontSize: 13,
    color: colors.muted,
    flex: 1,
  },
  patientNotesBox: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
  },
  patientNotesText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.muted,
  },
  acceptBtn: {
    marginTop: 4,
  },
  bookingEarningText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.success,
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
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  profileSpecialty: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand600,
  },
  profileExp: {
    fontSize: 12,
    color: colors.muted,
  },
  profileMetaCard: {
    padding: 16,
    gap: 12,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metaKey: {
    fontSize: 13,
    color: colors.muted,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  logoutBtn: {
    marginTop: 16,
  },
  loader: {
    marginTop: 32,
  },
  acceptingToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  acceptingToggleTexts: {
    flex: 1,
    gap: 4,
  },
  acceptingStatusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  acceptingToggleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  acceptingToggleDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  requestsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: 12,
  },
  requestsHeaderTexts: {
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
  pausedWarningCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    padding: 14,
  },
  pausedWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pausedWarningTexts: {
    flex: 1,
    gap: 2,
  },
  pausedWarningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  pausedWarningSub: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  emptyRequestsCard: {
    padding: 20,
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  emptyRequestsHeader: {
    alignItems: 'center',
    gap: 8,
  },
  emptyClockIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyRequestsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  emptyRequestsSub: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
  },
  diagnosticList: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  diagnosticListTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  diagnosticItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  diagnosticItemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkSecondary,
  },
  manualRefreshBtn: {
    alignSelf: 'center',
    marginTop: 4,
  },
  permissionBannerCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    padding: 14,
  },
  permissionBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBannerTexts: {
    flex: 1,
    gap: 2,
  },
  permissionBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  permissionBannerSub: {
    fontSize: 11,
    lineHeight: 16,
    color: '#3B82F6',
  },
  cancelledBannerMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  cancelledBannerMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
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
