-- "Sign in with Google". The browser obtains an ID token from Google and posts it to
-- POST /api/auth/google; the server verifies it (GoogleIdentityService) and either signs an
-- existing account in or creates a new customer. Two things in `users` have to change.
--
-- 1. `password_hash` becomes nullable. An account created through Google genuinely has no
--    password, and null says so. The alternative - storing an unmatchable sentinel - claims a
--    password exists and leaves every reader guessing which strings are real.
--
-- 2. `auth_provider` / `provider_id` come back. `auth_provider` records how the account was
--    created; `provider_id` holds Google's immutable `sub` for a linked account, which is
--    pinned rather than trusting the email alone because a Workspace address can be reassigned
--    to a different person while the subject never changes.
--
-- ---------------------------------------------------------------------------------------
-- READ THIS BEFORE RUNNING, because there are two possible starting states.
-- ---------------------------------------------------------------------------------------
--
-- These columns existed before and were dropped from the *entity* in commit bd190f2, but
-- `db/remove-auth-extras.sql` was only ever applied by hand and may not have been run.
--
--   * If `SHOW COLUMNS FROM users LIKE 'auth_provider'` returns a row, the column survived.
--     Since Hibernate stopped writing it, every INSERT since then omitted it and MySQL
--     supplied the first value of the ENUM - so those rows now read 'FACEBOOK' despite being
--     ordinary password accounts. Run section A. The backfill must happen BEFORE the
--     application starts mapping the field again, or existing users - the admin included -
--     come back as Facebook accounts.
--
--   * If it returns nothing, the column was dropped. Run section B instead.
--
-- Dev runs ddl-auto=update and will add missing columns by itself, but it will NOT relax
-- password_hash to NULL and will NOT backfill, so this script is needed locally too - not
-- only in production, where ddl-auto=validate.
--
-- There is no Flyway or Liquibase in this project, so this is applied by hand:
--     mysql -u root -p sewasathi < add-google-signin.sql
--
-- Tests are unaffected: the test profile builds H2 from scratch with create-drop.


-- ===== Section A: the columns are still present =========================================

-- Rows marked FACEBOOK are an artefact of the unmapped NOT NULL enum, not a real provider.
-- Anything genuinely created through Google would already say GOOGLE.
UPDATE users SET auth_provider = 'LOCAL' WHERE auth_provider <> 'GOOGLE';

-- ENUM('FACEBOOK','GOOGLE','LOCAL') -> the VARCHAR(20) that @Enumerated(STRING) expects, with
-- a default so a stray INSERT can no longer invent a provider.
ALTER TABLE users MODIFY COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE users MODIFY COLUMN provider_id VARCHAR(128) NULL;


-- ===== Section B: the columns were dropped - run this INSTEAD of section A ===============

-- ALTER TABLE users
--   ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
--   ADD COLUMN provider_id   VARCHAR(128) NULL;


-- ===== Both cases ========================================================================

ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Sanity check: no row should read FACEBOOK, and every existing account should still have a
-- password.
--   SELECT auth_provider, COUNT(*) FROM users GROUP BY auth_provider;
--   SELECT COUNT(*) FROM users WHERE password_hash IS NULL;
