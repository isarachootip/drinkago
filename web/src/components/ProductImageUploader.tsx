import React, { useEffect, useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { compressAndResizeProductImage, resolveProductImageUrl, validateProductImageFile } from '../domain/photo-picker';
import { IconCamera } from './icons/ActionIcons';
import { IconClock } from './icons/Icons';

interface Props {
  value: string;
  onChange: (nextUrl: string) => void;
  onNotify: (msg: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  compact?: boolean;
}

export const ProductImageUploader: React.FC<Props> = ({
  value,
  onChange,
  onNotify,
  onUploadingChange,
  compact = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
    if (!value) {
      setLocalPreview(null);
    }
  }, [value]);

  const setUploadingState = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    const file = await compressAndResizeProductImage(rawFile);
    const check = validateProductImageFile(file);
    if (!check.valid) {
      onNotify(check.error);
      e.target.value = '';
      return;
    }

    setPreviewFailed(false);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setLocalPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);

    setUploadingState(true);
    try {
      const uploadedUrl = await adminMgmtApi.uploadProductImage(file);
      onChange(uploadedUrl);
      onNotify('อัปโหลดรูปภาพสินค้าและบันทึกลงฐานข้อมูล Server สำเร็จ');
    } catch (err) {
      setLocalPreview(null);
      onNotify(err instanceof Error ? err.message : 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setUploadingState(false);
      e.target.value = '';
    }
  };

  const resolvedUrl = resolveProductImageUrl(value);
  const displayPreview = localPreview || (!previewFailed ? resolvedUrl : null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
        รูปภาพสินค้า Product Master (จำกัดไม่เกิน 2 MB · เก็บบนฐานข้อมูล Server ถาวร)
      </label>

      <div
        style={{
          position: 'relative',
          border: '1.5px dashed #CBD5E1',
          borderRadius: 10,
          padding: 10,
          height: compact ? 100 : 120,
          background: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: uploading ? 'wait' : 'pointer',
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#64748B' }}>
            <IconClock size={20} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>กำลังอัปโหลดรูปภาพขึ้น Server...</span>
          </div>
        ) : displayPreview ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <img
              src={displayPreview}
              alt="Product Preview"
              onError={() => {
                if (localPreview) setLocalPreview(null);
                else setPreviewFailed(true);
              }}
              style={{ maxHeight: compact ? 64 : 84, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }}
            />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#1D4ED8', fontWeight: 600 }}>
              <IconCamera size={12} />
              <span>คลิกที่กรอบนี้เพื่อเปลี่ยนรูปใหม่</span>
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCamera size={16} />
            </div>
            <span style={{ fontSize: 12, color: '#0F172A', fontWeight: 600 }}>คลิกเพื่ออัปโหลดรูปภาพ (Click to Upload)</span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>รองรับ JPG, PNG, WebP · ขนาดไม่เกิน 2 MB</span>
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          title="เลือกรูปภาพสินค้า (ไม่เกิน 2 MB)"
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: uploading ? 'wait' : 'pointer', zIndex: 10 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setLocalPreview(null);
          }}
          placeholder="หรือวาง URL รูปภาพที่นี่ (เช่น https://... หรือ /uploads/...)"
          style={{ flex: 1, minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }}
        />
        <button
          type="button"
          onClick={() => {
            onChange('');
            setLocalPreview(null);
          }}
          disabled={!value && !localPreview}
          style={{
            minHeight: 34,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#475569',
            fontSize: 12,
            fontWeight: 600,
            cursor: !value && !localPreview ? 'not-allowed' : 'pointer',
            opacity: !value && !localPreview ? 0.5 : 1,
          }}
        >
          ล้างรูป
        </button>
      </div>
    </div>
  );
};
