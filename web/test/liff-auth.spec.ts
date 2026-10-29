import { describe, expect, it } from 'vitest';
import { buildWebLineOauthStartUrl, lineAuthConfigSchema } from '../src/domain/liff-auth';

describe('LINE Login & LIFF Frontend Helpers', () => {
  it('ตรวจสอบโครงสร้างข้อมูล /auth/line/config ด้วย Zod และสร้าง URL OAuth Start ได้ถูกต้อง', () => {
    const cfg = lineAuthConfigSchema.parse({
      liffId: '2012276679-abcdefgh',
      loginChannelId: '2012276679',
      oauthEnabled: true,
      oaBasicId: '@157iywjs',
    });
    expect(cfg.loginChannelId).toBe('2012276679');
    expect(cfg.oauthEnabled).toBe(true);
    expect(buildWebLineOauthStartUrl('https://idrink.tamadee.online/', 'track')).toBe(
      'https://idrink.tamadee.online/auth/line/start?tab=track',
    );
  });
});
