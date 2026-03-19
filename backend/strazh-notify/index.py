"""
Страж — планировщик уведомлений.
Вызывается по cron (или вручную). Отправляет два типа уведомлений:
- За 3 дня до истечения (notified_3d)
- За 1 день до истечения (notified_1d)
"""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta
import urllib.request
import urllib.error

SCHEMA    = os.environ.get("MAIN_DB_SCHEMA", "public")
BOT_TOKEN = os.environ.get("MAX_BOT_TOKEN", "")
MAX_API   = "https://botapi.max.ru"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def send_max_message(user_max_id: int, text: str) -> bool:
    if not BOT_TOKEN:
        return False
    payload = json.dumps({
        "recipient": {"user_id": user_max_id},
        "type": "text",
        "text": text
    }).encode()
    req = urllib.request.Request(
        f"{MAX_API}/messages?access_token={BOT_TOKEN}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except urllib.error.URLError:
        return False

def notify_batch(conn, now, warn_start, warn_end, flag_col, kind_suffix, notified):
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT s.id, s.user_id, s.status, s.trial_ends, s.paid_ends,
                   u.max_user_id, u.max_name
            FROM {SCHEMA}.strazh_subscriptions s
            JOIN {SCHEMA}.strazh_users u ON u.id = s.user_id
            WHERE s.{flag_col} = FALSE
              AND s.status IN ('trial', 'active')
              AND COALESCE(s.paid_ends, s.trial_ends) BETWEEN %s AND %s
        """, (warn_start, warn_end))
        rows = cur.fetchall()

        for row in rows:
            sub_id, user_id, status, trial_ends, paid_ends, max_user_id, max_name = row
            expires = paid_ends or trial_ends
            kind    = "подписка" if status == "active" else "пробный период"
            name    = max_name or "Привет"

            if kind_suffix == "3d":
                text = (
                    f"⚔️ Страж — напоминание\n\n"
                    f"{name}, твой {kind} истекает через 3 дня ({expires.strftime('%d.%m.%Y')}).\n\n"
                    f"Чтобы не потерять защиту группы, продли заранее:\n"
                    f"• Месяц — 59 ₽\n"
                    f"• 3 месяца — 149 ₽ (выгодно)\n"
                    f"• Год — 590 ₽ (лучший выбор)\n\n"
                    f"Перейди в личный кабинет и нажми «Продлить»."
                )
            else:
                text = (
                    f"⚔️ Страж — последнее напоминание\n\n"
                    f"{name}, твой {kind} истекает завтра ({expires.strftime('%d.%m.%Y %H:%M')}).\n\n"
                    f"Без активной подписки бот перестанет защищать группу.\n\n"
                    f"• Месяц — 59 ₽\n"
                    f"• 3 месяца — 149 ₽ (выгодно)\n"
                    f"• Год — 590 ₽ (лучший выбор)\n\n"
                    f"Перейди в личный кабинет и нажми «Продлить»."
                )

            sent = send_max_message(max_user_id, text)

            cur.execute(f"""
                UPDATE {SCHEMA}.strazh_subscriptions
                SET {flag_col} = TRUE, updated_at = NOW()
                WHERE id = %s
            """, (sub_id,))

            cur.execute(f"""
                INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                VALUES (%s, 'notification_sent', %s)
            """, (user_id, json.dumps({"sent": sent, "kind": kind, "type": kind_suffix})))

            notified.append({"user_id": user_id, "max_user_id": max_user_id, "sent": sent, "type": kind_suffix})

def handler(event: dict, context) -> dict:
    """Отправка уведомлений об истечении подписок (за 3 дня и за 1 день)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = get_conn()
    notified = []
    try:
        now = datetime.now(timezone.utc)

        # За 3 дня (окно 71-73 часа)
        notify_batch(conn, now,
                     now + timedelta(hours=71), now + timedelta(hours=73),
                     "notified_3d", "3d", notified)

        # За 1 день (окно 23-25 часов)
        notify_batch(conn, now,
                     now + timedelta(hours=23), now + timedelta(hours=25),
                     "notified_1d", "1d", notified)

        conn.commit()

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "notified_count": len(notified),
            "notified": notified
        })}
    finally:
        conn.close()
