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
                    cur.execute("SELECT * FROM routes ORDER BY organization NULLS LAST, number")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO routes (number, name, organization, max_graphs) VALUES (%s, %s, %s, %s) RETURNING *",
                        (body.get("number"), body.get("name", ""),
                         body.get("organization") or None,
                         int(body.get("max_graphs") or 10))
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE routes SET number=%s, name=%s, organization=%s, max_graphs=%s WHERE id=%s RETURNING *",
                        (body.get("number"), body.get("name", ""),
                         body.get("organization") or None,
                         int(body.get("max_graphs") or 10),
                         item_id)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM routes WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- LINE REPORT: сводный отчёт выхода на линию ---
    if resource == "linereport":
        work_date = params.get("work_date")
        if not work_date:
            return err("work_date required")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT
                        r.id as route_id,
                        r.number as route_number,
                        r.name as route_name,
                        r.organization,
                        r.max_graphs,
                        COALESCE(json_agg(
                            json_build_object(
                                'graph_number', rg.graph_number,
                                'board_number', rg.board_number,
                                'gov_number', rg.gov_number,
                                'driver_name', rg.driver_name,
                                'conductor_name', rg.conductor_name,
                                'trips_planned', rg.trips_planned,
                                'trips_actual', rg.trips_actual,
                                'shortage_reason', rg.shortage_reason,
                                'departure_time', rg.departure_time,
                                'arrival_time', rg.arrival_time
                            ) ORDER BY rg.graph_number
                        ) FILTER (WHERE rg.id IS NOT NULL), '[]') as graphs
                    FROM routes r
                    LEFT JOIN route_graphs rg
                        ON rg.route_id = r.id AND rg.work_date = %s
                    GROUP BY r.id, r.number, r.name, r.organization, r.max_graphs
                    ORDER BY r.organization NULLS LAST, r.number
                """, (work_date,))
                rows = list(cur.fetchall())
                return ok(rows)

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

    # --- ROUTE GRAPHS ---
    if resource == "graphs":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    route_id = params.get("route_id")
                    work_date = params.get("work_date")
                    if not route_id or not work_date:
                        return err("route_id and work_date required")
                    cur.execute("""
                        SELECT * FROM route_graphs
                        WHERE route_id = %s AND work_date = %s
                        ORDER BY graph_number
                    """, (route_id, work_date))
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    cur.execute("""
                        INSERT INTO route_graphs
                          (route_id, graph_number, work_date, board_number, gov_number,
                           driver_name, conductor_name, trips_planned, trips_actual,
                           shortage_reason, departure_time, arrival_time, notes)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (route_id, graph_number, work_date)
                        DO UPDATE SET
                          board_number=EXCLUDED.board_number,
                          gov_number=EXCLUDED.gov_number,
                          driver_name=EXCLUDED.driver_name,
                          conductor_name=EXCLUDED.conductor_name,
                          trips_planned=EXCLUDED.trips_planned,
                          trips_actual=EXCLUDED.trips_actual,
                          shortage_reason=EXCLUDED.shortage_reason,
                          departure_time=EXCLUDED.departure_time,
                          arrival_time=EXCLUDED.arrival_time,
                          notes=EXCLUDED.notes,
                          updated_at=NOW()
                        RETURNING *
                    """, (
                        body.get("route_id"),
                        body.get("graph_number"),
                        body.get("work_date"),
                        body.get("board_number") or None,
                        body.get("gov_number") or None,
                        body.get("driver_name") or None,
                        body.get("conductor_name") or None,
                        body.get("trips_planned") or None,
                        body.get("trips_actual") or None,
                        body.get("shortage_reason") or None,
                        body.get("departure_time") or None,
                        body.get("arrival_time") or None,
                        body.get("notes") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id:
                        return err("id required")
                    cur.execute("""
                        UPDATE route_graphs SET
                          board_number=%s, gov_number=%s, driver_name=%s,
                          conductor_name=%s, trips_planned=%s, trips_actual=%s,
                          shortage_reason=%s, departure_time=%s, arrival_time=%s,
                          notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("board_number") or None,
                        body.get("gov_number") or None,
                        body.get("driver_name") or None,
                        body.get("conductor_name") or None,
                        body.get("trips_planned") or None,
                        body.get("trips_actual") or None,
                        body.get("shortage_reason") or None,
                        body.get("departure_time") or None,
                        body.get("arrival_time") or None,
                        body.get("notes") or None,
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    if not item_id:
                        return err("id required")
                    cur.execute("DELETE FROM route_graphs WHERE id = %s", (item_id,))
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