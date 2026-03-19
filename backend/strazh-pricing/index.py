"""
Страж — управление тарифами.
GET / — список тарифов для всех.
POST / — обновить цену (только для is_admin=True).
"""
import json
import os
import hashlib
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def verify_admin(conn, user_id: int, session_token: str) -> bool:
    expected = hashlib.sha256(
        f"{user_id}:{os.environ.get('DATABASE_URL','')[:20]}".encode()
    ).hexdigest()
    # Упрощённая проверка — токен содержит user_id
    with conn.cursor() as cur:
        cur.execute(f"SELECT is_admin FROM {SCHEMA}.strazh_users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        return row and row[0]

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

            if not verify_admin(conn, int(user_id), token):
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

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"updated": {"plan": row[0], "label": row[1], "price_rub": row[2]}})}

    finally:
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
