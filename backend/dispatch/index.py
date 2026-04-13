"""
API для управления диспетчерским расписанием:
справочники маршрутов, автобусов, водителей, кондукторов и расписание на день.
"""
import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def ok(data):
    return {"statusCode": 200, "headers": {**CORS_HEADERS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS_HEADERS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


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
    item_id = params.get("id", "")

    # --- ROUTES ---
    if resource == "routes":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM routes ORDER BY number")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO routes (number, name) VALUES (%s, %s) RETURNING *",
                        (body.get("number"), body.get("name", ""))
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE routes SET number=%s, name=%s WHERE id=%s RETURNING *",
                        (body.get("number"), body.get("name", ""), item_id)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM routes WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- BUSES ---
    if resource == "buses":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM buses ORDER BY board_number")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO buses (board_number, model) VALUES (%s, %s) RETURNING *",
                        (body.get("board_number"), body.get("model", ""))
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE buses SET board_number=%s, model=%s WHERE id=%s RETURNING *",
                        (body.get("board_number"), body.get("model", ""), item_id)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM buses WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- DRIVERS ---
    if resource == "drivers":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM drivers ORDER BY full_name")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO drivers (full_name) VALUES (%s) RETURNING *",
                        (body.get("full_name"),)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE drivers SET full_name=%s WHERE id=%s RETURNING *",
                        (body.get("full_name"), item_id)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM drivers WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- CONDUCTORS ---
    if resource == "conductors":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM conductors ORDER BY full_name")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO conductors (full_name) VALUES (%s) RETURNING *",
                        (body.get("full_name"),)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE conductors SET full_name=%s WHERE id=%s RETURNING *",
                        (body.get("full_name"), item_id)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM conductors WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- SCHEDULE ---
    if resource == "schedule":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    date = params.get("date")
                    if not date:
                        return err("date required")
                    cur.execute("""
                        SELECT se.id, se.work_date,
                               r.id as route_id, r.number as route_number, r.name as route_name,
                               b.id as bus_id, b.board_number, b.model as bus_model,
                               d.id as driver_id, d.full_name as driver_name,
                               c.id as conductor_id, c.full_name as conductor_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN buses b ON b.id = se.bus_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        LEFT JOIN conductors c ON c.id = se.conductor_id
                        WHERE se.work_date = %s
                        ORDER BY r.number
                    """, (date,))
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    cur.execute("""
                        INSERT INTO schedule_entries (work_date, route_id, bus_id, driver_id, conductor_id)
                        VALUES (%s, %s, %s, %s, %s) RETURNING id
                    """, (
                        body.get("work_date"),
                        body.get("route_id"),
                        body.get("bus_id") or None,
                        body.get("driver_id") or None,
                        body.get("conductor_id") or None,
                    ))
                    conn.commit()
                    new_id = cur.fetchone()["id"]
                    cur.execute("""
                        SELECT se.id, se.work_date,
                               r.id as route_id, r.number as route_number, r.name as route_name,
                               b.id as bus_id, b.board_number, b.model as bus_model,
                               d.id as driver_id, d.full_name as driver_name,
                               c.id as conductor_id, c.full_name as conductor_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN buses b ON b.id = se.bus_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        LEFT JOIN conductors c ON c.id = se.conductor_id
                        WHERE se.id = %s
                    """, (new_id,))
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    cur.execute("""
                        UPDATE schedule_entries
                        SET bus_id=%s, driver_id=%s, conductor_id=%s
                        WHERE id=%s
                    """, (
                        body.get("bus_id") or None,
                        body.get("driver_id") or None,
                        body.get("conductor_id") or None,
                        body.get("id")
                    ))
                    conn.commit()
                    cur.execute("""
                        SELECT se.id, se.work_date,
                               r.id as route_id, r.number as route_number, r.name as route_name,
                               b.id as bus_id, b.board_number, b.model as bus_model,
                               d.id as driver_id, d.full_name as driver_name,
                               c.id as conductor_id, c.full_name as conductor_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN buses b ON b.id = se.bus_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        LEFT JOIN conductors c ON c.id = se.conductor_id
                        WHERE se.id = %s
                    """, (body.get("id"),))
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    cur.execute("DELETE FROM schedule_entries WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- SUMMARY: сводка смен за месяц ---
    if resource == "summary":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                year = params.get("year")
                month = params.get("month")
                if not year or not month:
                    return err("year and month required")

                # Водители
                cur.execute("""
                    SELECT
                        d.id,
                        d.full_name,
                        COUNT(se.id) AS shifts,
                        ARRAY_AGG(se.work_date::text ORDER BY se.work_date) AS dates,
                        ARRAY_AGG(r.number ORDER BY se.work_date) AS route_numbers
                    FROM drivers d
                    LEFT JOIN schedule_entries se
                        ON se.driver_id = d.id
                        AND EXTRACT(YEAR FROM se.work_date) = %s
                        AND EXTRACT(MONTH FROM se.work_date) = %s
                    LEFT JOIN routes r ON r.id = se.route_id
                    GROUP BY d.id, d.full_name
                    ORDER BY d.full_name
                """, (year, month))
                drivers = list(cur.fetchall())

                # Кондукторы
                cur.execute("""
                    SELECT
                        c.id,
                        c.full_name,
                        COUNT(se.id) AS shifts,
                        ARRAY_AGG(se.work_date::text ORDER BY se.work_date) AS dates,
                        ARRAY_AGG(r.number ORDER BY se.work_date) AS route_numbers
                    FROM conductors c
                    LEFT JOIN schedule_entries se
                        ON se.conductor_id = c.id
                        AND EXTRACT(YEAR FROM se.work_date) = %s
                        AND EXTRACT(MONTH FROM se.work_date) = %s
                    LEFT JOIN routes r ON r.id = se.route_id
                    GROUP BY c.id, c.full_name
                    ORDER BY c.full_name
                """, (year, month))
                conductors = list(cur.fetchall())

                # Транспортные средства
                cur.execute("""
                    SELECT
                        b.id,
                        b.board_number,
                        b.model,
                        COUNT(se.id) AS shifts,
                        ARRAY_AGG(se.work_date::text ORDER BY se.work_date) AS dates,
                        ARRAY_AGG(r.number ORDER BY se.work_date) AS route_numbers
                    FROM buses b
                    LEFT JOIN schedule_entries se
                        ON se.bus_id = b.id
                        AND EXTRACT(YEAR FROM se.work_date) = %s
                        AND EXTRACT(MONTH FROM se.work_date) = %s
                    LEFT JOIN routes r ON r.id = se.route_id
                    GROUP BY b.id, b.board_number, b.model
                    ORDER BY b.board_number
                """, (year, month))
                buses = list(cur.fetchall())

                return ok({"drivers": drivers, "conductors": conductors, "buses": buses})

    return err("Not found", 404)