-- Admin invites table: tracks pending invitations for new admins
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
