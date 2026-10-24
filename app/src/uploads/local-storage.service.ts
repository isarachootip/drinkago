import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { APP_CONFIG, AppConfig } from '../config';
import { FileStorage, StoredFile, UploadInput } from './storage.interface';

@Injectable()
export class LocalStorageService implements FileStorage {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async save(input: UploadInput): Promise<StoredFile> {
    const rawExt = extname(input.originalname).toLowerCase();
    const safeExt = this.sanitizeExtension(rawExt, input.mimetype);
    const filename = `${randomUUID()}${safeExt}`;

    const dir = resolve(this.config.UPLOAD_DIR);
    await fs.mkdir(dir, { recursive: true });

    const filePath = resolve(dir, filename);
    await fs.writeFile(filePath, input.buffer);

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
    const filePath = resolve(this.config.UPLOAD_DIR, safeName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
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
