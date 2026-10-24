import React from 'react';

export const LINE_OA_BASIC_ID = '@157iywjs';
export const LINE_OA_NAME = 'llife';
export const LINE_ADD_FRIEND_URL = `https://line.me/R/ti/p/${LINE_OA_BASIC_ID}`;

interface Props {
  customerUser: string;
}

export const LineBanner: React.FC<Props> = ({ customerUser }) => {
  const isLinkedRealLine = customerUser.startsWith('U') && customerUser.length > 20;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 14px',
        background: '#E8F8EE',
        border: '1px solid #06C755',
        borderRadius: 12,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#058C3B' }}>
          💬 LINE OA: {LINE_OA_NAME} ({LINE_OA_BASIC_ID})
        </span>
        <span style={{ fontSize: 11, color: '#2F4358' }}>
          {isLinkedRealLine
            ? `✅ เชื่อมบัญชี LINE แล้ว (${customerUser.slice(0, 8)}...)`
            : 'แอดเพื่อนและทักแชทเพื่อรับรหัส OTP 4 หลักและลิงก์ผูกบัญชีใน LINE'}
        </span>
      </div>
      <a
        href={LINE_ADD_FRIEND_URL}
        target="_blank"
        rel="noreferrer"
        style={{
          padding: '8px 12px',
          borderRadius: 10,
          background: '#06C755',
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: 700,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        เปิดแชท LINE
      </a>
    </div>
  );
};
