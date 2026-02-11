import { Router } from 'express';
import { getUserProfile, followUser, unfollowUser } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/:id', authMiddleware, getUserProfile as any); // Use as any to bypass express type check if needed
router.post('/:id/follow', authMiddleware, followUser as any);
router.delete('/:id/follow', authMiddleware, unfollowUser as any);

export default router;
