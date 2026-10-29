import React, { useState } from 'react';
import { adminMgmtApi } from '../api/admin-api';
import { ProductImageUploader } from './ProductImageUploader';

interface Props {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onNotify: (msg: string) => void;
}

const RICH_MENU_SLOTS = [
  '1. บนซ้าย (โลโก้ ilife): แชร์ QR ให้เพื่อน',
  '2. บนกลาง (บริการของเรา): เช็คสถานะ / OTP',
  '3. บนขวา (โปรโมชั่น): สั่งซ้ำออเดอร์เดิมด่วน',
  '4. ล่างซ้าย (รูปถุงน้ำ): แชร์ QR ให้เพื่อน',
  '5. ล่างกลาง (ส่งใบสั่งซื้อ): เปิดเมนูสั่งน้ำ',
  '6. ล่างขวา (ติดต่อเรา): ข้อมูลร้าน & แชร์เพื่อน',
];

export const AdminRichMenuBanner: React.FC<Props> = ({ busy, onBusyChange, onNotify }) => {
  const [showConfig, setShowConfig] = useState(false);
  const [richMenuImageUrl, setRichMenuImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSyncRichMenu = async () => {
    onBusyChange(true);
    try {
      const res = await adminMgmtApi.syncLineRichMenu(richMenuImageUrl.trim() || null);
      const srcLabel = res.imageSource === 'custom' ? 'รูปภาพที่อัปโหลด' : 'ตาราง 6 ช่องมาตรฐาน';
      onNotify(`ซิงก์ LINE Rich Menu (${res.areas} ปุ่ม · ${srcLabel}) สำเร็จ [${res.mode}: ${res.richMenuId}]`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'ซิงก์ Rich Menu ไม่สำเร็จ');
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <div style={{ background: '#E6EEF9', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A56B0' }}>📱 Product Master &amp; LINE Rich Menu 6 ช่อง (พร้อมปุ่มแชร์ QR ให้เพื่อน)</div>
          <div style={{ fontSize: 12, color: '#33475B' }}>รองรับตาราง 6 ปุ่มสไตล์ ilife (แชร์ QR เพื่อน, บริการของเรา, โปรโมชั่น, ส่งใบสั่งซื้อ, ติดต่อเรา)</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowConfig((v) => !v)}
            style={{ minHeight: 40, padding: '0 12px', borderRadius: 10, border: '1px solid #1A56B0', background: '#FFFFFF', color: '#1A56B0', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
          >
            {showConfig ? '▲ ซ่อนตั้งค่ารูป Rich Menu' : '🖼️ ตั้งค่ารูป / ดูผัง 6 ปุ่ม'}
          </button>
          <button
            type="button"
            onClick={handleSyncRichMenu}
            disabled={busy || uploading}
            style={{ minHeight: 40, padding: '0 14px', borderRadius: 10, border: 'none', background: '#1E7B45', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
          >
            🔄 ซิงก์ LINE Rich Menu 6 ปุ่ม
          </button>
        </div>
      </div>

      {showConfig && (
        <div style={{ background: '#FFFFFF', borderRadius: 10, padding: 12, border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F2236' }}>🗺️ ผังการทำงาน Rich Menu 6 ช่อง (2 แถว × 3 คอลัมน์):</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
            {RICH_MENU_SLOTS.map((slot) => (
              <div key={slot} style={{ fontSize: 12, background: '#F8FAFC', padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', color: '#1E293B' }}>
                {slot}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            💡 <strong>ลิงก์สำหรับตั้งค่าใน LINE OA Manager โดยตรง (กรณีตั้งแบบลิงก์):</strong>{' '}
            <code>https://line.me/R/nv/recommendOA/@157iywjs</code> (แชร์นามบัตรให้เพื่อน) หรือ{' '}
            <code>https://line.me/R/ti/p/@157iywjs</code> (เปิดหน้า QR Code)
          </div>
          <ProductImageUploader
            value={richMenuImageUrl}
            onChange={setRichMenuImageUrl}
            onNotify={onNotify}
            onUploadingChange={setUploading}
            compact
          />
        </div>
      )}
    </div>
  );
};
