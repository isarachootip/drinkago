import { ar } from './locales/ar';
import { de } from './locales/de';
import { en } from './locales/en';
import { he } from './locales/he';
import { lo } from './locales/lo';
import { ms } from './locales/ms';
import { ru } from './locales/ru';
import { th } from './locales/th';
import { zh } from './locales/zh';
import {
  LOCALE_CODES,
  LOCALE_META,
  LocaleCode,
  localeCodeSchema,
  LocaleMeta,
  TextDirection,
  TranslationDict,
  TranslationKey,
} from './types';

export {
  LOCALE_CODES,
  LOCALE_META,
  localeCodeSchema,
  type LocaleCode,
  type LocaleMeta,
  type TextDirection,
  type TranslationDict,
  type TranslationKey,
};

export const LOCALE_STORAGE_KEY = 'drinkgo.locale';

export const TRANSLATIONS: Record<LocaleCode, TranslationDict> = {
  th,
  en,
  lo,
  ms,
  zh,
  ar,
  de,
  he,
  ru,
};

export function getLocaleDirection(locale: LocaleCode): TextDirection {
  return LOCALE_META[locale].dir;
}

export function isRtlLocale(locale: LocaleCode): boolean {
  return LOCALE_META[locale].dir === 'rtl';
}

function parseLocaleCandidate(raw: string | null | undefined): LocaleCode | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  const parsed = localeCodeSchema.safeParse(cleaned);
  return parsed.success ? parsed.data : null;
}

export function resolveInitialLocale(options?: {
  search?: string;
  stored?: string | null;
}): LocaleCode {
  try {
    const search =
      options?.search !== undefined
        ? options.search
        : typeof window !== 'undefined'
          ? window.location.search
          : '';
    if (search) {
      const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
      const direct = parseLocaleCandidate(params.get('lang'));
      if (direct) return direct;

      const liffState = params.get('liff.state');
      if (liffState) {
        const qIdx = liffState.indexOf('?');
        const stateQuery = qIdx >= 0 ? liffState.slice(qIdx + 1) : liffState;
        const fromState = parseLocaleCandidate(new URLSearchParams(stateQuery).get('lang'));
        if (fromState) return fromState;
      }
    }

    const storedVal =
      options?.stored !== undefined
        ? options.stored
        : typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem(LOCALE_STORAGE_KEY)
          : null;
    const fromStorage = parseLocaleCandidate(storedVal);
    if (fromStorage) return fromStorage;
  } catch {
    // Ignore storage/URL parsing errors in restricted WebViews
  }
  return 'th';
}

export function saveLocalePreference(locale: LocaleCode): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  } catch {
    // Ignore storage quota/privacy errors
  }
}

export function translate(
  locale: LocaleCode,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.th;
  const template = dict[key] ?? TRANSLATIONS.th[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const val = params[token];
    return val !== undefined ? String(val) : `{${token}}`;
  });
}

export function resolveDocumentTitle(
  locale: LocaleCode,
  activeTab: 'customer' | 'rider' | 'admin',
  custScreen: 'shop' | 'track' | 'stations' | 'events' = 'shop',
): string {
  if (activeTab === 'rider') return translate(locale, 'titleRiderJobs');
  if (activeTab === 'admin') return translate(locale, 'titleAdmin');
  switch (custScreen) {
    case 'events':
      return translate(locale, 'titleCustomerEvents');
    case 'stations':
      return translate(locale, 'titleCustomerStations');
    case 'track':
      return translate(locale, 'titleCustomerTrack');
    default:
      return translate(locale, 'titleCustomerShop');
  }
}
