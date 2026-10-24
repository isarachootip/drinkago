import { uploadEvidenceFile } from '../api/client';

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
