import type { IconName } from '@/components/icons';
import type { Tone } from '@/components/ui';
import type { CopyKey } from '@/i18n';
import { dayLabel } from '@/lib/format';
import type { MedicalDocument, MedicalDocumentType, ProDocument, ProDocumentType, VerificationStatus } from '@/lib/types';

export const PRO_DOCUMENT_TYPES: ProDocumentType[] = [
  'government_id',
  'profile_photo',
  'nursing_council_certificate',
  'degree_certificate',
  'police_verification',
  'address_proof',
];

const PRO_LABEL: Record<ProDocumentType, CopyKey> = {
  government_id: 'docs.type.government_id',
  nursing_council_certificate: 'docs.type.nursing_council_certificate',
  degree_certificate: 'docs.type.degree_certificate',
  police_verification: 'docs.type.police_verification',
  profile_photo: 'docs.type.profile_photo',
  address_proof: 'docs.type.address_proof',
};

const PRO_HINT: Record<ProDocumentType, CopyKey> = {
  government_id: 'docs.hint.government_id',
  nursing_council_certificate: 'docs.hint.nursing_council_certificate',
  degree_certificate: 'docs.hint.degree_certificate',
  police_verification: 'docs.hint.police_verification',
  profile_photo: 'docs.hint.profile_photo',
  address_proof: 'docs.hint.address_proof',
};

const humanize = (value: string) => value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Label for a KYC type; types added in the portal later fall back to a readable name. */
export function proDocLabel(type: string, t: (key: CopyKey) => string) {
  const key = PRO_LABEL[type as ProDocumentType];
  return key ? t(key) : humanize(type);
}

export function proDocHint(type: string, t: (key: CopyKey) => string) {
  const key = PRO_HINT[type as ProDocumentType];
  return key ? t(key) : null;
}

export const PRO_STATUS: Record<VerificationStatus | 'missing', { tone: Tone; label: CopyKey; icon: IconName }> = {
  missing: { tone: 'neutral', label: 'docs.status.missing', icon: 'upload' },
  pending: { tone: 'warning', label: 'docs.status.pending', icon: 'hourglass' },
  in_review: { tone: 'primary', label: 'docs.status.in_review', icon: 'clipboard' },
  approved: { tone: 'success', label: 'docs.status.approved', icon: 'verified' },
  rejected: { tone: 'danger', label: 'docs.status.rejected', icon: 'alert' },
};

/** The document that currently counts for each type (the newest upload). */
export function currentByType(docs: ProDocument[] | undefined): Map<string, ProDocument> {
  const map = new Map<string, ProDocument>();
  for (const doc of docs ?? []) {
    const existing = map.get(doc.document_type);
    if (!existing || doc.created_at > existing.created_at) map.set(doc.document_type, doc);
  }
  return map;
}

/** Required documents that still need the professional: not uploaded, or rejected. */
export function documentGaps(required: string[], docs: ProDocument[] | undefined) {
  const current = currentByType(docs);
  let missing = 0;
  let rejected = 0;
  for (const type of required) {
    const doc = current.get(type);
    if (!doc) missing += 1;
    else if (doc.verification_status === 'rejected') rejected += 1;
  }
  return { missing, rejected, uploaded: required.length - missing, total: required.length };
}

export const MEDICAL_TYPES: MedicalDocumentType[] = ['prescription', 'lab_report', 'referral', 'other'];

export const MEDICAL_LABEL: Record<MedicalDocumentType, CopyKey> = {
  prescription: 'docs.medical.prescription',
  lab_report: 'docs.medical.lab_report',
  referral: 'docs.medical.referral',
  other: 'docs.medical.other',
};

export function medicalIcon(type: MedicalDocumentType): IconName {
  return type === 'prescription' ? 'clipboard' : type === 'lab_report' ? 'flask' : type === 'referral' ? 'stethoscope' : 'file';
}

export const isImageType = (contentType: string | null | undefined) => !!contentType && contentType.startsWith('image/');

/** "340 KB" / "1.2 MB". */
export function fileSize(bytes: number, t: (key: CopyKey, vars?: Record<string, string | number>) => string) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return t('docs.size.kb', { size: Math.max(1, Math.round(bytes / 1024)) });
  return t('docs.size.mb', { size: (bytes / (1024 * 1024)).toFixed(1) });
}

type Translate = (key: CopyKey, vars?: Record<string, string | number>) => string;

/** The patient's name for the file, or its type. */
export function medicalTitle(doc: Pick<MedicalDocument, 'title' | 'document_type'>, t: Translate) {
  return doc.title?.trim() || t(MEDICAL_LABEL[doc.document_type] ?? 'docs.medical.other');
}

/** "Prescription · Tue, 4 Nov · 1.2 MB" */
export function medicalSubtitle(doc: MedicalDocument, t: Translate) {
  return [doc.title?.trim() ? t(MEDICAL_LABEL[doc.document_type] ?? 'docs.medical.other') : null, dayLabel(doc.created_at), fileSize(doc.size_bytes, t)]
    .filter(Boolean)
    .join(' · ');
}
