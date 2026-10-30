import { loadDevSettings, uploadEvidenceFile } from '../api/client';

export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB (ตามมาตรฐาน ODM)
export const MAX_PRODUCT_IMAGE_DIMENSION = 800; // ย่อรูปอัตโนมัติไม่เกิน 800x800 px เพื่อโหลดเร็ว
const ALLOWED_PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function calculateResizedDimensions(
  width: number,
  height: number,
  maxDim = MAX_PRODUCT_IMAGE_DIMENSION,
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || (width <= maxDim && height <= maxDim)) {
    return { width, height };
  }
  const ratio = Math.min(maxDim / width, maxDim / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function compressAndResizeProductImage(
  file: File,
  maxDim = MAX_PRODUCT_IMAGE_DIMENSION,
): Promise<File> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return file;
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = calculateResizedDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDim);
      if (width === img.width && height === img.height && file.size <= 350 * 1024) {
        resolve(file);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const ext = outMime === 'image/png' ? '.png' : '.jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${baseName}${ext}`, { type: outMime }));
        },
        outMime,
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export function validateProductImageFile(file: { size: number; type: string }): { valid: true } | { valid: false; error: string } {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG, WebP เท่านั้น' };
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return { valid: false, error: 'ขนาดไฟล์เกิน 2 MB กรุณาเลือกรูปภาพที่มีขนาดเล็กลง' };
  }
  return { valid: true };
}

export function toRelativeUploadPath(url: string): string {
  const trimmed = url.trim();
  const idx = trimmed.indexOf('/uploads/');
  return idx >= 0 ? trimmed.slice(idx) : trimmed;
}

export function resolveProductImageUrl(
  imageUrl: string | null | undefined,
  apiBaseUrl = loadDevSettings().apiBaseUrl,
): string | null {
  if (!imageUrl || !imageUrl.trim()) return null;
  const normalized = toRelativeUploadPath(imageUrl);
  if (normalized.startsWith('/')) {
    return `${apiBaseUrl.replace(/\/+$/, '')}${normalized}`;
  }
  return normalized;
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
