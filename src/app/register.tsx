import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Button, Card, Field, Notice, Title, Body } from '@/components/ui';
import { Icon, ProfessionIcon } from '@/components/icons';
import { colors, radii, space } from '@/constants/theme';
import {
  PROFESSIONS,
  registrationLabel,
  registrationPlaceholder,
} from '@/constants/professions';
import {
  getCurrentDeviceLocation,
  DEFAULT_LOCATION,
  type LocationData,
} from '@/lib/location';
import { api } from '@/lib/api';
import type { ProfessionalType, Service } from '@/lib/types';
import { useAuth } from '@/providers/auth';

const RADIUS_OPTIONS = [5, 10, 15, 20, 30];

export default function Register() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [role, setRole] = useState<'patient' | 'professional'>('patient');

  // Common account fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Professional specific fields
  const [selectedProfession, setSelectedProfession] =
    useState<ProfessionalType>('nurse');
  const [registrationNo, setRegistrationNo] = useState('');
  const [yearsOfExp, setYearsOfExp] = useState('4');
  const [travelRadius, setTravelRadius] = useState(10);
  const [bio, setBio] = useState('');

  // Location state
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationAcquired, setLocationAcquired] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Auto-detect location on mount
  useEffect(() => {
    handleDetectLocation(false);
  }, []);

  async function handleDetectLocation(showError = true) {
    setDetectingLocation(true);
    try {
      const loc = await getCurrentDeviceLocation();
      setLocation(loc);
      setLocationAcquired(true);
    } catch {
      if (showError) {
        setError('Could not detect GPS location. Using default city location.');
      }
    } finally {
      setDetectingLocation(false);
    }
  }

  async function submit() {
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please enter your 10-digit mobile number.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (role === 'professional') {
      if (!selectedProfession) {
        setError('Please select your healthcare profession.');
        return;
      }
      if (!registrationNo.trim()) {
        setError(`Please enter your ${registrationLabel(selectedProfession)}.`);
        return;
      }
      const expNum = Number(yearsOfExp);
      if (isNaN(expNum) || expNum < 0 || expNum > 60) {
        setError('Please enter valid years of experience (0 - 60).');
        return;
      }
    }

    setBusy(true);
    setError('');

    // Normalize phone number to +91 if needed
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    const formattedPhone = cleanPhone.startsWith('+')
      ? cleanPhone
      : `+91${cleanPhone.replace(/^0+/, '')}`;

    try {
      // 1. Create User account
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone_number: formattedPhone,
        password,
        role,
      });

      // 2. Role-specific onboarding & location setup
      if (role === 'professional') {
        const isCouncil = ['nurse', 'doctor', 'physiotherapist'].includes(
          selectedProfession,
        );

        // Fetch catalogue services to auto-opt into services for this profession
        let matchingServiceIds: string[] = [];
        try {
          const allServices = await api<Service[]>('/services');
          matchingServiceIds = allServices
            .filter((s) => s.required_professional_type === selectedProfession)
            .map((s) => s.id);
        } catch {
          // services fallback
        }

        // Onboard professional with profession, credentials, location, and radius
        await api('/professionals/onboard', {
          method: 'POST',
          body: {
            professional_type: selectedProfession,
            years_of_experience: Number(yearsOfExp) || 0,
            council_registration_number: isCouncil
              ? registrationNo.trim() || null
              : null,
            license_number: isCouncil
              ? null
              : registrationNo.trim() || null,
            languages_spoken: ['English', 'Hindi'],
            bio: bio.trim() || null,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            service_radius_km: travelRadius,
            service_ids: matchingServiceIds,
          },
        });

        // Set initial weekly availability schedule (9 AM - 6 PM across all days)
        try {
          const defaultSlots = [0, 1, 2, 3, 4, 5, 6].map((day_of_week) => ({
            day_of_week,
            start_time: '09:00:00',
            end_time: '18:00:00',
          }));
          await api('/professionals/me/availability/slots', {
            method: 'PUT',
            body: defaultSlots,
          });
        } catch {
          // availability slots fallback
        }

        router.replace('/pro');
      } else {
        // Patient registration: Save default service address with coordinates
        try {
          await api('/addresses', {
            method: 'POST',
            body: {
              label: 'Home',
              line1: location.area || 'Home address',
              line2: null,
              landmark: null,
              city: location.city || 'Bengaluru',
              state: location.state || 'Karnataka',
              pincode: location.pincode || '560001',
              location: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              is_default: true,
              contact_name: fullName.trim(),
              contact_phone: formattedPhone,
              instructions_for_professional: null,
            },
          });
        } catch {
          // address creation fallback
        }

        router.replace('/patient');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Unable to complete registration. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingTop: Math.max(insets.top + 12, 24),
            paddingBottom: Math.max(insets.bottom + 16, 28),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          {/* Logo & Header */}
          <View style={s.brandRow}>
            <Image
              source={require('@/assets/branding/mendyr.png')}
              style={s.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={s.brandName}>Mendyr</Text>
              <Text style={s.brandTag}>Home healthcare, on demand</Text>
            </View>
          </View>

          <View style={s.titleWrap}>
            <Title style={s.title}>Create your account</Title>
            <Body muted style={s.subtitle}>
              {role === 'professional'
                ? 'Join our network of healthcare professionals and start earning.'
                : 'Book home visits for yourself or your family.'}
            </Body>
          </View>

          {/* Role Selector Tabs */}
          <View style={s.roleGrid}>
            <Pressable
              onPress={() => setRole('patient')}
              style={({ pressed }) => [
                s.roleCard,
                role === 'patient' && s.roleCardSelected,
                pressed && s.pressed,
              ]}
            >
              <View
                style={[
                  s.roleIconCircle,
                  role === 'patient' && s.roleIconCircleSelected,
                ]}
              >
                <Icon
                  name="heart"
                  size={18}
                  color={role === 'patient' ? '#FFFFFF' : colors.brand600}
                />
              </View>
              <View style={s.roleInfo}>
                <Text
                  style={[
                    s.roleTitle,
                    role === 'patient' && s.roleTitleSelected,
                  ]}
                >
                  I need care
                </Text>
                <Text style={s.roleDesc}>Patients & families</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setRole('professional')}
              style={({ pressed }) => [
                s.roleCard,
                role === 'professional' && s.roleCardSelected,
                pressed && s.pressed,
              ]}
            >
              <View
                style={[
                  s.roleIconCircle,
                  role === 'professional' && s.roleIconCircleSelected,
                ]}
              >
                <Icon
                  name="activity"
                  size={18}
                  color={role === 'professional' ? '#FFFFFF' : colors.brand600}
                />
              </View>
              <View style={s.roleInfo}>
                <Text
                  style={[
                    s.roleTitle,
                    role === 'professional' && s.roleTitleSelected,
                  ]}
                >
                  I am a professional
                </Text>
                <Text style={s.roleDesc}>Nurses, physios & caregivers</Text>
              </View>
            </Pressable>
          </View>

          {error ? <Notice tone="error">{error}</Notice> : null}

          {/* Section 1: Basic Information */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>1. Account Details</Text>
          </View>

          <View style={s.fields}>
            <Field
              label="Full name"
              placeholder="e.g. Priya Sharma"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (error) setError('');
              }}
              autoCapitalize="words"
            />

            <Field
              label="Mobile number"
              placeholder="98765 43210"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (error) setError('');
              }}
              keyboardType="phone-pad"
            />

            <Field
              label="Email address"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Field
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              secureTextEntry
            />
          </View>

          {/* Section 2 (Professional Only): Profession & Credentials */}
          {role === 'professional' && (
            <>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>2. Healthcare Profession</Text>
                <Text style={s.sectionSub}>Choose your clinical specialty</Text>
              </View>

              <View style={s.professionsList}>
                {PROFESSIONS.map((p) => {
                  const isSelected = selectedProfession === p.type;
                  return (
                    <Pressable
                      key={p.type}
                      onPress={() => {
                        setSelectedProfession(p.type);
                        if (error) setError('');
                      }}
                      style={({ pressed }) => [
                        s.professionCard,
                        isSelected && s.professionCardSelected,
                        pressed && s.pressed,
                      ]}
                    >
                      <ProfessionIcon type={p.type} size={40} iconSize={20} />
                      <View style={s.professionCardInfo}>
                        <View style={s.proTitleRow}>
                          <Text
                            style={[
                              s.professionName,
                              isSelected && s.professionNameSelected,
                            ]}
                          >
                            {p.label}
                          </Text>
                          {isSelected && (
                            <Badge tone="brand">Selected</Badge>
                          )}
                        </View>
                        <Text style={s.professionBlurb}>{p.blurb}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Registration / Council Number */}
              <View style={s.fields}>
                <Field
                  label={registrationLabel(selectedProfession)}
                  placeholder={registrationPlaceholder(selectedProfession)}
                  value={registrationNo}
                  onChangeText={(text) => {
                    setRegistrationNo(text);
                    if (error) setError('');
                  }}
                  autoCapitalize="characters"
                  hint="Used by clinical operations to verify your credentials."
                />

                <Field
                  label="Years of experience"
                  placeholder="e.g. 5"
                  value={yearsOfExp}
                  onChangeText={(text) => {
                    setYearsOfExp(text);
                    if (error) setError('');
                  }}
                  keyboardType="numeric"
                />

                <Field
                  label="Short professional bio (optional)"
                  placeholder="e.g. ICU nurse with 5 years hospital experience in wound care and patient rehabilitation."
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={2}
                  style={s.bioInput}
                  optional
                />
              </View>
            </>
          )}

          {/* Section: Service Area & GPS Location */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              {role === 'professional'
                ? '3. Work Location & Travel Radius'
                : '2. Home Healthcare Location'}
            </Text>
            <Text style={s.sectionSub}>
              {role === 'professional'
                ? 'Only requests within this radius will be assigned to you.'
                : 'Caregivers will be matched to this service location.'}
            </Text>
          </View>

          <Card style={s.locationCard}>
            <View style={s.locationCardRow}>
              <View style={s.locationIconBox}>
                <Icon name="pin" size={20} color={colors.brand600} />
              </View>
              <View style={s.locationMeta}>
                <Text style={s.locationAreaName}>
                  {location.area || 'Current Location'}
                </Text>
                <Text style={s.locationCoords}>
                  {location.city}, {location.state} ({location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E)
                </Text>
              </View>

              <Pressable
                onPress={() => handleDetectLocation(true)}
                disabled={detectingLocation}
                style={({ pressed }) => [
                  s.detectBtn,
                  detectingLocation && s.disabled,
                  pressed && s.pressed,
                ]}
              >
                {detectingLocation ? (
                  <ActivityIndicator size="small" color={colors.brand600} />
                ) : (
                  <Text style={s.detectBtnText}>
                    {locationAcquired ? 'Re-detect' : 'Use GPS'}
                  </Text>
                )}
              </Pressable>
            </View>
          </Card>

          {/* Travel Radius for Professionals */}
          {role === 'professional' && (
            <View style={s.radiusSection}>
              <Text style={s.radiusLabel}>Travel radius from your location:</Text>
              <View style={s.radiusChips}>
                {RADIUS_OPTIONS.map((r) => {
                  const isSelected = travelRadius === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setTravelRadius(r)}
                      style={[
                        s.radiusChip,
                        isSelected && s.radiusChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          s.radiusChipText,
                          isSelected && s.radiusChipTextSelected,
                        ]}
                      >
                        {r} km
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Submit CTA */}
          <Button
            title={
              role === 'professional'
                ? 'Create account & onboard'
                : 'Create account'
            }
            onPress={submit}
            loading={busy}
            size="lg"
            icon="arrowRight"
            iconRight
          />

          {/* Footer Navigation */}
          <View style={s.footerRow}>
            <Text style={s.footerMuted}>Already have an account?</Text>
            <Pressable
              onPress={() => router.replace('/login')}
              style={({ pressed }) => [s.linkTouch, pressed && s.pressed]}
              hitSlop={8}
            >
              <Text style={s.linkText}>Log in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  brandTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand600,
  },
  titleWrap: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  roleGrid: {
    gap: 10,
    width: '100%',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  roleCardSelected: {
    borderColor: colors.brand600,
    backgroundColor: colors.brand50,
  },
  roleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconCircleSelected: {
    backgroundColor: colors.brand600,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  roleTitleSelected: {
    color: colors.brand700,
  },
  roleDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  sectionHeader: {
    marginTop: 6,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  sectionSub: {
    fontSize: 12,
    color: colors.muted,
  },
  fields: {
    gap: 12,
  },
  professionsList: {
    gap: 8,
  },
  professionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  professionCardSelected: {
    borderColor: colors.brand600,
    backgroundColor: colors.brand50,
  },
  professionCardInfo: {
    flex: 1,
  },
  proTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  professionName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  professionNameSelected: {
    color: colors.brand700,
  },
  professionBlurb: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  bioInput: {
    marginTop: 2,
  },
  locationCard: {
    padding: 12,
    backgroundColor: colors.surfaceSubtle,
  },
  locationCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationMeta: {
    flex: 1,
  },
  locationAreaName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  locationCoords: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  detectBtn: {
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
  detectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand600,
  },
  radiusSection: {
    gap: 8,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  radiusChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  radiusChipSelected: {
    borderColor: colors.brand600,
    backgroundColor: colors.brand600,
  },
  radiusChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  radiusChipTextSelected: {
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  footerMuted: {
    fontSize: 14,
    color: colors.muted,
  },
  linkTouch: {
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand600,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
