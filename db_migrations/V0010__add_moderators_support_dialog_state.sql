
-- Таблица модераторов
CREATE TABLE t_p54414125_messenger_bot_creati.moderators (
    user_id     BIGINT PRIMARY KEY,
    username    TEXT,
    assigned_by BIGINT NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица запросов помощи
CREATE TABLE t_p54414125_messenger_bot_creati.support_requests (
    id                  SERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    username            TEXT,
    request_type        TEXT NOT NULL,
    description         TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'new',
    assigned_moderator  BIGINT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at         TIMESTAMP WITH TIME ZONE
);

-- Таблица состояний диалога (ожидание ввода)
CREATE TABLE t_p54414125_messenger_bot_creati.bot_dialog_state (
    user_id     BIGINT PRIMARY KEY,
    state       TEXT NOT NULL,
    payload     TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
