import React from 'react';
import { LOCALE_CODES, LOCALE_META, localeCodeSchema } from '../i18n';
import { useI18n } from '../i18n/I18nContext';
import { IconGlobe } from './icons/Icons';

interface Props {
  variant?: 'dark' | 'light';
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<Props> = ({ variant = 'dark', compact = true }) => {
  const { locale, setLocale, t } = useI18n();
  const isDark = variant === 'dark';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const parsed = localeCodeSchema.safeParse(e.target.value);
    if (parsed.success) {
      setLocale(parsed.data);
    }
  };

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 30,
        padding: '0 8px',
        borderRadius: 7,
        border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid #CBD5E1',
        background: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
        color: isDark ? '#E2E8F0' : '#334155',
        fontSize: 11.5,
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      <IconGlobe size={13} style={{ opacity: 0.85 }} />
      <select
        aria-label={t('langLabel')}
        value={locale}
        onChange={handleChange}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          fontSize: 11.5,
          fontWeight: 500,
          padding: 0,
          outline: 'none',
          cursor: 'pointer',
          boxShadow: 'none',
        }}
      >
        {LOCALE_CODES.map((code) => {
          const meta = LOCALE_META[code];
          return (
            <option key={code} value={code} style={{ color: '#0F172A', background: '#FFFFFF' }}>
              {compact ? `${meta.shortLabel} · ${meta.nativeName}` : `${meta.nativeName} (${meta.englishName})`}
            </option>
          );
        })}
      </select>
    </label>
  );
};
