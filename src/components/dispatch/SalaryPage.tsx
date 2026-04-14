import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";

type SubTab = "crew" | "itr";

interface DriverSalaryShift {
  date: string;
  route: string;
  total: number;
  fuel_cost: number;
  earned: number;
  is_overtime: boolean;
}

interface DriverSalary {
  id: number;
  full_name: string;
  is_official: boolean;
  shifts: DriverSalaryShift[];
  total_earned: number;
}

interface ConductorShift {
  date: string;
  route: string;
  total: number;
  earned: number;
  is_overtime: boolean;
}

interface ConductorSalary {
  id: number;
  full_name: string;
  shifts: ConductorShift[];
  total_earned: number;
}

interface CrewRecord {
  id: number;
  type: "driver" | "conductor";
  full_name: string;
  is_official?: boolean;
  total_earned: number;
  shifts_count: number;
  // ведомость
  sick_leave: string;
  advance_cash: string;
  advance_card: string;
  salary_card: string;
  overtime_sum: string;
  fines: string;
}

interface ItrEmployee {
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

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

function fmt(v: number) {
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcItrEarned(emp: ItrEmployee): number {
  const days = emp.days_worked ?? 0;
  if (!days || !emp.base_days) return 0;
  return Math.round((emp.base_salary / emp.base_days) * days * 100) / 100;
}

function calcAdvance(emp: ItrEmployee): number {
  return Math.round(calcItrEarned(emp) * 0.4 * 100) / 100;
}

function calcCrewTotal(r: CrewRecord): number {
  const sick = Number(r.sick_leave) || 0;
  const advCash = Number(r.advance_cash) || 0;
  const advCard = Number(r.advance_card) || 0;
  const salCard = Number(r.salary_card) || 0;
  const overtime = Number(r.overtime_sum) || 0;
  const fines = Number(r.fines) || 0;
  return r.total_earned + sick + overtime - advCash - advCard - salCard - fines;
}

function printCrewStatement(
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

export default function SalaryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canEditItr = isAdmin;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [subTab, setSubTab] = useState<SubTab>("crew");

  // Экипажи
  const [driverData, setDriverData] = useState<{ drivers: DriverSalary[]; conductors: ConductorSalary[]; fuel_price: number } | null>(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // ведомость — хранятся правки полей по ключу "d-{id}" или "c-{id}"
  const [crewEdit, setCrewEdit] = useState<Record<string, Omit<CrewRecord, "id"|"type"|"full_name"|"is_official"|"total_earned"|"shifts_count">>>({});

  // ITR
  const [itrData, setItrData] = useState<ItrEmployee[]>([]);
  const [itrLoading, setItrLoading] = useState(false);
  const [itrEdit, setItrEdit] = useState<Record<number, { days_worked: string; bonus: string; advance_paid: string; salary_paid: string; note: string }>>({});
  const [itrSaving, setItrSaving] = useState<number | null>(null);

  const [showItrForm, setShowItrForm] = useState(false);
  const [itrForm, setItrForm] = useState({ full_name: "", position: "", base_salary: "", base_days: "" });
  const [itrFormSaving, setItrFormSaving] = useState(false);

  const EMPTY_CREW = { sick_leave: "", advance_cash: "", advance_card: "", salary_card: "", overtime_sum: "", fines: "" };

  const getCrewEdit = (key: string) => crewEdit[key] ?? EMPTY_CREW;

  const updateCrewField = (key: string, field: string, value: string) => {
    setCrewEdit(prev => ({ ...prev, [key]: { ...getCrewEdit(key), [field]: value } }));
  };

  const loadDrivers = async () => {
    setDriverLoading(true);
    const data = await api.getDriverSalary(year, month);
    setDriverData(data);
    setDriverLoading(false);
  };

  const loadItr = async () => {
    setItrLoading(true);
    const data = await api.getItrSalary(year, month);
    const arr: ItrEmployee[] = Array.isArray(data) ? data : [];
    setItrData(arr);
    const edits: typeof itrEdit = {};
    arr.forEach(e => {
      edits[e.id] = {
        days_worked: String(e.days_worked ?? 0),
        bonus: String(e.bonus ?? 0),
        advance_paid: String(e.advance_paid ?? 0),
        salary_paid: String(e.salary_paid ?? 0),
        note: e.note ?? "",
      };
    });
    setItrEdit(edits);
    setItrLoading(false);
  };

  useEffect(() => {
    loadDrivers();
    loadItr();
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveItr = async (emp: ItrEmployee) => {
    const e = itrEdit[emp.id];
    if (!e) return;
    setItrSaving(emp.id);
    await api.saveItrSalary({
      employee_id: emp.id, year, month,
      days_worked: Number(e.days_worked) || 0,
      bonus: Number(e.bonus) || 0,
      advance_paid: Number(e.advance_paid) || 0,
      salary_paid: Number(e.salary_paid) || 0,
      note: e.note || null,
    });
    await loadItr();
    setItrSaving(null);
  };

  const handleCreateItr = async () => {
    if (!itrForm.full_name || !itrForm.position || !itrForm.base_salary || !itrForm.base_days) return;
    setItrFormSaving(true);
    await api.createItrEmployee({
      full_name: itrForm.full_name,
      position: itrForm.position,
      base_salary: Number(itrForm.base_salary),
      base_days: Number(itrForm.base_days),
    });
    setItrForm({ full_name: "", position: "", base_salary: "", base_days: "" });
    setShowItrForm(false);
    await loadItr();
    setItrFormSaving(false);
  };

  const updateItrField = (id: number, field: string, value: string) => {
    setItrEdit(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // Собираем общий список для печати
  const buildCrewRecords = (type: "driver" | "conductor"): CrewRecord[] => {
    if (!driverData) return [];
    const list = type === "driver" ? driverData.drivers : driverData.conductors;
    return list.map(p => {
      const key = `${type[0]}-${p.id}`;
      const ed = getCrewEdit(key);
      return { id: p.id, type, full_name: p.full_name, is_official: (p as DriverSalary).is_official, total_earned: p.total_earned, shifts_count: p.shifts.length, ...ed };
    });
  };

  const crewFields = [
    { key: "sick_leave", label: "Больничный, ₽" },
    { key: "advance_cash", label: "Аванс (нал.), ₽" },
    { key: "advance_card", label: "Аванс (карта), ₽" },
    { key: "salary_card", label: "ЗП (карта), ₽" },
    { key: "overtime_sum", label: "Подработка, ₽" },
    { key: "fines", label: "Штрафы, ₽" },
  ];

  const renderCrewSection = (
    title: string,
    items: DriverSalary[] | ConductorSalary[],
    keyPrefix: "d" | "c",
    showOfficialBadge: boolean
  ) => (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-base font-semibold text-neutral-800">{title}</h3>
        <button
          onClick={() => {
            const records = buildCrewRecords(keyPrefix === "d" ? "driver" : "conductor");
            printCrewStatement(records, month, year, title);
          }}
          className="ml-auto flex items-center gap-1.5 text-xs border border-neutral-300 px-3 py-1.5 rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-600">
          <Icon name="Printer" size={13} />
          Печать ведомости
        </button>
      </div>
      {items.length === 0 ? (
        <div className="text-neutral-400 text-sm">Нет данных</div>
      ) : (
        <div className="border border-neutral-200 rounded overflow-hidden">
          {items.map((p, idx) => {
            const key = `${keyPrefix}-${p.id}`;
            const isExp = expandedId === key;
            const ed = getCrewEdit(key);
            const shifts = p.shifts;
            const overtimeShifts = shifts.filter((s: DriverSalaryShift | ConductorShift) => s.is_overtime).length;
            const rec: CrewRecord = { id: p.id, type: keyPrefix === "d" ? "driver" : "conductor", full_name: p.full_name, is_official: (p as DriverSalary).is_official, total_earned: p.total_earned, shifts_count: shifts.length, ...ed };
            const toGet = calcCrewTotal(rec);

            return (
              <div key={p.id} className={idx > 0 ? "border-t border-neutral-100" : ""}>
                <div className="px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(isExp ? null : key)}>
                  <span className="font-medium text-neutral-900 flex-1">{p.full_name}</span>
                  {showOfficialBadge && (
                    <span className={`text-xs px-2 py-0.5 rounded ${(p as DriverSalary).is_official ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                      {(p as DriverSalary).is_official ? "Официальный" : "Неофициальный"}
                    </span>
                  )}
                  <span className="text-xs text-neutral-500">{shifts.length} смен{overtimeShifts > 0 && <span className="ml-1 text-amber-600">· {overtimeShifts} подраб.</span>}</span>
                  <span className="font-bold text-neutral-900 text-sm">{fmt(p.total_earned)} ₽</span>
                  <Icon name={isExp ? "ChevronUp" : "ChevronDown"} size={14} className="text-neutral-400" />
                </div>

                {isExp && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-4 pb-4">
                    {/* Детализация смен */}
                    <table className="w-full text-xs mt-3 mb-4">
                      <thead>
                        <tr className="text-neutral-400 uppercase tracking-wide">
                          <th className="text-left py-1.5">Дата</th>
                          <th className="text-left">Маршрут</th>
                          <th className="text-right">Выручка</th>
                          {keyPrefix === "d" && <th className="text-right">Топливо</th>}
                          <th className="text-right">Заработал</th>
                          <th className="text-center">Подработка</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shifts.map((s: DriverSalaryShift | ConductorShift, i: number) => (
                          <tr key={i} className={`border-t border-neutral-100 ${s.is_overtime ? "bg-amber-50" : ""}`}>
                            <td className="py-1.5 text-neutral-600">{s.date.split("-").reverse().join(".")}</td>
                            <td className="text-neutral-600">№ {s.route}</td>
                            <td className="text-right text-neutral-600">{fmt(s.total)} ₽</td>
                            {keyPrefix === "d" && <td className="text-right text-red-400">−{fmt((s as DriverSalaryShift).fuel_cost)} ₽</td>}
                            <td className="text-right font-semibold text-neutral-900">{fmt(s.earned)} ₽</td>
                            <td className="text-center">{s.is_overtime ? <span className="text-amber-600">Да</span> : <span className="text-neutral-300">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-neutral-200 font-bold text-neutral-900">
                          <td colSpan={keyPrefix === "d" ? 4 : 3} className="py-1.5">Начислено за смены:</td>
                          <td className="text-right">{fmt(p.total_earned)} ₽</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Поля ведомости */}
                    <div className="border-t border-neutral-200 pt-3">
                      <p className="text-xs text-neutral-500 mb-2 font-medium">Ведомость выплат</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-3">
                        {crewFields.map(f => (
                          <div key={f.key}>
                            <label className="text-xs text-neutral-400 block mb-0.5">{f.label}</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={(ed as Record<string, string>)[f.key]}
                              onChange={ev => updateCrewField(key, f.key, ev.target.value)}
                              placeholder="0"
                              className="border border-neutral-300 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:border-neutral-600 text-right"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 pt-2 border-t border-neutral-200">
                        <span className="text-xs text-neutral-500">Начислено: <span className="font-semibold text-neutral-900">{fmt(p.total_earned)} ₽</span></span>
                        <span className={`text-sm font-bold ml-auto ${toGet < 0 ? "text-red-600" : "text-neutral-900"}`}>
                          Итого к выдаче: {fmt(toGet)} ₽
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <h2 className="text-2xl font-bold text-neutral-900">Зарплата</h2>
        <div className="flex gap-2 items-center ml-auto">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-neutral-300 rounded px-3 py-2 text-sm bg-white focus:outline-none">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-neutral-300 rounded px-3 py-2 text-sm bg-white focus:outline-none">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-1 mb-6">
        {([["crew", "Экипажи ТС"], ["itr", "ИТР"]] as [SubTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`px-4 py-2 text-sm rounded cursor-pointer transition-colors ${
              subTab === id ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {subTab === "crew" && (
        <div>
          {driverLoading ? (
            <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
          ) : !driverData ? null : (
            <div className="flex flex-col gap-6">
              {driverData.fuel_price > 0 && (
                <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                  <Icon name="Fuel" size={13} />
                  Базовая цена топлива: {driverData.fuel_price} ₽/л
                </div>
              )}
              {renderCrewSection("Водители", driverData.drivers, "d", true)}
              {renderCrewSection("Кондукторы", driverData.conductors, "c", false)}
            </div>
          )}
        </div>
      )}

      {subTab === "itr" && (
        <div>
          {canEditItr && (
            <div className="mb-4">
              <button onClick={() => setShowItrForm(!showItrForm)}
                className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors cursor-pointer flex items-center gap-2">
                <Icon name="UserPlus" size={15} />
                Добавить сотрудника
              </button>
            </div>
          )}

          {showItrForm && canEditItr && (
            <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-6">
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { key: "full_name", label: "ФИО", placeholder: "Иванов Иван Иванович" },
                  { key: "position", label: "Должность", placeholder: "Главный бухгалтер" },
                  { key: "base_salary", label: "Ставка, ₽/мес", placeholder: "100000" },
                  { key: "base_days", label: "Норма дней/мес", placeholder: "23" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-neutral-500 block mb-1">{f.label}</label>
                    <input
                      value={(itrForm as Record<string, string>)[f.key]}
                      onChange={e => setItrForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateItr} disabled={itrFormSaving}
                  className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">
                  {itrFormSaving ? "Сохраняю..." : "Добавить"}
                </button>
                <button onClick={() => setShowItrForm(false)}
                  className="border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 cursor-pointer">
                  Отмена
                </button>
              </div>
            </div>
          )}

          {itrLoading ? (
            <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
          ) : itrData.length === 0 ? (
            <div className="text-neutral-400 text-sm py-8 text-center">Сотрудники ИТР не добавлены</div>
          ) : (
            <div className="flex flex-col gap-3">
              {itrData.map(emp => {
                const e = itrEdit[emp.id] ?? { days_worked: "0", bonus: "0", advance_paid: "0", salary_paid: "0", note: "" };
                const earned = calcItrEarned({ ...emp, days_worked: Number(e.days_worked) || 0 });
                const advanceAuto = calcAdvance({ ...emp, days_worked: Number(e.days_worked) || 0 });
                const bonusNum = Number(e.bonus) || 0;
                const advancePaid = Number(e.advance_paid) || 0;
                const salaryPaid = Number(e.salary_paid) || 0;
                const totalWithBonus = earned + bonusNum;
                const remaining = totalWithBonus - advancePaid - salaryPaid;

                return (
                  <div key={emp.id} className="border border-neutral-200 rounded overflow-hidden">
                    <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100 flex items-center gap-3 flex-wrap">
                      <div>
                        <span className="font-semibold text-neutral-900">{emp.full_name}</span>
                        <span className="ml-2 text-xs text-neutral-500">{emp.position}</span>
                      </div>
                      <div className="ml-auto text-xs text-neutral-400">
                        Ставка: {emp.base_salary.toLocaleString("ru-RU")} ₽ / {emp.base_days} дн.
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-3 mb-3 sm:grid-cols-4">
                        <div>
                          <label className="text-xs text-neutral-500 block mb-1">Отработано дней</label>
                          <input type="number" min="0" max="31"
                            value={e.days_worked}
                            onChange={ev => updateItrField(emp.id, "days_worked", ev.target.value)}
                            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 block mb-1">Надбавка/премия, ₽</label>
                          <input type="number" min="0"
                            value={e.bonus}
                            onChange={ev => updateItrField(emp.id, "bonus", ev.target.value)}
                            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 block mb-1">Аванс выплачен, ₽ <span className="text-neutral-400">(авт. {fmt(advanceAuto)})</span></label>
                          <input type="number" min="0"
                            value={e.advance_paid}
                            onChange={ev => updateItrField(emp.id, "advance_paid", ev.target.value)}
                            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 block mb-1">ЗП выплачена, ₽</label>
                          <input type="number" min="0"
                            value={e.salary_paid}
                            onChange={ev => updateItrField(emp.id, "salary_paid", ev.target.value)}
                            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-neutral-500 block mb-1">Примечание</label>
                        <input
                          value={e.note}
                          onChange={ev => updateItrField(emp.id, "note", ev.target.value)}
                          placeholder="Любая заметка..."
                          className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex gap-4 text-sm flex-wrap">
                          <span className="text-neutral-500">Начислено: <span className="font-semibold text-neutral-900">{fmt(earned)} ₽</span></span>
                          {bonusNum > 0 && <span className="text-neutral-500">+ Надбавка: <span className="font-semibold text-green-700">+{fmt(bonusNum)} ₽</span></span>}
                          <span className="text-neutral-500">Итого: <span className="font-bold text-neutral-900">{fmt(totalWithBonus)} ₽</span></span>
                          <span className={`font-semibold ${remaining < 0 ? "text-red-600" : "text-neutral-700"}`}>
                            Остаток: {remaining < 0 ? "−" : ""}{fmt(Math.abs(remaining))} ₽
                          </span>
                        </div>
                        <button onClick={() => saveItr(emp)} disabled={itrSaving === emp.id}
                          className="ml-auto bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
                          {itrSaving === emp.id ? "Сохраняю..." : "Сохранить"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
