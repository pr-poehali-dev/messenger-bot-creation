-- Таблица настроек системы Страж
CREATE TABLE IF NOT EXISTS t_p54414125_messenger_bot_creati.strazh_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Инициализация: длительность пробного периода 7 дней
INSERT INTO t_p54414125_messenger_bot_creati.strazh_settings (key, value)
VALUES ('trial_days', '7')
ON CONFLICT (key) DO NOTHING;

-- Добавляем колонку trial_days_snapshot в подписки
-- чтобы зафиксировать длительность на момент регистрации
ALTER TABLE t_p54414125_messenger_bot_creati.strazh_subscriptions
ADD COLUMN IF NOT EXISTS trial_days_snapshot INTEGER NOT NULL DEFAULT 7;

-- Заполняем существующие записи расчётным значением
UPDATE t_p54414125_messenger_bot_creati.strazh_subscriptions
SET trial_days_snapshot = 7
WHERE trial_days_snapshot = 7;
