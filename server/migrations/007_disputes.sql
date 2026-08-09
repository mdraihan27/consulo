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
