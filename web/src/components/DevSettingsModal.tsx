import React, { useState } from 'react';
import { DevAuthSettings } from '../api/schemas';
import { useI18n } from '../i18n/I18nContext';
import { IconSettings } from './icons/Icons';

interface Props {
  settings: DevAuthSettings;
  onSave: (next: DevAuthSettings) => void;
  onClose: () => void;
}

export const DevSettingsModal: React.FC<Props> = ({ settings, onSave, onClose }) => {
  const { t } = useI18n();
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
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(2px)',
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
          maxWidth: 368,
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: '#0F172A' }}>
          <IconSettings size={17} style={{ color: '#1D4ED8' }} />
          <span>{t('devModalTitle')}</span>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, fontWeight: 500, color: '#334155' }}>
          <span>API Base URL</span>
          <input
            value={form.apiBaseUrl}
            onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value.trim() })}
            style={{ minHeight: 40, padding: '0 10px', borderRadius: 9, border: '1px solid #CBD5E1', fontSize: 13.5 }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, fontWeight: 500, color: '#334155' }}>
          <span>Rider Account (x-dev-user)</span>
          <select
            value={form.devUser}
            onChange={(e) => setForm({ ...form, devUser: e.target.value })}
            style={{ minHeight: 40, padding: '0 10px', borderRadius: 9, border: '1px solid #CBD5E1', fontSize: 13.5 }}
          >
            <option value="dev-rider">dev-rider (Rider 1)</option>
            <option value="dev-rider-2">dev-rider-2 (Rider 2)</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5, fontWeight: 500, color: '#334155' }}>
          <span>DEV_AUTH_KEY (x-dev-key)</span>
          <input
            type="password"
            value={form.devKey}
            placeholder="Optional for Local Dev"
            onChange={(e) => setForm({ ...form, devKey: e.target.value })}
            style={{ minHeight: 40, padding: '0 10px', borderRadius: 9, border: '1px solid #CBD5E1', fontSize: 13.5 }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
          <input
            type="checkbox"
            checked={form.mockGps}
            onChange={(e) => setForm({ ...form, mockGps: e.target.checked })}
          />
          <span>Mock GPS (13.7563, 100.5018)</span>
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              minHeight: 42,
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#475569',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('commonCancel')}
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              minHeight: 42,
              borderRadius: 10,
              border: 'none',
              background: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('commonSave')}
          </button>
        </div>
      </form>
    </div>
  );
};
