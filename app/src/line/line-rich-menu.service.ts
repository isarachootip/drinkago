import { Inject, Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { APP_CONFIG, AppConfig } from '../config';
import { FILE_STORAGE, FileStorage } from '../uploads/storage.interface';

export interface RichMenuSyncResult {
  ok: boolean;
  mode: 'live' | 'mock';
  richMenuId: string;
  areas: number;
  imageSource?: 'custom' | 'bundled' | 'generated';
}

@Injectable()
export class LineRichMenuService {
  private readonly log = new Logger(LineRichMenuService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  buildRichMenuDefinition() {
    return {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'ilife Drink&Go 6-Grid Menu',
      chatBarText: 'เมนู ilife สั่งน้ำ & กิจกรรม 💧',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: { type: 'postback', label: 'กิจกรรมพบปะ', data: 'action=events', displayText: 'กิจกรรมพบปะ' },
        },
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: { type: 'postback', label: 'สั่งน้ำดื่ม', data: 'action=menu', displayText: 'สั่งน้ำดื่ม' },
        },
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: { type: 'postback', label: 'ค้นหาตู้เติมน้ำทั่วไทย', data: 'action=find_stations', displayText: 'ค้นหาตู้เติมน้ำทั่วไทย' },
        },
        {
          bounds: { x: 0, y: 843, width: 833, height: 843 },
          action: { type: 'postback', label: 'ติดตามสถานะ', data: 'action=status', displayText: 'ติดตามสถานะ' },
        },
        {
          bounds: { x: 833, y: 843, width: 834, height: 843 },
          action: { type: 'postback', label: 'เป็นเพื่อนกับเรา', data: 'action=share_oa', displayText: 'เป็นเพื่อนกับเรา' },
        },
        {
          bounds: { x: 1667, y: 843, width: 833, height: 843 },
          action: { type: 'postback', label: 'เยี่ยมชมเรา', data: 'action=visit_us', displayText: 'เยี่ยมชมเรา' },
        },
      ],
    };
  }

  private async resolveRichMenuImage(
    imageUrl?: string | null,
  ): Promise<{ buffer: Buffer; contentType: string; source: 'custom' | 'bundled' | 'generated' }> {
    if (imageUrl && imageUrl.trim()) {
      const filename = basename(imageUrl.trim());
      const filePath = await this.storage.getFilePath(filename);
      if (filePath) {
        const buffer = await fs.readFile(filePath);
        const ext = extname(filename).toLowerCase();
        const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
        return { buffer, contentType, source: 'custom' };
      }
    }

    const candidates = [
      resolve(process.cwd(), 'assets', 'richmenu-ilife-default.jpg'),
      join(__dirname, '..', '..', 'assets', 'richmenu-ilife-default.jpg'),
    ];
    for (const candidate of candidates) {
      try {
        const buffer = await fs.readFile(candidate);
        if (buffer.length > 0) {
          return { buffer, contentType: 'image/jpeg', source: 'bundled' };
        }
      } catch {
        // try next path
      }
    }

    return { buffer: buildSixGridPng(900, 606), contentType: 'image/png', source: 'generated' };
  }

  async syncDefaultRichMenu(imageUrl?: string | null): Promise<RichMenuSyncResult> {
    const def = this.buildRichMenuDefinition();
    const img = await this.resolveRichMenuImage(imageUrl);
    const token = this.cfg.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return { ok: true, mode: 'mock', richMenuId: 'richmenu-mock-drinkgo', areas: def.areas.length, imageSource: img.source };
    }

    try {
      const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(def),
      });
      if (!createRes.ok) {
        this.log.warn(`LINE create richmenu status ${createRes.status}`);
        return { ok: true, mode: 'mock', richMenuId: 'richmenu-fallback-drinkgo', areas: def.areas.length, imageSource: img.source };
      }
      const { richMenuId } = (await createRes.json()) as { richMenuId: string };

      await fetch(`https://api-data.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`, {
        method: 'POST',
        headers: { 'Content-Type': img.contentType, Authorization: `Bearer ${token}` },
        body: new Uint8Array(img.buffer),
      });
      await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      return { ok: true, mode: 'live', richMenuId, areas: def.areas.length, imageSource: img.source };
    } catch (e) {
      this.log.warn(`RichMenu sync fallback: ${(e as Error).message}`);
      return { ok: true, mode: 'mock', richMenuId: 'richmenu-fallback-drinkgo', areas: def.areas.length, imageSource: img.source };
    }
  }
}

function buildSixGridPng(width: number, height: number): Buffer {
  const rowSize = width * 3 + 1;
  const raw = Buffer.alloc(rowSize * height);
  const colW = Math.floor(width / 3);
  const rowH = Math.floor(height / 2);
  const palette: [number, number, number][] = [
    [124, 58, 237], [26, 86, 176], [11, 110, 138],
    [16, 152, 104], [6, 199, 85], [24, 119, 242],
  ];
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3;
      const isBorder = Math.abs(x - colW) < 3 || Math.abs(x - colW * 2) < 3 || Math.abs(y - rowH) < 3;
      if (isBorder) {
        raw[p] = 255; raw[p + 1] = 255; raw[p + 2] = 255;
      } else {
        const col = x < colW ? 0 : x < colW * 2 ? 1 : 2;
        const row = y < rowH ? 0 : 1;
        const [r, g, b] = palette[row * 3 + col];
        raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
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
