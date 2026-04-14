import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";

type SubTab = "drivers" | "itr";

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

export default function SalaryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isAccountant = user?.role === "accountant";
  const canEditItr = isAdmin;
  const canEditFuelPrice = isAdmin || isAccountant;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [subTab, setSubTab] = useState<SubTab>("drivers");

  // Drivers
  const [driverData, setDriverData] = useState<{ drivers: DriverSalary[]; conductors: ConductorSalary[]; fuel_price: number } | null>(null);
  const [driverLoading, setDriverLoading] = useState(false);
  const [expandedDriver, setExpandedDriver] = useState<number | null>(null);
  const [expandedConductor, setExpandedConductor] = useState<number | null>(null);

  // ITR
  const [itrData, setItrData] = useState<ItrEmployee[]>([]);
  const [itrLoading, setItrLoading] = useState(false);
  const [itrEdit, setItrEdit] = useState<Record<number, { days_worked: string; bonus: string; advance_paid: string; salary_paid: string; note: string }>>({});
  const [itrSaving, setItrSaving] = useState<number | null>(null);

  // New ITR employee form
  const [showItrForm, setShowItrForm] = useState(false);
  const [itrForm, setItrForm] = useState({ full_name: "", position: "", base_salary: "", base_days: "" });
  const [itrFormSaving, setItrFormSaving] = useState(false);

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

  // При смене периода — грузим оба таба параллельно сразу
  useEffect(() => {
    loadDrivers();
    loadItr();
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  // При смене таба — не перезагружаем, данные уже есть

  const saveItr = async (emp: ItrEmployee) => {
    const e = itrEdit[emp.id];
    if (!e) return;
    setItrSaving(emp.id);
    await api.saveItrSalary({
      employee_id: emp.id,
      year,
      month,
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
        {([["drivers", "Водители и кондукторы"], ["itr", "ИТР"]] as [SubTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`px-4 py-2 text-sm rounded cursor-pointer transition-colors ${
              subTab === id ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {subTab === "drivers" && (
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

              {/* Водители */}
              <div>
                <h3 className="text-base font-semibold text-neutral-800 mb-3">Водители</h3>
                {driverData.drivers.length === 0 ? (
                  <div className="text-neutral-400 text-sm">Нет данных</div>
                ) : (
                  <div className="border border-neutral-200 rounded overflow-hidden">
                    {driverData.drivers.map((d, idx) => (
                      <div key={d.id} className={idx > 0 ? "border-t border-neutral-100" : ""}>
                        <div
                          className="px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedDriver(expandedDriver === d.id ? null : d.id)}>
                          <span className="font-medium text-neutral-900 flex-1">{d.full_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${d.is_official ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                            {d.is_official ? "Официальный" : "Неофициальный"}
                          </span>
                          <span className="text-xs text-neutral-500">{d.shifts.length} смен</span>
                          <span className="font-bold text-neutral-900 text-sm">{fmt(d.total_earned)} ₽</span>
                          <Icon name={expandedDriver === d.id ? "ChevronUp" : "ChevronDown"} size={14} className="text-neutral-400" />
                        </div>
                        {expandedDriver === d.id && (
                          <div className="px-4 pb-3 border-t border-neutral-100 bg-neutral-50">
                            <table className="w-full text-xs mt-2">
                              <thead>
                                <tr className="text-neutral-400 uppercase tracking-wide">
                                  <th className="text-left py-1.5">Дата</th>
                                  <th className="text-left">Маршрут</th>
                                  <th className="text-right">Выручка</th>
                                  <th className="text-right">Топливо</th>
                                  <th className="text-right">Заработал</th>
                                  <th className="text-center">Подработка</th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.shifts.map((s, i) => (
                                  <tr key={i} className={`border-t border-neutral-100 ${s.is_overtime ? "bg-amber-50" : ""}`}>
                                    <td className="py-1.5 text-neutral-600">{s.date.split("-").reverse().join(".")}</td>
                                    <td className="text-neutral-600">№ {s.route}</td>
                                    <td className="text-right text-neutral-600">{fmt(s.total)} ₽</td>
                                    <td className="text-right text-red-400">−{fmt(s.fuel_cost)} ₽</td>
                                    <td className="text-right font-semibold text-neutral-900">{fmt(s.earned)} ₽</td>
                                    <td className="text-center">{s.is_overtime ? <span className="text-amber-600">Да</span> : <span className="text-neutral-300">—</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-neutral-200 font-bold text-neutral-900">
                                  <td colSpan={4} className="py-2">Итого:</td>
                                  <td className="text-right text-sm">{fmt(d.total_earned)} ₽</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Кондукторы */}
              <div>
                <h3 className="text-base font-semibold text-neutral-800 mb-3">Кондукторы</h3>
                {driverData.conductors.length === 0 ? (
                  <div className="text-neutral-400 text-sm">Нет данных</div>
                ) : (
                  <div className="border border-neutral-200 rounded overflow-hidden">
                    {driverData.conductors.map((c, idx) => (
                      <div key={c.id} className={idx > 0 ? "border-t border-neutral-100" : ""}>
                        <div
                          className="px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedConductor(expandedConductor === c.id ? null : c.id)}>
                          <span className="font-medium text-neutral-900 flex-1">{c.full_name}</span>
                          <span className="text-xs text-neutral-500">{c.shifts.length} смен</span>
                          <span className="font-bold text-neutral-900 text-sm">{fmt(c.total_earned)} ₽</span>
                          <Icon name={expandedConductor === c.id ? "ChevronUp" : "ChevronDown"} size={14} className="text-neutral-400" />
                        </div>
                        {expandedConductor === c.id && (
                          <div className="px-4 pb-3 border-t border-neutral-100 bg-neutral-50">
                            <table className="w-full text-xs mt-2">
                              <thead>
                                <tr className="text-neutral-400 uppercase tracking-wide">
                                  <th className="text-left py-1.5">Дата</th>
                                  <th className="text-left">Маршрут</th>
                                  <th className="text-right">Выручка</th>
                                  <th className="text-right">Заработал (15%)</th>
                                  <th className="text-center">Подработка</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.shifts.map((s, i) => (
                                  <tr key={i} className={`border-t border-neutral-100 ${s.is_overtime ? "bg-amber-50" : ""}`}>
                                    <td className="py-1.5 text-neutral-600">{s.date.split("-").reverse().join(".")}</td>
                                    <td className="text-neutral-600">№ {s.route}</td>
                                    <td className="text-right text-neutral-600">{fmt(s.total)} ₽</td>
                                    <td className="text-right font-semibold text-neutral-900">{fmt(s.earned)} ₽</td>
                                    <td className="text-center">{s.is_overtime ? <span className="text-amber-600">Да</span> : <span className="text-neutral-300">—</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-neutral-200 font-bold text-neutral-900">
                                  <td colSpan={3} className="py-2">Итого:</td>
                                  <td className="text-right text-sm">{fmt(c.total_earned)} ₽</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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