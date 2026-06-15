-- 057: Add token_version column to refresh_tokens for token rotation security
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;
