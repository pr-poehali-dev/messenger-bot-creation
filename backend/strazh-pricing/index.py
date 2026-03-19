"""
Страж — управление тарифами.
GET / — список тарифов для всех.
POST / — обновить цену (только для is_admin=True + валидный session_token).
"""
import json
import os
import hashlib
import hmac
from datetime import datetime, timezone
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
    token_raw = f"{max_user_id}:{user_id}:{os.environ.get('DATABASE_URL','')[:20]}"
    return hashlib.sha256(token_raw.encode()).hexdigest()

def check_admin_rate_limit(conn, user_id: int, limit: int = 5) -> bool:
    """Не более 5 попыток входа в админку в минуту."""
    now = datetime.now(timezone.utc)
    window = now.replace(second=0, microsecond=0)
    with conn.cursor() as cur:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.strazh_rate_limit (max_user_id, window_start, count)
            VALUES (%s, %s, 1)
            ON CONFLICT (max_user_id, window_start)
            DO UPDATE SET count = strazh_rate_limit.count + 1
            RETURNING count
        """, (user_id, window))
        count = cur.fetchone()[0]
        conn.commit()
    return count <= limit

def verify_admin(conn, user_id: int, session_token: str) -> bool:
    """Проверяет is_admin=True И что session_token совпадает с ожидаемым."""
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT is_admin, max_user_id FROM {SCHEMA}.strazh_users WHERE id = %s",
            (user_id,)
        )
        row = cur.fetchone()
    if not row or not row[0]:
        return False
    is_admin, max_user_id = row
    expected_token = make_session_token(max_user_id, user_id)
    return hmac.compare_digest(expected_token, session_token)

def handler(event: dict, context) -> dict:
    """Получение и обновление тарифов Страж."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = get_conn()
    try:
        if event.get("httpMethod") == "GET":
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT plan, label, price_rub, days, badge, sort_order
                    FROM {SCHEMA}.strazh_pricing
                    ORDER BY sort_order
                """)
                rows = cur.fetchall()
            plans = [
                {"plan": r[0], "label": r[1], "price_rub": r[2],
                 "days": r[3], "badge": r[4], "sort_order": r[5]}
                for r in rows
            ]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"plans": plans})}

        if event.get("httpMethod") == "POST":
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

            if not check_admin_rate_limit(conn, user_id_int):
                return {"statusCode": 429, "headers": CORS, "body": json.dumps({"error": "Слишком много попыток. Попробуй через минуту"})}

            if not verify_admin(conn, user_id_int, token):
                return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

            with conn.cursor() as cur:
                cur.execute(f"""
                    UPDATE {SCHEMA}.strazh_pricing
                    SET price_rub = %s, badge = %s, updated_at = NOW()
                    WHERE plan = %s
                    RETURNING plan, label, price_rub
                """, (int(price_rub), badge, plan))  # noqa
                row = cur.fetchone()
                conn.commit()

            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Тариф не найден"})}

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"updated": {"plan": row[0], "label": row[1], "price_rub": row[2]}})}

    finally:
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}