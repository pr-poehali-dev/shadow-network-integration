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
                        "INSERT INTO drivers (full_name, phone, birth_date, snils, inn, license_number, license_date, is_official) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *",
                        (body.get("full_name"), body.get("phone") or None, body.get("birth_date") or None,
                         body.get("snils") or None, body.get("inn") or None,
                         body.get("license_number") or None, body.get("license_date") or None,
                         body.get("is_official", True))
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE drivers SET full_name=%s, phone=%s, birth_date=%s, snils=%s, inn=%s, license_number=%s, license_date=%s, is_official=%s WHERE id=%s RETURNING *",
                        (body.get("full_name"), body.get("phone") or None, body.get("birth_date") or None,
                         body.get("snils") or None, body.get("inn") or None,
                         body.get("license_number") or None, body.get("license_date") or None,
                         body.get("is_official", True), item_id)
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
                        "INSERT INTO conductors (full_name, phone, birth_date, snils, inn) VALUES (%s, %s, %s, %s, %s) RETURNING *",
                        (body.get("full_name"), body.get("phone") or None, body.get("birth_date") or None,
                         body.get("snils") or None, body.get("inn") or None)
                    )
                    conn.commit()
                    return ok(dict(cur.fetchone()))
                if method == "PUT":
                    cur.execute(
                        "UPDATE conductors SET full_name=%s, phone=%s, birth_date=%s, snils=%s, inn=%s WHERE id=%s RETURNING *",
                        (body.get("full_name"), body.get("phone") or None, body.get("birth_date") or None,
                         body.get("snils") or None, body.get("inn") or None, item_id)
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

                if method == "POST":
                    cur.execute("""
                        INSERT INTO schedule_entries (work_date, route_id, graph_number, bus_id, driver_id, conductor_id, terminal_id, fuel_spent,
                          revenue_cash, revenue_cashless, revenue_total, ticket_price, tickets_sold, is_overtime, fuel_price_override)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
                    """, (
                        body.get("work_date"),
                        body.get("route_id"),
                        body.get("graph_number") or None,
                        body.get("bus_id") or None,
                        body.get("driver_id") or None,
                        body.get("conductor_id") or None,
                        body.get("terminal_id") or None,
                        body.get("fuel_spent") or None,
                        body.get("revenue_cash") or None,
                        body.get("revenue_cashless") or None,
                        body.get("revenue_total") or None,
                        body.get("ticket_price") or None,
                        body.get("tickets_sold") or None,
                        body.get("is_overtime", False),
                        body.get("fuel_price_override") or None,
                    ))
                    conn.commit()
                    new_id = cur.fetchone()["id"]
                    cur.execute(SEL + " WHERE se.id = %s", (new_id,))
                    return ok(dict(cur.fetchone()))

                if method == "PUT":
                    cur.execute("""
                        UPDATE schedule_entries
                        SET bus_id=%s, driver_id=%s, conductor_id=%s, graph_number=%s, terminal_id=%s, fuel_spent=%s,
                            revenue_cash=%s, revenue_cashless=%s, revenue_total=%s, ticket_price=%s, tickets_sold=%s,
                            is_overtime=%s, fuel_price_override=%s
                        WHERE id=%s
                    """, (
                        body.get("bus_id") or None,
                        body.get("driver_id") or None,
                        body.get("conductor_id") or None,
                        body.get("graph_number") or None,
                        body.get("terminal_id") or None,
                        body.get("fuel_spent") or None,
                        body.get("revenue_cash") or None,
                        body.get("revenue_cashless") or None,
                        body.get("revenue_total") or None,
                        body.get("ticket_price") or None,
                        body.get("tickets_sold") or None,
                        body.get("is_overtime", False),
                        body.get("fuel_price_override") or None,
                        body.get("id")
                    ))
                    conn.commit()
                    cur.execute(SEL + " WHERE se.id = %s", (body.get("id"),))
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
                            (person_type, person_id, year, month, sick_leave, advance_cash, advance_card, salary_card, overtime_sum, fines, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (person_type, person_id, year, month) DO UPDATE SET
                            sick_leave = EXCLUDED.sick_leave,
                            advance_cash = EXCLUDED.advance_cash,
                            advance_card = EXCLUDED.advance_card,
                            salary_card = EXCLUDED.salary_card,
                            overtime_sum = EXCLUDED.overtime_sum,
                            fines = EXCLUDED.fines,
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

                cur.execute("SELECT value FROM settings WHERE key = 'fuel_price'")
                row = cur.fetchone()
                fuel_price_default = float(row["value"] or 0) if row else 0

                cur.execute("""
                    SELECT
                        se.id, se.work_date,
                        r.number as route_number,
                        d.id as driver_id, d.full_name as driver_name, d.is_official as driver_is_official,
                        c.id as conductor_id, c.full_name as conductor_name,
                        COALESCE(se.revenue_total, se.revenue_cash + se.revenue_cashless, 0) as total,
                        se.fuel_spent, se.fuel_price_override, se.is_overtime
                    FROM schedule_entries se
                    JOIN routes r ON r.id = se.route_id
                    LEFT JOIN drivers d ON d.id = se.driver_id
                    LEFT JOIN conductors c ON c.id = se.conductor_id
                    WHERE se.work_date BETWEEN %s AND %s
                    ORDER BY se.work_date, r.number
                """, (date_from2, date_to2))
                entries = list(cur.fetchall())

                ROUTE6_FIXED = 7000.0
                LUNCH = 150.0

                driver_map = {}
                conductor_map = {}

                for e in entries:
                    total = float(e.get("total") or 0)
                    fuel_price = float(e.get("fuel_price_override") or fuel_price_default)
                    fuel_cost = float(e.get("fuel_spent") or 0) * fuel_price
                    has_conductor = e.get("conductor_id") is not None
                    is_route6 = e.get("route_number") == "6"

                    # --- Водитель ---
                    if e.get("driver_id"):
                        did = e["driver_id"]
                        if did not in driver_map:
                            driver_map[did] = {"id": did, "full_name": e["driver_name"], "is_official": e["driver_is_official"], "shifts": [], "total_earned": 0}
                        if is_route6:
                            earned = ROUTE6_FIXED
                        elif has_conductor:
                            earned = total * 0.25 - LUNCH - fuel_cost
                        else:
                            earned = total * 0.37 - LUNCH - fuel_cost
                        driver_map[did]["shifts"].append({
                            "date": str(e["work_date"]),
                            "route": e["route_number"],
                            "total": total,
                            "fuel_cost": fuel_cost,
                            "earned": round(earned, 2),
                            "is_overtime": e["is_overtime"],
                        })
                        driver_map[did]["total_earned"] = round(driver_map[did]["total_earned"] + earned, 2)

                    # --- Кондуктор ---
                    if e.get("conductor_id"):
                        cid = e["conductor_id"]
                        if cid not in conductor_map:
                            conductor_map[cid] = {"id": cid, "full_name": e["conductor_name"], "shifts": [], "total_earned": 0}
                        if is_route6:
                            c_earned = 0
                        else:
                            c_earned = total * 0.15
                        conductor_map[cid]["shifts"].append({
                            "date": str(e["work_date"]),
                            "route": e["route_number"],
                            "total": total,
                            "earned": round(c_earned, 2),
                            "is_overtime": e["is_overtime"],
                        })
                        conductor_map[cid]["total_earned"] = round(conductor_map[cid]["total_earned"] + c_earned, 2)

                return ok({
                    "drivers": list(driver_map.values()),
                    "conductors": list(conductor_map.values()),
                    "fuel_price": fuel_price_default,
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
                            notes=%s, updated_at=NOW()
                        WHERE id=%s RETURNING *
                    """, (
                        body.get("mechanic_id") or None,
                        body.get("mechanic_name") or None,
                        body.get("departure_time") or None,
                        body.get("arrival_time") or None,
                        body.get("odometer_departure") or None,
                        body.get("odometer_arrival") or None,
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

                created = []
                for row in schedule:
                    if row["id"] in existing_ids:
                        continue
                    cur.execute("""
                        INSERT INTO vehicle_release_journal
                            (work_date, organization, schedule_entry_id, route_id, route_number, graph_number,
                             board_number, gov_number, driver_name)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
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
                    ))
                    r = cur.fetchone()
                    if r:
                        created.append(dict(r))
                conn.commit()
                return ok({"created": len(created), "records": created})

    return err("Not found", 404)