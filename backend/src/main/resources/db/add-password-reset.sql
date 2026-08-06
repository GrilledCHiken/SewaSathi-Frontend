-- Self-service password reset. A user who has forgotten their password asks for one by
-- email, gets a six-digit code, and posts a new password back against the row below
-- (PasswordResetService, AuthController /api/auth/password/*).
--
-- Nothing in `users` changes. The reset is a short-lived side quest - most accounts will
-- never have one in flight - so hanging its five columns off the accounts table would mean
-- every row carries bookkeeping that is null almost always. Same reasoning as
-- add-signup-otp.sql, and the two tables are deliberately near-identical.
--
-- Only the hash of the emailed code is kept, never the code.
--
-- `verified_at` is the one thing pending_registrations has no equivalent for: this row has to
-- outlive its code, because the caller still has a password to choose after proving the code.
-- Null there means the code step has not been passed and the reset endpoint refuses.
--
-- On a dev database spring.jpa.hibernate.ddl-auto=update WILL create this table on its own.
-- Production runs ddl-auto=validate (application-prod.properties), so there this file is a
-- prerequisite.
--
-- There is no Flyway or Liquibase in this project, so this is applied by hand:
--     mysql -u root -p sewasathi < add-password-reset.sql
--
-- Tests are unaffected: the test profile builds H2 from scratch with create-drop.

CREATE TABLE IF NOT EXISTS password_reset_challenges (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- Plain id, not a foreign key relation in the entity: the row never reads anything off
    -- the account until the final step.
    user_id         BIGINT       NOT NULL,
    email           VARCHAR(255) NOT NULL,
    otp_hash        VARCHAR(255) NOT NULL,
    challenge_token VARCHAR(36)  NOT NULL,
    attempts        INT          NOT NULL DEFAULT 0,
    expires_at      DATETIME     NOT NULL,
    last_sent_at    DATETIME     NOT NULL,
    verified_at     DATETIME     NULL,
    created_at      DATETIME     NULL,
    CONSTRAINT idx_password_reset_email     UNIQUE (email),
    CONSTRAINT idx_password_reset_challenge UNIQUE (challenge_token)
);

-- Rows past their expiry are deleted nightly by PasswordResetService.purgeExpired().
CREATE INDEX idx_password_reset_expires ON password_reset_challenges (expires_at);
