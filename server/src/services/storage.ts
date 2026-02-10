import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Storage mode: 's3' or 'local'
const STORAGE_MODE = process.env.STORAGE_MODE || 'local';
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// S3 config (used when STORAGE_MODE=s3)
const s3Client = process.env.AWS_REGION
  ? new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    })
  : null;

const S3_BUCKET = process.env.S3_BUCKET || '';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || '';

// Ensure local upload directory exists
if (STORAGE_MODE === 'local') {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export const uploadVideo = async (
  file: Express.Multer.File
): Promise<{ url: string; key: string }> => {
  const ext = path.extname(file.originalname) || '.mp4';
  const key = `videos/${uuidv4()}${ext}`;

  if (STORAGE_MODE === 's3' && s3Client) {
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const url = CLOUDFRONT_URL
      ? `${CLOUDFRONT_URL}/${key}`
      : `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;

    return { url, key };
  } else {
    // Store locally
    const localPath = path.join(UPLOAD_DIR, key);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localPath, file.buffer);

    const url = `/uploads/${key}`;
    return { url, key };
  }
};

export const deleteVideo = async (key: string): Promise<void> => {
  if (STORAGE_MODE === 's3' && s3Client) {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
  } else {
    const localPath = path.join(UPLOAD_DIR, key);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
};

// Video constraints
export const VIDEO_MAX_SIZE_MB = 50; // 50MB max
export const VIDEO_MAX_DURATION_SECONDS = 15;
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/mov',
];
