"""
Страж — аутентификация и тарифы.
POST /          — регистрация/вход по max_user_id, запуск триала.
GET  /pricing   — список тарифов (публично).
POST /pricing   — обновить тариф (только админ + session_token).
GET  /settings  — получить настройки (trial_days).
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

def make_session_token(max_user_id: int, user_id: int) -> str:
    raw = f"{max_user_id}:{user_id}:{os.environ.get('DATABASE_URL','')[:20]}"
    return hashlib.sha256(raw.encode()).hexdigest()

def check_rate_limit(conn, max_user_id: int, limit: int = 10) -> bool:
    now    = datetime.now(timezone.utc)
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

def get_trial_days(conn) -> int:
    with conn.cursor() as cur:
        cur.execute(f"SELECT value FROM {SCHEMA}.strazh_settings WHERE key = 'trial_days'")
        row = cur.fetchone()
    return int(row[0]) if row else 7

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

def handler(event: dict, context) -> dict:
    """Аутентификация пользователей и управление тарифами Страж."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path   = event.get("path", "/").rstrip("/")

    # ── GET /settings — публичные настройки (trial_days) ──────
    if method == "GET" and path.endswith("settings"):
        conn = get_conn()
        try:
            trial_days = get_trial_days(conn)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"trial_days": trial_days})}
        finally:
            conn.close()

    # ── GET /pricing — публичный список тарифов ───────────────
    if method == "GET" and path.endswith("pricing"):
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT plan, label, price_rub, days, badge, sort_order
                    FROM {SCHEMA}.strazh_pricing ORDER BY sort_order
                """)
                rows = cur.fetchall()
            plans = [
                {"plan": r[0], "label": r[1], "price_rub": r[2],
                 "days": r[3], "badge": r[4], "sort_order": r[5]}
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"plans": plans})}
        finally:
            conn.close()

    # ── POST /pricing — обновить тариф (только админ) ─────────
    if method == "POST" and path.endswith("pricing"):
        body      = json.loads(event.get("body") or "{}")
        user_id   = body.get("user_id")
        token     = body.get("session_token", "")
        plan      = body.get("plan")
        price_rub = body.get("price_rub")
        badge     = body.get("badge")

        if not all([user_id, plan, price_rub is not None]):
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id, plan, price_rub required"})}
        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id must be integer"})}

        conn = get_conn()
        try:
            if not check_rate_limit(conn, user_id_int, limit=5):
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "Слишком много попыток. Попробуй через минуту"})}
            if not verify_admin(conn, user_id_int, token):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

            with conn.cursor() as cur:
                cur.execute(f"""
                    UPDATE {SCHEMA}.strazh_pricing
                    SET price_rub = %s, badge = %s, updated_at = NOW()
                    WHERE plan = %s
                    RETURNING plan, label, price_rub
                """, (int(price_rub), badge, plan))
                row = cur.fetchone()
                conn.commit()

            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Тариф не найден"})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "updated": {"plan": row[0], "label": row[1], "price_rub": row[2]}
            })}
        finally:
            conn.close()

    # ── POST / — регистрация / вход ───────────────────────────
    if method == "POST":
        body         = json.loads(event.get("body") or "{}")
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
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_users (max_user_id, max_username, max_name)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (max_user_id)
                    DO UPDATE SET max_username = EXCLUDED.max_username, max_name = EXCLUDED.max_name
                    RETURNING id, is_admin, created_at
                """, (max_user_id, max_username, max_name))
                row = cur.fetchone()
                user_id, is_admin, created_at = row

                cur.execute(f"""
                    SELECT id, status, trial_started, trial_ends, paid_ends
                    FROM {SCHEMA}.strazh_subscriptions
                    WHERE user_id = %s ORDER BY id DESC LIMIT 1
                """, (user_id,))
                sub = cur.fetchone()

                now        = datetime.now(timezone.utc)
                trial_days = get_trial_days(conn)
                if not sub:
                    trial_end = now + timedelta(days=trial_days)
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_subscriptions
                            (user_id, status, trial_started, trial_ends, trial_days_snapshot)
                        VALUES (%s, 'trial', %s, %s, %s)
                        RETURNING id, status, trial_ends
                    """, (user_id, now, trial_end, trial_days))
                    sub_row = cur.fetchone()
                    sub_id, status, expires = sub_row
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                        VALUES (%s, 'trial_start', %s)
                    """, (user_id, json.dumps({"max_user_id": max_user_id, "trial_days": trial_days})))
                else:
                    sub_id, status, trial_started, trial_ends, paid_ends = sub
                    if status == "trial" and trial_ends and now > trial_ends:
                        cur.execute(f"UPDATE {SCHEMA}.strazh_subscriptions SET status='expired', updated_at=NOW() WHERE id=%s", (sub_id,))
                        status = "expired"
                    elif status == "active" and paid_ends and now > paid_ends:
                        cur.execute(f"UPDATE {SCHEMA}.strazh_subscriptions SET status='expired', updated_at=NOW() WHERE id=%s", (sub_id,))
                        status = "expired"
                    expires = paid_ends or trial_ends

                conn.commit()
                session_token = make_session_token(max_user_id, user_id)

                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "user_id":       user_id,
                    "max_user_id":   max_user_id,
                    "max_username":  max_username,
                    "is_admin":      is_admin,
                    "session_token": session_token,
                    "subscription":  {
                        "status":  status,
                        "expires": expires.isoformat() if expires else None,
                    }
                })}
        finally:
            conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}