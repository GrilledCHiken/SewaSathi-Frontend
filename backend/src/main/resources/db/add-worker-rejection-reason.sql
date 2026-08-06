-- The column behind the worker rejection notice.
--
-- This one is NOT a prerequisite: it is a plain new column, and
-- spring.jpa.hibernate.ddl-auto=update adds missing columns on boot. It is written down here so
-- the schema change is reviewable, and so it can be applied deliberately on a database where
-- ddl-auto is turned off (prod runs with validate):
--     mysql -u root -p sewasathi < add-worker-rejection-reason.sql
--
-- No backfill. Workers rejected before this change leave it NULL, and both the email and the
-- in-app banner fall back to their generic wording for those rows.
--
-- Deliberately separate from suspension_reason: a rejection is a decision about an application,
-- a suspension is a lock on an active account, and a worker can be both.

ALTER TABLE users
  ADD COLUMN rejection_reason VARCHAR(500) NULL;
