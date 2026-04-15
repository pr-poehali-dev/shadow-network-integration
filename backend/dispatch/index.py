"""
API для управления диспетчерским расписанием:
справочники маршрутов, автобусов, водителей, кондукторов и расписание на день. v5
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
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

    # --- ORGANIZATIONS: список уникальных организаций ---
    if resource == "organizations":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT DISTINCT organization FROM routes WHERE organization IS NOT NULL ORDER BY organization")
                orgs = [r["organization"] for r in cur.fetchall()]
                return ok(orgs)

    # --- ROUTES ---
    if resource == "routes":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM routes ORDER BY organization NULLS LAST, CAST(number AS INTEGER) NULLS LAST, number")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO routes (number, name, organization, max_graphs, min_vehicles, required_trips) VALUES (%s, %s, %s, %s, %s, %s) RETURNING *",
                        (body.get("number"), body.get("name", ""),
                         body.get("organization") or None,
                         int(body.get("max_graphs") or 10),
                         int(body.get("min_vehicles")) if body.get("min_vehicles") else None,
                         int(body.get("required_trips")) if body.get("required_trips") else None)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE routes SET number=%s, name=%s, organization=%s, max_graphs=%s, min_vehicles=%s, required_trips=%s WHERE id=%s RETURNING *",
                        (body.get("number"), body.get("name", ""),
                         body.get("organization") or None,
                         int(body.get("max_graphs") or 10),
                         int(body.get("min_vehicles")) if body.get("min_vehicles") else None,
                         int(body.get("required_trips")) if body.get("required_trips") else None,
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

    # --- SETTINGS ---
    if resource == "settings":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT key, value FROM settings")
                    rows = {r["key"]: r["value"] for r in cur.fetchall()}
                    return ok(rows)
                if method == "PUT":
                    key = body.get("key")
                    value = body.get("value")
                    if not key or value is None:
                        return err("key and value required")
                    cur.execute("""
                        INSERT INTO settings (key, value, updated_at) VALUES (%s, %s, NOW())
                        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
                        RETURNING *
                    """, (key, str(value)))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

    # --- TERMINALS ---
    if resource == "terminals":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM terminals ORDER BY organization, CAST(number AS INTEGER)")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO terminals (number, name, organization) VALUES (%s, %s, %s) RETURNING *",
                        (body.get("number"), body.get("name"), body.get("organization") or None)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE terminals SET number=%s, name=%s, organization=%s WHERE id=%s RETURNING *",
                        (body.get("number"), body.get("name"), body.get("organization") or None, item_id)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM terminals WHERE id = %s", (item_id,))
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
                        "INSERT INTO buses (board_number, model, gov_number, vin, rosavtodor_number) VALUES (%s, %s, %s, %s, %s) RETURNING *",
                        (body.get("board_number"), body.get("model", ""),
                         body.get("gov_number") or None, body.get("vin") or None,
                         body.get("rosavtodor_number") or None)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE buses SET board_number=%s, model=%s, gov_number=%s, vin=%s, rosavtodor_number=%s WHERE id=%s RETURNING *",
                        (body.get("board_number"), body.get("model", ""),
                         body.get("gov_number") or None, body.get("vin") or None,
                         body.get("rosavtodor_number") or None, item_id)
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
                        "INSERT INTO drivers (full_name, phone, birth_date, snils, inn, license_number, license_date, is_official, work_schedule, schedule_start_date) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *",
                        (body.get("full_name"), body.get("phone") or None, body.get("birth_date") or None,
                         body.get("snils") or None, body.get("inn") or None,
                         body.get("license_number") or None, body.get("license_date") or None,
                         body.get("is_official", True),
                         body.get("work_schedule") or None, body.get("schedule_start_date") or None)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE drivers SET full_name=%s, phone=%s, birth_date=%s, snils=%s, inn=%s, license_number=%s, license_date=%s, is_official=%s, work_schedule=%s, schedule_start_date=%s WHERE id=%s RETURNING *",
                        (body.get("full_name"), body.get("phone") or None, body.get("birth_date") or None,
                         body.get("snils") or None, body.get("inn") or None,
                         body.get("license_number") or None, body.get("license_date") or None,
                         body.get("is_official", True),
                         body.get("work_schedule") or None, body.get("schedule_start_date") or None,
                         item_id)
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
                        "INSERT INTO conductors (full_name, phone, birth_date, snils, inn, work_schedule, schedule_start_date) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *",
                        (body.get("full_name"), body.get("phone") or None, body.get("birth_date") or None,
                         body.get("snils") or None, body.get("inn") or None,
                         body.get("work_schedule") or None, body.get("schedule_start_date") or None)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE conductors SET full_name=%s, phone=%s, birth_date=%s, snils=%s, inn=%s, work_schedule=%s, schedule_start_date=%s WHERE id=%s RETURNING *",
                        (body.get("full_name"), body.get("phone") or None, body.get("birth_date") or None,
                         body.get("snils") or None, body.get("inn") or None,
                         body.get("work_schedule") or None, body.get("schedule_start_date") or None,
                         item_id)
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
                SEL = """
                    SELECT se.id, se.work_date, se.graph_number,
                           r.id as route_id, r.number as route_number, r.name as route_name,
                           r.organization as route_organization,
                           r.max_graphs,
                           b.id as bus_id, b.board_number, b.model as bus_model,
                           d.id as driver_id, d.full_name as driver_name, d.is_official as driver_is_official,
                           c.id as conductor_id, c.full_name as conductor_name,
                           se.fuel_spent, se.fuel_price_override,
                           se.revenue_cash, se.revenue_cashless,
                           se.revenue_total, se.ticket_price, se.tickets_sold,
                           se.is_overtime,
                           se.absence_reason, se.absence_fine,
                           t.id as terminal_id, t.number as terminal_number,
                           t.name as terminal_name, t.organization as terminal_org
                    FROM schedule_entries se
                    JOIN routes r ON r.id = se.route_id
                    LEFT JOIN buses b ON b.id = se.bus_id
                    LEFT JOIN drivers d ON d.id = se.driver_id
                    LEFT JOIN conductors c ON c.id = se.conductor_id
                    LEFT JOIN terminals t ON t.id = se.terminal_id
                """
                if method == "GET":
                    date = params.get("date")
                    if not date:
                        return err("date required")
                    cur.execute(SEL + """
                        WHERE se.work_date = %s
                        ORDER BY r.number, se.graph_number NULLS LAST
                    """, (date,))
                    return ok(list(cur.fetchall()))

                ALCOHOL_FINE = 5000.0

                if method == "POST":
                    absence_reason = body.get("absence_reason") or None
                    absence_fine = ALCOHOL_FINE if absence_reason == "alcohol" else (
                        float(body.get("absence_fine")) if body.get("absence_fine") else None
                    )
                    _cashless_ins = float(body.get("revenue_cashless") or 0) if body.get("revenue_cashless") else None
                    _total_ins = float(body.get("revenue_total") or 0) if body.get("revenue_total") else _cashless_ins
                    cur.execute("""
                        INSERT INTO schedule_entries (work_date, route_id, graph_number, bus_id, driver_id, conductor_id, terminal_id, fuel_spent,
                          revenue_cashless, revenue_total, ticket_price, tickets_sold, is_overtime, fuel_price_override,
                          absence_reason, absence_fine)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
                    """, (
                        body.get("work_date"),
                        body.get("route_id"),
                        body.get("graph_number") or None,
                        body.get("bus_id") or None,
                        body.get("driver_id") or None,
                        body.get("conductor_id") or None,
                        body.get("terminal_id") or None,
                        body.get("fuel_spent") or None,
                        _cashless_ins,
                        _total_ins,
                        body.get("ticket_price") or None,
                        body.get("tickets_sold") or None,
                        body.get("is_overtime", False),
                        body.get("fuel_price_override") or None,
                        absence_reason,
                        absence_fine,
                    ))
                    conn.commit()
                    new_id = cur.fetchone()["id"]
                    cur.execute(SEL + " WHERE se.id = %s", (new_id,))
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    entry_id = body.get("id")
                    absence_reason = body.get("absence_reason") or None
                    # Автоштраф при алкотестере
                    if absence_reason == "alcohol":
                        absence_fine = ALCOHOL_FINE
                    elif absence_reason is not None and body.get("absence_fine") is not None:
                        absence_fine = float(body.get("absence_fine"))
                    elif absence_reason is None:
                        absence_fine = None
                    else:
                        absence_fine = None

                    # Если это штраф за алкоголь — автоматически фиксируем в crew_salary
                    if absence_reason == "alcohol":
                        cur.execute("SELECT work_date, driver_id, conductor_id FROM schedule_entries WHERE id=%s", (entry_id,))
                        se_row = cur.fetchone()
                        if se_row:
                            import datetime as _dt
                            wd = se_row["work_date"]
                            y_m = (wd.year, wd.month) if hasattr(wd, "year") else (int(str(wd)[:4]), int(str(wd)[5:7]))
                            # Применяем штраф к водителю
                            for pid, ptype in [(se_row["driver_id"],"driver"),(se_row["conductor_id"],"conductor")]:
                                if pid:
                                    cur.execute("""
                                        INSERT INTO crew_salary_records
                                            (person_type, person_id, year, month, fines, updated_at)
                                        VALUES (%s, %s, %s, %s, %s, NOW())
                                        ON CONFLICT (person_type, person_id, year, month) DO UPDATE SET
                                            fines = COALESCE(crew_salary_records.fines, 0) + %s,
                                            updated_at = NOW()
                                    """, (ptype, pid, y_m[0], y_m[1], ALCOHOL_FINE, ALCOHOL_FINE))

                    cashless = float(body.get("revenue_cashless") or 0) if body.get("revenue_cashless") else None
                    # revenue_total принимаем явно, либо используем cashless как резерв
                    revenue_total = float(body.get("revenue_total") or 0) if body.get("revenue_total") else cashless
                    cur.execute("""
                        UPDATE schedule_entries
                        SET bus_id=%s, driver_id=%s, conductor_id=%s, graph_number=%s, terminal_id=%s, fuel_spent=%s,
                            revenue_cashless=%s, revenue_total=%s, ticket_price=%s, tickets_sold=%s,
                            is_overtime=%s, fuel_price_override=%s,
                            absence_reason=%s, absence_fine=%s,
                            updated_at=NOW()
                        WHERE id=%s
                    """, (
                        body.get("bus_id") or None,
                        body.get("driver_id") or None,
                        body.get("conductor_id") or None,
                        body.get("graph_number") or None,
                        body.get("terminal_id") or None,
                        body.get("fuel_spent") or None,
                        cashless,
                        revenue_total,
                        body.get("ticket_price") or None,
                        body.get("tickets_sold") or None,
                        body.get("is_overtime", False),
                        body.get("fuel_price_override") or None,
                        absence_reason,
                        absence_fine,
                        entry_id,
                    ))
                    conn.commit()
                    cur.execute(SEL + " WHERE se.id = %s", (entry_id,))
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    cur.execute("DELETE FROM schedule_entries WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- SCHEDULE REVENUE PATCH (из кассы) ---
    if resource == "schedule_revenue":
        """Обновляет только поля выручки у записи наряда — вызывается из кассы."""
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "OPTIONS":
                    return ok({})
                if method == "PATCH":
                    entry_id = body.get("id")
                    if not entry_id:
                        return err("id required")
                    revenue_cash = float(body["revenue_cash"]) if body.get("revenue_cash") is not None else None
                    revenue_cashless = float(body["revenue_cashless"]) if body.get("revenue_cashless") is not None else None
                    revenue_total = float(body["revenue_total"]) if body.get("revenue_total") is not None else None
                    fuel_spent = float(body["fuel_spent"]) if body.get("fuel_spent") is not None else None
                    fuel_price_override = float(body["fuel_price_override"]) if body.get("fuel_price_override") is not None else None
                    tickets_sold = int(body["tickets_sold"]) if body.get("tickets_sold") is not None else None
                    cur.execute("""
                        UPDATE schedule_entries
                        SET revenue_cash = COALESCE(%s, revenue_cash),
                            revenue_cashless = COALESCE(%s, revenue_cashless),
                            revenue_total = COALESCE(%s, revenue_total),
                            fuel_spent = COALESCE(%s, fuel_spent),
                            fuel_price_override = COALESCE(%s, fuel_price_override),
                            tickets_sold = COALESCE(%s, tickets_sold),
                            updated_at = NOW()
                        WHERE id = %s
                    """, (revenue_cash, revenue_cashless, revenue_total, fuel_spent, fuel_price_override, tickets_sold, entry_id))
                    conn.commit()
                    return ok({"updated": True})

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

                import calendar
                y, m = int(year), int(month)
                date_from = f"{y:04d}-{m:02d}-01"
                last_day = calendar.monthrange(y, m)[1]
                date_to = f"{y:04d}-{m:02d}-{last_day:02d}"

                cur.execute("""
                    SELECT
                        d.id, d.full_name,
                        COUNT(se.id) AS shifts,
                        COALESCE(SUM(se.fuel_spent), 0) AS total_fuel,
                        ARRAY_AGG(se.work_date::text ORDER BY se.work_date) AS dates,
                        ARRAY_AGG(r.number ORDER BY se.work_date) AS route_numbers,
                        ARRAY_AGG(t.name ORDER BY se.work_date) AS terminal_names
                    FROM drivers d
                    JOIN schedule_entries se ON se.driver_id = d.id
                        AND se.work_date BETWEEN %s AND %s
                    LEFT JOIN routes r ON r.id = se.route_id
                    LEFT JOIN terminals t ON t.id = se.terminal_id
                    GROUP BY d.id, d.full_name
                    ORDER BY d.full_name
                """, (date_from, date_to))
                drivers = list(cur.fetchall())

                cur.execute("""
                    SELECT
                        c.id, c.full_name,
                        COUNT(se.id) AS shifts,
                        COALESCE(SUM(se.fuel_spent), 0) AS total_fuel,
                        ARRAY_AGG(se.work_date::text ORDER BY se.work_date) AS dates,
                        ARRAY_AGG(r.number ORDER BY se.work_date) AS route_numbers,
                        ARRAY_AGG(t.name ORDER BY se.work_date) AS terminal_names
                    FROM conductors c
                    JOIN schedule_entries se ON se.conductor_id = c.id
                        AND se.work_date BETWEEN %s AND %s
                    LEFT JOIN routes r ON r.id = se.route_id
                    LEFT JOIN terminals t ON t.id = se.terminal_id
                    GROUP BY c.id, c.full_name
                    ORDER BY c.full_name
                """, (date_from, date_to))
                conductors = list(cur.fetchall())

                cur.execute("""
                    SELECT
                        b.id, b.board_number, b.model,
                        COUNT(se.id) AS shifts,
                        COALESCE(SUM(se.fuel_spent), 0) AS total_fuel,
                        ARRAY_AGG(se.work_date::text ORDER BY se.work_date) AS dates,
                        ARRAY_AGG(r.number ORDER BY se.work_date) AS route_numbers,
                        ARRAY_AGG(t.name ORDER BY se.work_date) AS terminal_names
                    FROM buses b
                    JOIN schedule_entries se ON se.bus_id = b.id
                        AND se.work_date BETWEEN %s AND %s
                    LEFT JOIN routes r ON r.id = se.route_id
                    LEFT JOIN terminals t ON t.id = se.terminal_id
                    GROUP BY b.id, b.board_number, b.model
                    ORDER BY b.board_number
                """, (date_from, date_to))
                buses = list(cur.fetchall())

                cur.execute("""
                    SELECT
                        COALESCE(SUM(revenue_cash), 0) AS total_cash,
                        COALESCE(SUM(revenue_cashless), 0) AS total_cashless,
                        COALESCE(SUM(revenue_total), 0) AS total_revenue,
                        COALESCE(SUM(tickets_sold), 0) AS total_tickets,
                        COALESCE(SUM(fuel_spent), 0) AS total_fuel
                    FROM schedule_entries
                    WHERE work_date BETWEEN %s AND %s
                """, (date_from, date_to))
                totals = dict(cur.fetchone())

                return ok({"drivers": drivers, "conductors": conductors, "buses": buses, "totals": totals})

    # --- ITR EMPLOYEES ---
    if resource == "itr_employees":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM itr_employees ORDER BY position, full_name")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO itr_employees (full_name, position, base_salary, base_days, is_active) VALUES (%s, %s, %s, %s, %s) RETURNING *",
                        (body.get("full_name"), body.get("position"), float(body.get("base_salary", 0)),
                         int(body.get("base_days", 23)), body.get("is_active", True))
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE itr_employees SET full_name=%s, position=%s, base_salary=%s, base_days=%s, is_active=%s WHERE id=%s RETURNING *",
                        (body.get("full_name"), body.get("position"), float(body.get("base_salary", 0)),
                         int(body.get("base_days", 23)), body.get("is_active", True), item_id)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM itr_employees WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- ITR SALARY RECORDS ---
    if resource == "itr_salary":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    year = params.get("year")
                    month = params.get("month")
                    if not year or not month:
                        return err("year and month required")
                    cur.execute("""
                        SELECT e.*, r.id as record_id, r.days_worked, r.bonus,
                               r.advance_paid, r.salary_paid, r.note,
                               r.year, r.month
                        FROM itr_employees e
                        LEFT JOIN itr_salary_records r
                            ON r.employee_id = e.id AND r.year = %s AND r.month = %s
                        WHERE e.is_active = true
                        ORDER BY e.position, e.full_name
                    """, (int(year), int(month)))
                    return ok(list(cur.fetchall()))
                if method == "PUT":
                    emp_id = body.get("employee_id")
                    year = int(body.get("year", 0))
                    month = int(body.get("month", 0))
                    if not emp_id or not year or not month:
                        return err("employee_id, year, month required")
                    cur.execute("""
                        INSERT INTO itr_salary_records (employee_id, year, month, days_worked, bonus, advance_paid, salary_paid, note)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (employee_id, year, month) DO UPDATE SET
                            days_worked = EXCLUDED.days_worked,
                            bonus = EXCLUDED.bonus,
                            advance_paid = EXCLUDED.advance_paid,
                            salary_paid = EXCLUDED.salary_paid,
                            note = EXCLUDED.note
                        RETURNING *
                    """, (
                        emp_id, year, month,
                        int(body.get("days_worked", 0)),
                        float(body.get("bonus", 0)),
                        float(body.get("advance_paid", 0)),
                        float(body.get("salary_paid", 0)),
                        body.get("note") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

    # --- CREW SALARY RECORDS: ведомость экипажей ---
    if resource == "crew_salary":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                year = params.get("year") or body.get("year")
                month = params.get("month") or body.get("month")
                if not year or not month:
                    return err("year and month required")
                if method == "GET":
                    cur.execute("""
                        SELECT * FROM crew_salary_records
                        WHERE year = %s AND month = %s
                    """, (int(year), int(month)))
                    rows = {f"{r['person_type']}-{r['person_id']}": dict(r) for r in cur.fetchall()}
                    return ok(rows)
                if method == "PUT":
                    pt = body.get("person_type")
                    pid = body.get("person_id")
                    if not pt or not pid:
                        return err("person_type and person_id required")
                    cur.execute("""
                        INSERT INTO crew_salary_records
                            (person_type, person_id, year, month, sick_leave, advance_cash, advance_card, salary_card, overtime_sum, fines, cashless_payment, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (person_type, person_id, year, month) DO UPDATE SET
                            sick_leave = EXCLUDED.sick_leave,
                            advance_cash = EXCLUDED.advance_cash,
                            advance_card = EXCLUDED.advance_card,
                            salary_card = EXCLUDED.salary_card,
                            overtime_sum = EXCLUDED.overtime_sum,
                            fines = EXCLUDED.fines,
                            cashless_payment = EXCLUDED.cashless_payment,
                            updated_at = NOW()
                        RETURNING *
                    """, (
                        pt, int(pid), int(year), int(month),
                        float(body.get("sick_leave") or 0),
                        float(body.get("advance_cash") or 0),
                        float(body.get("advance_card") or 0),
                        float(body.get("salary_card") or 0),
                        float(body.get("overtime_sum") or 0),
                        float(body.get("fines") or 0),
                        float(body.get("cashless_payment") or 0),
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

    # --- DRIVER SALARY: зарплата водителей и кондукторов за период ---
    if resource == "driver_salary":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                year = params.get("year")
                month = params.get("month")
                if not year or not month:
                    return err("year and month required")

                import calendar as _cal
                y2, m2 = int(year), int(month)
                date_from2 = f"{y2:04d}-{m2:02d}-01"
                last_day2 = _cal.monthrange(y2, m2)[1]
                date_to2 = f"{y2:04d}-{m2:02d}-{last_day2:02d}"

                # Загружаем все нужные настройки одним запросом
                cur.execute("SELECT key, value FROM settings WHERE key IN ('fuel_price','ticket_price','driver_pct_no_conductor','driver_pct_with_conductor','conductor_pct','route6_fixed_salary','lunch_no_conductor','lunch_with_conductor')")
                settings_map = {r["key"]: r["value"] for r in cur.fetchall()}
                fuel_price_default = float(settings_map.get("fuel_price") or 0)
                ticket_price = float(settings_map.get("ticket_price") or 70)
                driver_pct_no_cond = float(settings_map.get("driver_pct_no_conductor") or 37) / 100
                driver_pct_with_cond = float(settings_map.get("driver_pct_with_conductor") or 22) / 100
                conductor_pct = float(settings_map.get("conductor_pct") or 15) / 100
                route6_fixed = float(settings_map.get("route6_fixed_salary") or 7000)
                lunch_no_cond = float(settings_map.get("lunch_no_conductor") or 150)
                lunch_with_cond = float(settings_map.get("lunch_with_conductor") or 300)

                # Маршруты, по которым расчёт ведётся через билеты (кроме №6 — у него фиксированная ставка)
                TICKET_ROUTES = {"1", "3", "15", "24"}

                cur.execute("""
                    SELECT
                        se.id, se.work_date,
                        r.number as route_number,
                        d.id as driver_id, d.full_name as driver_name, d.is_official as driver_is_official,
                        c.id as conductor_id, c.full_name as conductor_name,
                        COALESCE(se.revenue_total, se.revenue_cash + se.revenue_cashless, 0) as total,
                        COALESCE(se.tickets_sold, 0) as tickets_count,
                        COALESCE(se.ticket_price, NULL) as entry_ticket_price,
                        se.fuel_spent, se.fuel_price_override, se.is_overtime
                    FROM schedule_entries se
                    JOIN routes r ON r.id = se.route_id
                    LEFT JOIN drivers d ON d.id = se.driver_id
                    LEFT JOIN conductors c ON c.id = se.conductor_id
                    WHERE se.work_date BETWEEN %s AND %s
                    ORDER BY se.work_date, r.number
                """, (date_from2, date_to2))
                entries = list(cur.fetchall())

                driver_map = {}
                conductor_map = {}

                for e in entries:
                    route_num = e.get("route_number", "")
                    total = float(e.get("total") or 0)
                    fuel_price = float(e.get("fuel_price_override") or fuel_price_default)
                    fuel_cost = float(e.get("fuel_spent") or 0) * fuel_price
                    has_conductor = e.get("conductor_id") is not None
                    is_route6 = route_num == "6"
                    is_ticket_route = route_num in TICKET_ROUTES

                    # --- Расчётная база ---
                    if is_route6:
                        base = 0  # для маршрута 6 база не нужна, используется фиксированная ставка
                    elif is_ticket_route:
                        # Маршруты 1,3,15,24: кол-во билетов × цена билета − топливо
                        tickets = int(e.get("tickets_count") or 0)
                        eff_ticket_price = float(e.get("entry_ticket_price") or ticket_price)
                        base = tickets * eff_ticket_price - fuel_cost
                    else:
                        # Остальные маршруты: выручка − топливо
                        base = total - fuel_cost

                    # --- Водитель ---
                    if e.get("driver_id"):
                        did = e["driver_id"]
                        if did not in driver_map:
                            driver_map[did] = {
                                "id": did, "full_name": e["driver_name"],
                                "is_official": e["driver_is_official"],
                                "shifts": [], "total_earned": 0
                            }
                        if is_route6:
                            earned = route6_fixed
                            formula = f"фикс. {int(route6_fixed):,} ₽ (маршрут 6)"
                            lunch_applied = 0.0
                        elif has_conductor:
                            earned = base * driver_pct_with_cond - lunch_with_cond
                            formula = f"{int(driver_pct_with_cond*100)}% (с кондуктором)"
                            lunch_applied = lunch_with_cond
                        else:
                            earned = base * driver_pct_no_cond - lunch_no_cond
                            formula = f"{int(driver_pct_no_cond*100)}% (без кондуктора)"
                            lunch_applied = lunch_no_cond

                        tickets_cnt = int(e.get("tickets_count") or 0) if is_ticket_route else None
                        driver_map[did]["shifts"].append({
                            "date": str(e["work_date"]),
                            "route": route_num,
                            "total": total,
                            "tickets": tickets_cnt,
                            "fuel_cost": fuel_cost,
                            "base": round(base, 2),
                            "formula": formula,
                            "lunch": round(lunch_applied, 2),
                            "earned": round(earned, 2),
                            "is_overtime": e["is_overtime"],
                        })
                        driver_map[did]["total_earned"] = round(driver_map[did]["total_earned"] + earned, 2)

                    # --- Кондуктор ---
                    if e.get("conductor_id"):
                        cid = e["conductor_id"]
                        if cid not in conductor_map:
                            conductor_map[cid] = {
                                "id": cid, "full_name": e["conductor_name"],
                                "shifts": [], "total_earned": 0
                            }
                        if is_route6:
                            c_earned = 0
                            c_formula = "не начисляется (маршрут 6 — фикс. ставка водителю)"
                            c_lunch = 0.0
                        else:
                            c_earned = base * conductor_pct - lunch_with_cond
                            c_formula = f"{int(conductor_pct*100)}% − обед {int(lunch_with_cond)} ₽"
                            c_lunch = lunch_with_cond

                        tickets_cnt = int(e.get("tickets_count") or 0) if is_ticket_route else None
                        conductor_map[cid]["shifts"].append({
                            "date": str(e["work_date"]),
                            "route": route_num,
                            "total": total,
                            "tickets": tickets_cnt,
                            "base": round(base, 2),
                            "formula": c_formula,
                            "lunch": round(c_lunch, 2),
                            "earned": round(c_earned, 2),
                            "is_overtime": e["is_overtime"],
                        })
                        conductor_map[cid]["total_earned"] = round(conductor_map[cid]["total_earned"] + c_earned, 2)

                return ok({
                    "drivers": list(driver_map.values()),
                    "conductors": list(conductor_map.values()),
                    "fuel_price": fuel_price_default,
                    "ticket_price": ticket_price,
                    "route6_fixed_salary": route6_fixed,
                    "driver_pct_no_conductor": int(driver_pct_no_cond * 100),
                    "driver_pct_with_conductor": int(driver_pct_with_cond * 100),
                    "conductor_pct": int(conductor_pct * 100),
                    "lunch_no_conductor": lunch_no_cond,
                    "lunch_with_conductor": lunch_with_cond,
                    "ticket_routes": sorted(list(TICKET_ROUTES)),
                })

    # --- MECHANICS: ответственные механики по выпуску ---
    if resource == "mechanics":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    org = params.get("organization")
                    if org:
                        cur.execute("SELECT * FROM mechanics WHERE is_active = TRUE AND organization = %s ORDER BY full_name", (org,))
                    else:
                        cur.execute("SELECT * FROM mechanics WHERE is_active = TRUE ORDER BY organization, full_name")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute(
                        "INSERT INTO mechanics (full_name, organization) VALUES (%s, %s) RETURNING *",
                        (body.get("full_name"), body.get("organization") or None)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE mechanics SET full_name=%s, organization=%s, is_active=%s WHERE id=%s RETURNING *",
                        (body.get("full_name"), body.get("organization") or None, body.get("is_active", True), item_id)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("UPDATE mechanics SET is_active = FALSE WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- MEDICAL_JOURNAL: журнал медосмотров ---
    if resource == "medical_journal":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    work_date = params.get("date")
                    org = params.get("organization")
                    if not work_date:
                        return err("date required")
                    # Авто-синхронизация: добавить недостающих водителей из наряда
                    from datetime import datetime, timedelta
                    sched_where = "se.work_date = %s AND d.id IS NOT NULL"
                    sched_params = [work_date]
                    if org:
                        sched_where += " AND r.organization = %s"
                        sched_params.append(org)
                    cur.execute(f"""
                        SELECT se.id, se.graph_number, r.id as route_id, r.number as route_number, r.organization,
                               d.id as driver_id, d.full_name as driver_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        WHERE {sched_where}
                        ORDER BY r.organization, se.graph_number NULLS LAST
                    """, sched_params)
                    schedule = list(cur.fetchall())
                    cur.execute("SELECT driver_id FROM medical_journal WHERE work_date = %s", (work_date,))
                    existing = {r["driver_id"] for r in cur.fetchall() if r["driver_id"]}
                    new_entries = [s for s in schedule if s["driver_id"] not in existing]
                    if new_entries:
                        base_time = datetime.strptime("06:00", "%H:%M")
                        slot = len(existing)
                        for row in new_entries:
                            t = base_time + timedelta(minutes=5 * slot)
                            slot += 1
                            cur.execute("""
                                INSERT INTO medical_journal
                                    (work_date, organization, driver_id, driver_name, route_id, route_number, graph_number,
                                     pre_shift_time, post_shift_time, pre_shift_admitted, post_shift_admitted)
                                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE,TRUE)
                                ON CONFLICT DO NOTHING
                            """, (work_date, row["organization"], row["driver_id"], row["driver_name"],
                                  row["route_id"], row["route_number"], row["graph_number"],
                                  t.strftime("%H:%M"), (t + timedelta(hours=9)).strftime("%H:%M")))
                        conn.commit()
                    # Синхронизируем ФИО/маршрут для существующих записей
                    for s in schedule:
                        if s["driver_id"] in existing:
                            cur.execute("""
                                UPDATE medical_journal SET driver_name=%s, route_number=%s, graph_number=%s
                                WHERE work_date=%s AND driver_id=%s AND (driver_name IS DISTINCT FROM %s OR route_number IS DISTINCT FROM %s OR graph_number IS DISTINCT FROM %s)
                            """, (s["driver_name"], s["route_number"], s["graph_number"],
                                  work_date, s["driver_id"],
                                  s["driver_name"], s["route_number"], s["graph_number"]))
                    conn.commit()
                    # Удаляем записи водителей, которых уже нет в наряде (только пустые, без заполненных данных медика)
                    schedule_driver_ids = {s["driver_id"] for s in schedule}
                    if existing - schedule_driver_ids:
                        orphan_ids = list(existing - schedule_driver_ids)
                        ph = ",".join(["%s"] * len(orphan_ids))
                        cur.execute(f"""
                            DELETE FROM medical_journal
                            WHERE work_date = %s AND driver_id IN ({ph})
                              AND medic_name IS NULL AND pre_shift_note IS NULL AND post_shift_note IS NULL
                              AND blood_pressure_pre IS NULL AND pulse_pre IS NULL
                        """, [work_date] + orphan_ids)
                        conn.commit()
                    if org:
                        cur.execute(
                            "SELECT * FROM medical_journal WHERE work_date = %s AND organization = %s ORDER BY graph_number NULLS LAST, pre_shift_time NULLS LAST",
                            (work_date, org)
                        )
                    else:
                        cur.execute(
                            "SELECT * FROM medical_journal WHERE work_date = %s ORDER BY organization, graph_number NULLS LAST, pre_shift_time NULLS LAST",
                            (work_date,)
                        )
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    cur.execute("""
                        INSERT INTO medical_journal
                            (work_date, organization, driver_id, driver_name, route_id, route_number, graph_number,
                             pre_shift_time, post_shift_time, pre_shift_admitted, post_shift_admitted,
                             pre_shift_note, post_shift_note, medic_name)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                    """, (
                        body.get("work_date"),
                        body.get("organization") or None,
                        body.get("driver_id") or None,
                        body.get("driver_name") or None,
                        body.get("route_id") or None,
                        body.get("route_number") or None,
                        body.get("graph_number") or None,
                        body.get("pre_shift_time") or None,
                        body.get("post_shift_time") or None,
                        body.get("pre_shift_admitted", True),
                        body.get("post_shift_admitted", True),
                        body.get("pre_shift_note") or None,
                        body.get("post_shift_note") or None,
                        body.get("medic_name") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    cur.execute("""
                        UPDATE medical_journal SET
                            pre_shift_time=%s, post_shift_time=%s,
                            pre_shift_admitted=%s, post_shift_admitted=%s,
                            pre_shift_note=%s, post_shift_note=%s, medic_name=%s,
                            blood_pressure_pre=%s, pulse_pre=%s, alcohol_pre=%s, temperature_pre=%s, complaints_pre=%s,
                            blood_pressure_post=%s, pulse_post=%s, alcohol_post=%s, temperature_post=%s, complaints_post=%s,
                            updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("pre_shift_time") or None,
                        body.get("post_shift_time") or None,
                        body.get("pre_shift_admitted", True),
                        body.get("post_shift_admitted", True),
                        body.get("pre_shift_note") or None,
                        body.get("post_shift_note") or None,
                        body.get("medic_name") or None,
                        body.get("blood_pressure_pre") or None,
                        int(body.get("pulse_pre")) if body.get("pulse_pre") else None,
                        float(body.get("alcohol_pre")) if body.get("alcohol_pre") else None,
                        float(body.get("temperature_pre")) if body.get("temperature_pre") else None,
                        body.get("complaints_pre") or None,
                        body.get("blood_pressure_post") or None,
                        int(body.get("pulse_post")) if body.get("pulse_post") else None,
                        float(body.get("alcohol_post")) if body.get("alcohol_post") else None,
                        float(body.get("temperature_post")) if body.get("temperature_post") else None,
                        body.get("complaints_post") or None,
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    cur.execute("DELETE FROM medical_journal WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- MEDICAL_JOURNAL_INIT: создать записи на день из расписания ---
    if resource == "medical_journal_init":
        if method != "POST":
            return err("POST required")
        work_date = body.get("work_date")
        organization = body.get("organization")
        if not work_date:
            return err("work_date required")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Получить расписание на день
                if organization:
                    cur.execute("""
                        SELECT se.id, se.graph_number, r.id as route_id, r.number as route_number, r.organization,
                               d.id as driver_id, d.full_name as driver_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        WHERE se.work_date = %s AND r.organization = %s AND d.id IS NOT NULL
                        ORDER BY se.graph_number NULLS LAST
                    """, (work_date, organization))
                else:
                    cur.execute("""
                        SELECT se.id, se.graph_number, r.id as route_id, r.number as route_number, r.organization,
                               d.id as driver_id, d.full_name as driver_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        WHERE se.work_date = %s AND d.id IS NOT NULL
                        ORDER BY r.organization, se.graph_number NULLS LAST
                    """, (work_date,))
                schedule = list(cur.fetchall())

                # Получить уже существующие записи (по driver_id и дате)
                cur.execute(
                    "SELECT driver_id FROM medical_journal WHERE work_date = %s",
                    (work_date,)
                )
                existing_driver_ids = {r["driver_id"] for r in cur.fetchall() if r["driver_id"]}

                created = []
                # Сортируем по graph_number для правильного шага 5 мин
                schedule_sorted = sorted(schedule, key=lambda x: (x["organization"] or "", x["graph_number"] or 9999))

                # Группируем по организации
                from itertools import groupby
                from datetime import datetime, timedelta

                org_groups = {}
                for row in schedule_sorted:
                    org_key = row["organization"] or "default"
                    if org_key not in org_groups:
                        org_groups[org_key] = []
                    org_groups[org_key].append(row)

                for org_key, rows in org_groups.items():
                    # Начальное время — 06:00, +5 мин на каждого водителя (по порядку графика)
                    base_time = datetime.strptime("06:00", "%H:%M")
                    slot = 0
                    for row in rows:
                        if row["driver_id"] in existing_driver_ids:
                            slot += 1
                            continue
                        t = base_time + timedelta(minutes=5 * slot)
                        slot += 1
                        pre_time = t.strftime("%H:%M")
                        # послесменный: базово через 9 часов
                        post_t = t + timedelta(hours=9)
                        post_time = post_t.strftime("%H:%M")
                        cur.execute("""
                            INSERT INTO medical_journal
                                (work_date, organization, driver_id, driver_name, route_id, route_number, graph_number,
                                 pre_shift_time, post_shift_time, pre_shift_admitted, post_shift_admitted)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, TRUE)
                            ON CONFLICT DO NOTHING
                            RETURNING *
                        """, (
                            work_date,
                            row["organization"],
                            row["driver_id"],
                            row["driver_name"],
                            row["route_id"],
                            row["route_number"],
                            row["graph_number"],
                            pre_time,
                            post_time,
                        ))
                        r = cur.fetchone()
                        if r:
                            created.append(dict(r))
                conn.commit()
                return ok({"created": len(created), "records": created})

    # --- VEHICLE_RELEASE_JOURNAL: журнал выпуска ТС ---
    if resource == "vehicle_release":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    work_date = params.get("date")
                    org = params.get("organization")
                    if not work_date:
                        return err("date required")
                    # Авто-синхронизация: добавить недостающие ТС из наряда
                    sched_where = "se.work_date = %s"
                    sched_params = [work_date]
                    if org:
                        sched_where += " AND r.organization = %s"
                        sched_params.append(org)
                    cur.execute(f"""
                        SELECT se.id, se.graph_number, r.id as route_id, r.number as route_number, r.organization,
                               b.board_number, b.gov_number, d.full_name as driver_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN buses b ON b.id = se.bus_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        WHERE {sched_where}
                        ORDER BY r.organization, se.graph_number NULLS LAST
                    """, sched_params)
                    schedule = list(cur.fetchall())
                    cur.execute("SELECT schedule_entry_id FROM vehicle_release_journal WHERE work_date = %s", (work_date,))
                    existing_ids = {r["schedule_entry_id"] for r in cur.fetchall() if r["schedule_entry_id"]}
                    schedule_ids = {s["id"] for s in schedule}
                    new_entries = [s for s in schedule if s["id"] not in existing_ids]
                    if new_entries:
                        for row in new_entries:
                            last_odo = None
                            if row.get("board_number"):
                                cur.execute("""
                                    SELECT odometer_arrival FROM vehicle_release_journal
                                    WHERE board_number = %s AND odometer_arrival IS NOT NULL
                                    ORDER BY work_date DESC, id DESC LIMIT 1
                                """, (row["board_number"],))
                                prev = cur.fetchone()
                                if prev:
                                    last_odo = prev["odometer_arrival"]
                            cur.execute("""
                                INSERT INTO vehicle_release_journal
                                    (work_date, organization, schedule_entry_id, route_id, route_number, graph_number,
                                     board_number, gov_number, driver_name, odometer_departure)
                                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                                ON CONFLICT DO NOTHING
                            """, (work_date, row["organization"], row["id"], row["route_id"],
                                  row["route_number"], row["graph_number"],
                                  row["board_number"], row["gov_number"], row["driver_name"], last_odo))
                        conn.commit()
                    # Синхронизируем данные (водитель/борт) для существующих записей
                    for s in schedule:
                        if s["id"] in existing_ids:
                            cur.execute("""
                                UPDATE vehicle_release_journal
                                SET driver_name=%s, board_number=%s, gov_number=%s, route_number=%s, graph_number=%s
                                WHERE work_date=%s AND schedule_entry_id=%s
                                  AND (driver_name IS DISTINCT FROM %s OR board_number IS DISTINCT FROM %s OR route_number IS DISTINCT FROM %s)
                            """, (s["driver_name"], s["board_number"], s["gov_number"], s["route_number"], s["graph_number"],
                                  work_date, s["id"],
                                  s["driver_name"], s["board_number"], s["route_number"]))
                    conn.commit()
                    # Удаляем записи без данных для ТС, удалённых из наряда
                    orphan_ids = list(existing_ids - schedule_ids)
                    if orphan_ids:
                        ph = ",".join(["%s"] * len(orphan_ids))
                        cur.execute(f"""
                            DELETE FROM vehicle_release_journal
                            WHERE work_date = %s AND schedule_entry_id IN ({ph})
                              AND mechanic_name IS NULL AND departure_time IS NULL AND arrival_time IS NULL
                              AND odometer_arrival IS NULL AND notes IS NULL
                        """, [work_date] + orphan_ids)
                        conn.commit()
                    if org:
                        cur.execute(
                            "SELECT * FROM vehicle_release_journal WHERE work_date = %s AND organization = %s ORDER BY graph_number NULLS LAST",
                            (work_date, org)
                        )
                    else:
                        cur.execute(
                            "SELECT * FROM vehicle_release_journal WHERE work_date = %s ORDER BY organization, graph_number NULLS LAST",
                            (work_date,)
                        )
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    cur.execute("""
                        INSERT INTO vehicle_release_journal
                            (work_date, organization, schedule_entry_id, route_id, route_number, graph_number,
                             board_number, gov_number, driver_name, mechanic_id, mechanic_name,
                             departure_time, arrival_time, odometer_departure, odometer_arrival, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                    """, (
                        body.get("work_date"),
                        body.get("organization") or None,
                        body.get("schedule_entry_id") or None,
                        body.get("route_id") or None,
                        body.get("route_number") or None,
                        body.get("graph_number") or None,
                        body.get("board_number") or None,
                        body.get("gov_number") or None,
                        body.get("driver_name") or None,
                        body.get("mechanic_id") or None,
                        body.get("mechanic_name") or None,
                        body.get("departure_time") or None,
                        body.get("arrival_time") or None,
                        body.get("odometer_departure") or None,
                        body.get("odometer_arrival") or None,
                        body.get("notes") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    cur.execute("""
                        UPDATE vehicle_release_journal SET
                            mechanic_id=%s, mechanic_name=%s,
                            departure_time=%s, arrival_time=%s,
                            odometer_departure=%s, odometer_arrival=%s,
                            fuel_level=%s, tire_pressure=%s,
                            brakes_ok=%s, lights_ok=%s, body_ok=%s,
                            tech_condition=%s, defects_found=%s, waybill_number=%s,
                            notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("mechanic_id") or None,
                        body.get("mechanic_name") or None,
                        body.get("departure_time") or None,
                        body.get("arrival_time") or None,
                        body.get("odometer_departure") or None,
                        body.get("odometer_arrival") or None,
                        body.get("fuel_level") or None,
                        body.get("tire_pressure") or None,
                        bool(body.get("brakes_ok", True)),
                        bool(body.get("lights_ok", True)),
                        bool(body.get("body_ok", True)),
                        body.get("tech_condition", "исправен"),
                        body.get("defects_found") or None,
                        body.get("waybill_number") or None,
                        body.get("notes") or None,
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    cur.execute("DELETE FROM vehicle_release_journal WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- VEHICLE_RELEASE_INIT: заполнить журнал выпуска из расписания ---
    if resource == "vehicle_release_init":
        if method != "POST":
            return err("POST required")
        work_date = body.get("work_date")
        organization = body.get("organization")
        if not work_date:
            return err("work_date required")
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if organization:
                    cur.execute("""
                        SELECT se.id, se.graph_number, r.id as route_id, r.number as route_number, r.organization,
                               b.board_number, b.gov_number,
                               d.full_name as driver_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN buses b ON b.id = se.bus_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        WHERE se.work_date = %s AND r.organization = %s
                        ORDER BY se.graph_number NULLS LAST
                    """, (work_date, organization))
                else:
                    cur.execute("""
                        SELECT se.id, se.graph_number, r.id as route_id, r.number as route_number, r.organization,
                               b.board_number, b.gov_number,
                               d.full_name as driver_name
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN buses b ON b.id = se.bus_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        WHERE se.work_date = %s
                        ORDER BY r.organization, se.graph_number NULLS LAST
                    """, (work_date,))
                schedule = list(cur.fetchall())

                cur.execute(
                    "SELECT schedule_entry_id FROM vehicle_release_journal WHERE work_date = %s",
                    (work_date,)
                )
                existing_ids = {r["schedule_entry_id"] for r in cur.fetchall() if r["schedule_entry_id"]}

                # Для каждого бортового номера ищем последнее значение odometer_arrival
                # за предыдущие дни — используем его как odometer_departure нового дня
                board_numbers = list({row["board_number"] for row in schedule if row.get("board_number")})
                prev_odometers: dict = {}
                if board_numbers:
                    placeholders = ",".join(["%s"] * len(board_numbers))
                    cur.execute(f"""
                        SELECT DISTINCT ON (board_number)
                            board_number,
                            odometer_arrival
                        FROM vehicle_release_journal
                        WHERE board_number IN ({placeholders})
                          AND work_date < %s
                          AND odometer_arrival IS NOT NULL
                        ORDER BY board_number, work_date DESC, id DESC
                    """, board_numbers + [work_date])
                    for rec in cur.fetchall():
                        if rec["board_number"] and rec["odometer_arrival"]:
                            prev_odometers[rec["board_number"]] = int(rec["odometer_arrival"])

                created = []
                for row in schedule:
                    if row["id"] in existing_ids:
                        continue
                    prev_odo = prev_odometers.get(row["board_number"]) if row.get("board_number") else None
                    cur.execute("""
                        INSERT INTO vehicle_release_journal
                            (work_date, organization, schedule_entry_id, route_id, route_number, graph_number,
                             board_number, gov_number, driver_name, odometer_departure)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                    """, (
                        work_date,
                        row["organization"],
                        row["id"],
                        row["route_id"],
                        row["route_number"],
                        row["graph_number"],
                        row["board_number"],
                        row["gov_number"],
                        row["driver_name"],
                        prev_odo,
                    ))
                    r = cur.fetchone()
                    if r:
                        created.append(dict(r))
                conn.commit()
                return ok({"created": len(created), "records": created})

    # --- CASH: учёт наличных средств ---
    if resource == "cash":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    date_from = params.get("date_from")
                    date_to = params.get("date_to")
                    category = params.get("category")
                    conditions = []
                    values = []
                    if date_from:
                        conditions.append("operation_date >= %s")
                        values.append(date_from)
                    if date_to:
                        conditions.append("operation_date <= %s")
                        values.append(date_to)
                    if category:
                        conditions.append("category = %s")
                        values.append(category)
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"""
                        SELECT * FROM cash_operations
                        {where}
                        ORDER BY operation_date DESC, created_at DESC
                    """, values)
                    rows = list(cur.fetchall())
                    # итоги
                    cur.execute(f"""
                        SELECT
                            COALESCE(SUM(amount) FILTER (WHERE operation_type = 'income'), 0) as total_income,
                            COALESCE(SUM(amount) FILTER (WHERE operation_type = 'expense'), 0) as total_expense
                        FROM cash_operations {where}
                    """, values)
                    totals = dict(cur.fetchone())
                    return ok({"items": rows, "totals": totals})

                if method == "POST":
                    required = ["operation_type", "category", "amount", "operation_date"]
                    for f in required:
                        if not body.get(f):
                            return err(f"{f} required")
                    cur.execute("""
                        INSERT INTO cash_operations
                            (operation_date, operation_type, category, amount, description,
                             created_by, organization, employee_name, loan_term_days, monthly_deduction,
                             recipient_name, purpose, salary_period)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *
                    """, (
                        body.get("operation_date"),
                        body.get("operation_type"),
                        body.get("category"),
                        float(body.get("amount")),
                        body.get("description") or None,
                        body.get("created_by") or None,
                        body.get("organization") or None,
                        body.get("employee_name") or None,
                        int(body.get("loan_term_days")) if body.get("loan_term_days") else None,
                        float(body.get("monthly_deduction")) if body.get("monthly_deduction") else None,
                        body.get("recipient_name") or None,
                        body.get("purpose") or None,
                        body.get("salary_period") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id:
                        return err("id required")
                    cur.execute("""
                        UPDATE cash_operations SET
                            operation_date=%s, operation_type=%s, category=%s, amount=%s,
                            description=%s, organization=%s, employee_name=%s, loan_term_days=%s,
                            monthly_deduction=%s, recipient_name=%s, purpose=%s, salary_period=%s
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("operation_date"),
                        body.get("operation_type"),
                        body.get("category"),
                        float(body.get("amount")),
                        body.get("description") or None,
                        body.get("organization") or None,
                        body.get("employee_name") or None,
                        int(body.get("loan_term_days")) if body.get("loan_term_days") else None,
                        float(body.get("monthly_deduction")) if body.get("monthly_deduction") else None,
                        body.get("recipient_name") or None,
                        body.get("purpose") or None,
                        body.get("salary_period") or None,
                        item_id,
                    ))
                    conn.commit()
                    row = cur.fetchone()
                    if not row:
                        return err("Not found", 404)
                    return ok(dict(row))

                if method == "DELETE":
                    if not item_id:
                        return err("id required")
                    cur.execute("DELETE FROM cash_operations WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- CASHIER_REPORT: отчёт кассира по ТС за день ---
    if resource == "cashier_report":
        BILLS = ["bills_5000","bills_2000","bills_1000","bills_500","bills_200","bills_100","bills_50","bills_10","coins_10","coins_5","coins_2","coins_1"]
        BILL_VALUES = {"bills_5000":5000,"bills_2000":2000,"bills_1000":1000,"bills_500":500,"bills_200":200,"bills_100":100,"bills_50":50,"bills_10":10,"coins_10":10,"coins_5":5,"coins_2":2,"coins_1":1}
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    work_date = params.get("date")
                    if not work_date:
                        return err("date required")
                    org = params.get("organization")
                    # Загружаем настройки (обед, дежурка, хознужды)
                    cur.execute("SELECT key, value FROM settings WHERE key IN ('lunch_no_conductor','lunch_with_conductor','garage_daily_expenses','duty_car_shift_pay','duty_car_fuel_liters','fuel_price','ticket_price')")
                    sett = {r["key"]: r["value"] for r in cur.fetchall()}
                    lunch_no_c = float(sett.get("lunch_no_conductor") or 150)
                    lunch_with_c = float(sett.get("lunch_with_conductor") or 300)
                    garage_exp = float(sett.get("garage_daily_expenses") or 5000)
                    duty_pay = float(sett.get("duty_car_shift_pay") or 0)
                    duty_fuel = float(sett.get("duty_car_fuel_liters") or 0)
                    fuel_price = float(sett.get("fuel_price") or 72)
                    ticket_price = float(sett.get("ticket_price") or 35)
                    SEL_CASHIER = """
                        SELECT se.id as schedule_entry_id, se.graph_number, se.is_overtime,
                               se.tickets_sold, se.fuel_spent, se.revenue_cashless,
                               r.number as route_number, r.organization,
                               b.board_number, b.gov_number,
                               d.id as driver_id, d.full_name as driver_name,
                               c.full_name as conductor_name,
                               cr.id as report_id,
                               cr.bills_5000, cr.bills_2000, cr.bills_1000, cr.bills_500,
                               cr.bills_200, cr.bills_100, cr.bills_50, cr.bills_10,
                               cr.coins_10, cr.coins_5, cr.coins_2, cr.coins_1,
                               COALESCE(cr.cashless_amount, se.revenue_cashless, 0) as cashless_amount,
                               cr.fuel_cash_amount, cr.fuel_liters, cr.fuel_price_per_liter, cr.tickets_sold as cr_tickets_sold,
                               COALESCE(cr.bonus_cash, 0) as bonus_cash, cr.cash_manual,
                               cr.notes, cr.updated_at
                        FROM schedule_entries se
                        JOIN routes r ON r.id = se.route_id
                        LEFT JOIN buses b ON b.id = se.bus_id
                        LEFT JOIN drivers d ON d.id = se.driver_id
                        LEFT JOIN conductors c ON c.id = se.conductor_id
                        LEFT JOIN cashier_reports cr ON cr.schedule_entry_id = se.id AND cr.report_date = se.work_date
                    """
                    if org:
                        cur.execute(SEL_CASHIER + " WHERE se.work_date = %s AND r.organization = %s ORDER BY r.number, se.graph_number NULLS LAST", (work_date, org))
                    else:
                        cur.execute(SEL_CASHIER + " WHERE se.work_date = %s ORDER BY r.organization NULLS LAST, r.number, se.graph_number NULLS LAST", (work_date,))
                    rows = list(cur.fetchall())
                    driver_ids = [r["driver_id"] for r in rows if r.get("driver_id")]
                    restrictions = {}
                    if driver_ids:
                        placeholders = ",".join(["%s"] * len(driver_ids))
                        cur.execute(f"""
                            SELECT driver_id, reason, restriction_type, limit_amount
                            FROM cash_restrictions
                            WHERE driver_id IN ({placeholders}) AND is_active = TRUE
                              AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
                        """, driver_ids)
                        for r in cur.fetchall():
                            restrictions[r["driver_id"]] = dict(r)
                    result = []
                    for row in rows:
                        d = dict(row)
                        d["restriction"] = restrictions.get(row.get("driver_id"))
                        bills_total = sum(int(d.get(b) or 0) * v for b, v in BILL_VALUES.items())
                        cash_manual = d.get("cash_manual")
                        cash_total = float(cash_manual) if cash_manual is not None else bills_total
                        d["cash_total"] = cash_total
                        d["bonus_cash"] = float(d.get("bonus_cash") or 0)
                        # Обед: если есть кондуктор — оба платят lunch_with_c, иначе driver платит lunch_no_c
                        has_conductor = bool(d.get("conductor_name"))
                        d["lunch_amount"] = (lunch_with_c * 2) if has_conductor else lunch_no_c
                        # Расход ДТ в деньгах
                        fuel_liters_val = float(d.get("fuel_liters") or d.get("fuel_spent") or 0)
                        fuel_cash_val = float(d.get("fuel_cash_amount") or 0)
                        d["fuel_cost"] = fuel_cash_val if fuel_cash_val > 0 else round(fuel_liters_val * fuel_price, 2)
                        d["fuel_liters_total"] = fuel_liters_val
                        d["fuel_price_per_liter"] = float(d.get("fuel_price_per_liter") or fuel_price)
                        # Билеты: приоритет из cashier_reports, затем из schedule_entries
                        if d.get("cr_tickets_sold") is not None:
                            d["tickets_sold"] = d["cr_tickets_sold"]
                        result.append(d)
                    total_cash = sum(r["cash_total"] for r in result)
                    total_cashless = sum(float(r.get("cashless_amount") or 0) for r in result)
                    total_lunch = sum(float(r.get("lunch_amount") or 0) for r in result)
                    total_fuel_cost = sum(float(r.get("fuel_cost") or 0) for r in result)
                    total_bonus = sum(float(r.get("bonus_cash") or 0) for r in result)
                    return ok({
                        "rows": result,
                        "total_cash": total_cash,
                        "total_cashless": total_cashless,
                        "total_lunch": total_lunch,
                        "total_fuel_cost": total_fuel_cost,
                        "total_bonus": total_bonus,
                        "garage_daily_expenses": garage_exp,
                        "duty_car_shift_pay": duty_pay,
                        "duty_car_fuel_liters": duty_fuel,
                        "duty_car_fuel_cost": round(duty_fuel * fuel_price, 2),
                        "fuel_price": fuel_price,
                        "ticket_price": ticket_price,
                    })

                if method == "POST":
                    eid = body.get("schedule_entry_id")
                    if not eid:
                        return err("schedule_entry_id required")
                    bill_vals = {b: int(body.get(b) or 0) for b in BILLS}
                    cash_total = sum(bill_vals[b] * BILL_VALUES[b] for b in BILLS)
                    fuel_cash = float(body.get("fuel_cash_amount") or 0)
                    fuel_liters = float(body.get("fuel_liters")) if body.get("fuel_liters") else None
                    fuel_price_per_liter = float(body.get("fuel_price_per_liter")) if body.get("fuel_price_per_liter") else None
                    tickets_sold = int(body.get("tickets_sold")) if body.get("tickets_sold") is not None else None
                    bonus_cash_val = float(body.get("bonus_cash") or 0)
                    cash_manual_val = float(body.get("cash_manual")) if body.get("cash_manual") is not None else None
                    cur.execute("""
                        INSERT INTO cashier_reports
                            (report_date, schedule_entry_id, board_number, gov_number, driver_name,
                             route_number, graph_number, organization,
                             bills_5000, bills_2000, bills_1000, bills_500, bills_200, bills_100, bills_50, bills_10,
                             coins_10, coins_5, coins_2, coins_1,
                             cashless_amount, is_overtime, notes, created_by,
                             fuel_cash_amount, fuel_liters, fuel_price_per_liter, tickets_sold,
                             bonus_cash, cash_manual)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (report_date, schedule_entry_id)
                        DO UPDATE SET
                            bills_5000=EXCLUDED.bills_5000, bills_2000=EXCLUDED.bills_2000,
                            bills_1000=EXCLUDED.bills_1000, bills_500=EXCLUDED.bills_500,
                            bills_200=EXCLUDED.bills_200, bills_100=EXCLUDED.bills_100,
                            bills_50=EXCLUDED.bills_50, bills_10=EXCLUDED.bills_10,
                            coins_10=EXCLUDED.coins_10, coins_5=EXCLUDED.coins_5,
                            coins_2=EXCLUDED.coins_2, coins_1=EXCLUDED.coins_1,
                            cashless_amount=EXCLUDED.cashless_amount,
                            fuel_cash_amount=EXCLUDED.fuel_cash_amount,
                            fuel_liters=EXCLUDED.fuel_liters,
                            fuel_price_per_liter=EXCLUDED.fuel_price_per_liter,
                            tickets_sold=EXCLUDED.tickets_sold,
                            bonus_cash=EXCLUDED.bonus_cash,
                            cash_manual=EXCLUDED.cash_manual,
                            notes=EXCLUDED.notes, updated_at=NOW()
                        RETURNING *
                    """, (
                        body.get("report_date"),
                        int(eid),
                        body.get("board_number") or None,
                        body.get("gov_number") or None,
                        body.get("driver_name") or None,
                        body.get("route_number") or None,
                        body.get("graph_number") or None,
                        body.get("organization") or None,
                        bill_vals["bills_5000"], bill_vals["bills_2000"], bill_vals["bills_1000"],
                        bill_vals["bills_500"], bill_vals["bills_200"], bill_vals["bills_100"],
                        bill_vals["bills_50"], bill_vals["bills_10"],
                        bill_vals["coins_10"], bill_vals["coins_5"], bill_vals["coins_2"], bill_vals["coins_1"],
                        float(body.get("cashless_amount") or 0),
                        bool(body.get("is_overtime", False)),
                        body.get("notes") or None,
                        body.get("created_by") or None,
                        fuel_cash, fuel_liters, fuel_price_per_liter, tickets_sold,
                        bonus_cash_val, cash_manual_val,
                    ))
                    conn.commit()
                    row = dict(cur.fetchone())
                    row["cash_total"] = cash_total
                    return ok(row)

                if method == "DELETE":
                    if not item_id:
                        return err("id required")
                    cur.execute("DELETE FROM cashier_reports WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- CASH_RESTRICTION: ограничения на выдачу наличных ---
    if resource == "cash_restriction":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("""
                        SELECT cr.*, d.full_name as driver_full_name
                        FROM cash_restrictions cr
                        LEFT JOIN drivers d ON d.id = cr.driver_id
                        ORDER BY cr.is_active DESC, cr.created_at DESC
                    """)
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    if not body.get("reason"):
                        return err("reason required")
                    cur.execute("""
                        INSERT INTO cash_restrictions
                            (driver_id, driver_name, reason, restriction_type, limit_amount, is_active, created_by, expires_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
                    """, (
                        int(body.get("driver_id")) if body.get("driver_id") else None,
                        body.get("driver_name") or None,
                        body.get("reason"),
                        body.get("restriction_type", "block"),
                        float(body.get("limit_amount")) if body.get("limit_amount") else None,
                        True,
                        body.get("created_by") or None,
                        body.get("expires_at") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id:
                        return err("id required")
                    cur.execute("""
                        UPDATE cash_restrictions SET
                            driver_id=%s, driver_name=%s, reason=%s, restriction_type=%s,
                            limit_amount=%s, is_active=%s, expires_at=%s
                        WHERE id=%s RETURNING *
                    """, (
                        int(body.get("driver_id")) if body.get("driver_id") else None,
                        body.get("driver_name") or None,
                        body.get("reason"),
                        body.get("restriction_type", "block"),
                        float(body.get("limit_amount")) if body.get("limit_amount") else None,
                        bool(body.get("is_active", True)),
                        body.get("expires_at") or None,
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    if not item_id:
                        return err("id required")
                    cur.execute("UPDATE cash_restrictions SET is_active = FALSE WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- REPAIR_MECHANICS: механики по ремонту ---
    if resource == "repair_mechanics":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM repair_mechanics WHERE is_active = TRUE ORDER BY full_name")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute("""
                        INSERT INTO repair_mechanics (full_name, role, organization, specialization)
                        VALUES (%s, %s, %s, %s) RETURNING *
                    """, (body.get("full_name"), body.get("role","executor"),
                          body.get("organization") or None, body.get("specialization") or None))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute("""
                        UPDATE repair_mechanics SET full_name=%s, role=%s, organization=%s,
                            specialization=%s, is_active=%s WHERE id=%s RETURNING *
                    """, (body.get("full_name"), body.get("role","executor"),
                          body.get("organization") or None, body.get("specialization") or None,
                          bool(body.get("is_active", True)), item_id))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("UPDATE repair_mechanics SET is_active = FALSE WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- REPAIR_WORK_TEMPLATES: справочник типовых работ ---
    if resource == "repair_work_templates":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    cur.execute("SELECT * FROM repair_work_templates WHERE is_active = TRUE ORDER BY work_type")
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    cur.execute("INSERT INTO repair_work_templates (work_type, description) VALUES (%s, %s) RETURNING *",
                                (body.get("work_type"), body.get("description") or None))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("UPDATE repair_work_templates SET is_active = FALSE WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- REPAIR_JOURNAL: журнал ремонта ---
    if resource == "repair_journal":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    bus_id = params.get("bus_id")
                    status_filter = params.get("status")
                    conditions = []
                    vals = []
                    if bus_id:
                        conditions.append("rj.bus_id = %s")
                        vals.append(int(bus_id))
                    if status_filter:
                        conditions.append("rj.status = %s")
                        vals.append(status_filter)
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"""
                        SELECT rj.*,
                            COALESCE((
                                SELECT json_agg(rw ORDER BY rw.sort_order)
                                FROM repair_works rw WHERE rw.repair_id = rj.id
                            ), '[]') as works,
                            COALESCE((
                                SELECT json_agg(rp ORDER BY rp.id)
                                FROM repair_parts rp WHERE rp.repair_id = rj.id
                            ), '[]') as parts
                        FROM repair_journal rj
                        {where}
                        ORDER BY rj.fault_date DESC, rj.created_at DESC
                    """, vals)
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    if not body.get("fault_description"):
                        return err("fault_description required")
                    cur.execute("""
                        INSERT INTO repair_journal
                            (bus_id, board_number, gov_number, bus_model, organization,
                             fault_date, fault_type, fault_description, severity,
                             repair_start, repair_end, status,
                             executor_id, executor_name, controller_id, controller_name,
                             total_cost, notes, created_by)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        RETURNING *
                    """, (
                        int(body.get("bus_id")) if body.get("bus_id") else None,
                        body.get("board_number") or None, body.get("gov_number") or None,
                        body.get("bus_model") or None, body.get("organization") or None,
                        body.get("fault_date") or None, body.get("fault_type") or None,
                        body.get("fault_description"),
                        body.get("severity", "medium"),
                        body.get("repair_start") or None, body.get("repair_end") or None,
                        body.get("status", "open"),
                        int(body.get("executor_id")) if body.get("executor_id") else None,
                        body.get("executor_name") or None,
                        int(body.get("controller_id")) if body.get("controller_id") else None,
                        body.get("controller_name") or None,
                        float(body.get("total_cost")) if body.get("total_cost") else None,
                        body.get("notes") or None, body.get("created_by") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute("""
                        UPDATE repair_journal SET
                            bus_id=%s, board_number=%s, gov_number=%s, bus_model=%s, organization=%s,
                            fault_date=%s, fault_type=%s, fault_description=%s, severity=%s,
                            repair_start=%s, repair_end=%s, status=%s,
                            executor_id=%s, executor_name=%s, controller_id=%s, controller_name=%s,
                            total_cost=%s, notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        int(body.get("bus_id")) if body.get("bus_id") else None,
                        body.get("board_number") or None, body.get("gov_number") or None,
                        body.get("bus_model") or None, body.get("organization") or None,
                        body.get("fault_date") or None, body.get("fault_type") or None,
                        body.get("fault_description"),
                        body.get("severity", "medium"),
                        body.get("repair_start") or None, body.get("repair_end") or None,
                        body.get("status", "open"),
                        int(body.get("executor_id")) if body.get("executor_id") else None,
                        body.get("executor_name") or None,
                        int(body.get("controller_id")) if body.get("controller_id") else None,
                        body.get("controller_name") or None,
                        float(body.get("total_cost")) if body.get("total_cost") else None,
                        body.get("notes") or None, item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("UPDATE repair_journal SET status='cancelled', updated_at=NOW() WHERE id=%s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- REPAIR_WORKS: работы по ремонту ---
    if resource == "repair_works":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                repair_id = params.get("repair_id") or body.get("repair_id")
                if method == "GET":
                    if not repair_id:
                        return err("repair_id required")
                    cur.execute("SELECT * FROM repair_works WHERE repair_id = %s ORDER BY sort_order, id", (int(repair_id),))
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    if not repair_id or not body.get("work_type"):
                        return err("repair_id and work_type required")
                    cur.execute("""
                        INSERT INTO repair_works (repair_id, work_type, work_description, executor_name, hours_spent, is_done, sort_order)
                        VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (int(repair_id), body.get("work_type"), body.get("work_description") or None,
                          body.get("executor_name") or None,
                          float(body.get("hours_spent")) if body.get("hours_spent") else None,
                          bool(body.get("is_done", False)),
                          int(body.get("sort_order") or 0)))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute("""
                        UPDATE repair_works SET work_type=%s, work_description=%s, executor_name=%s,
                            hours_spent=%s, is_done=%s WHERE id=%s RETURNING *
                    """, (body.get("work_type"), body.get("work_description") or None,
                          body.get("executor_name") or None,
                          float(body.get("hours_spent")) if body.get("hours_spent") else None,
                          bool(body.get("is_done", False)), item_id))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM repair_works WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- REPAIR_PARTS: запчасти ---
    if resource == "repair_parts":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                repair_id = params.get("repair_id") or body.get("repair_id")
                if method == "GET":
                    if not repair_id:
                        return err("repair_id required")
                    cur.execute("SELECT * FROM repair_parts WHERE repair_id = %s ORDER BY id", (int(repair_id),))
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    if not repair_id or not body.get("part_name"):
                        return err("repair_id and part_name required")
                    cur.execute("""
                        INSERT INTO repair_parts (repair_id, part_name, part_number, quantity, unit, price_per_unit)
                        VALUES (%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (int(repair_id), body.get("part_name"), body.get("part_number") or None,
                          float(body.get("quantity") or 1),
                          body.get("unit", "шт"),
                          float(body.get("price_per_unit")) if body.get("price_per_unit") else None))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute("""
                        UPDATE repair_parts SET part_name=%s, part_number=%s, quantity=%s, unit=%s, price_per_unit=%s
                        WHERE id=%s RETURNING *
                    """, (body.get("part_name"), body.get("part_number") or None,
                          float(body.get("quantity") or 1), body.get("unit","шт"),
                          float(body.get("price_per_unit")) if body.get("price_per_unit") else None,
                          item_id))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("DELETE FROM repair_parts WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- MAINTENANCE_JOURNAL: журнал ТО ---
    if resource == "maintenance_journal":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    bus_id = params.get("bus_id")
                    status_filter = params.get("status")
                    conditions = []
                    vals = []
                    if bus_id:
                        conditions.append("bus_id = %s")
                        vals.append(int(bus_id))
                    if status_filter:
                        conditions.append("status = %s")
                        vals.append(status_filter)
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"SELECT * FROM maintenance_journal {where} ORDER BY scheduled_date DESC", vals)
                    return ok(list(cur.fetchall()))
                if method == "POST":
                    if not body.get("maintenance_type") or not body.get("scheduled_date"):
                        return err("maintenance_type and scheduled_date required")
                    cur.execute("""
                        INSERT INTO maintenance_journal
                            (bus_id, board_number, gov_number, bus_model, organization,
                             maintenance_type, scheduled_date, completed_date,
                             mileage_at_service, next_service_mileage, next_service_date,
                             status, executor_name, controller_name,
                             works_performed, notes, total_cost, created_by)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (
                        int(body.get("bus_id")) if body.get("bus_id") else None,
                        body.get("board_number") or None, body.get("gov_number") or None,
                        body.get("bus_model") or None, body.get("organization") or None,
                        body.get("maintenance_type"), body.get("scheduled_date"),
                        body.get("completed_date") or None,
                        int(body.get("mileage_at_service")) if body.get("mileage_at_service") else None,
                        int(body.get("next_service_mileage")) if body.get("next_service_mileage") else None,
                        body.get("next_service_date") or None,
                        body.get("status", "scheduled"),
                        body.get("executor_name") or None, body.get("controller_name") or None,
                        body.get("works_performed") or None, body.get("notes") or None,
                        float(body.get("total_cost")) if body.get("total_cost") else None,
                        body.get("created_by") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute("""
                        UPDATE maintenance_journal SET
                            bus_id=%s, board_number=%s, gov_number=%s, bus_model=%s, organization=%s,
                            maintenance_type=%s, scheduled_date=%s, completed_date=%s,
                            mileage_at_service=%s, next_service_mileage=%s, next_service_date=%s,
                            status=%s, executor_name=%s, controller_name=%s,
                            works_performed=%s, notes=%s, total_cost=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        int(body.get("bus_id")) if body.get("bus_id") else None,
                        body.get("board_number") or None, body.get("gov_number") or None,
                        body.get("bus_model") or None, body.get("organization") or None,
                        body.get("maintenance_type"), body.get("scheduled_date"),
                        body.get("completed_date") or None,
                        int(body.get("mileage_at_service")) if body.get("mileage_at_service") else None,
                        int(body.get("next_service_mileage")) if body.get("next_service_mileage") else None,
                        body.get("next_service_date") or None,
                        body.get("status", "scheduled"),
                        body.get("executor_name") or None, body.get("controller_name") or None,
                        body.get("works_performed") or None, body.get("notes") or None,
                        float(body.get("total_cost")) if body.get("total_cost") else None,
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "DELETE":
                    cur.execute("UPDATE maintenance_journal SET status='done', updated_at=NOW() WHERE id=%s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- STAFF: сотрудники всех должностей (кроме водителей и кондукторов) ---
    if resource == "staff":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    position = params.get("position")
                    org = params.get("organization")
                    show_inactive = params.get("show_inactive") == "1"
                    conditions = []
                    vals = []
                    if position:
                        conditions.append("position = %s")
                        vals.append(position)
                    if org:
                        conditions.append("organization = %s")
                        vals.append(org)
                    if not show_inactive:
                        conditions.append("is_active = TRUE")
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"SELECT * FROM staff {where} ORDER BY position, full_name", vals)
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    if not body.get("full_name") or not body.get("position"):
                        return err("full_name and position required")
                    cur.execute("""
                        INSERT INTO staff
                            (position, full_name, phone, birth_date, snils, inn,
                             passport_series, passport_number, passport_issued_by, passport_issued_date,
                             address, hire_date, fire_date, organization, is_official, is_active, notes)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (
                        body.get("position"),
                        body.get("full_name"),
                        body.get("phone") or None,
                        body.get("birth_date") or None,
                        body.get("snils") or None,
                        body.get("inn") or None,
                        body.get("passport_series") or None,
                        body.get("passport_number") or None,
                        body.get("passport_issued_by") or None,
                        body.get("passport_issued_date") or None,
                        body.get("address") or None,
                        body.get("hire_date") or None,
                        body.get("fire_date") or None,
                        body.get("organization") or None,
                        bool(body.get("is_official", True)),
                        bool(body.get("is_active", True)),
                        body.get("notes") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id:
                        return err("id required")
                    cur.execute("""
                        UPDATE staff SET
                            position=%s, full_name=%s, phone=%s, birth_date=%s, snils=%s, inn=%s,
                            passport_series=%s, passport_number=%s, passport_issued_by=%s, passport_issued_date=%s,
                            address=%s, hire_date=%s, fire_date=%s, organization=%s,
                            is_official=%s, is_active=%s, notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("position"),
                        body.get("full_name"),
                        body.get("phone") or None,
                        body.get("birth_date") or None,
                        body.get("snils") or None,
                        body.get("inn") or None,
                        body.get("passport_series") or None,
                        body.get("passport_number") or None,
                        body.get("passport_issued_by") or None,
                        body.get("passport_issued_date") or None,
                        body.get("address") or None,
                        body.get("hire_date") or None,
                        body.get("fire_date") or None,
                        body.get("organization") or None,
                        bool(body.get("is_official", True)),
                        bool(body.get("is_active", True)),
                        body.get("notes") or None,
                        item_id,
                    ))
                    conn.commit()
                    row = cur.fetchone()
                    if not row:
                        return err("Not found", 404)
                    return ok(dict(row))

                if method == "DELETE":
                    if not item_id:
                        return err("id required")
                    cur.execute("UPDATE staff SET is_active = FALSE, updated_at=NOW() WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- HR_IMPORT: импорт сотрудников из 1С (CSV) ---
    if resource == "hr_import":
        if method == "POST":
            import csv, io, base64
            file_data = body.get("file_data", "")
            file_name = body.get("file_name", "import.csv")
            created_by = body.get("created_by") or None
            # Декодируем base64
            try:
                raw = base64.b64decode(file_data).decode("utf-8-sig")
            except Exception:
                return err("Ошибка декодирования файла")
            # Определяем разделитель
            sniffer = csv.Sniffer()
            try:
                dialect = sniffer.sniff(raw[:2048], delimiters=",;\t|")
            except Exception:
                dialect = csv.excel  # type: ignore
            reader = csv.DictReader(io.StringIO(raw), dialect=dialect)
            rows_data = list(reader)
            # Маппинг заголовков из 1С к полям staff/drivers
            FIELD_MAP = {
                "фио": "full_name", "ф.и.о.": "full_name", "наименование": "full_name",
                "должность": "position", "должностьнаименование": "position",
                "телефон": "phone", "мобильный": "phone", "мобтелефон": "phone",
                "датарождения": "birth_date", "дата рождения": "birth_date",
                "снилс": "snils", "инн": "inn",
                "организация": "organization", "организациянаименование": "organization",
                "датаприема": "hire_date", "датаприёма": "hire_date", "дата приема": "hire_date",
                "датаувольнения": "fire_date", "дата увольнения": "fire_date",
                "серияпаспорта": "passport_series", "номерпаспорта": "passport_number",
                "паспорт кем выдан": "passport_issued_by", "адрес": "address",
            }
            def normalize_key(k):
                return k.lower().replace(" ", "").replace(".", "").replace("_", "")
            imported = 0
            errors_list = []
            DRIVER_POSITIONS = {"водитель", "водительавтобуса", "driver"}
            CONDUCTOR_POSITIONS = {"кондуктор", "conductor"}
            with get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    for i, row in enumerate(rows_data):
                        mapped = {}
                        for orig_key, val in row.items():
                            nk = normalize_key(orig_key or "")
                            if nk in FIELD_MAP:
                                mapped[FIELD_MAP[nk]] = (val or "").strip() or None
                        if not mapped.get("full_name"):
                            errors_list.append(f"Строка {i+2}: нет ФИО")
                            continue
                        pos_raw = normalize_key(mapped.get("position") or "")
                        try:
                            if pos_raw in DRIVER_POSITIONS:
                                cur.execute("""
                                    INSERT INTO drivers (full_name, phone, birth_date, snils, inn)
                                    VALUES (%s, %s, %s, %s, %s)
                                    ON CONFLICT DO NOTHING
                                """, (mapped.get("full_name"), mapped.get("phone"),
                                      mapped.get("birth_date") or None, mapped.get("snils"), mapped.get("inn")))
                            elif pos_raw in CONDUCTOR_POSITIONS:
                                cur.execute("""
                                    INSERT INTO conductors (full_name, phone)
                                    VALUES (%s, %s)
                                    ON CONFLICT DO NOTHING
                                """, (mapped.get("full_name"), mapped.get("phone")))
                            else:
                                position = mapped.get("position") or "other"
                                cur.execute("""
                                    INSERT INTO staff (full_name, position, phone, birth_date, snils, inn,
                                        passport_series, passport_number, passport_issued_by, address,
                                        hire_date, fire_date, organization)
                                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                                    ON CONFLICT DO NOTHING
                                """, (
                                    mapped.get("full_name"), position[:50],
                                    mapped.get("phone"), mapped.get("birth_date") or None,
                                    mapped.get("snils"), mapped.get("inn"),
                                    mapped.get("passport_series"), mapped.get("passport_number"),
                                    mapped.get("passport_issued_by"), mapped.get("address"),
                                    mapped.get("hire_date") or None, mapped.get("fire_date") or None,
                                    mapped.get("organization"),
                                ))
                            imported += 1
                        except Exception as ex:
                            errors_list.append(f"Строка {i+2}: {str(ex)[:80]}")
                    conn.commit()
                    # Сохраняем лог импорта
                    log_text = "\n".join(errors_list) if errors_list else "Без ошибок"
                    cur.execute("""
                        INSERT INTO hr_imports (file_name, total_rows, imported_rows, errors, status, log, created_by)
                        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, import_date
                    """, (file_name, len(rows_data), imported, len(errors_list),
                          "done" if not errors_list else "partial", log_text, created_by))
                    conn.commit()
                    result_row = dict(cur.fetchone())
            return ok({
                "imported": imported,
                "total": len(rows_data),
                "errors": len(errors_list),
                "error_details": errors_list[:20],
                "import_id": result_row["id"],
                "import_date": str(result_row["import_date"]),
            })
        if method == "GET":
            with get_conn() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM hr_imports ORDER BY import_date DESC LIMIT 20")
                    return ok(list(cur.fetchall()))

    # --- BANK_TRANSACTIONS: банковские транзакции / импорт из 1С ---
    if resource == "bank_transactions":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    date_from = params.get("date_from")
                    date_to = params.get("date_to")
                    category = params.get("category")
                    direction = params.get("direction")
                    counterparty = params.get("counterparty")
                    org = params.get("organization")
                    conditions, vals = [], []
                    if date_from: conditions.append("transaction_date >= %s"); vals.append(date_from)
                    if date_to: conditions.append("transaction_date <= %s"); vals.append(date_to)
                    if category: conditions.append("category = %s"); vals.append(category)
                    if direction: conditions.append("direction = %s"); vals.append(direction)
                    if counterparty: conditions.append("counterparty ILIKE %s"); vals.append(f"%{counterparty}%")
                    if org: conditions.append("organization = %s"); vals.append(org)
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"""
                        SELECT * FROM bank_transactions {where}
                        ORDER BY transaction_date DESC, created_at DESC
                    """, vals)
                    rows = list(cur.fetchall())
                    cur.execute(f"""
                        SELECT
                            COALESCE(SUM(amount) FILTER (WHERE direction='credit'), 0) as total_credit,
                            COALESCE(SUM(amount) FILTER (WHERE direction='debit'), 0) as total_debit
                        FROM bank_transactions {where}
                    """, vals)
                    totals = dict(cur.fetchone())
                    # группировка по поставщикам
                    cur.execute(f"""
                        SELECT counterparty, category,
                            SUM(amount) FILTER (WHERE direction='debit') as debit_sum,
                            COUNT(*) FILTER (WHERE direction='debit') as debit_count
                        FROM bank_transactions {where}
                        WHERE counterparty IS NOT NULL
                        GROUP BY counterparty, category
                        ORDER BY debit_sum DESC NULLS LAST
                        LIMIT 50
                    """, vals)
                    by_counterparty = list(cur.fetchall())
                    return ok({"items": rows, "totals": totals, "by_counterparty": by_counterparty})

                if method == "POST":
                    if not body.get("amount") or not body.get("transaction_date"):
                        return err("amount and transaction_date required")
                    cur.execute("""
                        INSERT INTO bank_transactions
                            (transaction_date, direction, amount, counterparty, counterparty_inn,
                             category, purpose, account_number, bank_name, document_number,
                             organization, source, import_batch, notes, created_by)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (
                        body.get("transaction_date"), body.get("direction","debit"),
                        float(body.get("amount")),
                        body.get("counterparty") or None, body.get("counterparty_inn") or None,
                        body.get("category","other"), body.get("purpose") or None,
                        body.get("account_number") or None, body.get("bank_name") or None,
                        body.get("document_number") or None, body.get("organization") or None,
                        body.get("source","manual"), body.get("import_batch") or None,
                        body.get("notes") or None, body.get("created_by") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id: return err("id required")
                    cur.execute("""
                        UPDATE bank_transactions SET
                            transaction_date=%s, direction=%s, amount=%s, counterparty=%s, counterparty_inn=%s,
                            category=%s, purpose=%s, account_number=%s, bank_name=%s, document_number=%s,
                            organization=%s, notes=%s
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("transaction_date"), body.get("direction","debit"),
                        float(body.get("amount")),
                        body.get("counterparty") or None, body.get("counterparty_inn") or None,
                        body.get("category","other"), body.get("purpose") or None,
                        body.get("account_number") or None, body.get("bank_name") or None,
                        body.get("document_number") or None, body.get("organization") or None,
                        body.get("notes") or None, item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    if not item_id: return err("id required")
                    cur.execute("DELETE FROM bank_transactions WHERE id=%s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- TAX_PAYMENTS: налоговые платежи и ЕНС ---
    if resource == "tax_payments":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    year = params.get("year")
                    status_f = params.get("status")
                    org = params.get("organization")
                    conditions, vals = [], []
                    if year: conditions.append("period_year = %s"); vals.append(int(year))
                    if status_f: conditions.append("status = %s"); vals.append(status_f)
                    if org: conditions.append("organization = %s"); vals.append(org)
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"SELECT * FROM tax_payments {where} ORDER BY due_date DESC", vals)
                    rows = list(cur.fetchall())
                    cur.execute(f"""
                        SELECT
                            COALESCE(SUM(accrued_amount),0) as total_accrued,
                            COALESCE(SUM(paid_amount),0) as total_paid,
                            COALESCE(SUM(accrued_amount - COALESCE(paid_amount,0)),0) as total_debt
                        FROM tax_payments {where}
                    """, vals)
                    totals = dict(cur.fetchone())
                    # ближайшие к оплате
                    cur.execute("""
                        SELECT * FROM tax_payments
                        WHERE status IN ('pending','partial','overdue')
                          AND due_date >= CURRENT_DATE - INTERVAL '30 days'
                        ORDER BY due_date LIMIT 10
                    """)
                    upcoming = list(cur.fetchall())
                    return ok({"items": rows, "totals": totals, "upcoming": upcoming})

                if method == "POST":
                    if not body.get("tax_type") or not body.get("due_date"):
                        return err("tax_type and due_date required")
                    cur.execute("""
                        INSERT INTO tax_payments
                            (payment_date, due_date, tax_type, period_year, period_month,
                             accrued_amount, paid_amount, status, ens_balance, organization, notes, created_by)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (
                        body.get("payment_date") or None, body.get("due_date"),
                        body.get("tax_type"),
                        int(body.get("period_year")) if body.get("period_year") else None,
                        int(body.get("period_month")) if body.get("period_month") else None,
                        float(body.get("accrued_amount") or 0),
                        float(body.get("paid_amount") or 0),
                        body.get("status","pending"),
                        float(body.get("ens_balance")) if body.get("ens_balance") else None,
                        body.get("organization") or None, body.get("notes") or None,
                        body.get("created_by") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id: return err("id required")
                    cur.execute("""
                        UPDATE tax_payments SET
                            payment_date=%s, due_date=%s, tax_type=%s, period_year=%s, period_month=%s,
                            accrued_amount=%s, paid_amount=%s, status=%s, ens_balance=%s,
                            organization=%s, notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("payment_date") or None, body.get("due_date"),
                        body.get("tax_type"),
                        int(body.get("period_year")) if body.get("period_year") else None,
                        int(body.get("period_month")) if body.get("period_month") else None,
                        float(body.get("accrued_amount") or 0),
                        float(body.get("paid_amount") or 0),
                        body.get("status","pending"),
                        float(body.get("ens_balance")) if body.get("ens_balance") else None,
                        body.get("organization") or None, body.get("notes") or None,
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    if not item_id: return err("id required")
                    cur.execute("DELETE FROM tax_payments WHERE id=%s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- CREDITORS: кредиторская задолженность ---
    if resource == "creditors":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    show_inactive = params.get("show_inactive") == "1"
                    org = params.get("organization")
                    conditions, vals = [], []
                    if not show_inactive: conditions.append("is_active = TRUE")
                    if org: conditions.append("organization = %s"); vals.append(org)
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"""
                        SELECT * FROM creditors {where}
                        ORDER BY overdue_amount DESC, next_payment_date NULLS LAST
                    """, vals)
                    rows = list(cur.fetchall())
                    cur.execute(f"""
                        SELECT
                            COALESCE(SUM(current_debt),0) as total_debt,
                            COALESCE(SUM(overdue_amount),0) as total_overdue
                        FROM creditors {where}
                    """, vals)
                    totals = dict(cur.fetchone())
                    return ok({"items": rows, "totals": totals})

                if method == "POST":
                    if not body.get("counterparty") or not body.get("current_debt"):
                        return err("counterparty and current_debt required")
                    cur.execute("""
                        INSERT INTO creditors
                            (counterparty, counterparty_inn, debt_type, contract_number, contract_date,
                             original_amount, current_debt, overdue_amount, last_payment_date,
                             next_payment_date, next_payment_amount, organization, is_active, notes, created_by)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (
                        body.get("counterparty"),
                        body.get("counterparty_inn") or None,
                        body.get("debt_type","supplier"),
                        body.get("contract_number") or None,
                        body.get("contract_date") or None,
                        float(body.get("original_amount")) if body.get("original_amount") else None,
                        float(body.get("current_debt")),
                        float(body.get("overdue_amount") or 0),
                        body.get("last_payment_date") or None,
                        body.get("next_payment_date") or None,
                        float(body.get("next_payment_amount")) if body.get("next_payment_amount") else None,
                        body.get("organization") or None,
                        bool(body.get("is_active", True)),
                        body.get("notes") or None, body.get("created_by") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id: return err("id required")
                    cur.execute("""
                        UPDATE creditors SET
                            counterparty=%s, counterparty_inn=%s, debt_type=%s, contract_number=%s, contract_date=%s,
                            original_amount=%s, current_debt=%s, overdue_amount=%s, last_payment_date=%s,
                            next_payment_date=%s, next_payment_amount=%s, organization=%s, is_active=%s,
                            notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("counterparty"),
                        body.get("counterparty_inn") or None,
                        body.get("debt_type","supplier"),
                        body.get("contract_number") or None,
                        body.get("contract_date") or None,
                        float(body.get("original_amount")) if body.get("original_amount") else None,
                        float(body.get("current_debt")),
                        float(body.get("overdue_amount") or 0),
                        body.get("last_payment_date") or None,
                        body.get("next_payment_date") or None,
                        float(body.get("next_payment_amount")) if body.get("next_payment_amount") else None,
                        body.get("organization") or None,
                        bool(body.get("is_active", True)),
                        body.get("notes") or None, item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    if not item_id: return err("id required")
                    cur.execute("UPDATE creditors SET is_active=FALSE, updated_at=NOW() WHERE id=%s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- UPCOMING_PAYMENTS: предстоящие платежи ---
    if resource == "upcoming_payments":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    days_ahead = int(params.get("days_ahead", 30))
                    status_f = params.get("status")
                    org = params.get("organization")
                    conditions = [f"due_date <= CURRENT_DATE + INTERVAL '{days_ahead} days'"]
                    vals = []
                    if status_f: conditions.append("status = %s"); vals.append(status_f)
                    else: conditions.append("status IN ('planned','partial')")
                    if org: conditions.append("organization = %s"); vals.append(org)
                    where = "WHERE " + " AND ".join(conditions)
                    cur.execute(f"""
                        SELECT * FROM upcoming_payments {where}
                        ORDER BY due_date, due_date - CURRENT_DATE
                    """, vals)
                    rows = list(cur.fetchall())
                    # просроченные
                    cur.execute("""
                        SELECT * FROM upcoming_payments
                        WHERE status IN ('planned','partial') AND due_date < CURRENT_DATE
                        ORDER BY due_date
                    """)
                    overdue = list(cur.fetchall())
                    cur.execute(f"""
                        SELECT COALESCE(SUM(planned_amount - COALESCE(paid_amount,0)),0) as total_planned
                        FROM upcoming_payments {where}
                    """, vals)
                    total_planned = cur.fetchone()["total_planned"]
                    return ok({"items": rows, "overdue": overdue, "total_planned": total_planned})

                if method == "POST":
                    if not body.get("description") or not body.get("planned_amount") or not body.get("due_date"):
                        return err("description, planned_amount, due_date required")
                    cur.execute("""
                        INSERT INTO upcoming_payments
                            (due_date, payment_type, counterparty, description, planned_amount,
                             paid_amount, status, is_recurring, recur_day, organization,
                             notify_days_before, created_by)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (
                        body.get("due_date"), body.get("payment_type","other"),
                        body.get("counterparty") or None, body.get("description"),
                        float(body.get("planned_amount")),
                        float(body.get("paid_amount") or 0),
                        body.get("status","planned"),
                        bool(body.get("is_recurring", False)),
                        int(body.get("recur_day")) if body.get("recur_day") else None,
                        body.get("organization") or None,
                        int(body.get("notify_days_before") or 5),
                        body.get("created_by") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id: return err("id required")
                    cur.execute("""
                        UPDATE upcoming_payments SET
                            due_date=%s, payment_type=%s, counterparty=%s, description=%s,
                            planned_amount=%s, paid_amount=%s, status=%s, is_recurring=%s,
                            recur_day=%s, organization=%s, notify_days_before=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("due_date"), body.get("payment_type","other"),
                        body.get("counterparty") or None, body.get("description"),
                        float(body.get("planned_amount")),
                        float(body.get("paid_amount") or 0),
                        body.get("status","planned"),
                        bool(body.get("is_recurring", False)),
                        int(body.get("recur_day")) if body.get("recur_day") else None,
                        body.get("organization") or None,
                        int(body.get("notify_days_before") or 5),
                        item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    if not item_id: return err("id required")
                    cur.execute("UPDATE upcoming_payments SET status='cancelled', updated_at=NOW() WHERE id=%s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- LEASING_CONTRACTS: лизинговые договора ---
    if resource == "leasing_contracts":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    org = params.get("organization")
                    show_inactive = params.get("show_inactive") == "1"
                    conditions, vals = [], []
                    if not show_inactive: conditions.append("is_active = TRUE")
                    if org: conditions.append("organization = %s"); vals.append(org)
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"""
                        SELECT *,
                            (payments_total - payments_made) as payments_remaining
                        FROM leasing_contracts {where}
                        ORDER BY end_date NULLS LAST
                    """, vals)
                    rows = list(cur.fetchall())
                    cur.execute(f"""
                        SELECT
                            COALESCE(SUM(remaining_debt),0) as total_remaining,
                            COALESCE(SUM(monthly_payment),0) as total_monthly
                        FROM leasing_contracts {where}
                    """, vals)
                    totals = dict(cur.fetchone())
                    return ok({"items": rows, "totals": totals})

                if method == "POST":
                    if not body.get("lessor"): return err("lessor required")
                    cur.execute("""
                        INSERT INTO leasing_contracts
                            (lessor, contract_number, contract_date, object_description, bus_id,
                             total_amount, monthly_payment, payment_day, start_date, end_date,
                             payments_total, payments_made, remaining_debt, organization, is_active, notes, created_by)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *
                    """, (
                        body.get("lessor"),
                        body.get("contract_number") or None,
                        body.get("contract_date") or None,
                        body.get("object_description") or None,
                        int(body.get("bus_id")) if body.get("bus_id") else None,
                        float(body.get("total_amount")) if body.get("total_amount") else None,
                        float(body.get("monthly_payment")) if body.get("monthly_payment") else None,
                        int(body.get("payment_day")) if body.get("payment_day") else None,
                        body.get("start_date") or None,
                        body.get("end_date") or None,
                        int(body.get("payments_total")) if body.get("payments_total") else None,
                        int(body.get("payments_made") or 0),
                        float(body.get("remaining_debt")) if body.get("remaining_debt") else None,
                        body.get("organization") or None,
                        bool(body.get("is_active", True)),
                        body.get("notes") or None, body.get("created_by") or None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id: return err("id required")
                    cur.execute("""
                        UPDATE leasing_contracts SET
                            lessor=%s, contract_number=%s, contract_date=%s, object_description=%s, bus_id=%s,
                            total_amount=%s, monthly_payment=%s, payment_day=%s, start_date=%s, end_date=%s,
                            payments_total=%s, payments_made=%s, remaining_debt=%s,
                            organization=%s, is_active=%s, notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("lessor"),
                        body.get("contract_number") or None,
                        body.get("contract_date") or None,
                        body.get("object_description") or None,
                        int(body.get("bus_id")) if body.get("bus_id") else None,
                        float(body.get("total_amount")) if body.get("total_amount") else None,
                        float(body.get("monthly_payment")) if body.get("monthly_payment") else None,
                        int(body.get("payment_day")) if body.get("payment_day") else None,
                        body.get("start_date") or None,
                        body.get("end_date") or None,
                        int(body.get("payments_total")) if body.get("payments_total") else None,
                        int(body.get("payments_made") or 0),
                        float(body.get("remaining_debt")) if body.get("remaining_debt") else None,
                        body.get("organization") or None,
                        bool(body.get("is_active", True)),
                        body.get("notes") or None, item_id,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "DELETE":
                    if not item_id: return err("id required")
                    cur.execute("UPDATE leasing_contracts SET is_active=FALSE, updated_at=NOW() WHERE id=%s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- SCHEDULE_SUGGEST: предложение экипажей на неделю вперёд ---
    if resource == "schedule_suggest":
        if method != "GET":
            return err("GET required")
        from_date = params.get("from_date")
        if not from_date:
            return err("from_date required")
        import datetime as _dt

        def parse_schedule(ws):
            """Парсит '3/3', '5/2', '2/2', '6/1' -> (work_days, rest_days)"""
            if not ws or ws == "individual":
                return None
            try:
                parts = ws.strip().split("/")
                return (int(parts[0]), int(parts[1]))
            except Exception:
                return None

        def is_work_day(ws, start_date_str, check_date_str):
            """Проверяет, является ли check_date рабочим днём исходя из цикла"""
            parsed = parse_schedule(ws)
            if not parsed:
                return None  # неизвестно
            work_days, rest_days = parsed
            cycle = work_days + rest_days
            if not start_date_str:
                return None
            start = _dt.date.fromisoformat(start_date_str)
            check = _dt.date.fromisoformat(check_date_str)
            delta = (check - start).days
            if delta < 0:
                delta = (-delta) % cycle
            else:
                delta = delta % cycle
            return delta < work_days

        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # 7 дней начиная с from_date
                dates = []
                base = _dt.date.fromisoformat(from_date)
                for i in range(7):
                    dates.append(str(base + _dt.timedelta(days=i)))

                # Все водители и кондукторы с их графиками
                cur.execute("SELECT id, full_name, work_schedule, schedule_start_date FROM drivers ORDER BY full_name")
                drivers_all = list(cur.fetchall())
                cur.execute("SELECT id, full_name, work_schedule, schedule_start_date FROM conductors ORDER BY full_name")
                conductors_all = list(cur.fetchall())

                # Кол-во смен за текущий месяц (для расчёта переработки)
                month_start = base.strftime("%Y-%m-01")
                month_end = base.strftime("%Y-%m-") + "28"  # запас
                cur.execute("""
                    SELECT driver_id, COUNT(*) as shifts
                    FROM schedule_entries
                    WHERE work_date >= %s AND work_date <= CURRENT_DATE
                      AND driver_id IS NOT NULL
                    GROUP BY driver_id
                """, (month_start,))
                driver_shifts = {r["driver_id"]: r["shifts"] for r in cur.fetchall()}

                cur.execute("""
                    SELECT conductor_id, COUNT(*) as shifts
                    FROM schedule_entries
                    WHERE work_date >= %s AND work_date <= CURRENT_DATE
                      AND conductor_id IS NOT NULL
                    GROUP BY conductor_id
                """, (month_start,))
                conductor_shifts = {r["conductor_id"]: r["shifts"] for r in cur.fetchall()}

                OVERTIME_THRESHOLD = 18
                DRIVER_OVERTIME_PAY = 700
                CONDUCTOR_OVERTIME_PAY = 350

                suggestion = {}
                for d in dates:
                    day_drivers = []
                    day_conductors = []

                    for drv in drivers_all:
                        ws = drv.get("work_schedule")
                        ssd = drv.get("schedule_start_date")
                        if ws and ssd:
                            result = is_work_day(ws, str(ssd)[:10], d)
                            status = "work" if result else "rest"
                        else:
                            status = "unknown"
                        shifts_so_far = int(driver_shifts.get(drv["id"], 0))
                        day_drivers.append({
                            "id": drv["id"],
                            "full_name": drv["full_name"],
                            "work_schedule": ws,
                            "status": status,
                            "shifts_this_month": shifts_so_far,
                            "is_overtime": shifts_so_far >= OVERTIME_THRESHOLD,
                            "overtime_pay": (shifts_so_far - OVERTIME_THRESHOLD) * DRIVER_OVERTIME_PAY if shifts_so_far > OVERTIME_THRESHOLD else 0,
                        })

                    for cnd in conductors_all:
                        ws = cnd.get("work_schedule")
                        ssd = cnd.get("schedule_start_date")
                        if ws and ssd:
                            result = is_work_day(ws, str(ssd)[:10], d)
                            status = "work" if result else "rest"
                        else:
                            status = "unknown"
                        shifts_so_far = int(conductor_shifts.get(cnd["id"], 0))
                        day_conductors.append({
                            "id": cnd["id"],
                            "full_name": cnd["full_name"],
                            "work_schedule": ws,
                            "status": status,
                            "shifts_this_month": shifts_so_far,
                            "is_overtime": shifts_so_far >= OVERTIME_THRESHOLD,
                            "overtime_pay": (shifts_so_far - OVERTIME_THRESHOLD) * CONDUCTOR_OVERTIME_PAY if shifts_so_far > OVERTIME_THRESHOLD else 0,
                        })

                    suggestion[d] = {
                        "drivers": day_drivers,
                        "conductors": day_conductors,
                        "available_drivers": [x for x in day_drivers if x["status"] == "work"],
                        "available_conductors": [x for x in day_conductors if x["status"] == "work"],
                    }

                return ok({
                    "dates": dates,
                    "suggestion": suggestion,
                    "overtime_threshold": OVERTIME_THRESHOLD,
                    "driver_overtime_pay": DRIVER_OVERTIME_PAY,
                    "conductor_overtime_pay": CONDUCTOR_OVERTIME_PAY,
                })

    # --- ACCIDENTS: учёт ДТП для раздела БДД ---
    if resource == "accidents":
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if method == "GET":
                    accident_id = params.get("id")
                    if accident_id:
                        cur.execute("SELECT * FROM accidents WHERE id = %s", (int(accident_id),))
                        row = cur.fetchone()
                        return ok(dict(row)) if row else err("Not found", 404)
                    org = params.get("organization")
                    status_f = params.get("status")
                    date_from = params.get("date_from")
                    date_to = params.get("date_to")
                    conditions, vals = [], []
                    if org: conditions.append("organization = %s"); vals.append(org)
                    if status_f: conditions.append("status = %s"); vals.append(status_f)
                    if date_from: conditions.append("accident_date >= %s"); vals.append(date_from)
                    if date_to: conditions.append("accident_date <= %s"); vals.append(date_to)
                    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
                    cur.execute(f"SELECT * FROM accidents {where} ORDER BY accident_date DESC, created_at DESC", vals)
                    return ok(list(cur.fetchall()))

                if method == "POST":
                    if not body.get("accident_date"):
                        return err("accident_date required")
                    cur.execute("""
                        INSERT INTO accidents
                            (accident_date, accident_time, organization, location,
                             bus_board_number, bus_gov_number, bus_model,
                             driver_name, driver_license, route_number, graph_number,
                             description, weather_conditions, road_conditions, visibility,
                             victims_count, victims_info, other_vehicles,
                             fault_side, damage_description, damage_amount,
                             status, investigator_name, investigation_result,
                             documents, schedule_entry_id)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        RETURNING *
                    """, (
                        body.get("accident_date"),
                        body.get("accident_time") or None,
                        body.get("organization") or None,
                        body.get("location") or None,
                        body.get("bus_board_number") or None,
                        body.get("bus_gov_number") or None,
                        body.get("bus_model") or None,
                        body.get("driver_name") or None,
                        body.get("driver_license") or None,
                        body.get("route_number") or None,
                        int(body.get("graph_number")) if body.get("graph_number") else None,
                        body.get("description") or None,
                        body.get("weather_conditions") or None,
                        body.get("road_conditions") or None,
                        body.get("visibility") or None,
                        int(body.get("victims_count") or 0),
                        body.get("victims_info") or None,
                        body.get("other_vehicles") or None,
                        body.get("fault_side") or None,
                        body.get("damage_description") or None,
                        float(body.get("damage_amount")) if body.get("damage_amount") else None,
                        body.get("status", "new"),
                        body.get("investigator_name") or None,
                        body.get("investigation_result") or None,
                        json.dumps(body.get("documents", [])),
                        int(body.get("schedule_entry_id")) if body.get("schedule_entry_id") else None,
                    ))
                    conn.commit()
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    if not item_id: return err("id required")
                    cur.execute("""
                        UPDATE accidents SET
                            accident_date=%s, accident_time=%s, organization=%s, location=%s,
                            bus_board_number=%s, bus_gov_number=%s, bus_model=%s,
                            driver_name=%s, driver_license=%s, route_number=%s, graph_number=%s,
                            description=%s, weather_conditions=%s, road_conditions=%s, visibility=%s,
                            victims_count=%s, victims_info=%s, other_vehicles=%s,
                            fault_side=%s, damage_description=%s, damage_amount=%s,
                            status=%s, investigator_name=%s, investigation_result=%s,
                            documents=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("accident_date"),
                        body.get("accident_time") or None,
                        body.get("organization") or None,
                        body.get("location") or None,
                        body.get("bus_board_number") or None,
                        body.get("bus_gov_number") or None,
                        body.get("bus_model") or None,
                        body.get("driver_name") or None,
                        body.get("driver_license") or None,
                        body.get("route_number") or None,
                        int(body.get("graph_number")) if body.get("graph_number") else None,
                        body.get("description") or None,
                        body.get("weather_conditions") or None,
                        body.get("road_conditions") or None,
                        body.get("visibility") or None,
                        int(body.get("victims_count") or 0),
                        body.get("victims_info") or None,
                        body.get("other_vehicles") or None,
                        body.get("fault_side") or None,
                        body.get("damage_description") or None,
                        float(body.get("damage_amount")) if body.get("damage_amount") else None,
                        body.get("status", "new"),
                        body.get("investigator_name") or None,
                        body.get("investigation_result") or None,
                        json.dumps(body.get("documents", [])),
                        item_id,
                    ))
                    conn.commit()
                    row = cur.fetchone()
                    return ok(dict(row)) if row else err("Not found", 404)

                if method == "DELETE":
                    if not item_id: return err("id required")
                    cur.execute("DELETE FROM accidents WHERE id = %s", (item_id,))
                    conn.commit()
                    return ok({"deleted": True})

    # --- ACCIDENT_UPLOAD: загрузка документов к ДТП в S3 ---
    if resource == "accident_upload":
        if method != "POST":
            return err("POST required")
        import boto3, base64, uuid as _uuid
        accident_id = body.get("accident_id")
        file_data_b64 = body.get("file_data")
        file_name = body.get("file_name", "document.pdf")
        content_type = body.get("content_type", "application/pdf")
        if not accident_id or not file_data_b64:
            return err("accident_id and file_data required")
        raw = base64.b64decode(file_data_b64)
        ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "bin"
        key = f"accidents/{accident_id}/{_uuid.uuid4().hex}.{ext}"
        s3 = boto3.client("s3",
            endpoint_url="https://bucket.poehali.dev",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        )
        s3.put_object(Bucket="files", Key=key, Body=raw, ContentType=content_type)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT documents FROM accidents WHERE id = %s", (int(accident_id),))
                acc_row = cur.fetchone()
                if not acc_row: return err("Accident not found", 404)
                docs = acc_row["documents"] if acc_row["documents"] else []
                docs.append({"url": cdn_url, "name": file_name, "content_type": content_type})
                cur.execute("UPDATE accidents SET documents = %s, updated_at = NOW() WHERE id = %s",
                            (json.dumps(docs), int(accident_id)))
                conn.commit()
        return ok({"url": cdn_url, "key": key, "name": file_name})

    # --- OVERTIME_REPORT: отчёт по переработкам за месяц ---
    if resource == "overtime_report":
        year = params.get("year")
        month = params.get("month")
        if not year or not month:
            return err("year and month required")
        import calendar as _cal
        y, m = int(year), int(month)
        date_from = f"{y:04d}-{m:02d}-01"
        last_day = _cal.monthrange(y, m)[1]
        date_to = f"{y:04d}-{m:02d}-{last_day:02d}"
        OVERTIME_THRESHOLD = 18
        DRIVER_OVERTIME_PAY = 700
        CONDUCTOR_OVERTIME_PAY = 350

        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT d.id, d.full_name, 'driver' as person_type,
                        COUNT(se.id) as total_shifts,
                        GREATEST(COUNT(se.id) - %s, 0) as overtime_shifts,
                        GREATEST(COUNT(se.id) - %s, 0) * %s as overtime_pay
                    FROM drivers d
                    LEFT JOIN schedule_entries se ON se.driver_id = d.id
                        AND se.work_date BETWEEN %s AND %s
                    GROUP BY d.id, d.full_name
                    HAVING COUNT(se.id) > 0
                    ORDER BY total_shifts DESC
                """, (OVERTIME_THRESHOLD, OVERTIME_THRESHOLD, DRIVER_OVERTIME_PAY, date_from, date_to))
                driver_rows = list(cur.fetchall())

                cur.execute("""
                    SELECT c.id, c.full_name, 'conductor' as person_type,
                        COUNT(se.id) as total_shifts,
                        GREATEST(COUNT(se.id) - %s, 0) as overtime_shifts,
                        GREATEST(COUNT(se.id) - %s, 0) * %s as overtime_pay
                    FROM conductors c
                    LEFT JOIN schedule_entries se ON se.conductor_id = c.id
                        AND se.work_date BETWEEN %s AND %s
                    GROUP BY c.id, c.full_name
                    HAVING COUNT(se.id) > 0
                    ORDER BY total_shifts DESC
                """, (OVERTIME_THRESHOLD, OVERTIME_THRESHOLD, CONDUCTOR_OVERTIME_PAY, date_from, date_to))
                conductor_rows = list(cur.fetchall())

                total_overtime_pay = sum(int(r["overtime_pay"]) for r in driver_rows + conductor_rows)
                return ok({
                    "year": y, "month": m,
                    "drivers": driver_rows,
                    "conductors": conductor_rows,
                    "total_overtime_pay": total_overtime_pay,
                    "overtime_threshold": OVERTIME_THRESHOLD,
                    "driver_overtime_pay": DRIVER_OVERTIME_PAY,
                    "conductor_overtime_pay": CONDUCTOR_OVERTIME_PAY,
                })

    return err("Not found", 404)