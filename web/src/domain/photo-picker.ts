import { loadDevSettings, uploadEvidenceFile } from '../api/client';

export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB (ตามมาตรฐาน ODM)
const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateProductImageFile(file: { size: number; type: string }): { valid: true } | { valid: false; error: string } {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: '❌ รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WebP เท่านั้น' };
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return { valid: false, error: '❌ ขนาดไฟล์เกิน 2 MB กรุณาเลือกรูปภาพที่มีขนาดเล็กลง' };
  }
  return { valid: true };
}

export function resolveProductImageUrl(
  imageUrl: string | null | undefined,
  apiBaseUrl = loadDevSettings().apiBaseUrl,
): string | null {
  if (!imageUrl || !imageUrl.trim()) return null;
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('/')) {
    return `${apiBaseUrl.replace(/\/+$/, '')}${trimmed}`;
  }
  return trimmed;
}

/**
 * สร้างไฟล์ PNG ขนาดเล็กสำหรับทดสอบถ่ายรูปในโหมดเครื่องพัฒนา (Dev Mode)
 * เพื่อให้ทดสอบกับ POST /uploads (ซึ่งตรวจ MIME image/png) ได้โดยไม่ต้องต่อกล้องจริง
 */
export function createDemoPngBlob(): Blob {
  // 1x1 transparent PNG bytes
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const binary = atob(pngBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
}

export async function uploadSelectedOrDemoPhoto(file?: File | null, filename = 'pod.png'): Promise<string> {
  const blob = file ?? createDemoPngBlob();
  const name = file ? file.name : filename;
  return uploadEvidenceFile(blob, name);
}
