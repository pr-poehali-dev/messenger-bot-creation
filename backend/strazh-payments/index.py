"""
Страж — платежи и подписки.
GET  /status?user_id={id}   — статус подписки.
POST /create-payment        — создать платёж (ЮMoney quickpay).
POST /confirm-payment       — подтвердить вручную (для тестов).
POST /ymhook                — webhook от ЮMoney (SHA1-подпись).
"""
import json
import os
import hashlib
import psycopg2
from datetime import datetime, timezone, timedelta
from urllib.parse import unquote_plus

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token",
}

PLAN_DAYS = {"month": 30, "quarter": 90, "year": 365, "agency": 30}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def activate_subscription(cur, user_id: int, plan: str, schema: str):
    """Единая функция активации подписки — используется и вебхуком и ручным подтверждением."""
    now     = datetime.now(timezone.utc)
    days    = PLAN_DAYS.get(plan, 30)
    ends_at = now + timedelta(days=days)
    cur.execute(f"""
        UPDATE {schema}.strazh_subscriptions
        SET status = 'active', plan = %s,
            paid_starts = %s, paid_ends = %s,
            notified_1d = FALSE, notified_3d = FALSE, updated_at = NOW()
        WHERE user_id = %s
    """, (plan, now, ends_at, user_id))
    return ends_at

def verify_ymoney_signature(params: dict, secret: str) -> bool:
    fields = [
        params.get("notification_type", ""),
        params.get("operation_id", ""),
        params.get("amount", ""),
        params.get("currency", ""),
        params.get("datetime", ""),
        params.get("sender", ""),
        params.get("codepro", ""),
        secret,
        params.get("label", ""),
    ]
    expected = hashlib.sha1("&".join(fields).encode("utf-8")).hexdigest()
    return expected == params.get("sha1_hash", "")

def handler(event: dict, context) -> dict:
    """Управление платежами и подписками Страж."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    path   = event.get("path", "/").rstrip("/")
    method = event.get("httpMethod", "GET")

    # ── GET /status ──────────────────────────────────────────
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
                    WHERE user_id = %s ORDER BY id DESC LIMIT 1
                """, (int(user_id),))
                row = cur.fetchone()
            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Подписка не найдена"})}
            status, trial_ends, paid_ends, plan, notified = row
            expires = paid_ends or trial_ends
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "status": status, "plan": plan,
                "expires": expires.isoformat() if expires else None,
                "notified_1d": notified,
            })}
        finally:
            conn.close()

    # ── POST /create-payment ──────────────────────────────────
    if method == "POST" and path.endswith("create-payment"):
        import time
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
                price    = row[0]
                order_id = hashlib.md5(f"{user_id}:{plan}:{time.time()}".encode()).hexdigest()[:16].upper()
                pay_url  = f"/pay?order_id={order_id}&plan={plan}&amount={price}"

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_payments
                        (user_id, plan, amount_rub, status, sber_order_id, sber_payment_url)
                    VALUES (%s, %s, %s, 'pending', %s, %s) RETURNING id
                """, (int(user_id), plan, price, order_id, pay_url))
                payment_id = cur.fetchone()[0]

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                    VALUES (%s, 'payment_created', %s)
                """, (int(user_id), json.dumps({"plan": plan, "amount": price, "order_id": order_id})))
                conn.commit()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "payment_id": payment_id, "order_id": order_id,
                "payment_url": pay_url, "amount_rub": price, "plan": plan,
            })}
        finally:
            conn.close()

    # ── POST /confirm-payment ─────────────────────────────────
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

                cur.execute(f"UPDATE {SCHEMA}.strazh_payments SET status='paid', paid_at=NOW() WHERE id=%s", (payment_id,))
                ends_at = activate_subscription(cur, user_id, plan, SCHEMA)

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

    # ── POST /ymhook — webhook от ЮMoney ─────────────────────
    if method == "POST" and path.endswith("ymhook"):
        secret = os.environ.get("YOOMONEY_SECRET", "")
        raw    = event.get("body", "") or ""

        parsed = {}
        for part in raw.split("&"):
            if "=" in part:
                k, v = part.split("=", 1)
                parsed[unquote_plus(k)] = unquote_plus(v)

        if secret and not verify_ymoney_signature(parsed, secret):
            return {"statusCode": 400, "headers": CORS, "body": "Bad signature"}
        if parsed.get("codepro") == "true":
            return {"statusCode": 200, "headers": CORS, "body": "test skipped"}

        label     = parsed.get("label", "")
        amount    = parsed.get("amount", "0")
        operation = parsed.get("operation_id", "")

        if not label:
            return {"statusCode": 200, "headers": CORS, "body": "no label"}

        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT id, user_id, plan, status FROM {SCHEMA}.strazh_payments
                    WHERE sber_order_id = %s
                """, (label,))
                row = cur.fetchone()

                if not row:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_audit_log (action, details)
                        VALUES ('ymhook_unknown_label', %s)
                    """, (json.dumps({"label": label, "amount": amount, "operation": operation}),))
                    conn.commit()
                    return {"statusCode": 200, "headers": CORS, "body": "unknown label"}

                payment_id, user_id, plan, status = row
                if status == "paid":
                    return {"statusCode": 200, "headers": CORS, "body": "already processed"}

                cur.execute(f"UPDATE {SCHEMA}.strazh_payments SET status='paid', paid_at=NOW() WHERE id=%s", (payment_id,))
                ends_at = activate_subscription(cur, user_id, plan, SCHEMA)

                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                    VALUES (%s, 'ymoney_payment_confirmed', %s)
                """, (user_id, json.dumps({
                    "plan": plan, "amount": amount,
                    "ends_at": ends_at.isoformat(), "operation": operation, "label": label,
                })))
                conn.commit()

            return {"statusCode": 200, "headers": CORS, "body": "ok"}
        finally:
            conn.close()

    return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Not found"})}
