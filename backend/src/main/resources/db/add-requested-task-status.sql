-- Widens tasks.status to allow REQUESTED, the state a direct hire sits in while the worker
-- decides whether to accept it.
--
-- This one IS a prerequisite. Hibernate maps @Enumerated(STRING) to a native MySQL ENUM on
-- this dialect, and spring.jpa.hibernate.ddl-auto=update only ever adds missing tables and
-- columns - it never issues MODIFY COLUMN. So an existing dev database keeps the old
-- six-value list, and every direct hire fails with a data-truncation error: the customer
-- sees "Task posted, but <worker> could not be sent a request" and the task stays OPEN.
--
-- There is no Flyway or Liquibase in this project, so this is applied by hand:
--     mysql -u root -p sewasathi < add-requested-task-status.sql
--
-- Existing rows are untouched - widening an ENUM's value list rewrites no data. Tests are
-- unaffected: the test profile builds H2 from scratch with create-drop.

ALTER TABLE tasks
  MODIFY COLUMN status
  ENUM('OPEN','REQUESTED','ACCEPTED','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')
  NOT NULL;
