import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getMessages = async (req: AuthRequest, res: Response) => {
  const { questId } = req.params;
  const { limit = 50, before } = req.query;

  try {
    // Verify user is a participant or creator
    const access = await pool.query(
      `SELECT 1 FROM quests WHERE id = $1 AND creator_id = $2
       UNION
       SELECT 1 FROM quest_participants WHERE quest_id = $1 AND user_id = $2`,
      [questId, req.userId]
    );

    if (access.rows.length === 0) {
      return res.status(403).json({ error: 'You must join the quest to view messages' });
    }

    let query = `
      SELECT cm.*, u.username as sender_username, u.avatar_url as sender_avatar
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.quest_id = $1
    `;
    const params: any[] = [questId];

    if (before) {
      query += ` AND cm.created_at < $${params.length + 1}`;
      params.push(before);
    }

    query += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);

    return res.json({ messages: result.rows.reverse() });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const { questId } = req.params;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  try {
    // Verify user is a participant or creator
    const access = await pool.query(
      `SELECT 1 FROM quests WHERE id = $1 AND creator_id = $2
       UNION
       SELECT 1 FROM quest_participants WHERE quest_id = $1 AND user_id = $2`,
      [questId, req.userId]
    );

    if (access.rows.length === 0) {
      return res.status(403).json({ error: 'You must join the quest to send messages' });
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (quest_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [questId, req.userId, message.trim()]
    );

    // Get sender info
    const sender = await pool.query(
      'SELECT username, avatar_url FROM users WHERE id = $1',
      [req.userId]
    );

    const fullMessage = {
      ...result.rows[0],
      sender_username: sender.rows[0].username,
      sender_avatar: sender.rows[0].avatar_url,
    };

    return res.status(201).json({ message: fullMessage });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
