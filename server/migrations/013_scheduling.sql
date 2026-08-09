-- ============================================================
-- 013: scheduling (availability, time off, consultation sessions)
-- ============================================================

-- Per-consultant scheduling settings live alongside the freelancer profile.
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS min_notice_hours INTEGER NOT NULL DEFAULT 12;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS booking_horizon_days INTEGER NOT NULL DEFAULT 30;

-- Recurring weekly availability. Times are minutes-from-midnight in the
-- consultant's own timezone, so the published hours stay put across DST.
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

-- One-off blocks (holidays, appointments) that carve holes out of the weekly rules.
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

-- A concrete meeting inside a booking thread.
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

-- Belt-and-braces double-booking guard. The booking path already serialises on a
-- per-consultant advisory lock and re-checks for overlap, so this constraint is an
-- optional hard backstop: it needs btree_gist, which not every deployment has.
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
