import React, { useState } from 'react';
import { DevAuthSettings } from '../api/schemas';

interface Props {
  settings: DevAuthSettings;
  onSave: (next: DevAuthSettings) => void;
  onClose: () => void;
}

export const DevSettingsModal: React.FC<Props> = ({ settings, onSave, onClose }) => {
  const [form, setForm] = useState<DevAuthSettings>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 34, 54, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 100,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#FFFFFF',
          borderRadius: 16,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700 }}>ตั้งค่าโหมดพัฒนา (Dev / LIFF)</div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          <span>API Base URL</span>
          <input
            value={form.apiBaseUrl}
            onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value.trim() })}
            style={{ minHeight: 44, padding: '0 10px', borderRadius: 10, border: '1px solid #9AABBD' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          <span>บัญชีไรเดอร์ (x-dev-user)</span>
          <select
            value={form.devUser}
            onChange={(e) => setForm({ ...form, devUser: e.target.value })}
            style={{ minHeight: 44, padding: '0 10px', borderRadius: 10, border: '1px solid #9AABBD' }}
          >
            <option value="dev-rider">dev-rider (ไรเดอร์ 1)</option>
            <option value="dev-rider-2">dev-rider-2 (ไรเดอร์ 2)</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          <span>DEV_AUTH_KEY (x-dev-key ถ้ามี)</span>
          <input
            type="password"
            value={form.devKey}
            placeholder="เว้นว่างสำหรับ Local Dev"
            onChange={(e) => setForm({ ...form, devKey: e.target.value })}
            style={{ minHeight: 44, padding: '0 10px', borderRadius: 10, border: '1px solid #9AABBD' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={form.mockGps}
            onChange={(e) => setForm({ ...form, mockGps: e.target.checked })}
          />
          <span>จำลองพิกัด GPS (13.7563, 100.5018)</span>
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 10,
              border: '1px solid #DCE4EC',
              background: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 10,
              border: 'none',
              background: '#1A56B0',
              color: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            บันทึก
          </button>
        </div>
      </form>
    </div>
  );
};
