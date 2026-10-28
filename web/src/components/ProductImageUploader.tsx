import React, { useEffect, useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { resolveProductImageUrl, validateProductImageFile } from '../domain/photo-picker';

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

  useEffect(() => {
    if (!value) {
      setLocalPreview(null);
    }
  }, [value]);

  const setUploadingState = (next: boolean) => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = validateProductImageFile(file);
    if (!check.valid) {
      onNotify(check.error);
      e.target.value = '';
      return;
    }

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
      onNotify('✅ อัปโหลดรูปภาพสินค้าสำเร็จ');
    } catch (err) {
      setLocalPreview(null);
      onNotify(err instanceof Error ? err.message : '❌ อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setUploadingState(false);
      e.target.value = '';
    }
  };

  const displayPreview = localPreview || resolveProductImageUrl(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#33475B' }}>
        🖼️ รูปภาพสินค้า Product Master (จำกัดไม่เกิน 2 MB · สไตล์ ODM)
      </label>

      <div
        style={{
          position: 'relative',
          border: '2px dashed #CBD5E1',
          borderRadius: 10,
          padding: 10,
          height: compact ? 104 : 128,
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22 }}>⏳</span>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>กำลังอัปโหลดรูปภาพ...</span>
          </div>
        ) : displayPreview ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <img
              src={displayPreview}
              alt="Product Preview"
              style={{ maxHeight: compact ? 68 : 88, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 }}
            />
            <span style={{ fontSize: 11, color: '#1A56B0', fontWeight: 600 }}>📷 คลิกที่กรอบนี้เพื่อเปลี่ยนรูปใหม่</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              📷
            </div>
            <span style={{ fontSize: 12, color: '#1A56B0', fontWeight: 700 }}>คลิกเพื่ออัปโหลดรูปภาพ (Click to Upload)</span>
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
          style={{ flex: 1, minHeight: 36, padding: '0 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12 }}
        />
        <button
          type="button"
          onClick={() => {
            onChange('');
            setLocalPreview(null);
          }}
          disabled={!value && !localPreview}
          style={{
            minHeight: 36,
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
          Clear (ลบรูป)
        </button>
      </div>
    </div>
  );
};
