"""
Страж — управление подписками и платежами.
POST /create-payment — создать платёж (заглушка Сбер, готова к подключению).
POST /confirm-payment — подтвердить оплату (вебхук от Сбер).
GET /status — проверить статус подписки.
"""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

PLAN_DAYS = {"month": 30, "quarter": 90, "year": 365}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Создание платежей и управление подписками Страж."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    path   = event.get("path", "/").rstrip("/")
    method = event.get("httpMethod", "GET")

    # GET /status
    if method == "GET" and path.endswith("status"):
        params  = event.get("queryStringParameters") or {}
        user_id = params.get("user_id")
        if not user_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id required"})}

        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT status, trial_ends, paid_ends, plan, notified_1d
                    FROM {SCHEMA}.strazh_subscriptions
                    WHERE user_id = %s
                    ORDER BY id DESC LIMIT 1
                """, (int(user_id),))
                row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Подписка не найдена"})}
            status, trial_ends, paid_ends, plan, notified = row
            expires = paid_ends or trial_ends
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "status": status, "plan": plan,
                "expires": expires.isoformat() if expires else None,
                "notified_1d": notified
            })}
        finally:
            conn.close()

    # POST /create-payment
    if method == "POST" and path.endswith("create-payment"):
        body    = json.loads(event.get("body") or "{}")
        user_id = body.get("user_id")
        plan    = body.get("plan")

        if not all([user_id, plan]):
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "user_id, plan required"})}
        if plan not in PLAN_DAYS:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверный тариф"})}

        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"SELECT price_rub FROM {SCHEMA}.strazh_pricing WHERE plan = %s", (plan,))
                row = cur.fetchone()
                if not row:
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Тариф не найден"})}
                price = row[0]

                # Заглушка — в будущем здесь будет вызов Sber API
                # sber_response = sber_create_order(price, plan, user_id)
                # Пока генерируем локальный order_id
                import hashlib, time
                order_id = hashlib.md5(f"{user_id}:{plan}:{time.time()}".encode()).hexdigest()[:16].upper()
                payment_url = f"/pay?order_id={order_id}&plan={plan}&amount={price}"

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_payments
                        (user_id, plan, amount_rub, status, sber_order_id, sber_payment_url)
                    VALUES (%s, %s, %s, 'pending', %s, %s)
                    RETURNING id
                """, (int(user_id), plan, price, order_id, payment_url))
                payment_id = cur.fetchone()[0]

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                    VALUES (%s, 'payment_created', %s)
                """, (int(user_id), json.dumps({"plan": plan, "amount": price, "order_id": order_id})))
                conn.commit()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "payment_id":   payment_id,
                "order_id":     order_id,
                "payment_url":  payment_url,
                "amount_rub":   price,
                "plan":         plan,
                "sber_ready":   False,  # True когда подключим Сбер
            })}
        finally:
            conn.close()

    # POST /confirm-payment (вебхук от Сбер или ручное подтверждение)
    if method == "POST" and path.endswith("confirm-payment"):
        body     = json.loads(event.get("body") or "{}")
        order_id = body.get("order_id")
        if not order_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "order_id required"})}

        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT id, user_id, plan FROM {SCHEMA}.strazh_payments
                    WHERE sber_order_id = %s AND status = 'pending'
                """, (order_id,))
                prow = cur.fetchone()
                if not prow:
                    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Платёж не найден"})}
                payment_id, user_id, plan = prow

                now     = datetime.now(timezone.utc)
                days    = PLAN_DAYS.get(plan, 30)
                ends_at = now + timedelta(days=days)

                cur.execute(f"""
                    UPDATE {SCHEMA}.strazh_payments
                    SET status = 'paid', paid_at = NOW()
                    WHERE id = %s
                """, (payment_id,))

                cur.execute(f"""
                    UPDATE {SCHEMA}.strazh_subscriptions
                    SET status = 'active', plan = %s,
                        paid_starts = %s, paid_ends = %s,
                        notified_1d = FALSE, updated_at = NOW()
                    WHERE user_id = %s
                """, (plan, now, ends_at, user_id))

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                    VALUES (%s, 'payment_confirmed', %s)
                """, (user_id, json.dumps({"plan": plan, "ends_at": ends_at.isoformat()})))
                conn.commit()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "status": "active", "plan": plan, "expires": ends_at.isoformat()
            })}
        finally:
            conn.close()

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
