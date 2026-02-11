import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { awardXP } from '../utils/gamification';

// Add a review
export const addReview = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // questId
  const { score, comment } = req.body;

  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Score must be between 1 and 5' });
  }

  try {
    // Check if user already reviewed
    const existing = await pool.query(
      'SELECT id FROM quest_reviews WHERE quest_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this quest' });
    }

    const result = await pool.query(
      `INSERT INTO quest_reviews (quest_id, user_id, score, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, req.userId, score, comment]
    );

    // Award XP (5 XP per review)
    // We assert req.userId! because AuthRequest ensures it's set
    await awardXP(req.userId!, 5);

    return res.status(201).json({ review: result.rows[0] });
  } catch (err) {
    console.error('Add review error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get reviews for a quest
export const getReviews = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // questId

  try {
    const result = await pool.query(
      `SELECT r.id, r.score, r.comment, r.created_at,
              u.username, u.avatar_url
       FROM quest_reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.quest_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    return res.json({ reviews: result.rows });
  } catch (err) {
    console.error('Get reviews error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
