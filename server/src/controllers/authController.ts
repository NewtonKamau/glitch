import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database';
import { generateToken, AuthRequest } from '../middleware/auth';

const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, avatar_url, is_premium, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, email, password_hash, avatar_url, is_premium FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    const { password_hash, ...userWithoutPassword } = user;

    return res.json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.avatar_url, u.bio, u.is_premium, u.quest_count, u.created_at,
              (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
              (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count
       FROM users u
       WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePushToken = async (req: AuthRequest, res: Response) => {
  const { pushToken } = req.body;

  if (!pushToken) {
    return res.status(400).json({ error: 'Push token is required' });
  }

  try {
    await pool.query('UPDATE users SET push_token = $1 WHERE id = $2', [pushToken, req.userId]);
    return res.json({ message: 'Push token updated' });
  } catch (err) {
    console.error('Update push token error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
