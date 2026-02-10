import { Router } from 'express';
import multer from 'multer';
import { uploadQuestVideo, deleteQuestVideo } from '../controllers/uploadController';
import { authMiddleware } from '../middleware/auth';
import { VIDEO_MAX_SIZE_MB } from '../services/storage';

const router = Router();

// Configure multer for memory storage (buffer → S3 or local disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: VIDEO_MAX_SIZE_MB * 1024 * 1024, // Convert MB to bytes
  },
});

router.use(authMiddleware);

// POST /api/upload/video — Upload a quest video
router.post('/video', upload.single('video'), uploadQuestVideo);

// DELETE /api/upload/video — Delete a quest video
router.delete('/video', deleteQuestVideo);

export default router;
