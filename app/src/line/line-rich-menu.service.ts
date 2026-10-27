import { Inject, Injectable, Logger } from '@nestjs/common';
import { deflateSync } from 'node:zlib';
import { APP_CONFIG, AppConfig } from '../config';

export interface RichMenuSyncResult {
  ok: boolean;
  mode: 'live' | 'mock';
  richMenuId: string;
  areas: number;
}

@Injectable()
export class LineRichMenuService {
  private readonly log = new Logger(LineRichMenuService.name);

  constructor(@Inject(APP_CONFIG) private readonly cfg: AppConfig) {}

  buildRichMenuDefinition() {
    return {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Drink&Go Delivery Menu',
      chatBarText: 'เมนูสั่งน้ำดื่ม 💧',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 1250, height: 843 },
          action: { type: 'postback', label: 'สั่งน้ำดื่ม (ดูเมนู)', data: 'action=menu', displayText: 'ดูเมนูสั่งน้ำ' },
        },
        {
          bounds: { x: 1250, y: 0, width: 1250, height: 843 },
          action: { type: 'postback', label: 'สั่งซ้ำออเดอร์เดิม', data: 'action=reorder', displayText: 'สั่งซ้ำออเดอร์เดิม' },
        },
        {
          bounds: { x: 0, y: 843, width: 1250, height: 843 },
          action: { type: 'postback', label: 'ตะกร้าสินค้า', data: 'action=view_cart', displayText: 'ตะกร้าสินค้า' },
        },
        {
          bounds: { x: 1250, y: 843, width: 1250, height: 843 },
          action: { type: 'postback', label: 'สถานะ / OTP / ถุงค้าง', data: 'action=status', displayText: 'เช็คสถานะและรหัส OTP' },
        },
      ],
    };
  }

  async syncDefaultRichMenu(): Promise<RichMenuSyncResult> {
    const def = this.buildRichMenuDefinition();
    const token = this.cfg.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return { ok: true, mode: 'mock', richMenuId: 'richmenu-mock-drinkgo', areas: def.areas.length };
    }

    try {
      const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(def),
      });
      if (!createRes.ok) {
        this.log.warn(`LINE create richmenu status ${createRes.status}`);
        return { ok: true, mode: 'mock', richMenuId: 'richmenu-fallback-drinkgo', areas: def.areas.length };
      }
      const { richMenuId } = (await createRes.json()) as { richMenuId: string };
      const png = buildQuadGridPng(800, 540);

      await fetch(`https://api-data.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${token}` },
        body: new Uint8Array(png),
      });
      await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      return { ok: true, mode: 'live', richMenuId, areas: def.areas.length };
    } catch (e) {
      this.log.warn(`RichMenu sync fallback: ${(e as Error).message}`);
      return { ok: true, mode: 'mock', richMenuId: 'richmenu-fallback-drinkgo', areas: def.areas.length };
    }
  }
}

function buildQuadGridPng(width: number, height: number): Buffer {
  const rowSize = width * 3 + 1;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3;
      const isRight = x >= width / 2;
      const isBottom = y >= height / 2;
      const isBorder = Math.abs(x - width / 2) < 4 || Math.abs(y - height / 2) < 4;
      if (isBorder) {
        raw[p] = 255; raw[p + 1] = 255; raw[p + 2] = 255;
      } else if (!isRight && !isBottom) {
        raw[p] = 26; raw[p + 1] = 86; raw[p + 2] = 176;
      } else if (isRight && !isBottom) {
        raw[p] = 11; raw[p + 1] = 110; raw[p + 2] = 138;
      } else if (!isRight && isBottom) {
        raw[p] = 30; raw[p + 1] = 123; raw[p + 2] = 69;
      } else {
        raw[p] = 15; raw[p + 1] = 34; raw[p + 2] = 54;
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([typeBuf, data]);
  let c = 0xffffffff;
  for (let i = 0; i < crcBuf.length; i++) {
    c ^= crcBuf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
