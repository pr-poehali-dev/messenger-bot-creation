"""
Страж — управление ботом, модерация, вебхук бота.
GET  /settings?group_id={id}                — настройки и правила группы.
POST / (action=connect)                     — подключить бота (проверка токена через Max API).
POST / (action=save_rules)                  — сохранить правила группы.
POST / (action=set_trial_days)              — изменить длительность триала (только админ).
GET  /trial-settings?user_id=&token=        — получить trial_days (только админ).
GET  /violations?group_id={id}&days=7       — статистика нарушений.
POST /violations                            — зафиксировать нарушение (от бота).
GET  /lists?group_id={id}                   — whitelist и blacklist.
POST /lists                                 — добавить в список.
DELETE /lists                               — удалить из списка.
GET  /moderation?chat_id={id}               — настройки модерации чата.
POST /moderation                            — сохранить настройки модерации.
GET  /banned-words?user_id=&session_token=  — список запрещённых слов.
POST /banned-words                          — управление запрещёнными словами.
GET  /moderation-log?user_id=&chat_id=      — история модерации.
GET  /filter-settings?user_id=              — настройки фильтра.
POST /filter-settings                       — обновить настройки фильтра.
POST /webhook                               — вебхук событий MAX Bot API.
"""
import json
import os
import re
import hashlib
import hmac
import psycopg2
import urllib.request
import urllib.error

SCHEMA    = os.environ.get("MAIN_DB_SCHEMA", "public")
BOT_TOKEN = os.environ.get("MAX_BOT_TOKEN", "")
MAX_API   = "https://botapi.max.ru"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

CHAT_TYPE_RU = {
    "channel": "канале", "group": "группе", "chat": "группе",
    "private": "личном чате", "dialog": "личном чате",
}
CHAT_TYPE_LABEL = {
    "channel": "Канал", "group": "Группа", "chat": "Группа",
    "private": "Личный чат", "dialog": "Личный чат",
}
URL_PATTERN = re.compile(
    r'https?://[^\s]+|www\.[^\s]+|[a-zA-Z0-9\-]+\.(ru|com|net|org|io|xyz|club|site|online|info|biz|top|pro)/\S*',
    re.IGNORECASE
)

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

# ── MAX API helpers ──────────────────────────────────────────────

def max_post(path: str, payload: dict) -> dict:
    if not BOT_TOKEN:
        return {"ok": False}
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{MAX_API}{path}?access_token={BOT_TOKEN}",
        data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception:
        return {"ok": False}

