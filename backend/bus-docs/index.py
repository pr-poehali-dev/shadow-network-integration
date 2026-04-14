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

    # --- COMPANIES: карточки предприятий ---
    if resource == "companies":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    if item_id:
                        cur.execute("SELECT * FROM companies WHERE id = %s", (item_id,))
                        row = cur.fetchone()
                        return ok(dict(row)) if row else err("Not found", 404)
                    cur.execute("SELECT * FROM companies ORDER BY name")
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    cur.execute("""
                        INSERT INTO companies (
                            name, short_name, organization_type, inn, kpp, ogrn, okpo, okved,
                            legal_address, actual_address, phone, email, website,
                            director_name, director_position, chief_accountant,
                            bank_name, bank_bik, bank_account, bank_corr_account,
                            license_number, license_issued_by, license_issued_at, license_expires_at, notes
                        ) VALUES (
                            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                        ) RETURNING *
                    """, (
                        body.get("name"), body.get("short_name") or None,
                        body.get("organization_type") or None,
                        body.get("inn") or None, body.get("kpp") or None,
                        body.get("ogrn") or None, body.get("okpo") or None, body.get("okved") or None,
                        body.get("legal_address") or None, body.get("actual_address") or None,
                        body.get("phone") or None, body.get("email") or None, body.get("website") or None,
                        body.get("director_name") or None, body.get("director_position") or None,
                        body.get("chief_accountant") or None,
                        body.get("bank_name") or None, body.get("bank_bik") or None,
                        body.get("bank_account") or None, body.get("bank_corr_account") or None,
                        body.get("license_number") or None, body.get("license_issued_by") or None,
                        body.get("license_issued_at") or None, body.get("license_expires_at") or None,
                        body.get("notes") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id:
                        return err("id required")
                    cur.execute("""
                        UPDATE companies SET
                            name=%s, short_name=%s, organization_type=%s, inn=%s, kpp=%s, ogrn=%s,
                            okpo=%s, okved=%s, legal_address=%s, actual_address=%s,
                            phone=%s, email=%s, website=%s,
                            director_name=%s, director_position=%s, chief_accountant=%s,
                            bank_name=%s, bank_bik=%s, bank_account=%s, bank_corr_account=%s,
                            license_number=%s, license_issued_by=%s,
                            license_issued_at=%s, license_expires_at=%s, notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("name"), body.get("short_name") or None,
                        body.get("organization_type") or None,
                        body.get("inn") or None, body.get("kpp") or None,
                        body.get("ogrn") or None, body.get("okpo") or None, body.get("okved") or None,
                        body.get("legal_address") or None, body.get("actual_address") or None,
                        body.get("phone") or None, body.get("email") or None, body.get("website") or None,
                        body.get("director_name") or None, body.get("director_position") or None,
                        body.get("chief_accountant") or None,
                        body.get("bank_name") or None, body.get("bank_bik") or None,
                        body.get("bank_account") or None, body.get("bank_corr_account") or None,
                        body.get("license_number") or None, body.get("license_issued_by") or None,
                        body.get("license_issued_at") or None, body.get("license_expires_at") or None,
                        body.get("notes") or None,
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    cur.execute("DELETE FROM companies WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- COMPANY_DOCS: документы предприятия ---
    if resource == "company_docs":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    company_id = params.get("company_id")
                    if not company_id:
                        return err("company_id required")
                    cur.execute("""
                        SELECT * FROM company_documents
                        WHERE company_id = %s
                        ORDER BY doc_type, issued_at DESC NULLS LAST
                    """, (company_id,))
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    company_id = body.get("company_id")
                    if not company_id:
                        return err("company_id required")

                    file_url = None
                    file_name = None
                    if body.get("file_data") and body.get("file_name"):
                        raw = base64.b64decode(body["file_data"])
                        orig_name = body["file_name"]
                        ext = orig_name.rsplit(".", 1)[-1].lower() if "." in orig_name else "bin"
                        key = f"company-docs/{company_id}/{uuid.uuid4()}.{ext}"
                        content_type = "application/pdf" if ext == "pdf" else f"image/{ext}" if ext in ("jpg","jpeg","png") else "application/octet-stream"
                        s3 = get_s3()
                        s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=content_type)
                        file_url = cdn_url(key)
                        file_name = orig_name

                    cur.execute("""
                        INSERT INTO company_documents
                            (company_id, doc_type, doc_name, doc_number, issued_by, issued_at, expires_at, file_url, file_name, notes)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (
                        company_id,
                        body.get("doc_type") or "Прочее",
                        body.get("doc_name") or "",
                        body.get("doc_number") or None,
                        body.get("issued_by") or None,
                        body.get("issued_at") or None,
                        body.get("expires_at") or None,
                        file_url, file_name,
                        body.get("notes") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id:
                        return err("id required")

                    file_url = body.get("file_url")
                    file_name = body.get("file_name")
                    if body.get("file_data") and body.get("file_name"):
                        raw = base64.b64decode(body["file_data"])
                        orig_name = body["file_name"]
                        ext = orig_name.rsplit(".", 1)[-1].lower() if "." in orig_name else "bin"
                        key = f"company-docs/{body.get('company_id', 0)}/{uuid.uuid4()}.{ext}"
                        content_type = "application/pdf" if ext == "pdf" else f"image/{ext}" if ext in ("jpg","jpeg","png") else "application/octet-stream"
                        s3 = get_s3()
                        s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=content_type)
                        file_url = cdn_url(key)
                        file_name = orig_name

                    cur.execute("""
                        UPDATE company_documents SET
                            doc_type=%s, doc_name=%s, doc_number=%s, issued_by=%s,
                            issued_at=%s, expires_at=%s,
                            file_url=COALESCE(%s, file_url),
                            file_name=COALESCE(%s, file_name),
                            notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("doc_type") or "Прочее",
                        body.get("doc_name") or "",
                        body.get("doc_number") or None,
                        body.get("issued_by") or None,
                        body.get("issued_at") or None,
                        body.get("expires_at") or None,
                        file_url, file_name,
                        body.get("notes") or None,
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    cur.execute("DELETE FROM company_documents WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    return err("Not found", 404)