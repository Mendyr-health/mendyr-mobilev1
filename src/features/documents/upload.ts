import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import type { CopyKey } from '@/i18n';
import { api, ApiError } from '@/lib/api';
import type { UploadTarget } from '@/lib/types';

/** Where a file comes from: the camera, the photo library, or the files app (PDFs). */
export type UploadSource = 'camera' | 'library' | 'file';
/** What the UI shows while an upload runs. */
export type UploadPhase = 'idle' | 'preparing' | 'uploading' | 'saving';

/** Same limits as the backend (`storage_service.py`). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
// Formats every viewer can show; anything else (HEIC, unknown) is re-encoded as JPEG.
const PORTABLE_IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
const LONG_EDGE = 2000;
const JPEG_QUALITY = 0.8;
// Small photos within the long-edge limit are uploaded as they are.
const COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024;

const EXT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/** A client-side upload failure; `code` matches the backend error codes where one exists. */
export class UploadError extends Error {
  constructor(
    public code: 'unsupported_file_type' | 'file_too_large' | 'upload_failed' | 'camera_permission' | 'network',
    message = code,
  ) {
    super(message);
  }
}

type PickedFile = {
  uri: string;
  mimeType: string | null;
  size: number | null;
  width?: number;
  height?: number;
};

function typeFromName(name: string | null | undefined): string | null {
  const ext = name?.split('?')[0].split('.').pop()?.toLowerCase();
  return (ext && EXT_TYPES[ext]) || null;
}

/** Open the camera, photo library or document picker. Resolves null when the user cancels. */
export async function pickFile(source: UploadSource): Promise<PickedFile | null> {
  if (source === 'file') {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return null;
    return { uri: asset.uri, mimeType: asset.mimeType ?? typeFromName(asset.name), size: asset.size ?? null };
  }
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new UploadError('camera_permission');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? typeFromName(asset.fileName ?? asset.uri) ?? 'image/jpeg',
    size: asset.fileSize ?? null,
    width: asset.width || undefined,
    height: asset.height || undefined,
  };
}

function imageSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null),
    );
  });
}

/** Photos are resized to a ~2000px long edge and saved as JPEG (~0.8) so they stay well under
 * 10 MB and open everywhere. Small, portable images are left alone. */
async function compressIfNeeded(file: PickedFile): Promise<{ uri: string; mimeType: string }> {
  const mimeType = file.mimeType ?? 'image/jpeg';
  const dims = file.width && file.height ? { width: file.width, height: file.height } : await imageSize(file.uri);
  const longEdge = dims ? Math.max(dims.width, dims.height) : Infinity;
  const small = file.size !== null && file.size <= COMPRESS_ABOVE_BYTES;
  if (PORTABLE_IMAGES.includes(mimeType) && small && longEdge <= LONG_EDGE) return { uri: file.uri, mimeType };
  try {
    const context = ImageManipulator.manipulate(file.uri);
    if (longEdge > LONG_EDGE && dims) {
      context.resize(dims.width >= dims.height ? { width: LONG_EDGE } : { height: LONG_EDGE });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return { uri: saved.uri, mimeType: 'image/jpeg' };
  } catch {
    // Couldn't decode it here (e.g. HEIC on web) — let the size/type checks decide.
    return { uri: file.uri, mimeType };
  }
}

/** Compress if it's a photo, read the bytes, check type and size. */
async function prepare(file: PickedFile): Promise<{ blob: Blob; contentType: string }> {
  const isPdf = file.mimeType === 'application/pdf';
  const { uri, mimeType } = isPdf ? { uri: file.uri, mimeType: 'application/pdf' } : await compressIfNeeded(file);
  const contentType = mimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mimeType.toLowerCase();
  if (!ALLOWED.includes(contentType)) throw new UploadError('unsupported_file_type');
  let blob: Blob;
  try {
    blob = await (await fetch(uri)).blob();
  } catch {
    throw new UploadError('upload_failed');
  }
  if (blob.size > MAX_UPLOAD_BYTES) throw new UploadError('file_too_large');
  return { blob, contentType };
}

/**
 * Upload a picked file to private storage and return its `file_key`. Three steps, the bytes
 * never touch our API:
 *  1. `POST {base}/upload-url` with content type and size → presigned PUT URL + headers
 *  2. `PUT` the bytes there with exactly those headers (no auth header)
 *  3. the caller records `file_key` with `POST {base}`
 */
export async function uploadFile(
  base: '/professionals/me/documents' | '/medical-documents',
  file: PickedFile,
  onPhase: (phase: UploadPhase) => void,
): Promise<string> {
  onPhase('preparing');
  const { blob, contentType } = await prepare(file);
  const target = await api<UploadTarget>(`${base}/upload-url`, {
    method: 'POST',
    body: { content_type: contentType, size_bytes: blob.size },
  });
  onPhase('uploading');
  let response: Response;
  try {
    response = await fetch(target.upload_url, { method: target.method || 'PUT', headers: target.headers, body: blob });
  } catch {
    throw new UploadError('network');
  }
  if (!response.ok) throw new UploadError('upload_failed');
  return target.file_key;
}

/** A friendly message for any failure in the pick → upload → record chain. */
export function uploadErrorKey(error: unknown): CopyKey | null {
  const code = error instanceof UploadError || error instanceof ApiError ? error.code : null;
  switch (code) {
    case 'unsupported_file_type':
      return 'docs.error.unsupported';
    case 'file_too_large':
      return 'docs.error.tooLarge';
    case 'upload_missing':
    case 'upload_failed':
      return 'docs.error.missing';
    case 'network':
      return 'docs.error.network';
    case 'camera_permission':
      return 'docs.error.cameraPermission';
    default:
      return null;
  }
}
