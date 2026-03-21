CREATE TABLE IF NOT EXISTS banned_words (
    word TEXT PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'spam',
    added_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);