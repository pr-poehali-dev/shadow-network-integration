"""
Авторизация: логин, проверка сессии, управление пользователями.
"""
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


def ok(data):
    return {"statusCode": 200, "headers": {**CORS_HEADERS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS_HEADERS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def get_current_user(event):
    auth = event.get("headers", {}).get("Authorization") or event.get("headers", {}).get("authorization") or ""
    token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""
    if not token:
        params = event.get("queryStringParameters") or {}
        token = params.get("token", "")
    if not token:
        return None
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT u.id, u.username, u.full_name, u.role, u.is_active
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active = true
            """, (token,))
            return cur.fetchone()


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass
    params = event.get("queryStringParameters") or {}
    resource = params.get("resource", "")

    # --- LOGIN ---
    if resource == "login" and method == "POST":
        username = body.get("username", "").strip()
        password = body.get("password", "")
        if not username or not password:
            return err("Введите логин и пароль")

        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM users WHERE username = %s AND is_active = true", (username,))
                user = cur.fetchone()
                if not user or user["password_hash"] != hash_password(password):
                    return err("Неверный логин или пароль", 401)

                token = secrets.token_hex(32)
                expires = datetime.now() + timedelta(days=30)
                cur.execute(
                    "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
                    (user["id"], token, expires)
                )
                conn.commit()
                return ok({
                    "token": token,
                    "user": {
                        "id": user["id"],
                        "username": user["username"],
                        "full_name": user["full_name"],
                        "role": user["role"],
                    }
                })

    # --- ME (проверка сессии) ---
    if resource == "me" and method == "GET":
        user = get_current_user(event)
        if not user:
            return err("Не авторизован", 401)
        return ok({"user": dict(user)})

    # --- LOGOUT ---
    if resource == "logout" and method == "POST":
        auth = event.get("headers", {}).get("Authorization") or event.get("headers", {}).get("authorization") or ""
        token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""
        if token:
            with get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE sessions SET expires_at = NOW() WHERE token = %s", (token,))
                    conn.commit()
        return ok({"ok": True})

    # --- USERS (только админ) ---
    if resource == "users":
        user = get_current_user(event)
        if not user or user["role"] != "admin":
            return err("Доступ запрещён", 403)

        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at")
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    username = body.get("username", "").strip()
                    password = body.get("password", "")
                    full_name = body.get("full_name", "").strip()
                    role = body.get("role", "dispatcher")
                    if not username or not password or not full_name:
                        return err("Заполните все поля")
                    valid_roles = ["admin", "dispatcher", "mechanic", "hr", "accountant"]
                    if role not in valid_roles:
                        return err("Недопустимая роль")
                    cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                    if cur.fetchone():
                        return err("Логин уже занят")
                    cur.execute(
                        "INSERT INTO users (username, password_hash, full_name, role) VALUES (%s, %s, %s, %s) RETURNING id, username, full_name, role, is_active, created_at",
                        (username, hash_password(password), full_name, role)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    uid = params.get("id")
                    if not uid:
                        return err("id required")
                    full_name = body.get("full_name", "").strip()
                    role = body.get("role")
                    is_active = body.get("is_active")
                    password = body.get("password", "")

                    updates = []
                    values = []
                    if full_name:
                        updates.append("full_name = %s")
                        values.append(full_name)
                    if role:
                        updates.append("role = %s")
                        values.append(role)
                    if is_active is not None:
                        updates.append("is_active = %s")
                        values.append(is_active)
                    if password:
                        updates.append("password_hash = %s")
                        values.append(hash_password(password))

                    if not updates:
                        return err("Нечего обновлять")

                    values.append(uid)
                    cur.execute(
                        f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING id, username, full_name, role, is_active, created_at",
                        values
                    )
                    conn.commit()
                    row = cur.fetchone()
                    if not row:
                        return err("Пользователь не найден", 404)
                    return ok(dict(row))

    return err("Not found", 404)
