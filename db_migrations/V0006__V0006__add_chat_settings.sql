CREATE TABLE IF NOT EXISTS chat_settings (
    chat_id BIGINT PRIMARY KEY,
    chat_type TEXT NOT NULL DEFAULT 'private',
    moderation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    monitored_types JSONB NOT NULL DEFAULT '[]',
    user_id BIGINT NOT NULL,
    notify_admins BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);