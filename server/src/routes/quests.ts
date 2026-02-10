import { Router } from 'express';
import { createQuest, getNearbyQuests, getQuestById, joinQuest, leaveQuest } from '../controllers/questController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createQuest);
router.get('/nearby', getNearbyQuests);
router.get('/:id', getQuestById);
router.post('/:id/join', joinQuest);
router.delete('/:id/leave', leaveQuest);

export default router;
