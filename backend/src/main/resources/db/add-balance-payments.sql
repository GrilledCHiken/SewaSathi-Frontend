-- Splits a task's price into two payable legs: the 10% ADVANCE that confirms a booking, and
-- the 90% BALANCE the customer pays once the worker has marked the job complete. Both are
-- rows in `payments`; the new `type` column is what tells them apart.
--
-- Deliberately no new task status. A task stays COMPLETED after the balance settles, and
-- "paid in full" is derived from a COMPLETED payment with type = 'BALANCE'. That keeps every
-- existing count keyed off COMPLETED - reviews, the customer dashboard summary, the public
-- marketing figures, admin analytics - meaning exactly what it did before.
--
-- On a dev database spring.jpa.hibernate.ddl-auto=update WILL add the column on its own, but
-- a NOT NULL column added to a table that already has rows only works because of the DEFAULT
-- below. Production runs ddl-auto=validate (application-prod.properties), so there this file
-- is a prerequisite.
--
-- There is no Flyway or Liquibase in this project, so this is applied by hand:
--     mysql -u root -p sewasathi < add-balance-payments.sql
--
-- Every payment taken before this change was an advance, which is what the backfill records.
-- Tests are unaffected: the test profile builds H2 from scratch with create-drop.

ALTER TABLE payments
  ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'ADVANCE';

-- Belt and braces for a database where the column was added by ddl-auto rather than by the
-- statement above, and so may have landed without the default.
UPDATE payments
   SET type = 'ADVANCE'
 WHERE type IS NULL OR type = '';
