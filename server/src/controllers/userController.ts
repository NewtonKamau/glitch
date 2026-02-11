import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get public user profile with stats
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio, u.quest_count, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) as is_following
       FROM users u
       WHERE u.id = $2`,
      [req.userId, id] // req.userId is logged-in user, id is profile being viewed
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get user profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Follow a user
export const followUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (id === req.userId) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  try {
    // Check if user exists
    const userExists = await pool.query('SELECT 1 FROM users WHERE id = $1', [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.userId, id]
    );

    return res.json({ message: 'Successfully followed user' });
  } catch (err) {
    console.error('Follow user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Unfollow a user
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM follows
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'You are not following this user' });
    }

    return res.json({ message: 'Successfully unfollowed user' });
  } catch (err) {
    console.error('Unfollow user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
