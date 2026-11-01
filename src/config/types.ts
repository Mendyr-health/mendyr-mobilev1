/** Shapes of the server-driven config bundle (`GET /configs/app`). Mirrors
 * `Mendyr-Backend/app/core/config_registry.py`. */

export type FeatureFlags = {
  reviews: boolean;
  visit_otp: boolean;
  sos: boolean;
  live_status: boolean;
  gender_preference: boolean;
  coupons: boolean;
  prescription_upload: boolean;
  chat: boolean;
  wallet: boolean;
  referrals: boolean;
  hindi: boolean;
  [flag: string]: boolean;
};

export type ThemeConfig = {
  primary: string;
  primary_dark: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  radius: number;
};

export type HomeSectionType =
  | 'banners'
  | 'categories'
  | 'book_again'
  | 'trust'
  | 'how_it_works'
  | 'offers'
  | 'support';

export type HomeSection = { type: HomeSectionType; enabled: boolean; title: string | null };

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  deeplink: string | null;
  bg_color: string;
  text_color: string;
  starts_at: string | null;
  ends_at: string | null;
  roles: ('patient' | 'professional')[];
  platforms: ('android' | 'ios' | 'web')[];
  enabled: boolean;
};

export type OnboardingSlide = {
  title: string;
  body: string;
  image_url: string | null;
  icon: string | null;
};

export type Faq = { q: string; a: string };

export type SupportConfig = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  hours: string;
  sos_number: string;
  ambulance_number: string;
  faqs: Faq[];
};

export type PlatformVersion = {
  min_supported: string;
  latest: string;
  store_url: string | null;
};

export type BookingRules = {
  slot_start_hour: number;
  slot_end_hour: number;
  slot_step_minutes: number;
  min_lead_minutes: number;
  horizon_days: number;
  free_cancel_window_minutes: number;
  cancellation_fee_pct: number;
  travel_buffer_minutes: number;
  early_start_minutes: number;
};

export type PollingConfig = { active_booking: number; lists: number; requests: number };

export type AppConfigs = {
  'app.features': FeatureFlags;
  'app.theme': ThemeConfig;
  'app.home': { sections: HomeSection[] };
  'app.banners': { items: Banner[] };
  'app.onboarding': { slides: OnboardingSlide[] };
  'app.copy': { locales: Record<string, Record<string, string>> };
  'app.support': SupportConfig;
  'app.version': { android: PlatformVersion; ios: PlatformVersion; message: string };
  'app.maintenance': { enabled: boolean; title: string; message: string };
  'app.polling': PollingConfig;
  'booking.rules': BookingRules;
  'booking.cancel_reasons': { patient: string[]; professional: string[] };
  'pro.settings': {
    radius_options_km: number[];
    default_radius_km: number;
    languages: string[];
    required_documents: string[];
  };
};

export type ConfigBundle = { version: string; configs: AppConfigs };
