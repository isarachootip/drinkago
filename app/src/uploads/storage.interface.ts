export interface UploadInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StoredFile {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface FileStorage {
  save(input: UploadInput): Promise<StoredFile>;
  getFilePath(filename: string): Promise<string | null>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
