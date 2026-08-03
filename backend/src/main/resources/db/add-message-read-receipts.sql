-- Adds read receipts to chat: messages.read_at is stamped when the *other* party opens the
-- thread. It backs both the "Seen" tick under a sent bubble and the unread badges on the
-- conversation list and the Messages nav item.
--
-- Chat is one-to-one, so the reader is always the participant who is not sender_id. That is
-- why a single nullable timestamp on the message is enough - there is no conversation table
-- to hang a per-user last_read_at off, since a conversation is derived from the tasks a
-- customer and a worker share (see service/ConversationKey.java).
--
-- On a dev database spring.jpa.hibernate.ddl-auto=update WILL add the column on its own, but
-- it never creates indexes for an existing table - so the index below is the part that
-- actually needs applying by hand. Production runs ddl-auto=validate
-- (application-prod.properties), so there both statements are a prerequisite.
--
-- There is no Flyway or Liquibase in this project, so this is applied by hand:
--     mysql -u root -p sewasathi < add-message-read-receipts.sql
--
-- Existing rows get read_at = NULL, i.e. every message already in the database counts as
-- unread. That is the honest answer - nothing has ever been marked read - and it clears the
-- first time each participant opens their threads. Tests are unaffected: the test profile
-- builds H2 from scratch with create-drop.

-- DATETIME(6) to match messages.created_at and what Hibernate generates for a LocalDateTime,
-- so ddl-auto=validate has nothing to complain about in production.
ALTER TABLE messages
  ADD COLUMN read_at DATETIME(6) NULL;

-- Covers the two queries this feature runs: the unread count and the bulk mark-as-read, both
-- of which filter "messages on these tasks, not sent by me, not yet read".
CREATE INDEX idx_message_task_sender_read
  ON messages (task_id, sender_id, read_at);
