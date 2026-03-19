"""
Страж — webhook от ЮMoney.
ЮMoney отправляет POST-запрос после успешной оплаты.
Проверяем подпись SHA1, активируем подписку пользователя.
"""
import json
import os
import hashlib
import psycopg2
from datetime import datetime, timezone, timedelta
from urllib.parse import parse_qs

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

PLAN_DAYS = {"month": 30, "quarter": 90, "year": 365}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def verify_signature(params: dict, secret: str) -> bool:
    """
    ЮMoney подписывает уведомление SHA1 от строки:
    notification_type&operation_id&amount&currency&datetime&sender&codepro&secret&label
    """
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
    check_str = "&".join(fields)
    expected = hashlib.sha1(check_str.encode("utf-8")).hexdigest()
    return expected == params.get("sha1_hash", "")

def parse_label(label: str):
    """
    label формата: STRAZH-{timestamp} — извлекаем plan и user_id из БД по sber_order_id.
    """
    return label

def handler(event: dict, context) -> dict:
    """Обработка уведомлений об оплате от ЮMoney."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": CORS, "body": "Method Not Allowed"}

    secret = os.environ.get("YOOMONEY_SECRET", "")
    body   = event.get("body", "") or ""

    # ЮMoney присылает application/x-www-form-urlencoded
    parsed = {}
    for part in body.split("&"):
        if "=" in part:
            k, v = part.split("=", 1)
            from urllib.parse import unquote_plus
            parsed[unquote_plus(k)] = unquote_plus(v)

    # Проверяем подпись
    if secret and not verify_signature(parsed, secret):
        return {"statusCode": 400, "headers": CORS, "body": "Bad signature"}

    # Проверяем что платёж успешный и не тестовый
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
            # Ищем платёж по order_id (label)
            cur.execute(f"""
                SELECT id, user_id, plan, amount_rub, status
                FROM {SCHEMA}.strazh_payments
                WHERE sber_order_id = %s
            """, (label,))
            row = cur.fetchone()

            if not row:
                # Платёж не найден — логируем и выходим
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.strazh_audit_log (action, details)
                    VALUES ('ymhook_unknown_label', %s)
                """, (json.dumps({"label": label, "amount": amount, "operation": operation}),))
                conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": "unknown label"}

            payment_id, user_id, plan, expected_amount, status = row

            # Уже обработан
            if status == "paid":
                return {"statusCode": 200, "headers": CORS, "body": "already processed"}

            now     = datetime.now(timezone.utc)
            days    = PLAN_DAYS.get(plan, 30)
            ends_at = now + timedelta(days=days)

            # Помечаем платёж оплаченным
            cur.execute(f"""
                UPDATE {SCHEMA}.strazh_payments
                SET status = 'paid', paid_at = NOW(), sber_order_id = sber_order_id
                WHERE id = %s
            """, (payment_id,))

            # Активируем подписку
            cur.execute(f"""
                UPDATE {SCHEMA}.strazh_subscriptions
                SET status = 'active', plan = %s,
                    paid_starts = %s, paid_ends = %s,
                    notified_1d = FALSE, updated_at = NOW()
                WHERE user_id = %s
            """, (plan, now, ends_at, user_id))

            # Аудит
            cur.execute(f"""
                INSERT INTO {SCHEMA}.strazh_audit_log (user_id, action, details)
                VALUES (%s, 'ymoney_payment_confirmed', %s)
            """, (user_id, json.dumps({
                "plan":       plan,
                "amount":     amount,
                "ends_at":    ends_at.isoformat(),
                "operation":  operation,
                "label":      label,
            })))

            conn.commit()

        return {"statusCode": 200, "headers": CORS, "body": "ok"}
    finally:
        conn.close()
