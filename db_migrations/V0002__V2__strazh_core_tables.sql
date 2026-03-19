CREATE TABLE IF NOT EXISTS strazh_users (
    id              BIGSERIAL PRIMARY KEY,
    max_user_id     BIGINT NOT NULL UNIQUE,
    max_username    TEXT,
    max_name        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS strazh_pricing (
    id          SERIAL PRIMARY KEY,
    plan        TEXT NOT NULL UNIQUE,
    label       TEXT NOT NULL,
    price_rub   INTEGER NOT NULL,
    days        INTEGER NOT NULL,
    badge       TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO strazh_pricing (plan, label, price_rub, days, badge, sort_order) VALUES
    ('month',   '1 месяц',   59,  30,  NULL,      1),
    ('quarter', '3 месяца', 149,  90,  'Выгодно', 2),
    ('year',    'Год',       590, 365, 'Лучший',  3)
ON CONFLICT (plan) DO NOTHING;

CREATE TABLE IF NOT EXISTS strazh_subscriptions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES strazh_users(id),
    plan            TEXT,
    status          TEXT NOT NULL DEFAULT 'trial',
    trial_started   TIMESTAMPTZ,
    trial_ends      TIMESTAMPTZ,
    paid_starts     TIMESTAMPTZ,
    paid_ends       TIMESTAMPTZ,
    notified_1d     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strazh_payments (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES strazh_users(id),
    plan             TEXT NOT NULL,
    amount_rub       INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    sber_order_id    TEXT,
    sber_payment_url TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS strazh_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES strazh_users(id),
    action      TEXT NOT NULL,
    details     JSONB,
    ip          TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strazh_rate_limit (
    max_user_id  BIGINT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count        INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (max_user_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_strazh_subs_user     ON strazh_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_strazh_subs_status   ON strazh_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_strazh_audit_user    ON strazh_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_strazh_payments_user ON strazh_payments(user_id);