def max_get_chat(chat_id: int) -> str:
    if not BOT_TOKEN:
        return "private"
    req = urllib.request.Request(
        f"{MAX_API}/chats/{chat_id}?access_token={BOT_TOKEN}",
        headers={"User-Agent": "Mozilla/5.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = json.loads(resp.read()).get("type", "private")
    except Exception:
        return "private"
    if raw == "channel":
        return "channel"
    if raw in ("group", "chat", "supergroup"):
        return "group"
    return "private"

def send_max(chat_id: int, text: str, buttons: list = None) -> dict:
    payload = {"recipient": {"chat_id": chat_id}, "type": "text", "text": text}
    if buttons:
        payload["attachments"] = [{"type": "inline_keyboard", "payload": {"buttons": buttons}}]
    return max_post("/messages", payload)

def answer_cb(callback_id: str, text: str = "") -> dict:
    return max_post(f"/answers/{callback_id}", {"type": "callback", "message": {"text": text or " "}})

def del_max_msg(chat_id: int, message_id: int) -> bool:
    req = urllib.request.Request(
        f"{MAX_API}/messages/{message_id}?access_token={BOT_TOKEN}&chat_id={chat_id}",
        method="DELETE"
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status == 200
    except Exception:
        return False

# ── БД helpers для модерации ─────────────────────────────────────

def get_chat_cfg(conn, chat_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT chat_type, moderation_enabled, monitored_types, notify_admins "
            f"FROM {SCHEMA}.chat_settings WHERE chat_id = %s", (chat_id,)
        )
        row = cur.fetchone()
    if not row:
        return None
    return {"chat_type": row[0], "moderation_enabled": row[1],
            "monitored_types": row[2] if row[2] else [], "notify_admins": row[3]}

def upsert_chat_cfg(conn, chat_id: int, chat_type: str, user_id: int,
                    enabled: bool = False, zones: list = None):
    zones = zones or []
    with conn.cursor() as cur:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.chat_settings
                (chat_id, chat_type, user_id, moderation_enabled, monitored_types, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (chat_id) DO UPDATE SET
                chat_type = EXCLUDED.chat_type,
                moderation_enabled = EXCLUDED.moderation_enabled,
                monitored_types = EXCLUDED.monitored_types,
                updated_at = NOW()
        """, (chat_id, chat_type, user_id, enabled, json.dumps(zones)))
    conn.commit()

def get_banned(conn) -> list:
    with conn.cursor() as cur:
        cur.execute(f"SELECT word, category FROM {SCHEMA}.banned_words WHERE category != 'removed'")
        return [{"word": r[0], "category": r[1]} for r in cur.fetchall()]

def get_filter_cfg(conn) -> dict:
    with conn.cursor() as cur:
        cur.execute(f"SELECT setting_key, setting_value FROM {SCHEMA}.filter_settings")
        return {r[0]: r[1] for r in cur.fetchall()}

def log_mod(conn, chat_id: int, chat_type: str, user_id: int, user_name: str,
            msg_text: str, reason: str, action: str, message_id: int = None):
    with conn.cursor() as cur:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.moderation_log
                (chat_id, chat_type, message_id, user_id, user_name, message_text, reason, action_taken)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (chat_id, chat_type, message_id, user_id, user_name, msg_text[:500], reason, action))
    conn.commit()

def flood_count(conn, user_id: int, chat_id: int, window_sec: int) -> int:
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT COUNT(*) FROM {SCHEMA}.moderation_log
            WHERE user_id = %s AND chat_id = %s AND reason = 'flood'
              AND created_at >= NOW() - INTERVAL '{window_sec} seconds'
        """, (user_id, chat_id))
        return cur.fetchone()[0]

# ── Фильтрация ───────────────────────────────────────────────────

def check_banned(text: str, banned: list):
    tl = text.lower()
    for item in banned:
        if item["word"].lower() in tl:
            return True, item["category"]
    return False, ""

def check_links(text: str, forbidden: list) -> bool:
    urls = URL_PATTERN.findall(text)
    for url in urls:
        for domain in forbidden:
            if domain.lower() in url.lower():
                return True
    return False

def is_bad(conn, text: str, user_id: int, chat_id: int, banned: list, fcfg: dict):
    if not text:
        return False, ""
    ok, cat = check_banned(text, banned)
    if ok:
        return True, cat
    fdm = json.loads(fcfg.get("forbidden_domains", "[]"))
    if fdm and check_links(text, fdm):
        return True, "link"
    limit = int(fcfg.get("flood_limit", "5"))
    win   = int(fcfg.get("flood_window_sec", "60"))
    if flood_count(conn, user_id, chat_id, win) >= limit:
        return True, "flood"
    return False, ""

# ── Кнопки ───────────────────────────────────────────────────────

def zone_buttons(chat_id: int) -> list:
    return [
        [
            {"type": "callback", "text": "📢 Канал",      "payload": f"zone:channel:{chat_id}"},
            {"type": "callback", "text": "👥 Группа",     "payload": f"zone:group:{chat_id}"},
            {"type": "callback", "text": "💬 Личный чат", "payload": f"zone:private:{chat_id}"},
        ],
        [
            {"type": "callback", "text": "✅ Все зоны",       "payload": f"zone:all:{chat_id}"},
            {"type": "callback", "text": "⏭ Настроить позже", "payload": f"zone:skip:{chat_id}"},
        ]
    ]

def mod_menu(chat_id: int, cfg: dict) -> list:
    zones = cfg.get("monitored_types", [])
    en    = cfg.get("moderation_enabled", False)
    ch = "✅" if "channel" in zones else "☐"
    gr = "✅" if "group"   in zones else "☐"
    pr = "✅" if "private" in zones else "☐"
    st = "🟢 Вкл" if en else "🔴 Выкл"
    return [
        [
            {"type": "callback", "text": f"{ch} Канал",      "payload": f"toggle:channel:{chat_id}"},
            {"type": "callback", "text": f"{gr} Группа",     "payload": f"toggle:group:{chat_id}"},
            {"type": "callback", "text": f"{pr} Личный чат", "payload": f"toggle:private:{chat_id}"},
        ],
        [
            {"type": "callback", "text": f"Статус: {st}",   "payload": f"toggle:enable:{chat_id}"},
            {"type": "callback", "text": "✔ Сохранить",     "payload": f"toggle:save:{chat_id}"},
        ]
    ]

# ── Обработчики событий вебхука ──────────────────────────────────

def wh_start(conn, chat_id: int, user_id: int, chat_type: str):
    if not get_chat_cfg(conn, chat_id):
        upsert_chat_cfg(conn, chat_id, chat_type, user_id)
    tr = CHAT_TYPE_RU.get(chat_type, "чате")
    send_max(chat_id,
        f"⚔️ Привет! Я Страж — бот автоматической модерации.\n\n"
        f"Я обнаружил, что нахожусь в {tr}. "
        f"Где вы хотите активировать фильтрацию контента?",
        zone_buttons(chat_id)
    )

def wh_bot_added(conn, chat_id: int, user_id: int):
    ct = max_get_chat(chat_id)
    if not get_chat_cfg(conn, chat_id):
        upsert_chat_cfg(conn, chat_id, ct, user_id)
    tr = CHAT_TYPE_RU.get(ct, "чате")
    send_max(chat_id,
        f"⚔️ Страж подключён!\n\nЯ обнаружен в новом {tr}. Хотите активировать модерацию здесь?",
        zone_buttons(chat_id)
    )

def wh_mod_cmd(conn, chat_id: int, user_id: int):
    cfg = get_chat_cfg(conn, chat_id)
    if not cfg:
        ct = max_get_chat(chat_id)
        upsert_chat_cfg(conn, chat_id, ct, user_id)
        cfg = get_chat_cfg(conn, chat_id)
    en    = cfg.get("moderation_enabled", False)
    zones = cfg.get("monitored_types", [])
    zs    = ", ".join([CHAT_TYPE_LABEL.get(z, z) for z in zones]) if zones else "не выбраны"
    send_max(chat_id,
        f"⚙️ Настройки модерации\n\nСтатус: {'🟢 Включена' if en else '🔴 Выключена'}\nЗоны: {zs}\n\nВыберите зоны:",
        mod_menu(chat_id, cfg)
    )

def wh_callback(conn, payload_str: str, cb_id: str, chat_id: int, user_id: int):
    parts = payload_str.split(":")
    if len(parts) < 2:
        return
    action = parts[0]
    value  = parts[1]
    tcid   = int(parts[2]) if len(parts) > 2 else chat_id

    cfg = get_chat_cfg(conn, tcid)
    if not cfg:
        ct = max_get_chat(tcid)
        upsert_chat_cfg(conn, tcid, ct, user_id)
        cfg = get_chat_cfg(conn, tcid)

    if action == "zone":
        if value == "skip":
            answer_cb(cb_id, "Настройки сохранены. /moderation — для настройки позже.")
            send_max(tcid, "⏭ Хорошо. Используйте /moderation для настройки в любой момент.")
            return
        zones = ["channel", "group", "private"] if value == "all" else [value]
        upsert_chat_cfg(conn, tcid, cfg["chat_type"], user_id, enabled=True, zones=zones)
        zl = ", ".join([CHAT_TYPE_LABEL.get(z, z) for z in zones])
        answer_cb(cb_id, f"✅ Модерация активирована для: {zl}")
        send_max(tcid,
            f"✅ Модерация активирована для: {zl}.\n\n"
            f"/moderation — настройки\n/add_word [слово] — запрещённое слово\n/log — история"
        )

    elif action == "toggle":
        zones   = list(cfg.get("monitored_types", []))
        enabled = cfg.get("moderation_enabled", False)
        if value == "enable":
            enabled = not enabled
            upsert_chat_cfg(conn, tcid, cfg["chat_type"], user_id, enabled=enabled, zones=zones)
            answer_cb(cb_id, "🟢 Включена" if enabled else "🔴 Выключена")
        elif value == "save":
            answer_cb(cb_id, "✅ Сохранено")
            send_max(tcid, "✅ Настройки модерации сохранены.")
            return
        else:
            if value in zones:
                zones.remove(value)
            else:
                zones.append(value)
            upsert_chat_cfg(conn, tcid, cfg["chat_type"], user_id, enabled=enabled, zones=zones)
            answer_cb(cb_id, f"{'✅' if value in zones else '☐'} {CHAT_TYPE_LABEL.get(value, value)}")
        upd = get_chat_cfg(conn, tcid)
        en  = upd.get("moderation_enabled", False)
        zs  = ", ".join([CHAT_TYPE_LABEL.get(z, z) for z in upd.get("monitored_types", [])]) or "не выбраны"
        send_max(tcid,
            f"⚙️ Модерация\n\nСтатус: {'🟢 Включена' if en else '🔴 Выключена'}\nЗоны: {zs}\n\nНажмите зону для переключения:",
            mod_menu(tcid, upd)
        )

def wh_add_word(conn, chat_id: int, args: str, user_id: int):
    word = args.strip()
    if not word:
        send_max(chat_id, "Использование: /add_word [слово]")
        return
    cat = "spam"
    with conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO {SCHEMA}.banned_words (word, category, added_by) VALUES (%s, %s, %s) "
            f"ON CONFLICT (word) DO UPDATE SET category = EXCLUDED.category",
            (word.lower(), cat, user_id)
        )
    conn.commit()
    send_max(chat_id, f"✅ Слово «{word}» добавлено в запрещённые")

def wh_remove_word(conn, chat_id: int, args: str):
    word = args.strip().lower()
    if not word:
        send_max(chat_id, "Использование: /remove_word [слово]")
        return
    with conn.cursor() as cur:
        cur.execute(f"UPDATE {SCHEMA}.banned_words SET category = 'removed' WHERE word = %s", (word,))
    conn.commit()
    send_max(chat_id, f"✅ Слово «{word}» удалено")

def wh_log_cmd(conn, chat_id: int):
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT user_name, reason, message_text, created_at
            FROM {SCHEMA}.moderation_log
            WHERE chat_id = %s AND created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC LIMIT 10
        """, (chat_id,))
        rows = cur.fetchall()
    if not rows:
        send_max(chat_id, "📋 За 24 ч нарушений нет.")
        return
    lines = [f"📋 Модерация за 24 ч ({len(rows)}):\n"]
    for r in rows:
        t = r[3].strftime("%H:%M") if hasattr(r[3], "strftime") else str(r[3])[:5]
        lines.append(f"[{t}] {r[0]} — {r[1]}: «{r[2][:40]}»")
    send_max(chat_id, "\n".join(lines))

def wh_check_msg(conn, msg: dict):
    chat_id    = msg.get("recipient", {}).get("chat_id")
    sender     = msg.get("sender", {})
    user_id    = sender.get("user_id", 0)
    user_name  = sender.get("name", "")
    message_id = msg.get("id")
    body       = msg.get("body", {})
    text       = body.get("text", "") if isinstance(body, dict) else ""

    if not chat_id or not text:
        return

    cfg = get_chat_cfg(conn, chat_id)
    if not cfg or not cfg.get("moderation_enabled", False):
        return

    chat_type = cfg.get("chat_type", "private")
    if chat_type not in cfg.get("monitored_types", []):
        return

    banned = get_banned(conn)
    fcfg   = get_filter_cfg(conn)
    bad, reason = is_bad(conn, text, user_id, chat_id, banned, fcfg)
    if not bad:
        return

    reason_ru = {"spam": "спам", "insult": "оскорбление", "link": "запрещённая ссылка", "flood": "флуд"}.get(reason, reason)
    if message_id:
        del_max_msg(chat_id, message_id)

    log_mod(conn, chat_id, chat_type, user_id, user_name, text, reason, "removed", message_id)

    if cfg.get("notify_admins", True):
        send_max(chat_id,
            f"🛡 Удалено сообщение {user_name}.\nПричина: {reason_ru}\nТекст: «{text[:80]}»"
        )

# ── Вебхук dispatcher ─────────────────────────────────────────────

def handle_webhook(event: dict, conn) -> dict:
    raw = event.get("body", "{}")
    try:
        update = json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Invalid JSON"})}

    upd_type = update.get("update_type", "")

    if upd_type == "message_callback":
        cb      = update.get("callback", {})
        pl      = cb.get("payload", "")
        cb_id   = cb.get("callback_id", "")
        chat_id = cb.get("chat_id") or update.get("message", {}).get("recipient", {}).get("chat_id", 0)
        user_id = cb.get("user", {}).get("user_id", 0)
        wh_callback(conn, pl, cb_id, int(chat_id), int(user_id))

    elif upd_type == "message_created":
        msg     = update.get("message", {})
        body    = msg.get("body", {})
        text    = body.get("text", "") if isinstance(body, dict) else ""
        chat_id = msg.get("recipient", {}).get("chat_id", 0)
        sender  = msg.get("sender", {})
        user_id = sender.get("user_id", 0)

        if text.startswith("/start"):
            ct = max_get_chat(int(chat_id))
            wh_start(conn, int(chat_id), int(user_id), ct)
        elif text.startswith("/moderation"):
            wh_mod_cmd(conn, int(chat_id), int(user_id))
        elif text.startswith("/add_word"):
            wh_add_word(conn, int(chat_id), text[9:].strip(), int(user_id))
        elif text.startswith("/remove_word"):
            wh_remove_word(conn, int(chat_id), text[12:].strip())
        elif text.startswith("/log"):
            wh_log_cmd(conn, int(chat_id))
        else:
            wh_check_msg(conn, msg)

    elif upd_type in ("bot_added", "chat_member_updated"):
        chat_id = update.get("chat_id") or update.get("chat", {}).get("chat_id", 0)
        user_id = update.get("user", {}).get("user_id", 0)
        if chat_id:
            wh_bot_added(conn, int(chat_id), int(user_id))

    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

def verify_max_token(token: str) -> dict:
    url = f"https://botapi.max.ru/me?access_token={token}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
            return {"ok": True, "name": data.get("name", ""), "username": data.get("username", "")}
    except urllib.error.HTTPError as e:
        return {"ok": False, "error": f"HTTP {e.code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def verify_group_token(conn, group_id: str, token: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(f"SELECT bot_token FROM {SCHEMA}.bot_settings WHERE group_id = %s", (group_id,))
        row = cur.fetchone()
    return bool(row and row[0] == token)

def make_session_token(max_user_id: int, user_id: int) -> str:
    raw = f"{max_user_id}:{user_id}:{os.environ.get('DATABASE_URL','')[:20]}"
    return hashlib.sha256(raw.encode()).hexdigest()

def verify_admin(conn, user_id: int, session_token: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT is_admin, max_user_id FROM {SCHEMA}.strazh_users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
    if not row or not row[0]:
        return False
    expected = make_session_token(row[1], user_id)
    return hmac.compare_digest(expected, session_token)

def get_trial_days(conn) -> int:
    with conn.cursor() as cur:
        cur.execute(f"SELECT value FROM {SCHEMA}.strazh_settings WHERE key = 'trial_days'")
        row = cur.fetchone()
    return int(row[0]) if row else 7

def handler(event: dict, context) -> dict:
    """Управление ботом, правилами, нарушениями, списками и модерацией."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path   = event.get("path", "/").rstrip("/")
    conn   = get_conn()

    try:
        # ── WEBHOOK (события MAX Bot API) ─────────────────────────
        if "webhook" in path:
            return handle_webhook(event, conn)

        # ── TRIAL SETTINGS (только админ) ────────────────────────
        if "trial-settings" in path:
            if method == "GET":
                params   = event.get("queryStringParameters") or {}
                user_id  = params.get("user_id")
                token    = params.get("session_token", "")
                if not user_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id required"})}
                if not verify_admin(conn, int(user_id), token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}
                trial_days = get_trial_days(conn)
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"trial_days": trial_days})}

        # ── VIOLATIONS ───────────────────────────────────────────
        if "violations" in path:
            if method == "GET":
                params   = event.get("queryStringParameters") or {}
                group_id = params.get("group_id", "")
                days     = int(params.get("days", 7))
                if not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT COUNT(*), violation_type FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s AND created_at >= NOW() - INTERVAL '{days} days'
                        GROUP BY violation_type ORDER BY COUNT(*) DESC
                    """, (group_id,))
                    by_type = [{"type": r[1], "count": r[0]} for r in cur.fetchall()]

                    cur.execute(f"""
                        SELECT violator_user_id, violator_name, COUNT(*) as cnt
                        FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s AND created_at >= NOW() - INTERVAL '{days} days'
                          AND violator_user_id IS NOT NULL
                        GROUP BY violator_user_id, violator_name ORDER BY cnt DESC LIMIT 10
                    """, (group_id,))
                    top_violators = [{"user_id": r[0], "name": r[1], "count": r[2]} for r in cur.fetchall()]

                    cur.execute(f"""
                        SELECT DATE(created_at), COUNT(*) FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s AND created_at >= NOW() - INTERVAL '{days} days'
                        GROUP BY DATE(created_at) ORDER BY DATE(created_at)
                    """, (group_id,))
                    by_day = [{"date": str(r[0]), "count": r[1]} for r in cur.fetchall()]

                    cur.execute(f"""
                        SELECT COUNT(*) FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s AND created_at >= NOW() - INTERVAL '{days} days'
                    """, (group_id,))
                    total = cur.fetchone()[0]

                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "total": total, "days": days,
                    "by_type": by_type, "top_violators": top_violators, "by_day": by_day,
                })}

            if method == "POST":
                body     = json.loads(event.get("body") or "{}")
                group_id = (body.get("group_id") or "").strip()
                token    = (body.get("token") or "").strip()
                if not group_id or not token:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id and token required"})}
                if not verify_group_token(conn, group_id, token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_violations
                            (group_id, violator_user_id, violator_name, violation_type, message_text, action_taken)
                        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                    """, (
                        group_id,
                        body.get("violator_user_id"),
                        body.get("violator_name", ""),
                        body.get("violation_type", "unknown"),
                        body.get("message_text", "")[:500],
                        body.get("action_taken", ""),
                    ))
                    new_id = cur.fetchone()[0]
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id})}

        # ── LISTS ─────────────────────────────────────────────────
        if "lists" in path:
            if method == "GET":
                params   = event.get("queryStringParameters") or {}
                group_id = params.get("group_id", "")
                if not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT target_user_id, target_name, list_type, added_at
                        FROM {SCHEMA}.strazh_user_lists
                        WHERE group_id = %s ORDER BY list_type, added_at DESC
                    """, (group_id,))
                    rows = cur.fetchall()

                whitelist = [{"user_id": r[0], "name": r[1], "added_at": str(r[3])} for r in rows if r[2] == "whitelist"]
                blacklist = [{"user_id": r[0], "name": r[1], "added_at": str(r[3])} for r in rows if r[2] == "blacklist"]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"whitelist": whitelist, "blacklist": blacklist})}

            if method == "POST":
                body      = json.loads(event.get("body") or "{}")
                group_id  = (body.get("group_id") or "").strip()
                token     = (body.get("token") or "").strip()
                target_id = body.get("target_user_id")
                name      = body.get("target_name", "")
                list_type = body.get("list_type", "")
                if not all([group_id, token, target_id, list_type]):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id, token, target_user_id, list_type required"})}
                if list_type not in ("whitelist", "blacklist"):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "list_type must be whitelist or blacklist"})}
                if not verify_group_token(conn, group_id, token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_user_lists (group_id, target_user_id, target_name, list_type)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (group_id, target_user_id)
                        DO UPDATE SET list_type = EXCLUDED.list_type, target_name = EXCLUDED.target_name
                    """, (group_id, int(target_id), name, list_type))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

            if method == "DELETE":
                body      = json.loads(event.get("body") or "{}")
                group_id  = (body.get("group_id") or "").strip()
                token     = (body.get("token") or "").strip()
                target_id = body.get("target_user_id")
                if not all([group_id, token, target_id]):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id, token, target_user_id required"})}
                if not verify_group_token(conn, group_id, token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"UPDATE {SCHEMA}.strazh_user_lists SET list_type = 'removed' WHERE group_id = %s AND target_user_id = %s", (group_id, int(target_id)))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── MODERATION SETTINGS ───────────────────────────────────
        if "moderation" in path and "log" not in path:
            if method == "GET":
                params  = event.get("queryStringParameters") or {}
                chat_id = params.get("chat_id", "")
                if not chat_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "chat_id required"})}
                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT chat_type, moderation_enabled, monitored_types, notify_admins
                        FROM {SCHEMA}.chat_settings WHERE chat_id = %s
                    """, (chat_id,))
                    row = cur.fetchone()
                if not row:
                    return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                        "chat_id": int(chat_id),
                        "chat_type": "private",
                        "moderation_enabled": False,
                        "monitored_types": [],
                        "notify_admins": True,
                    })}
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "chat_id": int(chat_id),
                    "chat_type": row[0],
                    "moderation_enabled": row[1],
                    "monitored_types": row[2] if row[2] else [],
                    "notify_admins": row[3],
                })}

            if method == "POST":
                body    = json.loads(event.get("body") or "{}")
                chat_id = body.get("chat_id")
                if not chat_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "chat_id required"})}
                enabled   = bool(body.get("moderation_enabled", False))
                monitored = body.get("monitored_types", [])
                chat_type = body.get("chat_type", "private")
                notify    = bool(body.get("notify_admins", True))
                user_id   = body.get("user_id", 0)
                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.chat_settings
                            (chat_id, chat_type, user_id, moderation_enabled, monitored_types, notify_admins, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (chat_id) DO UPDATE SET
                            moderation_enabled = EXCLUDED.moderation_enabled,
                            monitored_types = EXCLUDED.monitored_types,
                            notify_admins = EXCLUDED.notify_admins,
                            updated_at = NOW()
                    """, (int(chat_id), chat_type, int(user_id), enabled, json.dumps(monitored), notify))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── BANNED WORDS ──────────────────────────────────────────
        if "banned-words" in path:
            if method == "GET":
                params  = event.get("queryStringParameters") or {}
                user_id = params.get("user_id")
                token   = params.get("session_token", "")
                if not user_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id required"})}
                if not verify_admin(conn, int(user_id), token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}
                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT word, category, created_at FROM {SCHEMA}.banned_words
                        WHERE category != 'removed'
                        ORDER BY created_at DESC
                    """)
                    rows = cur.fetchall()
                words = [{"word": r[0], "category": r[1], "created_at": str(r[2])} for r in rows]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"words": words, "total": len(words)})}

            if method == "POST":
                body    = json.loads(event.get("body") or "{}")
                user_id = body.get("user_id")
                token   = body.get("session_token", "")
                action  = body.get("action", "add")
                word    = (body.get("word") or "").strip().lower()
                if not user_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id required"})}
                if not verify_admin(conn, int(user_id), token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}
                if not word:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "word required"})}

                if action == "add":
                    category = body.get("category", "spam")
                    with conn.cursor() as cur:
                        cur.execute(f"""
                            INSERT INTO {SCHEMA}.banned_words (word, category, added_by)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (word) DO UPDATE SET category = EXCLUDED.category
                        """, (word, category, int(user_id)))
                        conn.commit()
                    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "word": word})}

                if action == "remove":
                    with conn.cursor() as cur:
                        cur.execute(f"UPDATE {SCHEMA}.banned_words SET category = 'removed' WHERE word = %s", (word,))
                        conn.commit()
                    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "action must be add or remove"})}

        # ── MODERATION LOG ────────────────────────────────────────
        if "moderation-log" in path:
            if method == "GET":
                params  = event.get("queryStringParameters") or {}
                chat_id = params.get("chat_id", "")
                user_id = params.get("user_id")
                token   = params.get("session_token", "")
                hours   = int(params.get("hours", 24))
                if not user_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id required"})}
                if not verify_admin(conn, int(user_id), token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}
                with conn.cursor() as cur:
                    if chat_id:
                        cur.execute(f"""
                            SELECT id, chat_id, chat_type, user_id, user_name,
                                   message_text, reason, action_taken, created_at
                            FROM {SCHEMA}.moderation_log
                            WHERE chat_id = %s
                              AND created_at >= NOW() - INTERVAL '{hours} hours'
                            ORDER BY created_at DESC LIMIT 100
                        """, (chat_id,))
                    else:
                        cur.execute(f"""
                            SELECT id, chat_id, chat_type, user_id, user_name,
                                   message_text, reason, action_taken, created_at
                            FROM {SCHEMA}.moderation_log
                            WHERE created_at >= NOW() - INTERVAL '{hours} hours'
                            ORDER BY created_at DESC LIMIT 100
                        """)
                    rows = cur.fetchall()
                logs = [{
                    "id": r[0], "chat_id": r[1], "chat_type": r[2],
                    "user_id": r[3], "user_name": r[4],
                    "message_text": r[5], "reason": r[6],
                    "action_taken": r[7], "created_at": str(r[8]),
                } for r in rows]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"logs": logs, "total": len(logs)})}

        # ── FILTER SETTINGS ───────────────────────────────────────
        if "filter-settings" in path:
            if method == "GET":
                params  = event.get("queryStringParameters") or {}
                user_id = params.get("user_id")
                token   = params.get("session_token", "")
                if not user_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id required"})}
                if not verify_admin(conn, int(user_id), token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}
                with conn.cursor() as cur:
                    cur.execute(f"SELECT setting_key, setting_value FROM {SCHEMA}.filter_settings")
                    rows = cur.fetchall()
                return {"statusCode": 200, "headers": CORS,
                        "body": json.dumps({"settings": {r[0]: r[1] for r in rows}})}

            if method == "POST":
                body    = json.loads(event.get("body") or "{}")
                user_id = body.get("user_id")
                token   = body.get("session_token", "")
                if not user_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id required"})}
                if not verify_admin(conn, int(user_id), token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}
                settings_data = body.get("settings", {})
                if not isinstance(settings_data, dict):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "settings must be object"})}
                with conn.cursor() as cur:
                    for k, v in settings_data.items():
                        cur.execute(f"""
                            INSERT INTO {SCHEMA}.filter_settings (setting_key, setting_value, updated_at)
                            VALUES (%s, %s, NOW())
                            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
                        """, (str(k), str(v)))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── SETTINGS (GET) ────────────────────────────────────────
        if method == "GET":
            params   = event.get("queryStringParameters") or {}
            group_id = params.get("group_id", "")
            if not group_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

            with conn.cursor() as cur:
                cur.execute(f"SELECT group_name, connected_at FROM {SCHEMA}.bot_settings WHERE group_id = %s", (group_id,))
                row = cur.fetchone()
                cur.execute(f"SELECT rules_text FROM {SCHEMA}.bot_rules WHERE group_id = %s", (group_id,))
                rules_row = cur.fetchone()

            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"connected": False})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "connected":    True,
                "group_name":   row[0],
                "connected_at": str(row[1]),
                "rules_text":   rules_row[0] if rules_row else "",
            })}

        # ── SETTINGS (POST) ───────────────────────────────────────
        if method == "POST":
            body   = json.loads(event.get("body") or "{}")
            action = body.get("action", "connect")

            if action == "connect":
                token    = (body.get("token") or "").strip()
                group_id = (body.get("group_id") or "").strip()
                if not token or not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "token and group_id required"})}

                verify = verify_max_token(token)
                if not verify["ok"]:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Токен недействителен: {verify['error']}"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.bot_settings (group_id, bot_token, group_name)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (group_id) DO UPDATE
                        SET bot_token = EXCLUDED.bot_token, group_name = EXCLUDED.group_name, updated_at = NOW()
                    """, (group_id, token, verify.get("name", "")))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "ok": True, "bot_name": verify.get("name", ""), "bot_username": verify.get("username", ""),
                })}

            if action == "set_trial_days":
                user_id   = body.get("user_id")
                token     = body.get("session_token", "")
                days      = body.get("days")
                if not user_id or days is None:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id, days required"})}
                try:
                    days_int = int(days)
                except (ValueError, TypeError):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "days must be integer"})}
                if days_int < 1 or days_int > 365:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "days must be 1–365"})}
                if not verify_admin(conn, int(user_id), token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_settings (key, value, updated_at)
                        VALUES ('trial_days', %s, NOW())
                        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                    """, (str(days_int),))
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                        VALUES (%s, 'trial_days_changed', %s)
                    """, (int(user_id), json.dumps({"new_days": days_int})))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "trial_days": days_int})}

            if action == "save_rules":
                group_id   = (body.get("group_id") or "").strip()
                rules_text = body.get("rules_text", "")
                token      = (body.get("token") or "").strip()
                if not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}
                if not token:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "token required"})}
                if not verify_group_token(conn, group_id, token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.bot_rules (group_id, rules_text)
                        VALUES (%s, %s)
                        ON CONFLICT (group_id) DO UPDATE
                        SET rules_text = EXCLUDED.rules_text, updated_at = NOW()
                    """, (group_id, rules_text))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

    finally:
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}