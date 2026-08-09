CREATE TABLE IF NOT EXISTS favorite_consultants (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, consultant_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_consultants_client_id ON favorite_consultants(client_id);
