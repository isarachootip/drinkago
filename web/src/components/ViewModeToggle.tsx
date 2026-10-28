import React from 'react';

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
  const handleSelect = (next: AdminViewMode) => {
    saveViewMode(next);
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {title && (
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F2236' }}>
            {title} {typeof count === 'number' ? `(${count})` : ''}
          </div>
        )}
        {extra}
      </div>

      <div
        style={{
          display: 'inline-flex',
          background: '#E2E8F0',
          padding: 3,
          borderRadius: 10,
          gap: 3,
        }}
      >
        <button
          type="button"
          onClick={() => handleSelect('card')}
          style={{
            minHeight: 32,
            padding: '0 12px',
            borderRadius: 8,
            border: 'none',
            background: mode === 'card' ? '#0B6E8A' : 'transparent',
            color: mode === 'card' ? '#FFFFFF' : '#33475B',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span>▦</span> แบบการ์ด (Card)
        </button>
        <button
          type="button"
          onClick={() => handleSelect('grid')}
          style={{
            minHeight: 32,
            padding: '0 12px',
            borderRadius: 8,
            border: 'none',
            background: mode === 'grid' ? '#0B6E8A' : 'transparent',
            color: mode === 'grid' ? '#FFFFFF' : '#33475B',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span>☰</span> แบบตาราง (Grid)
        </button>
      </div>
    </div>
  );
};
