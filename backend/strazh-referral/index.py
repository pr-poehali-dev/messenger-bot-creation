"""
Страж — реферальная программа.
GET /?user_id={id} — получить реферальную ссылку и статистику (сколько привёл, бонусов получил).
POST /apply — применить реферальный код при регистрации (даёт +7 дней обоим).
"""
import json
import os
import hashlib
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
BONUS_DAYS = 7

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def make_ref_code(user_id: int) -> str:
    raw = f"strazh-ref-{user_id}-{os.environ.get('DATABASE_URL','')[:10]}"
    return hashlib.md5(raw.encode()).hexdigest()[:10].upper()

def add_bonus_days(cur, user_id: int, days: int):
    """Добавляет бонусные дни к активной/триальной подписке пользователя."""
    now = datetime.now(timezone.utc)
    cur.execute(f"""
        SELECT id, status, trial_ends, paid_ends
        FROM {SCHEMA}.strazh_subscriptions
        WHERE user_id = %s
        ORDER BY id DESC LIMIT 1
    """, (user_id,))
    sub = cur.fetchone()
    if not sub:
        return
    sub_id, status, trial_ends, paid_ends = sub
    if status in ('trial',) and trial_ends:
        new_end = max(trial_ends, now) + timedelta(days=days)
        cur.execute(f"""
            UPDATE {SCHEMA}.strazh_subscriptions
            SET trial_ends = %s, updated_at = NOW() WHERE id = %s
        """, (new_end, sub_id))
    elif status in ('active', 'expired') :
        base = max(paid_ends, now) if paid_ends else now
        new_end = base + timedelta(days=days)
        cur.execute(f"""
            UPDATE {SCHEMA}.strazh_subscriptions
            SET paid_ends = %s, status = 'active', updated_at = NOW() WHERE id = %s
        """, (new_end, sub_id))

def handler(event: dict, context) -> dict:
    """Реферальная программа: получить код, применить бонус."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    conn = get_conn()

    try:
        if method == "GET":
            params = event.get("queryStringParameters") or {}
            user_id = params.get("user_id")
            if not user_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id required"})}
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id must be integer"})}

            ref_code = make_ref_code(user_id)

            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT COUNT(*), COALESCE(SUM(bonus_days), 0)
                    FROM {SCHEMA}.strazh_referrals
                    WHERE referrer_user_id = %s
                """, (user_id,))
                row = cur.fetchone()
                invited_count = row[0]
                total_bonus   = row[1]

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ref_code": ref_code,
                "ref_link": f"https://poehali.dev/apps/messenger-bot-creation/strazh?ref={ref_code}",
                "invited_count": invited_count,
                "total_bonus_days": int(total_bonus),
            })}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            ref_code     = (body.get("ref_code") or "").strip().upper()
            new_user_id  = body.get("new_user_id")

            if not ref_code or not new_user_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "ref_code and new_user_id required"})}
            try:
                new_user_id = int(new_user_id)
            except (ValueError, TypeError):
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "new_user_id must be integer"})}

            with conn.cursor() as cur:
                # Найти referrer по коду
                cur.execute(f"SELECT id FROM {SCHEMA}.strazh_users", ())
                all_users = cur.fetchall()
                referrer_id = None
                for (uid,) in all_users:
                    if make_ref_code(uid) == ref_code:
                        referrer_id = uid
                        break

                if not referrer_id:
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Реферальный код не найден"})}

                if referrer_id == new_user_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нельзя использовать собственный код"})}

                # Проверить что этот пользователь ещё не был приглашён
                cur.execute(f"""
                    SELECT id FROM {SCHEMA}.strazh_referrals WHERE referred_user_id = %s
                """, (new_user_id,))
                if cur.fetchone():
                    return {"statusCode": 409, "headers": CORS, "body": json.dumps({"error": "Реферальный бонус уже был применён"})}

                # Записать связь
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_referrals (referrer_user_id, referred_user_id, bonus_days)
                    VALUES (%s, %s, %s)
                """, (referrer_id, new_user_id, BONUS_DAYS))

                # Начислить бонус обоим
                add_bonus_days(cur, referrer_id, BONUS_DAYS)
                add_bonus_days(cur, new_user_id, BONUS_DAYS)

                # Аудит
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                    VALUES (%s, 'referral_bonus', %s)
                """, (referrer_id, json.dumps({"referred_user_id": new_user_id, "bonus_days": BONUS_DAYS})))

                conn.commit()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ok": True,
                "bonus_days": BONUS_DAYS,
                "message": f"Бонус +{BONUS_DAYS} дней начислен обоим участникам"
            })}

    finally:
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
