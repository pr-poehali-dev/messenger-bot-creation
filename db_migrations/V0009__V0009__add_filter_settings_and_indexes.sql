CREATE TABLE IF NOT EXISTS filter_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modlog_chat ON moderation_log(chat_id);
CREATE INDEX IF NOT EXISTS idx_modlog_time ON moderation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_settings_uid ON chat_settings(user_id);