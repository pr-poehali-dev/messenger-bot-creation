-- Добавляем флаг уведомления за 3 дня до истечения подписки
ALTER TABLE strazh_subscriptions ADD COLUMN IF NOT EXISTS notified_3d BOOLEAN DEFAULT FALSE;

-- Таблица для реферальной программы
CREATE TABLE IF NOT EXISTS strazh_referrals (
    id BIGSERIAL PRIMARY KEY,
    referrer_user_id BIGINT NOT NULL REFERENCES strazh_users(id),
    referred_user_id BIGINT NOT NULL REFERENCES strazh_users(id),
    bonus_days INTEGER DEFAULT 7,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referred_user_id)
);
CREATE INDEX IF NOT EXISTS idx_strazh_referrals_referrer ON strazh_referrals(referrer_user_id);

-- Таблица статистики нарушений от бота
CREATE TABLE IF NOT EXISTS strazh_violations (
    id BIGSERIAL PRIMARY KEY,
    group_id TEXT NOT NULL,
    violator_user_id BIGINT,
    violator_name TEXT,
    violation_type TEXT NOT NULL,
    message_text TEXT,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strazh_violations_group ON strazh_violations(group_id);
CREATE INDEX IF NOT EXISTS idx_strazh_violations_created ON strazh_violations(created_at);

-- Таблица whitelist/blacklist пользователей
CREATE TABLE IF NOT EXISTS strazh_user_lists (
    id BIGSERIAL PRIMARY KEY,
    group_id TEXT NOT NULL,
    target_user_id BIGINT NOT NULL,
    target_name TEXT,
    list_type TEXT NOT NULL CHECK (list_type IN ('whitelist', 'blacklist')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, target_user_id)
);
CREATE INDEX IF NOT EXISTS idx_strazh_lists_group ON strazh_user_lists(group_id, list_type);

-- Тариф агентство: поле max_groups в подписках
ALTER TABLE strazh_subscriptions ADD COLUMN IF NOT EXISTS max_groups INTEGER DEFAULT 1;
