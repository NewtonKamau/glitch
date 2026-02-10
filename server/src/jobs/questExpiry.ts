import cron from 'node-cron';
import pool from '../config/database';

/**
 * Quest Expiry Job
 * Runs every 5 minutes to deactivate expired quests
 * and clean up associated ephemeral chat messages.
 */
export const startQuestExpiryJob = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Deactivate expired quests
      const result = await pool.query(
        `UPDATE quests
         SET is_active = false
         WHERE is_active = true
           AND expires_at <= NOW()
         RETURNING id, title`
      );

      if (result.rows.length > 0) {
        console.log(`⏰ Expired ${result.rows.length} quest(s):`);
        result.rows.forEach((q) => console.log(`   - ${q.title} (${q.id})`));

        // Clean up ephemeral chat messages for expired quests
        const expiredIds = result.rows.map((q) => q.id);
        await pool.query(
          `DELETE FROM chat_messages
           WHERE quest_id = ANY($1::uuid[])`,
          [expiredIds]
        );

        // Remove participants from expired quests
        await pool.query(
          `DELETE FROM quest_participants
           WHERE quest_id = ANY($1::uuid[])`,
          [expiredIds]
        );

        console.log(`🧹 Cleaned up chat messages and participants for expired quests`);
      }
    } catch (err) {
      console.error('Quest expiry job error:', err);
    }
  });

  console.log('⏰ Quest expiry cron job started (every 5 minutes)');
};

/**
 * Stale Quest Cleanup Job
 * Runs daily at midnight to purge quests that expired more than 24 hours ago.
 */
export const startStaleQuestCleanupJob = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await pool.query(
        `DELETE FROM quests
         WHERE is_active = false
           AND expires_at <= NOW() - INTERVAL '24 hours'
         RETURNING id`
      );

      if (result.rows.length > 0) {
        console.log(`🗑️  Purged ${result.rows.length} stale quest(s) from database`);
      }
    } catch (err) {
      console.error('Stale quest cleanup error:', err);
    }
  });

  console.log('🗑️  Stale quest cleanup cron job started (daily at midnight)');
};
