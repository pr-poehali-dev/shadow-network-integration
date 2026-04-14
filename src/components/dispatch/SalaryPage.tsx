import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import {
  SubTab, DriverSalary, ConductorSalary, CrewRecord, ItrEmployee,
  MONTHS, fmt, calcItrEarned, calcCrewTotal,
} from "./salaryTypes";
import SalaryCrewSection from "./SalaryCrewSection";
import SalaryItrSection from "./SalaryItrSection";

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
  const [crewSaving, setCrewSaving] = useState<string | null>(null);

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
    const [data, saved] = await Promise.all([
      api.getDriverSalary(year, month),
      api.getCrewSalary(year, month),
    ]);
    setDriverData(data);
    if (saved && typeof saved === "object" && !saved.error) {
      const edits: typeof crewEdit = {};
      for (const [key, rec] of Object.entries(saved as Record<string, Record<string, unknown>>)) {
        edits[key] = {
          sick_leave: String(rec.sick_leave ?? ""),
          advance_cash: String(rec.advance_cash ?? ""),
          advance_card: String(rec.advance_card ?? ""),
          salary_card: String(rec.salary_card ?? ""),
          overtime_sum: String(rec.overtime_sum ?? ""),
          fines: String(rec.fines ?? ""),
        };
      }
      setCrewEdit(edits);
    }
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
    Promise.all([loadDrivers(), loadItr()]);
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

  const saveCrewRecord = async (key: string, personType: "driver" | "conductor", personId: number) => {
    const ed = getCrewEdit(key);
    setCrewSaving(key);
    await api.saveCrewSalary({
      person_type: personType,
      person_id: personId,
      year, month,
      sick_leave: Number(ed.sick_leave) || 0,
      advance_cash: Number(ed.advance_cash) || 0,
      advance_card: Number(ed.advance_card) || 0,
      salary_card: Number(ed.salary_card) || 0,
      overtime_sum: Number(ed.overtime_sum) || 0,
      fines: Number(ed.fines) || 0,
    });
    setCrewSaving(null);
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
              <SalaryCrewSection
                title="Водители"
                items={driverData.drivers}
                keyPrefix="d"
                showOfficialBadge={true}
                month={month}
                year={year}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                getCrewEdit={getCrewEdit}
                updateCrewField={updateCrewField}
                saveCrewRecord={saveCrewRecord}
                crewSaving={crewSaving}
                buildCrewRecords={buildCrewRecords}
              />
              <SalaryCrewSection
                title="Кондукторы"
                items={driverData.conductors}
                keyPrefix="c"
                showOfficialBadge={false}
                month={month}
                year={year}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                getCrewEdit={getCrewEdit}
                updateCrewField={updateCrewField}
                saveCrewRecord={saveCrewRecord}
                crewSaving={crewSaving}
                buildCrewRecords={buildCrewRecords}
              />
            </div>
          )}
        </div>
      )}

      {subTab === "itr" && (
        <SalaryItrSection
          canEditItr={canEditItr}
          itrLoading={itrLoading}
          itrData={itrData}
          itrEdit={itrEdit}
          itrSaving={itrSaving}
          showItrForm={showItrForm}
          itrForm={itrForm}
          itrFormSaving={itrFormSaving}
          setShowItrForm={setShowItrForm}
          setItrForm={setItrForm}
          updateItrField={updateItrField}
          saveItr={saveItr}
          handleCreateItr={handleCreateItr}
        />
      )}

      {/* ФОТ — итоговая строка */}
      {!driverLoading && !itrLoading && driverData && (
        (() => {
          const driversTotal = driverData.drivers.reduce((s, d) => {
            const key = `d-${d.id}`;
            const ed = getCrewEdit(key);
            return s + calcCrewTotal({ id: d.id, type: "driver", full_name: d.full_name, is_official: d.is_official, total_earned: d.total_earned, shifts_count: d.shifts.length, ...ed });
          }, 0);
          const conductorsTotal = driverData.conductors.reduce((s, c) => {
            const key = `c-${c.id}`;
            const ed = getCrewEdit(key);
            return s + calcCrewTotal({ id: c.id, type: "conductor", full_name: c.full_name, total_earned: c.total_earned, shifts_count: c.shifts.length, ...ed });
          }, 0);
          const itrTotal = itrData.reduce((s, emp) => {
            const e = itrEdit[emp.id];
            if (!e) return s;
            return s + calcItrEarned({ ...emp, days_worked: Number(e.days_worked) || 0 }) + (Number(e.bonus) || 0);
          }, 0);
          const grandTotal = driversTotal + conductorsTotal + itrTotal;

          return (
            <div className="mt-8 border-t-2 border-neutral-300 pt-5">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Фонд оплаты труда — {MONTHS[month - 1]} {year}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Водители",   value: driversTotal,    icon: "User",     bold: false },
                  { label: "Кондукторы", value: conductorsTotal,  icon: "Users",    bold: false },
                  { label: "ИТР",        value: itrTotal,         icon: "Briefcase",bold: false },
                  { label: "Итого ФОТ",  value: grandTotal,       icon: "Banknote", bold: true  },
                ].map(item => (
                  <div key={item.label} className={`rounded p-4 border ${item.bold ? "bg-neutral-900 text-white border-neutral-900" : "bg-neutral-50 border-neutral-200"}`}>
                    <div className={`flex items-center gap-2 mb-1 ${item.bold ? "text-neutral-300" : "text-neutral-500"}`}>
                      <Icon name={item.icon} size={13} />
                      <span className="text-xs">{item.label}</span>
                    </div>
                    <div className={`text-lg font-bold ${item.bold ? "text-white" : "text-neutral-900"}`}>
                      {fmt(item.value)} ₽
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}