-- ============================================================
-- 014: seed booking requests into chat, and drop the booking lead time
-- ============================================================

-- New booking requests now write their message into the chat as the opening
-- line. Backfill the ones created before that, timestamped to the moment the
-- request was made so they sort to the top of the thread.
--
-- Skips any booking whose opening message is already in the chat, so running
-- this more than once will not duplicate anything.
INSERT INTO chat_messages (id, booking_id, sender_id, content, message_type, created_at)
SELECT
    md5(random()::text || clock_timestamp()::text || b.id),
    b.id,
    b.client_id,
    b.message,
    'text',
    b.created_at
FROM bookings b
WHERE b.message <> ''
  AND NOT EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.booking_id = b.id
        AND cm.sender_id = b.client_id
        AND cm.content = b.message
  );

-- Consultants were defaulted to needing 12 hours of notice, which hides every
-- slot for the rest of the day. Default to no lead time and let anyone who
-- wants a buffer set one themselves.
ALTER TABLE freelancer_profiles ALTER COLUMN min_notice_hours SET DEFAULT 0;
UPDATE freelancer_profiles SET min_notice_hours = 0 WHERE min_notice_hours = 12;
