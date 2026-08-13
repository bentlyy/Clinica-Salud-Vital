-- 013: User sessions (active devices per user)
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  CONSTRAINT fk_us_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_us_user_active ON user_sessions(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_us_tenant ON user_sessions(tenant_id, revoked_at);

-- Link refresh tokens to their parent session (rotation keeps same session_id)
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS session_id INT;
CREATE INDEX IF NOT EXISTS idx_rt_session ON refresh_tokens(session_id);
