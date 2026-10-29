import { describe, expect, it } from 'vitest';
import { buildWebLineOauthStartUrl, lineAuthConfigSchema } from '../src/domain/liff-auth';
import { resolveInitialQueryTab } from '../src/domain/session-gate';

describe('LINE Login & LIFF Frontend Helpers', () => {
  it('ตรวจสอบโครงสร้างข้อมูล /auth/line/config ด้วย Zod และสร้าง URL OAuth Start ได้ถูกต้อง', () => {
    const cfg = lineAuthConfigSchema.parse({
      liffId: '2012276679-cVW55jug',
      loginChannelId: '2012276679',
      oauthEnabled: true,
      oaBasicId: '@157iywjs',
    });
    expect(cfg.liffId).toBe('2012276679-cVW55jug');
    expect(cfg.loginChannelId).toBe('2012276679');
    expect(cfg.oauthEnabled).toBe(true);
    expect(buildWebLineOauthStartUrl('https://idrink.tamadee.online/', 'track')).toBe(
      'https://idrink.tamadee.online/auth/line/start?tab=track',
    );
  });

  it('resolveInitialQueryTab: อ่านค่า tab ได้ทั้งจาก query ปกติและจาก liff.state ของ LINE LIFF', () => {
    expect(resolveInitialQueryTab('?tab=events')).toBe('events');
    expect(resolveInitialQueryTab('?tab=track')).toBe('track');
    expect(resolveInitialQueryTab('?liff.state=%3Ftab%3Devents')).toBe('events');
    expect(resolveInitialQueryTab('?liff.state=%2F%3Ftab%3Dtrack%26foo%3D1')).toBe('track');
    expect(resolveInitialQueryTab('?tab=unknown')).toBeNull();
    expect(resolveInitialQueryTab('')).toBeNull();
  });
});
