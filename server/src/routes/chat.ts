import { Router } from 'express';
import { getMessages, sendMessage } from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/:questId/messages', getMessages);
router.post('/:questId/messages', sendMessage);

export default router;
