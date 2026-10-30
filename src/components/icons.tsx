import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import {
  Activity,
  ArrowRight,
  Baby,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  Heart,
  IndianRupee,
  Info,
  List,
  LogOut,
  MapPin,
  Phone,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import type { ProfessionalType } from '@/lib/types';
import { colors } from '@/constants/theme';

export type IconName =
  | 'heart'
  | 'activity'
  | 'users'
  | 'baby'
  | 'flask'
  | 'stethoscope'
  | 'calendar'
  | 'clock'
  | 'pin'
  | 'phone'
  | 'star'
  | 'check'
  | 'checkCircle'
  | 'x'
  | 'chevronRight'
  | 'chevronLeft'
  | 'arrowRight'
  | 'plus'
  | 'user'
  | 'logout'
  | 'shield'
  | 'shieldCheck'
  | 'sparkles'
  | 'rupee'
  | 'info'
  | 'list';

const ICON_MAP: Record<IconName, LucideIcon> = {
  heart: Heart,
  activity: Activity,
  users: Users,
  baby: Baby,
  flask: FlaskConical,
  stethoscope: Stethoscope,
  calendar: Calendar,
  clock: Clock,
  pin: MapPin,
  phone: Phone,
  star: Star,
  check: Check,
  checkCircle: CheckCircle2,
  x: X,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  arrowRight: ArrowRight,
  plus: Plus,
  user: User,
  logout: LogOut,
  shield: Shield,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  rupee: IndianRupee,
  info: Info,
  list: List,
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  color = colors.ink,
  strokeWidth = 2,
}: IconProps) {
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component size={size} color={color} strokeWidth={strokeWidth} />;
}

const PROFESSION_CONFIG: Record<
  ProfessionalType,
  { icon: IconName; bg: string; color: string }
> = {
  nurse: { icon: 'heart', bg: '#FFF1F2', color: '#E11D48' },
  physiotherapist: { icon: 'activity', bg: '#F0F9FF', color: '#0284C7' },
  caretaker: { icon: 'users', bg: '#FFFBEB', color: '#D97706' },
  baby_care_specialist: { icon: 'baby', bg: '#FDF2F8', color: '#DB2777' },
  lab_technician: { icon: 'flask', bg: '#F5F3FF', color: '#7C3AED' },
  doctor: { icon: 'stethoscope', bg: '#ECFDF5', color: '#059669' },
};

export function ProfessionIcon({
  type,
  size = 44,
  iconSize = 22,
  style,
}: {
  type: ProfessionalType;
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
}) {
  const cfg = PROFESSION_CONFIG[type] ?? PROFESSION_CONFIG.nurse;
  return (
    <View
      style={[
        s.proContainer,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          backgroundColor: cfg.bg,
        },
        style,
      ]}
    >
      <Icon name={cfg.icon} size={iconSize} color={cfg.color} strokeWidth={2.2} />
    </View>
  );
}

const s = StyleSheet.create({
  proContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

