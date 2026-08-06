-- Two-factor verification in front of account creation. Registration no longer writes to
-- `users`; it emails a six-digit code and parks the submitted signup in the new table below.
-- The `users` row is inserted only when that code comes back (RegistrationOtpService,
-- AuthService.completeRegistration).
--
-- Note that nothing in `users` changes. Holding the draft in its own table rather than adding
-- an `email_verified` flag keeps unverified addresses out of the accounts table entirely:
-- no half-created account can be signed into, no admin listing or count has to learn to skip
-- them, and a mistyped address stops squatting on the unique email index once its row expires
-- instead of being blocked forever.
--
-- Neither secret is stored in the clear: `password_hash` arrives already BCrypt-hashed, and
-- only the BCrypt of the emailed code is kept.
--
-- On a dev database spring.jpa.hibernate.ddl-auto=update WILL create this table on its own.
-- Production runs ddl-auto=validate (application-prod.properties), so there this file is a
-- prerequisite.
--
-- There is no Flyway or Liquibase in this project, so this is applied by hand:
--     mysql -u root -p sewasathi < add-signup-otp.sql
--
-- Tests are unaffected: the test profile builds H2 from scratch with create-drop.

CREATE TABLE IF NOT EXISTS pending_registrations (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255)   NOT NULL,
    password_hash   VARCHAR(255)   NOT NULL,
    full_name       VARCHAR(150)   NOT NULL,
    phone           VARCHAR(20)    NOT NULL,
    role            VARCHAR(20)    NOT NULL,
    -- Worker-only, carried through so the worker_profiles row can be built at the far end
    -- of the challenge exactly as it would have been at submit time.
    skills          VARCHAR(500)   NULL,
    hourly_rate     DECIMAL(10, 2) NULL,
    location        VARCHAR(120)   NULL,
    bio             VARCHAR(1000)  NULL,
    otp_hash        VARCHAR(255)   NOT NULL,
    challenge_token VARCHAR(36)    NOT NULL,
    attempts        INT            NOT NULL DEFAULT 0,
    expires_at      DATETIME       NOT NULL,
    last_sent_at    DATETIME       NOT NULL,
    created_at      DATETIME       NULL,
    CONSTRAINT idx_pending_registration_email     UNIQUE (email),
    CONSTRAINT idx_pending_registration_challenge UNIQUE (challenge_token)
);

-- Rows past their expiry are deleted nightly by RegistrationOtpService.purgeExpired().
CREATE INDEX idx_pending_registration_expires ON pending_registrations (expires_at);
