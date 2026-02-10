import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

const QUEST_EXPIRY_HOURS = 3;

export const createQuest = async (req: AuthRequest, res: Response) => {
  const { title, description, latitude, longitude, category, maxParticipants } = req.body;

  if (!title || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Title, latitude, and longitude are required' });
  }

  try {
    // Check if free user has reached quest limit (1 per day)
    const userResult = await pool.query('SELECT is_premium FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];

    if (!user.is_premium) {
      const todayQuests = await pool.query(
        `SELECT COUNT(*) FROM quests
         WHERE creator_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
        [req.userId]
      );
      if (parseInt(todayQuests.rows[0].count) >= 1) {
        return res.status(403).json({
          error: 'Free users can create 1 quest per day. Upgrade to GLITCH+ for unlimited quests!'
        });
      }
    }

    const expiresAt = new Date(Date.now() + QUEST_EXPIRY_HOURS * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO quests (title, description, creator_id, latitude, longitude, category, max_participants, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description || '', req.userId, latitude, longitude, category || 'general', maxParticipants || 10, expiresAt]
    );

    // Increment user's quest count
    await pool.query('UPDATE users SET quest_count = quest_count + 1 WHERE id = $1', [req.userId]);

    return res.status(201).json({ quest: result.rows[0] });
  } catch (err) {
    console.error('Create quest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNearbyQuests = async (req: AuthRequest, res: Response) => {
  const { lat, lng, radius = 5 } = req.query; // radius in km

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const radiusKm = parseFloat(radius as string);

  try {
    // Haversine formula to find quests within radius
    const result = await pool.query(
      `SELECT q.*, u.username as creator_username, u.avatar_url as creator_avatar,
              (SELECT COUNT(*) FROM quest_participants WHERE quest_id = q.id) as participant_count,
              (6371 * acos(
                cos(radians($1)) * cos(radians(q.latitude)) *
                cos(radians(q.longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(q.latitude))
              )) AS distance_km
       FROM quests q
       JOIN users u ON q.creator_id = u.id
       WHERE q.is_active = true
         AND q.expires_at > NOW()
         AND (6371 * acos(
                cos(radians($1)) * cos(radians(q.latitude)) *
                cos(radians(q.longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(q.latitude))
              )) <= $3
       ORDER BY distance_km ASC
       LIMIT 50`,
      [latitude, longitude, radiusKm]
    );

    return res.json({ quests: result.rows });
  } catch (err) {
    console.error('Get nearby quests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuestById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT q.*, u.username as creator_username, u.avatar_url as creator_avatar,
              (SELECT COUNT(*) FROM quest_participants WHERE quest_id = q.id) as participant_count
       FROM quests q
       JOIN users u ON q.creator_id = u.id
       WHERE q.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quest not found' });
    }

    // Get participants
    const participants = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, qp.joined_at
       FROM quest_participants qp
       JOIN users u ON qp.user_id = u.id
       WHERE qp.quest_id = $1
       ORDER BY qp.joined_at ASC`,
      [id]
    );

    return res.json({ quest: result.rows[0], participants: participants.rows });
  } catch (err) {
    console.error('Get quest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinQuest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Check quest exists and is active
    const questResult = await pool.query(
      'SELECT * FROM quests WHERE id = $1 AND is_active = true AND expires_at > NOW()',
      [id]
    );

    if (questResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quest not found or has expired' });
    }

    const quest = questResult.rows[0];

    // Check if already joined
    const existingParticipant = await pool.query(
      'SELECT id FROM quest_participants WHERE quest_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (existingParticipant.rows.length > 0) {
      return res.status(409).json({ error: 'You have already joined this quest' });
    }

    // Check max participants
    const participantCount = await pool.query(
      'SELECT COUNT(*) FROM quest_participants WHERE quest_id = $1',
      [id]
    );

    if (parseInt(participantCount.rows[0].count) >= quest.max_participants) {
      return res.status(403).json({ error: 'Quest is full' });
    }

    await pool.query(
      'INSERT INTO quest_participants (quest_id, user_id) VALUES ($1, $2)',
      [id, req.userId]
    );

    return res.status(201).json({ message: 'Successfully joined quest' });
  } catch (err) {
    console.error('Join quest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const leaveQuest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM quest_participants WHERE quest_id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'You are not a participant of this quest' });
    }

    return res.json({ message: 'Successfully left quest' });
  } catch (err) {
    console.error('Leave quest error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
