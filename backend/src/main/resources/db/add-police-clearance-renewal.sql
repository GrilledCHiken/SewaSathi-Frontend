-- Columns behind the six-month police clearance renewal rule.
--
-- This one is NOT a prerequisite: they are plain new columns, and
-- spring.jpa.hibernate.ddl-auto=update adds missing columns on boot. It is written down here
-- so the schema change is reviewable, and so it can be applied deliberately on a database
-- where ddl-auto is turned off:
--     mysql -u root -p sewasathi < add-police-clearance-renewal.sql
--
-- No backfill of police_clearance_uploaded_at is needed. Rows written before this change
-- leave it NULL, and WorkerProfile.getEffectiveClearanceUploadedAt() measures their expiry
-- from verification_submitted_at instead.
--
-- The pending_* pair holds a replacement report that an admin has not reviewed yet. It is
-- deliberately separate from police_clearance_url so a worker stays APPROVED and keeps
-- working while the renewal is in the queue; approval promotes pending -> active and is the
-- only thing that restarts the six-month clock.

ALTER TABLE worker_profiles
  ADD COLUMN police_clearance_uploaded_at DATETIME NULL,
  ADD COLUMN pending_police_clearance_url VARCHAR(500) NULL,
  ADD COLUMN pending_police_clearance_uploaded_at DATETIME NULL;
