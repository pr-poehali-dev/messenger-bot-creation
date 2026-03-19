import json
import os
import psycopg2
import urllib.request
import urllib.error

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p54414125_messenger_bot_creati")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def verify_max_token(token: str) -> dict:
    """Проверяет токен бота через Max API (аналог Telegram getMe)."""
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


def handler(event: dict, context) -> dict:
    """Сохранение и получение настроек подключения бота (токен, group_id) и правил группы."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")

    # GET — вернуть настройки по group_id
    if method == "GET":
        params = event.get("queryStringParameters") or {}
        group_id = params.get("group_id", "")
        if not group_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"SELECT group_name, connected_at FROM {SCHEMA}.bot_settings WHERE group_id = %s",
            (group_id,)
        )
        row = cur.fetchone()
        cur.execute(
            f"SELECT rules_text FROM {SCHEMA}.bot_rules WHERE group_id = %s",
            (group_id,)
        )
        rules_row = cur.fetchone()
        conn.close()

        if not row:
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"connected": False})}

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "connected": True,
            "group_name": row[0],
            "connected_at": str(row[1]),
            "rules_text": rules_row[0] if rules_row else "",
        })}

    # POST — сохранить токен + group_id или сохранить правила
    if method == "POST":
        body = json.loads(event.get("body") or "{}")
        action = body.get("action", "connect")

        if action == "connect":
            token = (body.get("token") or "").strip()
            group_id = (body.get("group_id") or "").strip()

            if not token or not group_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "token and group_id required"})}

            # Проверяем токен через Max API
            verify = verify_max_token(token)
            if not verify["ok"]:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({
                    "error": f"Токен недействителен: {verify['error']}"
                })}

            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.bot_settings (group_id, bot_token, group_name)
                VALUES (%s, %s, %s)
                ON CONFLICT (group_id) DO UPDATE
                SET bot_token = EXCLUDED.bot_token,
                    group_name = EXCLUDED.group_name,
                    updated_at = NOW()
            """, (group_id, token, verify.get("name", "")))
            conn.commit()
            conn.close()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ok": True,
                "bot_name": verify.get("name", ""),
                "bot_username": verify.get("username", ""),
            })}

        if action == "save_rules":
            group_id = (body.get("group_id") or "").strip()
            rules_text = body.get("rules_text", "")

            if not group_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.bot_rules (group_id, rules_text)
                VALUES (%s, %s)
                ON CONFLICT (group_id) DO UPDATE
                SET rules_text = EXCLUDED.rules_text, updated_at = NOW()
            """, (group_id, rules_text))
            conn.commit()
            conn.close()

            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}
