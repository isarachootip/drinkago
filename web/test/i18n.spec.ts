import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProductionEntryGate } from '../src/components/ProductionEntryGate';
import { StaffLoginCard } from '../src/components/StaffLoginCard';
import { TopAuthBar } from '../src/components/TopAuthBar';
import { RiderJobsPage } from '../src/pages/RiderJobsPage';
import {
  getLocaleDirection,
  isRtlLocale,
  LOCALE_CODES,
  LOCALE_META,
  localeCodeSchema,
  resolveDocumentTitle,
  resolveInitialLocale,
  TRANSLATIONS,
  translate,
} from '../src/i18n';
import { I18nProvider } from '../src/i18n/I18nContext';

describe('Multi-Language i18n Engine (9 Languages + RTL Support)', () => {
  it('รองรับครบทั้ง 9 ภาษาตามข้อกำหนด (th, en, lo, ms, zh, ar, de, he, ru) และตรวจสอบด้วย Zod', () => {
    expect(LOCALE_CODES).toEqual(['th', 'en', 'lo', 'ms', 'zh', 'ar', 'de', 'he', 'ru']);
    for (const code of LOCALE_CODES) {
      expect(localeCodeSchema.parse(code)).toBe(code);
      expect(LOCALE_META[code].nativeName.length).toBeGreaterThan(0);
    }
    expect(localeCodeSchema.safeParse('fr').success).toBe(false);
    expect(localeCodeSchema.safeParse('').success).toBe(false);
  });

  it('ระบุทิศทางข้อความ RTL สำหรับภาษาอาหรับ (ar) และฮีบรู/อิสราเอล (he) และ LTR สำหรับภาษาอื่น', () => {
    expect(getLocaleDirection('ar')).toBe('rtl');
    expect(getLocaleDirection('he')).toBe('rtl');
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('he')).toBe(true);

    for (const ltrCode of ['th', 'en', 'lo', 'ms', 'zh', 'de', 'ru'] as const) {
      expect(getLocaleDirection(ltrCode)).toBe('ltr');
      expect(isRtlLocale(ltrCode)).toBe(false);
    }
  });

  it('ทุกภาษาทั้ง 9 ชุดมีคีย์คำแปลครบตรงกับภาษาต้นแบบ 100% โดยไม่มีค่าว่าง', () => {
    const baseKeys = Object.keys(TRANSLATIONS.th).sort();
    expect(baseKeys.length).toBeGreaterThan(100);

    for (const code of LOCALE_CODES) {
      const dict = TRANSLATIONS[code];
      const keys = Object.keys(dict).sort();
      expect(keys).toEqual(baseKeys);
      for (const k of keys) {
        const val = dict[k as keyof typeof dict];
        expect(typeof val).toBe('string');
        expect(val.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('อ่านภาษาเริ่มต้นจาก query (?lang=), liff.state, หรือค่าที่บันทึกไว้ พร้อม fallback เป็น th อย่างปลอดภัย', () => {
    expect(resolveInitialLocale({ search: '?lang=en', stored: 'ru' })).toBe('en');
    expect(resolveInitialLocale({ search: '?tab=events&lang=AR', stored: 'th' })).toBe('ar');
    expect(resolveInitialLocale({ search: '?liff.state=%3Ftab%3Dshop%26lang%3Dhe', stored: null })).toBe('he');
    expect(resolveInitialLocale({ search: '?lang=invalid', stored: 'de' })).toBe('de');
    expect(resolveInitialLocale({ search: '', stored: 'zh' })).toBe('zh');
    expect(resolveInitialLocale({ search: '', stored: 'unknown' })).toBe('th');
    expect(resolveInitialLocale({ search: '', stored: null })).toBe('th');
  });

  it('แปลข้อความและแทนค่าตัวแปร {param} ได้ถูกต้องทุกภาษา รวมถึงสร้างชื่อหน้าเว็บ (Document Title) ตามบทบาทจริง', () => {
    expect(translate('en', 'offlinePending', { count: 3 })).toContain('3');
    expect(translate('ar', 'offlinePending', { count: 5 })).toContain('5');
    expect(translate('ru', 'loginSubmit')).not.toBe(translate('th', 'loginSubmit'));
    expect(translate('lo', 'topGuide')).not.toBe(translate('de', 'topGuide'));
    expect(translate('ms', 'riderTodayJobs')).not.toBe(translate('he', 'riderTodayJobs'));

    const custEventsTitleTh = resolveDocumentTitle('th', 'customer', 'events');
    expect(custEventsTitleTh).not.toContain('ไรเดอร์');
    expect(custEventsTitleTh).toContain('ilife');

    const riderTitleEn = resolveDocumentTitle('en', 'rider');
    expect(riderTitleEn).toContain('Drink&Go');
  });

  it('เรนเดอร์ TopAuthBar, StaffLoginCard และ ProductionEntryGate แบบ Minimal Enterprise (SVG Icons ไร้ Emoji ฉูดฉาด) และสลับภาษาได้ครบ', () => {
    const arLoginHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'ar' },
        React.createElement(StaffLoginCard, { onLoginSuccess: () => {}, onNotify: () => {} }),
      ),
    );
    expect(arLoginHtml).toContain(translate('ar', 'loginHeading'));
    expect(arLoginHtml).toContain('<svg');
    expect(arLoginHtml).not.toContain('🔑');
    expect(arLoginHtml).not.toContain('🟢');

    const ruTopHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'ru' },
        React.createElement(TopAuthBar, {
          identity: {
            displayName: 'Samran',
            username: 'samran',
            lineUserId: 'U123',
            role: 'customer',
            appTab: 'customer',
            isAuthenticated: true,
          },
          activeTab: 'customer',
          showTraining: false,
          onSelectTab: () => {},
          onToggleTraining: () => {},
          onOpenLogin: () => {},
          onLogout: () => {},
          onOpenSettings: () => {},
        }),
      ),
    );
    expect(ruTopHtml).toContain(translate('ru', 'topLogout'));
    expect(ruTopHtml).not.toContain('🚪');
    expect(ruTopHtml).not.toContain('🎓');

    const heGateHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'he' },
        React.createElement(ProductionEntryGate, {
          onOpenStaffLogin: () => {},
          onUnlockDemo: () => {},
        }),
      ),
    );
    expect(heGateHtml).toContain(translate('he', 'gateLineLoginBtn'));
    expect(heGateHtml).not.toContain('💧');
    expect(heGateHtml).not.toContain('🧪');
  });

  it('เรนเดอร์หน้างานไรเดอร์ (RiderJobsPage) แบบ Minimal Enterprise ด้วย SVG Icons ไร้ Emoji และแปล 5 ขั้นตอนได้ครบ', () => {
    const sampleJob = {
      id: '00000000-0000-0000-0000-000000000101',
      code: 'DG-TEST01',
      status: 'PICKED_UP' as const,
      riderId: '00000000-0000-0000-0000-000000000001',
      stationId: 6,
      expectBagReturn: 2,
      paymentMethod: 'PROMPTPAY' as const,
      paymentStatus: 'PENDING_VERIFY' as const,
      totalSatang: 6000,
      customerName: 'อิศระ ชุทิพย์',
      customerPhone: '0812345678',
      address: { label: 'บ้าน', detail: 'สุขุมวิท 50 แขวงพระโขนง', lat: 13.705, lng: 100.601, note: null },
      station: { id: 6, code: 'ST-06', name: 'สาขารัชดา', addressDetail: 'ห้วยขวาง กรุงเทพฯ', lat: 13.78, lng: 100.57 },
    };
    const deRiderHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'de' },
        React.createElement(RiderJobsPage, {
          jobs: [sampleJob],
          selectedJob: sampleJob,
          selectedDetail: null,
          settings: { apiBaseUrl: '', devUser: 'dev-rider', devKey: '', mockGps: true, mockLat: 13.75, mockLng: 100.55 },
          loading: false,
          onSelectJob: () => {},
          onPrimaryAction: () => {},
          onOpenSettings: () => {},
          onRefresh: () => {},
        }),
      ),
    );
    expect(deRiderHtml).toContain(translate('de', 'riderTodayJobs'));
    expect(deRiderHtml).toContain(translate('de', 'rStep4Btn'));
    expect(deRiderHtml).toContain('<svg');
    for (const emoji of ['🏠', '🚰', '🛵', '📋', '🗺️', '📞', '🔄', '⚙️', '👉', '✅', '🔒']) {
      expect(deRiderHtml).not.toContain(emoji);
    }
  });
});
