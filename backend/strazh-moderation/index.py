"""
Страж — модерация: статистика нарушений, whitelist/blacklist.
GET /violations?group_id={id}&days=7 — статистика нарушений за N дней.
POST /violation — зафиксировать нарушение (вызывается самим ботом).
GET /lists?group_id={id} — получить whitelist и blacklist.
POST /lists — добавить пользователя в список.
DELETE /lists — удалить пользователя из списка.
"""
import json
import os
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def verify_group_token(conn, group_id: str, token: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT bot_token FROM {SCHEMA}.bot_settings WHERE group_id = %s",
            (group_id,)
        )
        row = cur.fetchone()
    return bool(row and row[0] == token)

def handler(event: dict, context) -> dict:
    """Статистика нарушений и управление whitelist/blacklist."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path   = event.get("path", "/")
    conn   = get_conn()

    try:
        # === VIOLATIONS ===
        if "violations" in path:
            if method == "GET":
                params   = event.get("queryStringParameters") or {}
                group_id = params.get("group_id", "")
                days     = int(params.get("days", 7))
                if not group_id:
                    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "group_id required"})}

                with conn.cursor() as cur:
                    # Общая статистика
                    cur.execute(f"""
                        SELECT COUNT(*), violation_type
                        FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s
                          AND created_at >= NOW() - INTERVAL '{days} days'
                        GROUP BY violation_type
                        ORDER BY COUNT(*) DESC
                    """, (group_id,))
                    by_type = [{"type": r[1], "count": r[0]} for r in cur.fetchall()]

                    # Топ нарушителей
                    cur.execute(f"""
                        SELECT violator_user_id, violator_name, COUNT(*) as cnt
                        FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s
                          AND created_at >= NOW() - INTERVAL '{days} days'
                          AND violator_user_id IS NOT NULL
                        GROUP BY violator_user_id, violator_name
                        ORDER BY cnt DESC
                        LIMIT 10
                    """, (group_id,))
                    top_violators = [
                        {"user_id": r[0], "name": r[1], "count": r[2]}
                        for r in cur.fetchall()
                    ]

                    # По дням
                    cur.execute(f"""
                        SELECT DATE(created_at), COUNT(*)
                        FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s
                          AND created_at >= NOW() - INTERVAL '{days} days'
                        GROUP BY DATE(created_at)
                        ORDER BY DATE(created_at)
                    """, (group_id,))
                    by_day = [{"date": str(r[0]), "count": r[1]} for r in cur.fetchall()]

                    cur.execute(f"""
                        SELECT COUNT(*) FROM {SCHEMA}.strazh_violations
                        WHERE group_id = %s
                          AND created_at >= NOW() - INTERVAL '{days} days'
                    """, (group_id,))
                    total = cur.fetchone()[0]

                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "total": total,
                    "days": days,
                    "by_type": by_type,
                    "top_violators": top_violators,
                    "by_day": by_day,
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
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
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

        # === LISTS (whitelist / blacklist) ===
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
                        WHERE group_id = %s
                        ORDER BY list_type, added_at DESC
                    """, (group_id,))
                    rows = cur.fetchall()

                whitelist = [{"user_id": r[0], "name": r[1], "added_at": str(r[3])} for r in rows if r[2] == "whitelist"]
                blacklist = [{"user_id": r[0], "name": r[1], "added_at": str(r[3])} for r in rows if r[2] == "blacklist"]

                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "whitelist": whitelist,
                    "blacklist": blacklist,
                })}

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
                    cur.execute(f"""
                        DELETE FROM {SCHEMA}.strazh_user_lists
                        WHERE group_id = %s AND target_user_id = %s
                    """, (group_id, int(target_id)))
                    conn.commit()

                return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    finally:
        conn.close()

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
