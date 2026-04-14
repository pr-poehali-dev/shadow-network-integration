export type SubTab = "crew" | "itr";

export interface DriverSalaryShift {
  date: string;
  route: string;
  total: number;
  fuel_cost: number;
  earned: number;
  is_overtime: boolean;
  tickets?: number | null;
  base?: number;
  formula?: string;
  lunch?: number;
}

export interface DriverSalary {
  id: number;
  full_name: string;
  is_official: boolean;
  shifts: DriverSalaryShift[];
  total_earned: number;
}

export interface ConductorShift {
  date: string;
  route: string;
  total: number;
  earned: number;
  is_overtime: boolean;
  tickets?: number | null;
  base?: number;
  formula?: string;
  lunch?: number;
}

export interface ConductorSalary {
  id: number;
  full_name: string;
  shifts: ConductorShift[];
  total_earned: number;
}

export interface CrewRecord {
  id: number;
  type: "driver" | "conductor";
  full_name: string;
  is_official?: boolean;
  total_earned: number;
  shifts_count: number;
  sick_leave: string;
  advance_cash: string;
  advance_card: string;
  salary_card: string;
  overtime_sum: string;
  fines: string;
  cashless_payment: string;
}

export interface ItrEmployee {
  id: number;
  full_name: string;
  position: string;
  base_salary: number;
  base_days: number;
  is_active: boolean;
  record_id: number | null;
  days_worked: number | null;
  bonus: number | null;
  advance_paid: number | null;
  salary_paid: number | null;
  note: string | null;
  year: number | null;
  month: number | null;
}

export const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export function fmt(v: number) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calcItrEarned(emp: ItrEmployee): number {
  const days = emp.days_worked ?? 0;
  if (!days || !emp.base_days) return 0;
  return Math.round((emp.base_salary / emp.base_days) * days * 100) / 100;
}

export function calcAdvance(emp: ItrEmployee): number {
  return Math.round(calcItrEarned(emp) * 0.4 * 100) / 100;
}

export function calcCrewTotal(r: CrewRecord): number {
  const sick = Number(r.sick_leave) || 0;
  const advCash = Number(r.advance_cash) || 0;
  const advCard = Number(r.advance_card) || 0;
  const salCard = Number(r.salary_card) || 0;
  const overtime = Number(r.overtime_sum) || 0;
  const fines = Number(r.fines) || 0;
  const cashless = Number(r.cashless_payment) || 0;
  return r.total_earned + sick + overtime - advCash - advCard - salCard - fines - cashless;
}

export function printCrewStatement(
  records: CrewRecord[],
  month: number,
  year: number,
  title: string
) {
  const monthName = MONTHS[month - 1];
  const rows = records.map(r => {
    const total = calcCrewTotal(r);
    return `
      <tr>
        <td>${r.full_name}${r.type === "driver" ? `<br/><small>${r.is_official ? "Официальный" : "Неофициальный"}</small>` : "<br/><small>Кондуктор</small>"}</td>
        <td class="num">${fmt(r.total_earned)}</td>
        <td class="num">${r.sick_leave ? fmt(Number(r.sick_leave)) : "—"}</td>
        <td class="num">${r.advance_cash ? fmt(Number(r.advance_cash)) : "—"}</td>
        <td class="num">${r.advance_card ? fmt(Number(r.advance_card)) : "—"}</td>
        <td class="num">${r.salary_card ? fmt(Number(r.salary_card)) : "—"}</td>
        <td class="num">${r.overtime_sum ? fmt(Number(r.overtime_sum)) : "—"}</td>
        <td class="num">${r.fines ? fmt(Number(r.fines)) : "—"}</td>
        <td class="num">${r.cashless_payment ? fmt(Number(r.cashless_payment)) : "—"}</td>
        <td class="num total ${total < 0 ? "neg" : ""}">${fmt(total)}</td>
        <td class="sign"></td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Ведомость ${title} ${monthName} ${year}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; color: #111; }
    h2 { font-size: 14px; margin-bottom: 2px; }
    p.sub { color: #666; font-size: 10px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; padding: 6px 5px; font-size: 9px; text-transform: uppercase;
         letter-spacing:.04em; border: 1px solid #ccc; text-align: center; }
    td { padding: 5px 5px; border: 1px solid #ddd; vertical-align: middle; }
    td small { color: #888; font-size: 9px; }
    td.num { text-align: right; }
    td.total { font-weight: bold; background: #f9f9f9; }
    td.neg { color: #c00; }
    td.sign { width: 60px; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 20px; font-size: 10px; color: #aaa; text-align: right; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h2>Расчётная ведомость — ${title}</h2>
  <p class="sub">${monthName} ${year} г. &nbsp;|&nbsp; Сформировано: ${new Date().toLocaleString("ru")}</p>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;width:160px">ФИО</th>
        <th>Начислено, ₽</th>
        <th>Больничный, ₽</th>
        <th>Аванс (нал.), ₽</th>
        <th>Аванс (карта), ₽</th>
        <th>ЗП (карта), ₽</th>
        <th>Подработка, ₽</th>
        <th>Штрафы, ₽</th>
        <th>Безнал, ₽</th>
        <th>Итого к выдаче, ₽</th>
        <th>Подпись</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Всего человек: ${records.length}</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}