CREATE TABLE IF NOT EXISTS moderation_log (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    chat_type TEXT NOT NULL,
    post_id BIGINT,
    comment_id BIGINT,
    message_id BIGINT,
    user_id BIGINT NOT NULL,
    user_name TEXT NOT NULL,
    message_text TEXT NOT NULL,
    reason TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);