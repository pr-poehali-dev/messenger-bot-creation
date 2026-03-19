CREATE TABLE IF NOT EXISTS t_p54414125_messenger_bot_creati.bot_settings (
  id SERIAL PRIMARY KEY,
  group_id TEXT NOT NULL UNIQUE,
  bot_token TEXT NOT NULL,
  group_name TEXT DEFAULT '',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p54414125_messenger_bot_creati.bot_rules (
  id SERIAL PRIMARY KEY,
  group_id TEXT NOT NULL UNIQUE,
  rules_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
