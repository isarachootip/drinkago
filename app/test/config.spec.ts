import { loadConfig } from '../src/config';

const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

describe('การตั้งค่าบนเซิร์ฟเวอร์', () => {
  it('production + dev auth โดยไม่มี DEV_AUTH_KEY = เปิดไม่ขึ้น', () => {
    expect(() => loadConfig(env({ NODE_ENV: 'production', AUTH_MODE: 'dev' }))).toThrow(/DEV_AUTH_KEY/);
    expect(() => loadConfig(env({ NODE_ENV: 'production', AUTH_MODE: 'dev', DEV_AUTH_KEY: 'short' }))).toThrow(/DEV_AUTH_KEY/);
    expect(loadConfig(env({ NODE_ENV: 'production', AUTH_MODE: 'dev', DEV_AUTH_KEY: 'x'.repeat(24) })).AUTH_MODE).toBe('dev');
  });
  it('AUTH_MODE=line ต้องมี LINE_LOGIN_CHANNEL_ID', () => {
    expect(() => loadConfig(env({ AUTH_MODE: 'line' }))).toThrow(/LINE_LOGIN_CHANNEL_ID/);
  });
});

