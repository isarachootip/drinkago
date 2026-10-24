import { z } from 'zod';

/** ตรวจ body ด้วย zod (ZodError ถูกแปลงเป็น 400 ใน ErrorFilter) */
export function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  return schema.parse(input ?? {});
}

export const photoUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      const allowedBase = (process.env.PUBLIC_UPLOAD_BASE_URL ?? 'http://localhost:3000/uploads').replace(/\/+$/, '');
      return url.startsWith(allowedBase) || url.startsWith('/uploads/');
    },
    { message: 'photoUrl ต้องเป็นไฟล์ที่อัปโหลดผ่านระบบเท่านั้น' },
  );

/**
 * หลักฐานการยืนยัน: ตรวจรูปแบบที่นี่ ส่วน "ต้องมีหรือไม่" ตัดสินโดย state machine
 * (ตอบ 422 EVIDENCE_REQUIRED ถ้าขาด)
 */
export const evidenceSchema = z.object({
  photoUrl: photoUrlSchema.optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
