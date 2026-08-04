-- Adds cash as a way to settle the BALANCE leg, and a worker-confirmation step in front of
-- closing a job out. Two new enum values, no new columns:
--
--   tasks.status    gains 'AWAITING_PAYMENT' - the worker has finished the work but the
--                   closing payment is still outstanding.
--   payments.provider gains 'CASH' - money handed over in person, which no gateway can
--                   verify, so the row stays PENDING until the assigned worker confirms it.
--
-- Both columns are already VARCHAR(20) and both new values fit, so there is no DDL here at
-- all - Hibernate stores these enums by name and the widths are unchanged.
--
-- This reverses the note in add-balance-payments.sql: a task no longer stays COMPLETED
-- through settlement. COMPLETED now means "done AND paid for", and it is the balance
-- settling that produces it. That is the point of the change - a task used to read
-- "completed" while 90% of the money was still owed.
--
-- There is no Flyway or Liquibase in this project, so this is applied by hand:
--     mysql -u root -p sewasathi < add-cash-balance-confirmation.sql
--
-- Tests are unaffected: the test profile builds H2 from scratch with create-drop.

-- The backfill that matters. Under the new rules the balance can only be paid on a task in
-- AWAITING_PAYMENT, so any task already sitting at COMPLETED with an unsettled balance would
-- become unpayable - the customer would have no way to hand over the rest of the money, and
-- the worker no way to be paid it. Moving those back to AWAITING_PAYMENT puts them where the
-- new flow expects them. Tasks that were genuinely paid in full are left alone.
UPDATE tasks t
   SET t.status = 'AWAITING_PAYMENT'
 WHERE t.status = 'COMPLETED'
   AND NOT EXISTS (
       SELECT 1
         FROM payments p
        WHERE p.task_id = t.id
          AND p.type = 'BALANCE'
          AND p.status = 'COMPLETED');
