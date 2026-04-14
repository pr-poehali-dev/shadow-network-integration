import Icon from "@/components/ui/icon";
import {
  DriverSalary, ConductorSalary, DriverSalaryShift, ConductorShift,
  CrewRecord, fmt, calcCrewTotal, printCrewStatement,
} from "./salaryTypes";

const CREW_FIELDS = [
  { key: "sick_leave",   label: "Больничный, ₽" },
  { key: "advance_cash", label: "Аванс (нал.), ₽" },
  { key: "advance_card", label: "Аванс (карта), ₽" },
  { key: "salary_card",  label: "ЗП (карта), ₽" },
  { key: "overtime_sum", label: "Подработка, ₽" },
  { key: "fines",        label: "Штрафы, ₽" },
];

type EditFields = Omit<CrewRecord, "id"|"type"|"full_name"|"is_official"|"total_earned"|"shifts_count">;

interface Props {
  title: string;
  items: DriverSalary[] | ConductorSalary[];
  keyPrefix: "d" | "c";
  showOfficialBadge: boolean;
  month: number;
  year: number;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  getCrewEdit: (key: string) => EditFields;
  updateCrewField: (key: string, field: string, value: string) => void;
  saveCrewRecord: (key: string, personType: "driver" | "conductor", personId: number) => void;
  crewSaving: string | null;
  buildCrewRecords: (type: "driver" | "conductor") => CrewRecord[];
}

export default function SalaryCrewSection({
  title, items, keyPrefix, showOfficialBadge,
  month, year,
  expandedId, setExpandedId,
  getCrewEdit, updateCrewField, saveCrewRecord, crewSaving,
  buildCrewRecords,
}: Props) {
  return (
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
            const rec: CrewRecord = {
              id: p.id,
              type: keyPrefix === "d" ? "driver" : "conductor",
              full_name: p.full_name,
              is_official: (p as DriverSalary).is_official,
              total_earned: p.total_earned,
              shifts_count: shifts.length,
              ...ed,
            };
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
                  <span className="text-xs text-neutral-500">
                    {shifts.length} смен{overtimeShifts > 0 && <span className="ml-1 text-amber-600">· {overtimeShifts} подраб.</span>}
                  </span>
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
                          <th className="text-right">Билеты</th>
                          <th className="text-right">База</th>
                          {keyPrefix === "d" && <th className="text-right">Топливо</th>}
                          <th className="text-left pl-2">%</th>
                          <th className="text-right">Обед</th>
                          <th className="text-right">Заработал</th>
                          <th className="text-center">Подраб.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shifts.map((s: DriverSalaryShift | ConductorShift, i: number) => {
                          const ds = s as DriverSalaryShift & { tickets?: number; base?: number; formula?: string; lunch?: number };
                          return (
                            <tr key={i} className={`border-t border-neutral-100 ${s.is_overtime ? "bg-amber-50" : ""}`}>
                              <td className="py-1.5 text-neutral-600">{s.date.split("-").reverse().join(".")}</td>
                              <td className="text-neutral-600">№ {s.route}</td>
                              <td className="text-right text-neutral-600">
                                {ds.tickets != null ? <span className="font-medium">{ds.tickets} шт.</span> : <span className="text-neutral-300">—</span>}
                              </td>
                              <td className="text-right text-neutral-600">
                                {ds.base != null ? fmt(ds.base) + " ₽" : fmt(s.total) + " ₽"}
                              </td>
                              {keyPrefix === "d" && <td className="text-right text-red-400">−{fmt((s as DriverSalaryShift).fuel_cost)} ₽</td>}
                              <td className="pl-2 text-neutral-400 whitespace-nowrap">
                                {ds.formula ?? "—"}
                              </td>
                              <td className="text-right text-orange-500">
                                {ds.lunch != null && ds.lunch > 0 ? `−${fmt(ds.lunch)} ₽` : <span className="text-neutral-300">—</span>}
                              </td>
                              <td className="text-right font-semibold text-neutral-900">{fmt(s.earned)} ₽</td>
                              <td className="text-center">{s.is_overtime ? <span className="text-amber-600">Да</span> : <span className="text-neutral-300">—</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-neutral-200 font-bold text-neutral-900">
                          <td colSpan={keyPrefix === "d" ? 6 : 5} className="py-1.5">Начислено за смены:</td>
                          <td colSpan={2} className="text-right">{fmt(p.total_earned)} ₽</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Поля ведомости */}
                    <div className="border-t border-neutral-200 pt-3">
                      <p className="text-xs text-neutral-500 mb-2 font-medium">Ведомость выплат</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-3">
                        {CREW_FIELDS.map(f => (
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
                      <div className="flex items-center gap-4 pt-2 border-t border-neutral-200 flex-wrap">
                        <span className="text-xs text-neutral-500">Начислено: <span className="font-semibold text-neutral-900">{fmt(p.total_earned)} ₽</span></span>
                        <span className={`text-sm font-bold ${toGet < 0 ? "text-red-600" : "text-neutral-900"}`}>
                          Итого к выдаче: {fmt(toGet)} ₽
                        </span>
                        <button
                          onClick={() => saveCrewRecord(key, keyPrefix === "d" ? "driver" : "conductor", p.id)}
                          disabled={crewSaving === key}
                          className="ml-auto bg-neutral-900 text-white px-4 py-1.5 text-xs rounded hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-1.5">
                          <Icon name={crewSaving === key ? "Loader" : "Save"} size={13} />
                          {crewSaving === key ? "Сохраняю..." : "Сохранить"}
                        </button>
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
}