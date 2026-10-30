import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { IconCards, IconGrid } from './icons/ActionIcons';

export type AdminViewMode = 'card' | 'grid';

const STORAGE_KEY = 'drinkgo.admin.viewMode';
let memoryFallback: AdminViewMode = 'card';

export function parseViewMode(raw: unknown): AdminViewMode {
  return raw === 'grid' ? 'grid' : 'card';
}

export function getSavedViewMode(): AdminViewMode {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return parseViewMode(window.localStorage.getItem(STORAGE_KEY));
    }
  } catch {
    // ignore storage errors
  }
  return memoryFallback;
}

export function saveViewMode(mode: AdminViewMode): void {
  memoryFallback = parseViewMode(mode);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, memoryFallback);
    }
  } catch {
    // ignore storage errors
  }
}

interface Props {
  mode: AdminViewMode;
  onChange: (mode: AdminViewMode) => void;
  title?: string;
  count?: number;
  extra?: React.ReactNode;
}

export const ViewModeToggle: React.FC<Props> = ({ mode, onChange, title, count, extra }) => {
  const { t } = useI18n();
  const handleSelect = (next: AdminViewMode) => {
    saveViewMode(next);
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {title && (
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            {title} {typeof count === 'number' ? <span className="dg-num" style={{ color: '#64748B', fontWeight: 600 }}>({count})</span> : ''}
          </div>
        )}
        {extra}
      </div>

      <div style={{ display: 'inline-flex', background: '#F1F5F9', border: '1px solid #E2E8F0', padding: 3, borderRadius: 9, gap: 3 }}>
        <button
          type="button"
          onClick={() => handleSelect('card')}
          className="dg-btn-icon"
          style={{
            minHeight: 30,
            padding: '0 10px',
            borderRadius: 7,
            border: 'none',
            background: mode === 'card' ? '#FFFFFF' : 'transparent',
            color: mode === 'card' ? '#0F172A' : '#64748B',
            boxShadow: mode === 'card' ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <IconCards size={13} />
          <span>{t('adminCardView')}</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelect('grid')}
          className="dg-btn-icon"
          style={{
            minHeight: 30,
            padding: '0 10px',
            borderRadius: 7,
            border: 'none',
            background: mode === 'grid' ? '#FFFFFF' : 'transparent',
            color: mode === 'grid' ? '#0F172A' : '#64748B',
            boxShadow: mode === 'grid' ? '0 1px 2px rgba(15, 23, 42, 0.08)' : 'none',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <IconGrid size={13} />
          <span>{t('adminGridView')}</span>
        </button>
      </div>
    </div>
  );
};
