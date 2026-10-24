import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public, Roles } from '../common/auth';
import { DomainError } from '../common/errors';
import { FILE_STORAGE, FileStorage } from './storage.interface';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('uploads')
export class UploadsController {
  constructor(@Inject(FILE_STORAGE) private readonly storage: FileStorage) {}

  @Post()
  @Roles('rider', 'warehouse', 'admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new DomainError(400, 'FILE_REQUIRED', 'กรุณาแนบไฟล์รูปภาพ');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new DomainError(
        400,
        'INVALID_FILE_TYPE',
        'รองรับเฉพาะไฟล์รูปภาพ jpeg, png, webp เท่านั้น',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new DomainError(400, 'FILE_TOO_LARGE', 'ขนาดไฟล์ต้องไม่เกิน 5 MB');
    }

    const stored = await this.storage.save({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    return { url: stored.url };
  }

  @Get(':filename')
  @Public()
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = await this.storage.getFilePath(filename);
    if (!filePath) {
      throw new DomainError(404, 'FILE_NOT_FOUND', 'ไม่พบไฟล์');
    }
    return res.sendFile(filePath);
  }
}
