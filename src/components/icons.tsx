import {
  Activity,
  Ambulance,
  ArrowRight,
  Baby,
  BadgeCheck,
  Ban,
  Bell,
  Camera,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleUser,
  ClipboardList,
  Clock,
  Copy,
  Eye,
  FileText,
  FlaskConical,
  FolderOpen,
  Headset,
  Heart,
  HeartPulse,
  Image as ImageIcon,
  Hourglass,
  House,
  IndianRupee,
  Info,
  Languages,
  LocateFixed,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Siren,
  Sparkles,
  Star,
  Stethoscope,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  Users,
  Venus,
  Wallet,
  WifiOff,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import type { ProfessionalType } from '@/lib/types';
import { neutral, professionPalette } from '@/theme/tokens';

const ICONS = {
  activity: Activity,
  ambulance: Ambulance,
  arrowRight: ArrowRight,
  baby: Baby,
  verified: BadgeCheck,
  ban: Ban,
  bell: Bell,
  camera: Camera,
  calendar: CalendarDays,
  check: Check,
  checkCircle: CheckCircle2,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  alert: CircleAlert,
  account: CircleUser,
  clipboard: ClipboardList,
  clock: Clock,
  copy: Copy,
  eye: Eye,
  file: FileText,
  flask: FlaskConical,
  folder: FolderOpen,
  headset: Headset,
  heart: Heart,
  heartPulse: HeartPulse,
  image: ImageIcon,
  hourglass: Hourglass,
  home: House,
  rupee: IndianRupee,
  info: Info,
  languages: Languages,
  locate: LocateFixed,
  lock: Lock,
  logout: LogOut,
  mail: Mail,
  pin: MapPin,
  whatsapp: MessageCircle,
  minus: Minus,
  navigation: Navigation,
  paperclip: Paperclip,
  edit: Pencil,
  phone: Phone,
  plus: Plus,
  refresh: RefreshCw,
  shieldCheck: ShieldCheck,
  siren: Siren,
  sparkles: Sparkles,
  star: Star,
  stethoscope: Stethoscope,
  trash: Trash2,
  warning: TriangleAlert,
  upload: Upload,
  user: User,
  users: Users,
  female: Venus,
  wallet: Wallet,
  offline: WifiOff,
  wrench: Wrench,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Map config icon names ("shield-check", "map-pin", "home-heart") to our set. */
export function iconFromConfig(name: string | null | undefined, fallback: IconName = 'heart'): IconName {
  const map: Record<string, IconName> = {
    'home-heart': 'home',
    home: 'home',
    'shield-check': 'shieldCheck',
    shield: 'shieldCheck',
    'map-pin': 'pin',
    heart: 'heart',
    star: 'star',
    clock: 'clock',
    phone: 'phone',
    users: 'users',
    stethoscope: 'stethoscope',
  };
  return (name && map[name]) || fallback;
}

export function Icon({
  name,
  size = 20,
  color = neutral.ink,
  strokeWidth = 2,
  fill,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  const Component = ICONS[name];
  return <Component size={size} color={color} strokeWidth={strokeWidth} fill={fill ?? 'none'} />;
}

const PROFESSION_ICON: Record<ProfessionalType, IconName> = {
  nurse: 'heartPulse',
  physiotherapist: 'activity',
  caretaker: 'users',
  baby_care_specialist: 'baby',
  lab_technician: 'flask',
  doctor: 'stethoscope',
};

export function ProfessionIcon({
  type,
  size = 44,
  style,
}: {
  type: ProfessionalType;
  size?: number;
  style?: ViewStyle;
}) {
  const palette = professionPalette[type] ?? professionPalette.nurse;
  return (
    <View
      style={[
        s.wrap,
        { width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: palette.bg },
        style,
      ]}
    >
      <Icon name={PROFESSION_ICON[type] ?? 'heartPulse'} size={Math.round(size * 0.5)} color={palette.fg} strokeWidth={2.2} />
    </View>
  );
}

const s = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center' } });
