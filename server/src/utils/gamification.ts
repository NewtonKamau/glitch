import pool from '../config/database';

export const awardXP = async (userId: string, amount: number) => {
  try {
    const result = await pool.query(
      'UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp, level',
      [amount, userId]
    );

    if (result.rows.length === 0) return null;

    const { xp, level } = result.rows[0];

    // Calculate new level: Level 1 + floor(XP / 100)
    // 0-99 XP = Level 1
    // 100-199 XP = Level 2
    const calculatedLevel = Math.floor(xp / 100) + 1;

    let leveledUp = false;
    if (calculatedLevel > level) {
      await pool.query('UPDATE users SET level = $1 WHERE id = $2', [calculatedLevel, userId]);
      leveledUp = true;
      console.log(`User ${userId} leveled up to ${calculatedLevel}!`);
    }

    return { xp, level: leveledUp ? calculatedLevel : level, leveledUp };
  } catch (err) {
    console.error('Award XP error:', err);
    throw err; // Allow caller to handle
  }
};
