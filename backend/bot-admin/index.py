"""
Страж — управление ботом и модерация.
GET  /settings?group_id={id}                — настройки и правила группы.
POST / (action=connect)                     — подключить бота (проверка токена через Max API).
POST / (action=save_rules)                  — сохранить правила группы.
GET  /violations?group_id={id}&days=7       — статистика нарушений.
POST /violations                            — зафиксировать нарушение (от бота).
GET  /lists?group_id={id}                   — whitelist и blacklist.
POST /lists                                 — добавить в список.
DELETE /lists                               — удалить из списка.
"""
import json
import os
import psycopg2
import urllib.request
import urllib.error

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def verify_max_token(token: str) -> dict:
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

def verify_group_token(conn, group_id: str, token: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(f"SELECT bot_token FROM {SCHEMA}.bot_settings WHERE group_id = %s", (group_id,))
        row = cur.fetchone()
    return bool(row and row[0] == token)

def handler(event: dict, context) -> dict:
    """Управление ботом, правилами, нарушениями и списками участников."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path   = event.get("path", "/").rstrip("/")
    conn   = get_conn()

    try:
        # ── VIOLATIONS ───────────────────────────────────────────
        if "violations" in path:
            if method == "GET":
                params   = event.get("queryStringParameters") or {}
                group_id = params.get("group_id", "")
                days     = int(params.get("days", 7))
                if not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT COUNT(*), violation_type FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s AND created_at >= NOW() - INTERVAL '{days} days'
                        GROUP BY violation_type ORDER BY COUNT(*) DESC
                    """, (group_id,))
                    by_type = [{"type": r[1], "count": r[0]} for r in cur.fetchall()]

                    cur.execute(f"""
                        SELECT violator_user_id, violator_name, COUNT(*) as cnt
                        FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s AND created_at >= NOW() - INTERVAL '{days} days'
                          AND violator_user_id IS NOT NULL
                        GROUP BY violator_user_id, violator_name ORDER BY cnt DESC LIMIT 10
                    """, (group_id,))
                    top_violators = [{"user_id": r[0], "name": r[1], "count": r[2]} for r in cur.fetchall()]

                    cur.execute(f"""
                        SELECT DATE(created_at), COUNT(*) FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s AND created_at >= NOW() - INTERVAL '{days} days'
                        GROUP BY DATE(created_at) ORDER BY DATE(created_at)
                    """, (group_id,))
                    by_day = [{"date": str(r[0]), "count": r[1]} for r in cur.fetchall()]

                    cur.execute(f"""
                        SELECT COUNT(*) FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s AND created_at >= NOW() - INTERVAL '{days} days'
                    """, (group_id,))
                    total = cur.fetchone()[0]

                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "total": total, "days": days,
                    "by_type": by_type, "top_violators": top_violators, "by_day": by_day,
                })}

            if method == "POST":
                body     = json.loads(event.get("body") or "{}")
                group_id = (body.get("group_id") or "").strip()
                token    = (body.get("token") or "").strip()
                if not group_id or not token:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id and token required"})}
                if not verify_group_token(conn, group_id, token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_violations
                            (group_id, violator_user_id, violator_name, violation_type, message_text, action_taken)
                        VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                    """, (
                        group_id,
                        body.get("violator_user_id"),
                        body.get("violator_name", ""),
                        body.get("violation_type", "unknown"),
                        body.get("message_text", "")[:500],
                        body.get("action_taken", ""),
                    ))
                    new_id = cur.fetchone()[0]
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id})}

        # ── LISTS ─────────────────────────────────────────────────
        if "lists" in path:
            if method == "GET":
                params   = event.get("queryStringParameters") or {}
                group_id = params.get("group_id", "")
                if not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        SELECT target_user_id, target_name, list_type, added_at
                        FROM {SCHEMA}.strazh_user_lists
                        WHERE group_id = %s ORDER BY list_type, added_at DESC
                    """, (group_id,))
                    rows = cur.fetchall()

                whitelist = [{"user_id": r[0], "name": r[1], "added_at": str(r[3])} for r in rows if r[2] == "whitelist"]
                blacklist = [{"user_id": r[0], "name": r[1], "added_at": str(r[3])} for r in rows if r[2] == "blacklist"]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"whitelist": whitelist, "blacklist": blacklist})}

            if method == "POST":
                body      = json.loads(event.get("body") or "{}")
                group_id  = (body.get("group_id") or "").strip()
                token     = (body.get("token") or "").strip()
                target_id = body.get("target_user_id")
                name      = body.get("target_name", "")
                list_type = body.get("list_type", "")
                if not all([group_id, token, target_id, list_type]):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id, token, target_user_id, list_type required"})}
                if list_type not in ("whitelist", "blacklist"):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "list_type must be whitelist or blacklist"})}
                if not verify_group_token(conn, group_id, token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.strazh_user_lists (group_id, target_user_id, target_name, list_type)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (group_id, target_user_id)
                        DO UPDATE SET list_type = EXCLUDED.list_type, target_name = EXCLUDED.target_name
                    """, (group_id, int(target_id), name, list_type))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

            if method == "DELETE":
                body      = json.loads(event.get("body") or "{}")
                group_id  = (body.get("group_id") or "").strip()
                token     = (body.get("token") or "").strip()
                target_id = body.get("target_user_id")
                if not all([group_id, token, target_id]):
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id, token, target_user_id required"})}
                if not verify_group_token(conn, group_id, token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"DELETE FROM {SCHEMA}.strazh_user_lists WHERE group_id = %s AND target_user_id = %s", (group_id, int(target_id)))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # ── SETTINGS (GET) ────────────────────────────────────────
        if method == "GET":
            params   = event.get("queryStringParameters") or {}
            group_id = params.get("group_id", "")
            if not group_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

            with conn.cursor() as cur:
                cur.execute(f"SELECT group_name, connected_at FROM {SCHEMA}.bot_settings WHERE group_id = %s", (group_id,))
                row = cur.fetchone()
                cur.execute(f"SELECT rules_text FROM {SCHEMA}.bot_rules WHERE group_id = %s", (group_id,))
                rules_row = cur.fetchone()

            if not row:
                return {"statusCode": 404, "headers": CORS, "body": json.dumps({"connected": False})}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "connected":    True,
                "group_name":   row[0],
                "connected_at": str(row[1]),
                "rules_text":   rules_row[0] if rules_row else "",
            })}

        # ── SETTINGS (POST) ───────────────────────────────────────
        if method == "POST":
            body   = json.loads(event.get("body") or "{}")
            action = body.get("action", "connect")

            if action == "connect":
                token    = (body.get("token") or "").strip()
                group_id = (body.get("group_id") or "").strip()
                if not token or not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "token and group_id required"})}

                verify = verify_max_token(token)
                if not verify["ok"]:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Токен недействителен: {verify['error']}"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.bot_settings (group_id, bot_token, group_name)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (group_id) DO UPDATE
                        SET bot_token = EXCLUDED.bot_token, group_name = EXCLUDED.group_name, updated_at = NOW()
                    """, (group_id, token, verify.get("name", "")))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "ok": True, "bot_name": verify.get("name", ""), "bot_username": verify.get("username", ""),
                })}

            if action == "save_rules":
                group_id   = (body.get("group_id") or "").strip()
                rules_text = body.get("rules_text", "")
                token      = (body.get("token") or "").strip()
                if not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}
                if not token:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "token required"})}
                if not verify_group_token(conn, group_id, token):
                    return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Доступ запрещён"})}

                with conn.cursor() as cur:
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.bot_rules (group_id, rules_text)
                        VALUES (%s, %s)
                        ON CONFLICT (group_id) DO UPDATE
                        SET rules_text = EXCLUDED.rules_text, updated_at = NOW()
                    """, (group_id, rules_text))
                    conn.commit()
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}

    finally:
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
