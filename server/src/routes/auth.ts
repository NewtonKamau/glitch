import { Router } from 'express';
import { register, login, getProfile, updatePushToken } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.post('/push-token', authMiddleware, updatePushToken);

export default router;
