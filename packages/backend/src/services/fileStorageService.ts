import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export interface FileUploadResult {
  url: string;
  filename: string;
  originalName: string;
  size: number;
}

export class FileStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectories();
  }

  private async ensureUploadDirectories(): Promise<void> {
    const directories = [
      this.uploadDir,
      path.join(this.uploadDir, 'menu'),
      path.join(this.uploadDir, 'profiles'),
      path.join(this.uploadDir, 'temp')
    ];

    for (const dir of directories) {
      try {
        await access(dir);
      } catch {
        await mkdir(dir, { recursive: true });
      }
    }
  }

  async uploadMenuImage(file: any): Promise<FileUploadResult> {
    // In production, this would upload to S3
    // For now, we'll just return the local file path
    const filename = this.generateUniqueFilename(file.originalname);
    const relativePath = `/uploads/menu/${filename}`;
    
    return {
      url: relativePath,
      filename,
      originalName: file.originalname,
      size: file.size
    };
  }

  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    return `menu-${timestamp}-${random}${ext}`;
  }

  // Future S3 implementation would go here
  async uploadToS3(file: any, bucket: string, key: string): Promise<FileUploadResult> {
    // TODO: Implement S3 upload using AWS SDK
    // This is a placeholder for future S3 integration
    throw new Error('S3 upload not implemented yet');
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      await promisify(fs.unlink)(fullPath);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }
}

export const fileStorageService = new FileStorageService();