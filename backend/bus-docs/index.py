"""
API для управления документами транспортных средств:
ОСАГО, ОСГОП, СТС, ТО — с загрузкой файлов в S3 и отслеживанием сроков.
"""
import json
import os
import base64
import uuid
import boto3
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

DOC_TYPES = ["ОСАГО", "ОСГОП", "СТС", "ТО"]


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/files/{key}"


def ok(data):
    return {
        "statusCode": 200,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def err(msg, code=400):
    return {
        "statusCode": code,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps({"error": msg}, ensure_ascii=False),
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    resource = params.get("resource", "")
    item_id = params.get("id", "")

    # --- GET docs for a bus ---
    if resource == "docs" and method == "GET":
        bus_id = params.get("bus_id")
        if not bus_id:
            return err("bus_id required")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, bus_id, doc_type, doc_number, issued_at, expires_at,
                           file_url, file_name, notes, created_at
                    FROM bus_documents
                    WHERE bus_id = %s
                    ORDER BY doc_type, expires_at DESC NULLS LAST
                """, (bus_id,))
                return ok(list(cur.fetchall()))

    # --- GET expiring docs (alerts) ---
    if resource == "alerts" and method == "GET":
        days = int(params.get("days", "30"))
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT bd.id, bd.doc_type, bd.expires_at, bd.doc_number,
                           b.id as bus_id, b.board_number, b.model
                    FROM bus_documents bd
                    JOIN buses b ON b.id = bd.bus_id
                    WHERE bd.expires_at IS NOT NULL
                      AND bd.expires_at <= CURRENT_DATE + %s
                    ORDER BY bd.expires_at ASC
                """, (days,))
                return ok(list(cur.fetchall()))

    # --- CREATE doc (with optional file) ---
    if resource == "docs" and method == "POST":
        bus_id = body.get("bus_id")
        doc_type = body.get("doc_type")
        if not bus_id or not doc_type:
            return err("bus_id and doc_type required")

        file_url = None
        file_name = None

        # Если передан файл в base64
        if body.get("file_data") and body.get("file_name"):
            raw = base64.b64decode(body["file_data"])
            orig_name = body["file_name"]
            ext = orig_name.rsplit(".", 1)[-1].lower() if "." in orig_name else "bin"
            key = f"bus-docs/{bus_id}/{doc_type}/{uuid.uuid4()}.{ext}"
            content_type = "application/pdf" if ext == "pdf" else f"image/{ext}" if ext in ("jpg", "jpeg", "png") else "application/octet-stream"
            s3 = get_s3()
            s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=content_type)
            file_url = cdn_url(key)
            file_name = orig_name

        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    INSERT INTO bus_documents
                      (bus_id, doc_type, doc_number, issued_at, expires_at, file_url, file_name, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    bus_id,
                    doc_type,
                    body.get("doc_number") or None,
                    body.get("issued_at") or None,
                    body.get("expires_at") or None,
                    file_url,
                    file_name,
                    body.get("notes") or None,
                ))
                conn.commit()
                return ok(dict(cur.fetchone()))

    # --- UPDATE doc ---
    if resource == "docs" and method == "PUT":
        if not item_id:
            return err("id required")

        file_url = body.get("file_url")
        file_name = body.get("file_name")

        if body.get("file_data") and body.get("file_name"):
            raw = base64.b64decode(body["file_data"])
            orig_name = body["file_name"]
            ext = orig_name.rsplit(".", 1)[-1].lower() if "." in orig_name else "bin"
            bus_id = body.get("bus_id", "0")
            doc_type = body.get("doc_type", "doc")
            key = f"bus-docs/{bus_id}/{doc_type}/{uuid.uuid4()}.{ext}"
            content_type = "application/pdf" if ext == "pdf" else f"image/{ext}" if ext in ("jpg", "jpeg", "png") else "application/octet-stream"
            s3 = get_s3()
            s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=content_type)
            file_url = cdn_url(key)
            file_name = orig_name

        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    UPDATE bus_documents
                    SET doc_number=%s, issued_at=%s, expires_at=%s,
                        file_url=COALESCE(%s, file_url),
                        file_name=COALESCE(%s, file_name),
                        notes=%s, updated_at=NOW()
                    WHERE id=%s
                    RETURNING *
                """, (
                    body.get("doc_number") or None,
                    body.get("issued_at") or None,
                    body.get("expires_at") or None,
                    file_url,
                    file_name,
                    body.get("notes") or None,
                    item_id,
                ))
                conn.commit()
                return ok(dict(cur.fetchone()))

    # --- DELETE doc ---
    if resource == "docs" and method == "DELETE":
        if not item_id:
            return err("id required")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("DELETE FROM bus_documents WHERE id = %s", (item_id,))
                conn.commit()
                return ok({"deleted": True})

    return err("Not found", 404)
