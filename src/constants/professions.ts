import type { ProfessionalType } from '@/lib/types';

export interface ProfessionOption {
  type: ProfessionalType;
  label: string;
  blurb: string;
  requiresCouncil: boolean;
}

export const PROFESSIONS: ProfessionOption[] = [
  {
    type: 'nurse',
    label: 'Nurse',
    blurb: 'GNM / ANM / B.Sc nursing',
    requiresCouncil: true,
  },
  {
    type: 'physiotherapist',
    label: 'Physiotherapist',
    blurb: 'BPT / MPT physiotherapy',
    requiresCouncil: true,
  },
  {
    type: 'caretaker',
    label: 'Caretaker / attendant',
    blurb: 'Elder & bedridden patient care',
    requiresCouncil: false,
  },
  {
    type: 'baby_care_specialist',
    label: 'Baby care specialist',
    blurb: 'Mother & newborn baby care',
    requiresCouncil: false,
  },
  {
    type: 'lab_technician',
    label: 'Lab technician',
    blurb: 'Home sample collection (DMLT)',
    requiresCouncil: false,
  },
  {
    type: 'doctor',
    label: 'Doctor',
    blurb: 'MBBS and above consultation',
    requiresCouncil: true,
  },
];

export function registrationLabel(type: ProfessionalType): string {
  switch (type) {
    case 'nurse':
      return 'Nursing council registration no.';
    case 'doctor':
      return 'Medical council registration no.';
    case 'physiotherapist':
      return 'Physiotherapy council / IAP registration no.';
    default:
      return 'Certificate / license number';
  }
}

export function registrationPlaceholder(type: ProfessionalType): string {
  switch (type) {
    case 'nurse':
      return 'e.g. KNC-123456';
    case 'doctor':
      return 'e.g. KMC-78901';
    case 'physiotherapist':
      return 'e.g. IAP-L-4567';
    default:
      return 'e.g. CERT-2024-89';
  }
}
