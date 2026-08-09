ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(10) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file'));
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name TEXT;

CREATE TABLE IF NOT EXISTS booking_read_receipts (
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (booking_id, user_id)
);
