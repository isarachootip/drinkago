import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { APP_CONFIG, AppConfig } from '../config';
import { Db, DB } from '../db/db';
import { FileStorage, StoredFile, UploadInput } from './storage.interface';

@Injectable()
export class LocalStorageService implements FileStorage {
  private tableReady = false;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(DB) private readonly db: Db,
  ) {}

  private async ensureTable() {
    if (this.tableReady) return;
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        filename TEXT PRIMARY KEY,
        mimetype TEXT NOT NULL,
        size INTEGER NOT NULL,
        content_base64 TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    this.tableReady = true;
  }

  async save(input: UploadInput): Promise<StoredFile> {
    const rawExt = extname(input.originalname).toLowerCase();
    const safeExt = this.sanitizeExtension(rawExt, input.mimetype);
    const filename = `${randomUUID()}${safeExt}`;

    const dir = resolve(this.config.UPLOAD_DIR);
    await fs.mkdir(dir, { recursive: true });

    const filePath = resolve(dir, filename);
    await fs.writeFile(filePath, input.buffer);

    await this.ensureTable();
    const base64 = input.buffer.toString('base64');
    await this.db.execute(sql`
      INSERT INTO uploaded_files (filename, mimetype, size, content_base64, created_at)
      VALUES (${filename}, ${input.mimetype}, ${input.size}, ${base64}, now())
      ON CONFLICT (filename) DO UPDATE
      SET mimetype = EXCLUDED.mimetype, size = EXCLUDED.size, content_base64 = EXCLUDED.content_base64
    `);

    const baseUrl = this.config.PUBLIC_UPLOAD_BASE_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/${filename}`;

    return {
      url,
      filename,
      size: input.size,
      mimetype: input.mimetype,
    };
  }

  async getFilePath(filename: string): Promise<string | null> {
    const safeName = basename(filename);
    const dir = resolve(this.config.UPLOAD_DIR);
    const filePath = resolve(dir, safeName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      try {
        await this.ensureTable();
        const res = await this.db.execute<{ content_base64: string }>(
          sql`SELECT content_base64 FROM uploaded_files WHERE filename = ${safeName} LIMIT 1`,
        );
        const row = res.rows[0];
        if (!row?.content_base64) return null;
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, Buffer.from(row.content_base64, 'base64'));
        return filePath;
      } catch {
        return null;
      }
    }
  }

  private sanitizeExtension(ext: string, mimetype: string): string {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(ext)) {
      return ext === '.jpeg' ? '.jpg' : ext;
    }
    if (mimetype === 'image/jpeg') return '.jpg';
    if (mimetype === 'image/png') return '.png';
    if (mimetype === 'image/webp') return '.webp';
    return '.bin';
  }
}
