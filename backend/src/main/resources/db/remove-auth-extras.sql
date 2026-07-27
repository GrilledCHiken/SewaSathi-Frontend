-- Removes the schema left behind by two-factor authentication, email verification, social
-- sign-in, and password reset.
--
-- Cleanup, not a prerequisite. spring.jpa.hibernate.ddl-auto=update never drops anything, so
-- deleting the Java fields leaves these columns and tables sitting there unused. Registration
-- was verified working against the existing dev database without running this first -
-- users.auth_provider tolerates the insert - so the only cost of skipping it is dead weight
-- and four tables nothing reads.
--
-- Worth running anyway: an unused NOT NULL column is a trap for the next person who writes an
-- INSERT by hand, and the dangling foreign keys make the schema harder to read.
--
-- There is no Flyway or Liquibase in this project, so this is applied by hand:
--     mysql -u root -p sewasathi < remove-auth-extras.sql
--
-- Tests are unaffected: the test profile builds H2 from scratch with create-drop.

ALTER TABLE users
  DROP COLUMN auth_provider,
  DROP COLUMN provider_id,
  DROP COLUMN two_factor_enabled,
  DROP COLUMN email_verified;

DROP TABLE IF EXISTS otp_tokens;
DROP TABLE IF EXISTS known_devices;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
