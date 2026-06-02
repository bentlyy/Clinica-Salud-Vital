ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);
