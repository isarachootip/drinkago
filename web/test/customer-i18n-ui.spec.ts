import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CustomerAddressCard } from '../src/components/CustomerAddressCard';
import { CustomerProductCartList } from '../src/components/CustomerProductCartList';
import { translate } from '../src/i18n';
import { I18nProvider } from '../src/i18n/I18nContext';
import { AdminPage } from '../src/pages/AdminPage';
import { CustomerEventsPage } from '../src/pages/CustomerEventsPage';
import { CustomerStationsPage } from '../src/pages/CustomerStationsPage';

describe('Customer LIFF Screens — Minimal Enterprise UI & 9-Language i18n', () => {
  it('เรนเดอร์หน้ากิจกรรมพบปะ (CustomerEventsPage) ได้ทั้งภาษาจีน (zh) และลาว (lo) ด้วย SVG Icons ไร้ Emoji', () => {
    const zhHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'zh' },
        React.createElement(CustomerEventsPage, { onNotify: () => {} }),
      ),
    );
    expect(zhHtml).toContain(translate('zh', 'eventsTitle'));
    expect(zhHtml).toContain('<svg');
    for (const emoji of ['📅', '📋', '🟢', '🔵', '⚪', '🗓️', '⏰', '📍', '📞', '🗺️']) {
      expect(zhHtml).not.toContain(emoji);
    }

    const loHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'lo' },
        React.createElement(CustomerEventsPage, { onNotify: () => {} }),
      ),
    );
    expect(loHtml).toContain(translate('lo', 'eventsTitle'));
  });

  it('เรนเดอร์หน้าค้นหาตู้เติมน้ำ (CustomerStationsPage) ได้ทั้งภาษามาเลย์ (ms) และอาหรับ (ar) โดยไม่มี Emoji ภูมิภาค', () => {
    const msHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'ms' },
        React.createElement(CustomerStationsPage, { onBackToShop: () => {}, onNotify: () => {} }),
      ),
    );
    expect(msHtml).toContain(translate('ms', 'stationsTitle'));
    expect(msHtml).toContain(translate('ms', 'regionNorth'));
    expect(msHtml).toContain('<svg');
    for (const emoji of ['📍', '💧', '📡', '🔍', '🏙️', '🌾', '⛰️', '🦖', '🌊', '🏝️']) {
      expect(msHtml).not.toContain(emoji);
    }

    const arHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'ar' },
        React.createElement(CustomerStationsPage, { onBackToShop: () => {}, onNotify: () => {} }),
      ),
    );
    expect(arHtml).toContain(translate('ar', 'regionBangkok'));
  });

  it('เรนเดอร์ตะกร้าสินค้าและที่อยู่ลูกค้าแบบ Minimal Enterprise (en / ru) โดยไม่มี Emoji ฉูดฉาด', () => {
    const enCartHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'en' },
        React.createElement(CustomerProductCartList, {
          products: [{ id: 1, sku: 'W-18L', name: 'น้ำดื่มถุง 18L', priceSatang: 6000, isReturnable: true }],
          cart: { 1: 2 },
          bagBalance: 3,
          hasReturnBag: true,
          returnBagQty: 1,
          onChangeCartQty: () => {},
          onToggleReturnBag: () => {},
          onChangeReturnBagQty: () => {},
        }),
      ),
    );
    expect(enCartHtml).toContain(translate('en', 'custReturnBagQuestion'));
    expect(enCartHtml).not.toContain('🛢️');
    expect(enCartHtml).not.toContain('📦');

    const ruAddrHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'ru' },
        React.createElement(CustomerAddressCard, {
          addresses: [{ id: '00000000-0000-0000-0000-000000000001', label: 'Home', detail: 'Sukhumvit 50', lat: 13.705, lng: 100.601 }],
          activeAddr: { id: '00000000-0000-0000-0000-000000000001', label: 'Home', detail: 'Sukhumvit 50', lat: 13.705, lng: 100.601 },
          onSelectAddress: () => {},
          onSaveNewAddress: async () => {},
          onNotify: () => {},
        }),
      ),
    );
    expect(ruAddrHtml).toContain(translate('ru', 'addrEditBtn'));
    expect(ruAddrHtml).not.toContain('🏠');
    expect(ruAddrHtml).not.toContain('✏️');
  });

  it('เรนเดอร์หน้าหลังบ้าน (AdminPage) แบบ Minimal Enterprise (he / en) พร้อม SVG Icons ไร้ Emoji', () => {
    const heAdminHtml = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        { initialLocale: 'he' },
        React.createElement(AdminPage, {
          staffSession: {
            token: 'tok-test',
            user: { id: 'u-admin', lineUserId: 'dev-admin', username: 'admin', name: 'Admin', role: 'admin' },
          },
          onLogout: () => {},
          onNotify: () => {},
        }),
      ),
    );
    expect(heAdminHtml).toContain(translate('he', 'adminHeaderTitle'));
    expect(heAdminHtml).toContain(translate('he', 'adminTabUsers'));
    expect(heAdminHtml).toContain('<svg');
    for (const emoji of ['🔐', '🔄', '🚪', '👤', '🛒', '📅', '🚰', '🛵', '🏠', '🚨', '📚']) {
      expect(heAdminHtml).not.toContain(emoji);
    }
  });
});
