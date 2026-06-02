-- Backfill names for users who have NULL name (column added in 009_add_user_name.sql after users existed)
-- For doctors: use the name from the doctors table
-- For others: use the part of email before @

UPDATE users u
SET name = d.name
FROM doctors d
WHERE u.name IS NULL
  AND d.user_id = u.id
  AND d.name IS NOT NULL;

UPDATE users
SET name = SPLIT_PART(email, '@', 1)
WHERE name IS NULL;
