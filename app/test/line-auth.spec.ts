import { loadConfig } from '../src/config';
import {
  buildLineAuthorizeUrl,
  LineAuthService,
  sanitizeRedirectTab,
  signLineOauthState,
  verifyLineOauthState,
} from '../src/customers/line-auth.service';
import { Db } from '../src/db/db';

describe('LINE Login OAuth 2.0 & LIFF Helpers', () => {
  const secret = 'test-oauth-state-secret-key-2026';

  it('signLineOauthState & verifyLineOauthState: สร้างและตรวจสอบ state ป้องกัน CSRF พร้อมวันหมดอายุ', () => {
    const now = 1_700_000_000_000;
    const state = signLineOauthState('track', secret, now);
    expect(verifyLineOauthState(state, secret, now + 60_000)).toEqual({ tab: 'track' });

    // ปลอมแปลงลายเซ็น -> ปฏิเสธ
    expect(verifyLineOauthState(`${state}x`, secret, now + 60_000)).toBeNull();

    // หมดอายุเกิน 10 นาที -> ปฏิเสธ
    expect(verifyLineOauthState(state, secret, now + 11 * 60_000)).toBeNull();
  });

  it('sanitizeRedirectTab: อนุญาตเฉพาะแท็บที่ปลอดภัยเท่านั้น', () => {
    expect(sanitizeRedirectTab('events')).toBe('events');
    expect(sanitizeRedirectTab('track')).toBe('track');
    expect(sanitizeRedirectTab('stations')).toBe('stations');
    expect(sanitizeRedirectTab('evil://xss')).toBe('shop');
    expect(sanitizeRedirectTab(undefined)).toBe('shop');
  });

  it('buildLineAuthorizeUrl: สร้าง URL สำหรับ LINE Login OAuth 2.0 (Channel 2012276679) ได้ครบถ้วน', () => {
    const url = buildLineAuthorizeUrl({
      channelId: '2012276679',
      callbackUrl: 'https://idrink.tamadee.online/auth/line/callback',
      state: 'signed-state-123',
    });
    expect(url).toContain('https://access.line.me/oauth2/v2.1/authorize?');
    expect(url).toContain('client_id=2012276679');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fidrink.tamadee.online%2Fauth%2Fline%2Fcallback');
    expect(url).toContain('scope=profile+openid');
    expect(url).toContain('bot_prompt=normal');
  });

  it('ตั้งค่าเริ่มต้น LINE_LIFF_ID เป็น 2012276679-cVW55jug และดึง Channel ID 2012276679 อัตโนมัติได้', () => {
    const cfg = loadConfig({
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://drinkgo:drinkgo@localhost:5433/drinkgo',
      AUTH_MODE: 'dev',
    });
    expect(cfg.LINE_LIFF_ID).toBe('2012276679-cVW55jug');

    const svc = new LineAuthService({} as Db, cfg);
    expect(svc.getEffectiveLoginChannelId()).toBe('2012276679');
    expect(svc.getPublicConfig()).toEqual({
      liffId: '2012276679-cVW55jug',
      loginChannelId: '2012276679',
      oauthEnabled: false,
      oaBasicId: '@157iywjs',
    });
  });
});
