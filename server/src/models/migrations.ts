import pool from '../config/database';

export const runMigrations = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable PostGIS extension (will work when PostGIS is available)
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        is_premium BOOLEAN DEFAULT FALSE,
        quest_count INTEGER DEFAULT 0,
        push_token VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Quests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(100) NOT NULL,
        description TEXT,
        creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        video_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        max_participants INTEGER DEFAULT 10,
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

    // Quest participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quest_participants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(quest_id, user_id)
      );
    `);

    // Chat messages table (ephemeral - tied to quest)
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quests_location ON quests(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_quests_active ON quests(is_active, expires_at);
      CREATE INDEX IF NOT EXISTS idx_quests_creator ON quests(creator_id);
      CREATE INDEX IF NOT EXISTS idx_quest_participants_quest ON quest_participants(quest_id);
      CREATE INDEX IF NOT EXISTS idx_quest_participants_user ON quest_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_quest ON chat_messages(quest_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Database migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
};
