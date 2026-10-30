import { z } from 'zod';
import type { th } from './locales/th';

export const LOCALE_CODES = ['th', 'en', 'lo', 'ms', 'zh', 'ar', 'de', 'he', 'ru'] as const;

export const localeCodeSchema = z.enum(LOCALE_CODES);
export type LocaleCode = z.infer<typeof localeCodeSchema>;
export type TextDirection = 'ltr' | 'rtl';

export interface LocaleMeta {
  code: LocaleCode;
  shortLabel: string;
  nativeName: string;
  englishName: string;
  dir: TextDirection;
}

export const LOCALE_META: Record<LocaleCode, LocaleMeta> = {
  th: { code: 'th', shortLabel: 'TH', nativeName: 'ไทย', englishName: 'Thai', dir: 'ltr' },
  en: { code: 'en', shortLabel: 'EN', nativeName: 'English', englishName: 'English', dir: 'ltr' },
  lo: { code: 'lo', shortLabel: 'LO', nativeName: 'ລາວ', englishName: 'Lao', dir: 'ltr' },
  ms: { code: 'ms', shortLabel: 'MS', nativeName: 'Bahasa Melayu', englishName: 'Malay', dir: 'ltr' },
  zh: { code: 'zh', shortLabel: 'ZH', nativeName: '中文', englishName: 'Chinese', dir: 'ltr' },
  ar: { code: 'ar', shortLabel: 'AR', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl' },
  de: { code: 'de', shortLabel: 'DE', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr' },
  he: { code: 'he', shortLabel: 'HE', nativeName: 'עברית', englishName: 'Hebrew', dir: 'rtl' },
  ru: { code: 'ru', shortLabel: 'RU', nativeName: 'Русский', englishName: 'Russian', dir: 'ltr' },
};

export type TranslationKey = keyof typeof th;
export type TranslationDict = Record<TranslationKey, string>;
