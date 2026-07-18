-- Track last in-app release note acknowledged per staff user and portal user

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_acknowledged_release_version VARCHAR(32);

ALTER TABLE portal_users
  ADD COLUMN IF NOT EXISTS last_acknowledged_release_version VARCHAR(32);
