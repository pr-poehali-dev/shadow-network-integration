"""
Отправка SMS через SMSC.ru:
- Уведомление водителю/кондуктору о назначении в график
- Поздравления с Днём Рождения и праздниками
"""
import json
import os
import psycopg2
import urllib.request
import urllib.parse
from psycopg2.extras import RealDictCursor
from datetime import date, timedelta


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Authorization",
}


def ok(data):
    return {"statusCode": 200, "headers": {**CORS_HEADERS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS_HEADERS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def send_sms(phone: str, message: str) -> dict:
    """Отправляет SMS через SMSC.ru, возвращает результат"""
    login = os.environ.get("SMSC_LOGIN", "")
    password = os.environ.get("SMSC_PASSWORD", "")
    if not login or not password:
        return {"error": "SMSC credentials not configured", "sent": False}
    # Нормализуем номер телефона
    phone = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if phone.startswith("8"):
        phone = "7" + phone[1:]
    if not phone.startswith("+"):
        if not phone.startswith("7"):
            phone = "7" + phone
    params = urllib.parse.urlencode({
        "login": login,
        "psw": password,
        "phones": phone,
        "mes": message,
        "charset": "utf-8",
        "fmt": "3",  # JSON ответ
    })
    url = f"https://smsc.ru/sys/send.php?{params}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            result = json.loads(body)
            return {"sent": "error" not in result, "phone": phone, "response": result}
    except Exception as e:
        return {"sent": False, "error": str(e)}


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

    # --- SEND_SCHEDULE: уведомить водителя/кондуктора о назначении в наряд ---
    if resource == "send_schedule":
        if method != "POST":
            return err("POST required")
        phone = body.get("phone", "")
        full_name = body.get("full_name", "")
        work_date = body.get("work_date", "")
        route_number = body.get("route_number", "")
        graph_number = body.get("graph_number")
        person_type = body.get("person_type", "водитель")  # водитель / кондуктор
        organization = body.get("organization", "")

        if not phone:
            return err("phone required")

        date_parts = work_date.split("-") if work_date else []
        date_str = f"{date_parts[2]}.{date_parts[1]}.{date_parts[0]}" if len(date_parts) == 3 else work_date

        msg = (
            f"Уважаемый(ая) {full_name}! "
            f"Вы назначены {person_type}ом "
            f"на {date_str}, маршрут №{route_number}"
            + (f", график {graph_number}" if graph_number else "")
            + (f" ({organization})" if organization else "")
            + ". С уважением, диспетчерская служба."
        )
        result = send_sms(phone, msg)
        return ok(result)

    # --- SEND_BIRTHDAY: поздравление с Днём Рождения ---
    if resource == "send_birthday":
        if method != "POST":
            return err("POST required")
        phone = body.get("phone", "")
        full_name = body.get("full_name", "")
        organization = body.get("organization", "")

        if not phone:
            return err("phone required")

        msg = (
            f"Уважаемый(ая) {full_name}! "
            f"Организация {organization} поздравляет Вас с Днём Рождения! "
            f"Желает Вам крепкого здоровья и достижения успехов в любых Ваших начинаниях!"
        )
        result = send_sms(phone, msg)
        return ok(result)

    # --- SEND_HOLIDAY: поздравление с праздником ---
    if resource == "send_holiday":
        if method != "POST":
            return err("POST required")
        phone = body.get("phone", "")
        full_name = body.get("full_name", "")
        organization = body.get("organization", "")
        holiday_name = body.get("holiday_name", "праздником")
        custom_text = body.get("custom_text", "")

        if not phone:
            return err("phone required")

        if custom_text:
            msg = f"Уважаемый(ая) {full_name}! {custom_text}"
        else:
            msg = (
                f"Уважаемый(ая) {full_name}! "
                f"Организация {organization} поздравляет Вас с {holiday_name}! "
                f"Желаем Вам крепкого здоровья, счастья и благополучия!"
            )
        result = send_sms(phone, msg)
        return ok(result)

    # --- BIRTHDAY_TODAY: получить сотрудников с ДР сегодня/через N дней ---
    if resource == "birthday_today":
        days_ahead = int(params.get("days_ahead", 0))
        check_date = date.today() + timedelta(days=days_ahead)
        month = check_date.month
        day = check_date.day

        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                results = []
                # Водители
                cur.execute("""
                    SELECT id, full_name, phone, birth_date, 'driver' as person_type, NULL as organization
                    FROM drivers
                    WHERE birth_date IS NOT NULL
                      AND EXTRACT(MONTH FROM birth_date) = %s
                      AND EXTRACT(DAY FROM birth_date) = %s
                """, (month, day))
                results += list(cur.fetchall())
                # Кондукторы (если есть телефон в staff)
                cur.execute("""
                    SELECT id, full_name, phone, birth_date, position as person_type, organization
                    FROM staff
                    WHERE birth_date IS NOT NULL
                      AND EXTRACT(MONTH FROM birth_date) = %s
                      AND EXTRACT(DAY FROM birth_date) = %s
                      AND is_active = TRUE
                """, (month, day))
                results += list(cur.fetchall())
                return ok({"people": results, "date": str(check_date), "count": len(results)})

    # --- SEND_BULK_BIRTHDAY: отправить всем именинникам сегодня ---
    if resource == "send_bulk_birthday":
        if method != "POST":
            return err("POST required")
        organization = body.get("organization", "")
        today_date = date.today()
        month = today_date.month
        day = today_date.day
        sent = []
        errors = []

        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Водители
                cur.execute("""
                    SELECT id, full_name, phone, 'driver' as person_type
                    FROM drivers
                    WHERE birth_date IS NOT NULL
                      AND EXTRACT(MONTH FROM birth_date) = %s
                      AND EXTRACT(DAY FROM birth_date) = %s
                      AND phone IS NOT NULL AND phone != ''
                """, (month, day))
                people = list(cur.fetchall())
                # Персонал
                cur.execute("""
                    SELECT id, full_name, phone, position as person_type, organization
                    FROM staff
                    WHERE birth_date IS NOT NULL
                      AND EXTRACT(MONTH FROM birth_date) = %s
                      AND EXTRACT(DAY FROM birth_date) = %s
                      AND is_active = TRUE
                      AND phone IS NOT NULL AND phone != ''
                """, (month, day))
                people += list(cur.fetchall())

        org_name = organization or "Наша организация"
        for p in people:
            if not p.get("phone"):
                continue
            msg = (
                f"Уважаемый(ая) {p['full_name']}! "
                f"Организация {org_name} поздравляет Вас с Днём Рождения! "
                f"Желает Вам крепкого здоровья и достижения успехов в любых Ваших начинаниях!"
            )
            result = send_sms(p["phone"], msg)
            if result.get("sent"):
                sent.append({"name": p["full_name"], "phone": p["phone"]})
            else:
                errors.append({"name": p["full_name"], "phone": p["phone"], "error": result.get("error")})

        return ok({"sent": sent, "errors": errors, "total": len(people)})

    return err("Not found", 404)
