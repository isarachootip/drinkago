import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StaffLoginCard } from '../src/components/StaffLoginCard';
import { pickDefaultTrackedOrderId, shouldShowCustomerOtp } from '../src/domain/customer-track';
import { buildWebLineOauthStartUrl, lineAuthConfigSchema } from '../src/domain/liff-auth';
import { isDemoUnlocked, resolveInitialOrderId, resolveInitialQueryTab } from '../src/domain/session-gate';

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

  it('resolveInitialOrderId & buildWebLineOauthStartUrl: อ่าน orderId จาก query และ liff.state พร้อมส่งต่อใน OAuth URL', () => {
    expect(resolveInitialOrderId('?tab=track&orderId=550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expect(resolveInitialOrderId('?liff.state=%3Ftab%3Dtrack%26orderId%3Dord-uuid-88')).toBe('ord-uuid-88');
    expect(resolveInitialOrderId('?orderId=<script>evil</script>')).toBeNull();
    expect(resolveInitialOrderId('')).toBeNull();

    expect(buildWebLineOauthStartUrl('https://idrink.tamadee.online/', 'track', 'ord-uuid-88')).toBe(
      'https://idrink.tamadee.online/auth/line/start?tab=track&orderId=ord-uuid-88',
    );
  });

  it('isDemoUnlocked: ปลดล็อกอัตโนมัติเฉพาะแท็บสาธารณะ (events/stations) ส่วน tab=track ต้องยืนยันตัวตนบัญชี LINE ก่อน', () => {
    expect(isDemoUnlocked('?tab=events')).toBe(true);
    expect(isDemoUnlocked('?tab=stations')).toBe(true);
    expect(isDemoUnlocked('?tab=track')).toBe(false);
  });

  it('pickDefaultTrackedOrderId & shouldShowCustomerOtp: เลือกออเดอร์ที่กำลังส่งก่อนออเดอร์ที่ยกเลิก และซ่อน OTP หลังส่งจบ', () => {
    const sample = [
      { id: 'ord-cxl', status: 'CANCELLED' },
      { id: 'ord-delivering', status: 'OUT_FOR_DELIVERY' },
      { id: 'ord-done', status: 'CLOSED_WITH_RETURN' },
    ];
    expect(pickDefaultTrackedOrderId(sample, 'ord-done')).toBe('ord-done');
    expect(pickDefaultTrackedOrderId(sample, 'ord-not-mine')).toBe('ord-delivering');
    expect(pickDefaultTrackedOrderId(sample, null)).toBe('ord-delivering');
    expect(pickDefaultTrackedOrderId([{ id: 'ord-done', status: 'CLOSED_WITH_RETURN' }], null)).toBe('ord-done');
    expect(pickDefaultTrackedOrderId([], null)).toBeNull();

    expect(shouldShowCustomerOtp('CONFIRMED')).toBe(true);
    expect(shouldShowCustomerOtp('OUT_FOR_DELIVERY')).toBe(true);
    expect(shouldShowCustomerOtp('DELIVERED')).toBe(false);
    expect(shouldShowCustomerOtp('CLOSED_WITH_RETURN')).toBe(false);
    expect(shouldShowCustomerOtp('CANCELLED')).toBe(false);
  });

  it('StaffLoginCard: ไม่แสดงกรอบปุ่มช่วยกรอกบัญชีมาตรฐานสำหรับทดสอบ แต่ยังคงมีปุ่มเข้าสู่ระบบด้วย LINE และช่อง Username/Password', () => {
    const html = renderToStaticMarkup(
      React.createElement(StaffLoginCard, {
        onLoginSuccess: () => {},
        onNotify: () => {},
      }),
    );
    expect(html).not.toContain('ปุ่มช่วยกรอกบัญชีมาตรฐานสำหรับทดสอบ');
    expect(html).not.toContain('Admin (admin)');
    expect(html).not.toContain('Rider (rider)');
    expect(html).not.toContain('คลัง (warehouse)');
    expect(html).not.toContain('ลูกค้า (customer)');
    expect(html).toContain('ลูกค้า: เข้าสู่ระบบด้วย LINE');
    expect(html).toContain('ชื่อผู้ใช้ (Username)');
    expect(html).toContain('รหัสผ่าน (Password)');
  });
});
