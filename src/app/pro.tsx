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
import { dateTime, inr, statusLabel } from '@/lib/format';
import type { BookingRequest, ProBooking, ProfessionalProfile } from '@/lib/types';
import { colors, radii, space } from '@/constants/theme';
import { Icon, ProfessionIcon } from '@/components/icons';
import { Avatar, Badge, Button, Card, Notice, Title, Body } from '@/components/ui';

type Tab = 'home' | 'requests' | 'bookings' | 'profile';

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
    refetchInterval: 15000,
  });

  const bookings = useQuery({
    queryKey: ['pro-bookings'],
    queryFn: () => api<ProBooking[]>('/bookings/professional/mine?page_size=100'),
    refetchInterval: 30000,
  });

  const [msg, setMsg] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [showReviewDetails, setShowReviewDetails] = useState(false);

  async function accept(id: string) {
    setAcceptingId(id);
    setMsg('');
    try {
      await api(`/bookings/${id}/accept`, { method: 'POST' });
      setMsg('Visit accepted! It is now in your active bookings list.');
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['pro-bookings'] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Unable to accept request.');
    } finally {
      setAcceptingId(null);
    }
  }

  const isVerified = profile.data?.verification_status === 'approved';

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
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

      {/* Main Tab Content */}
      <View style={s.content}>
        {tab === 'home' && (
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
        )}

        {tab === 'requests' && (
          <View style={s.tabWrapper}>
            <View style={s.screenHeadingWrap}>
              <Title>Requests near you</Title>
              <Body muted>Visits inside your travel radius.</Body>
            </View>

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
                  <Notice tone="info">
                    No open visit requests right now. As patients book in your area, they will appear here in real-time.
                  </Notice>
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
        )}

        {tab === 'bookings' && (
          <View style={s.tabWrapper}>
            <View style={s.screenHeadingWrap}>
              <Title>Your visits</Title>
              <Body muted>Assigned and completed home appointments.</Body>
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
                    You have no active or past bookings. Accept incoming requests from the Requests tab to start visits.
                  </Notice>
                }
                renderItem={({ item }) => (
                  <Card style={s.bookingCard}>
                    <View style={s.requestTopRow}>
                      <Text style={s.requestService}>{item.service_name}</Text>
                      <Badge tone="blue">{statusLabel(item.status)}</Badge>
                    </View>

                    <View style={s.requestMetaRow}>
                      <Icon name="clock" size={14} color={colors.muted} />
                      <Text style={s.requestMetaText}>
                        {dateTime(item.scheduled_start_at)}
                      </Text>
                    </View>

                    <View style={s.requestMetaRow}>
                      <Icon name="user" size={14} color={colors.muted} />
                      <Text style={s.requestMetaText}>
                        Patient: {item.patient_name} · {item.patient_phone}
                      </Text>
                    </View>

                    <View style={s.requestMetaRow}>
                      <Icon name="pin" size={14} color={colors.muted} />
                      <Text style={s.requestMetaText}>{item.address}</Text>
                    </View>

                    <View style={s.bookingFooter}>
                      <Text style={s.bookingEarningText}>
                        Your payout: {inr(item.earning_amount)}
                      </Text>
                    </View>
                  </Card>
                )}
              />
            )}
          </View>
        )}

        {tab === 'profile' && (
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
          onPress={() => setTab('home')}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="activity"
            size={20}
            color={tab === 'home' ? colors.brand600 : colors.muted}
          />
          <Text style={[s.tabLabel, tab === 'home' && s.tabLabelActive]}>
            Overview
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab('requests')}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="clock"
            size={20}
            color={tab === 'requests' ? colors.brand600 : colors.muted}
          />
          <Text style={[s.tabLabel, tab === 'requests' && s.tabLabelActive]}>
            Requests
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab('bookings')}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="calendar"
            size={20}
            color={tab === 'bookings' ? colors.brand600 : colors.muted}
          />
          <Text style={[s.tabLabel, tab === 'bookings' && s.tabLabelActive]}>
            Visits
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab('profile')}
          style={s.tabButton}
          accessibilityRole="button"
        >
          <Icon
            name="user"
            size={20}
            color={tab === 'profile' ? colors.brand600 : colors.muted}
          />
          <Text style={[s.tabLabel, tab === 'profile' && s.tabLabelActive]}>
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
    gap: 2,
  },
  noticeWrap: {
    paddingHorizontal: space.md,
    paddingTop: 10,
  },
  scrollContainer: {
    padding: space.md,
    gap: 16,
  },
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
  bookingCard: {
    padding: 16,
    gap: 10,
  },
  bookingFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
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
});
