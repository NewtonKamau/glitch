import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  uploadVideo,
  deleteVideo,
  VIDEO_MAX_SIZE_MB,
  ALLOWED_VIDEO_TYPES,
} from '../services/storage';

export const uploadQuestVideo = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: `Invalid file type: ${file.mimetype}. Allowed: MP4, MOV`,
      });
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > VIDEO_MAX_SIZE_MB) {
      return res.status(400).json({
        error: `File too large (${fileSizeMB.toFixed(1)}MB). Max: ${VIDEO_MAX_SIZE_MB}MB`,
      });
    }

    // Upload the video
    const { url, key } = await uploadVideo(file);

    return res.status(201).json({
      videoUrl: url,
      videoKey: key,
      size: file.size,
      mimetype: file.mimetype,
    });
  } catch (err) {
    console.error('Video upload error:', err);
    return res.status(500).json({ error: 'Failed to upload video' });
  }
};

export const deleteQuestVideo = async (req: AuthRequest, res: Response) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'Video key is required' });
  }

  try {
    await deleteVideo(key);
    return res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    console.error('Video delete error:', err);
    return res.status(500).json({ error: 'Failed to delete video' });
  }
};
