-- Consulo — full database bootstrap
-- Run this once against a fresh, empty database to create every table the app needs.

-- ============================================================
-- Core: users, freelancer profile, certifications
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role VARCHAR(20),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    bio TEXT NOT NULL DEFAULT '',
    profile_picture TEXT NOT NULL DEFAULT '',
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS freelancer_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    test_score INTEGER
);

CREATE INDEX IF NOT EXISTS idx_freelancer_profiles_user_id ON freelancer_profiles(user_id);

CREATE TABLE IF NOT EXISTS freelancer_certifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_freelancer_certifications_user_id ON freelancer_certifications(user_id);


-- ============================================================
-- 004: bookings and chat
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_consultant_id ON bookings(consultant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_booking_id ON chat_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);


-- ============================================================
-- 005: admin invites
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_invites (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_invites_email_pending
    ON admin_invites (email)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_admin_invites_invited_by ON admin_invites(invited_by);


-- ============================================================
-- 006: contracts and escrow ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    platform_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (
        status IN ('pending_payment', 'funded', 'in_progress', 'completion_requested', 'completed', 'disputed', 'cancelled')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_consultant_id ON contracts(consultant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

CREATE TABLE IF NOT EXISTS contract_transactions (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('payment', 'release', 'platform_fee', 'refund')),
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_transactions_contract_id ON contract_transactions(contract_id);


-- ============================================================
-- 007: disputes
-- ============================================================

CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
    raised_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    evidence_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_favor_client', 'resolved_favor_consultant')),
    resolution_notes TEXT,
    resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON disputes(raised_by);


-- ============================================================
-- 008: reviews
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    reply TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    replied_at TIMESTAMPTZ,
    UNIQUE (contract_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_contract_id ON reviews(contract_id);


-- ============================================================
-- 009: favorite consultants
-- ============================================================

CREATE TABLE IF NOT EXISTS favorite_consultants (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, consultant_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_consultants_client_id ON favorite_consultants(client_id);


-- ============================================================
-- 010: chat enhancements (file messages, read receipts)
-- ============================================================

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(10) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file'));
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name TEXT;

CREATE TABLE IF NOT EXISTS booking_read_receipts (
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (booking_id, user_id)
);


-- ============================================================
-- 011: notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);


-- ============================================================
-- 012: admin ops (suspension flag + audit log)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(60) NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);


-- ============================================================
-- 013: scheduling (availability, time off, consultation sessions)
-- ============================================================

ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS min_notice_hours INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS booking_horizon_days INTEGER NOT NULL DEFAULT 30;

CREATE TABLE IF NOT EXISTS availability_rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
    end_minute INTEGER NOT NULL CHECK (end_minute > 0 AND end_minute <= 1440),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_minute > start_minute)
);

CREATE INDEX IF NOT EXISTS idx_availability_rules_user_id ON availability_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_user_weekday ON availability_rules(user_id, weekday);

CREATE TABLE IF NOT EXISTS availability_time_off (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_availability_time_off_user_id ON availability_time_off(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_time_off_range ON availability_time_off(user_id, start_at, end_at);

CREATE TABLE IF NOT EXISTS consultation_sessions (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    mode VARCHAR(10) NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'offline')),
    location TEXT NOT NULL DEFAULT '',
    agenda TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (
        status IN ('pending', 'scheduled', 'completed', 'cancelled', 'no_show')
    ),
    cancelled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    rescheduled_from_id TEXT REFERENCES consultation_sessions(id) ON DELETE SET NULL,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_consultation_sessions_booking_id ON consultation_sessions(booking_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_client_id ON consultation_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_consultant_id ON consultation_sessions(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_start_at ON consultation_sessions(start_at);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_consultant_active
    ON consultation_sessions(consultant_id, start_at)
    WHERE status IN ('pending', 'scheduled');

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS btree_gist;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'consultation_sessions_no_overlap'
    ) THEN
        ALTER TABLE consultation_sessions
            ADD CONSTRAINT consultation_sessions_no_overlap
            EXCLUDE USING gist (
                consultant_id WITH =,
                tstzrange(start_at, end_at) WITH &&
            ) WHERE (status IN ('pending', 'scheduled'));
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping consultation_sessions_no_overlap exclusion constraint: %', SQLERRM;
END
$$;

-- Scoring breakdown columns
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS assessment_score INTEGER;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS cert_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS rating_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancer_certifications ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

