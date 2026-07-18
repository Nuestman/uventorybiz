-- OIDC (Google / Microsoft): stable external identity on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_issuer VARCHAR(512);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_sub VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_issuer_sub_unique
  ON users (oauth_issuer, oauth_sub)
  WHERE oauth_issuer IS NOT NULL AND oauth_sub IS NOT NULL;
