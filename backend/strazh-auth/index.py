"""
Страж — аутентификация и регистрация пользователей.
Принимает max_user_id (неизменяемый ID из Макс), регистрирует и запускает триал.
"""
import json
import os
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def check_rate_limit(conn, max_user_id: int, limit: int = 10) -> bool:
    """Возвращает True если запрос разрешён, False если превышен лимит."""
    now = datetime.now(timezone.utc)
    window = now.replace(second=0, microsecond=0)
    with conn.cursor() as cur:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.strazh_rate_limit (max_user_id, window_start, count)
            VALUES (%s, %s, 1)
            ON CONFLICT (max_user_id, window_start)
            DO UPDATE SET count = strazh_rate_limit.count + 1
            RETURNING count
        """, (max_user_id, window))
        count = cur.fetchone()[0]
        conn.commit()
    return count <= limit

def handler(event: dict, context) -> dict:
    """Регистрация/вход пользователя по max_user_id."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    max_user_id  = body.get("max_user_id")
    max_username = body.get("max_username", "")
    max_name     = body.get("max_name", "")

    if not max_user_id:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "max_user_id required"})}

    try:
        max_user_id = int(max_user_id)
    except (ValueError, TypeError):
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "max_user_id must be integer"})}

    conn = get_conn()
    try:
        if not check_rate_limit(conn, max_user_id):
            return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "Слишком много запросов"})}

        with conn.cursor() as cur:
            # Обновляем ник (он может меняться), но user_id остаётся тем же
            cur.execute(f"""
                INSERT INTO {SCHEMA}.strazh_users (max_user_id, max_username, max_name)
                VALUES (%s, %s, %s)
                ON CONFLICT (max_user_id)
                DO UPDATE SET max_username = EXCLUDED.max_username, max_name = EXCLUDED.max_name
                RETURNING id, is_admin, created_at
            """, (max_user_id, max_username, max_name))
            row = cur.fetchone()
            user_id, is_admin, created_at = row

            # Проверяем подписку
            cur.execute(f"""
                SELECT id, status, trial_started, trial_ends, paid_ends
                FROM {SCHEMA}.strazh_subscriptions
                WHERE user_id = %s
                ORDER BY id DESC LIMIT 1
            """, (user_id,))
            sub = cur.fetchone()

            now = datetime.now(timezone.utc)
            if not sub:
                # Первый вход — запускаем триал 7 дней
                trial_end = now + timedelta(days=7)
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_subscriptions
                        (user_id, status, trial_started, trial_ends)
                    VALUES (%s, 'trial', %s, %s)
                    RETURNING id, status, trial_ends
                """, (user_id, now, trial_end))
                sub_row = cur.fetchone()
                sub_id, status, expires = sub_row

                # Аудит
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                    VALUES (%s, 'trial_start', %s)
                """, (user_id, json.dumps({"max_user_id": max_user_id})))
            else:
                sub_id, status, trial_started, trial_ends, paid_ends = sub
                # Проверяем не истёк ли триал/подписка
                if status == "trial" and trial_ends and now > trial_ends:
                    cur.execute(f"""
                        UPDATE {SCHEMA}.strazh_subscriptions
                        SET status = 'expired', updated_at = NOW()
                        WHERE id = %s
                    """, (sub_id,))
                    status = "expired"
                elif status == "active" and paid_ends and now > paid_ends:
                    cur.execute(f"""
                        UPDATE {SCHEMA}.strazh_subscriptions
                        SET status = 'expired', updated_at = NOW()
                        WHERE id = %s
                    """, (sub_id,))
                    status = "expired"
                expires = paid_ends or trial_ends

            conn.commit()

            # Генерируем простой session token
            token_raw = f"{max_user_id}:{user_id}:{os.environ.get('DATABASE_URL','')[:20]}"
            session_token = hashlib.sha256(token_raw.encode()).hexdigest()

            return {
                "statusCode": 200,
                "headers": CORS,
                "body": json.dumps({
                    "user_id":       user_id,
                    "max_user_id":   max_user_id,
                    "max_username":  max_username,
                    "is_admin":      is_admin,
                    "session_token": session_token,
                    "subscription": {
                        "status":  status,
                        "expires": expires.isoformat() if expires else None,
                    }
                })
            }
    finally:
        conn.close()
