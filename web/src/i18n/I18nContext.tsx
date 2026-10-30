import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getLocaleDirection,
  isRtlLocale,
  LocaleCode,
  resolveInitialLocale,
  saveLocalePreference,
  TextDirection,
  translate,
  TranslationKey,
} from './index';

export interface I18nContextValue {
  locale: LocaleCode;
  dir: TextDirection;
  isRtl: boolean;
  setLocale: (next: LocaleCode) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const DEFAULT_CONTEXT: I18nContextValue = {
  locale: 'th',
  dir: 'ltr',
  isRtl: false,
  setLocale: () => {},
  t: (key, params) => translate('th', key, params),
};

const I18nContext = createContext<I18nContextValue>(DEFAULT_CONTEXT);

interface ProviderProps {
  initialLocale?: LocaleCode;
  children?: React.ReactNode;
}

export const I18nProvider: React.FC<ProviderProps> = ({ initialLocale, children }) => {
  const [locale, setLocaleState] = useState<LocaleCode>(() => initialLocale ?? resolveInitialLocale());

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    saveLocalePreference(next);
  }, []);

  const dir = getLocaleDirection(locale);
  const isRtl = isRtlLocale(locale);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir, isRtl, setLocale, t }),
    [locale, dir, isRtl, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
