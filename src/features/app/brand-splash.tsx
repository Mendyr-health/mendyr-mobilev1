import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

/** The branded launch screen shown on every cold start while the session, fonts and intro
 * flag load. Uses system fonts on purpose — the brand fonts may not be loaded yet. */
export function BrandSplash() {
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.brandCenter}>
        <View style={s.logoWrap}>
          <Image source={require('@/assets/branding/mendyr.png')} style={s.logo} contentFit="contain" />
        </View>
        <Text style={s.brandTitle}>Mendyr</Text>
        <Text style={s.tagline}>Healthcare delivered at home</Text>
        <ActivityIndicator color="#FFFFFF" size="small" style={s.spinner} />
      </View>
      <View style={s.footer}>
        <Text style={s.footerText}>Certified Caregivers · Doorstep Support</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1262E2', // Signature Mendyr Brand Blue
    paddingHorizontal: 24,
  },
  brandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
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
  logo: {
    width: 60,
    height: 60,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
