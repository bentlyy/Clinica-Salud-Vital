-- 024: Add token_family for refresh token reuse detection + cleanup indexes
-- token_family groups all refresh tokens issued from a single login session.
-- If a revoked token is reused, all tokens in that family are revoked (reuse detection).

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_family TEXT;

-- Backfill existing tokens: each user gets one family per oldest non-revoked token
UPDATE refresh_tokens
SET token_family = 'legacy-' || user_id || '-' || id
WHERE token_family IS NULL;

-- Indexes for cleanup performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expired
  ON refresh_tokens(expires_at) WHERE revoked = false;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
  ON refresh_tokens(token_family) WHERE revoked = false;

CREATE INDEX IF NOT EXISTS idx_user_sessions_expired
  ON user_sessions(expires_at) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_orphan_check
  ON user_sessions(revoked_at, expires_at) WHERE revoked_at IS NULL;

-- Index for password_reset_tokens cleanup
CREATE INDEX IF NOT EXISTS idx_password_reset_expired
  ON password_reset_tokens(expires_at) WHERE used = false;
