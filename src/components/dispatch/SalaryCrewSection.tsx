import Icon from "@/components/ui/icon";
import {
  DriverSalary, ConductorSalary,
  CrewRecord, fmt, calcCrewTotal, printCrewStatement,
} from "./salaryTypes";

type EditFields = Omit<CrewRecord, "id"|"type"|"full_name"|"is_official"|"total_earned"|"shifts_count">;

interface Props {
  title: string;
  items: DriverSalary[] | ConductorSalary[];
  keyPrefix: "d" | "c";
  showOfficialBadge: boolean;
  month: number;
  year: number;
  getCrewEdit: (key: string) => EditFields;
  updateCrewField: (key: string, field: string, value: string) => void;
  saveCrewRecord: (key: string, personType: "driver" | "conductor", personId: number) => void;
  crewSaving: string | null;
  buildCrewRecords: (type: "driver" | "conductor") => CrewRecord[];
}

const cellInp = "bg-transparent border-b border-neutral-200 text-xs text-center focus:outline-none focus:border-neutral-600 py-0.5 w-full min-w-[55px]";

export default function SalaryCrewSection({
  title, items, keyPrefix, showOfficialBadge,
  month, year,
  getCrewEdit, updateCrewField, saveCrewRecord, crewSaving,
  buildCrewRecords,
}: Props) {
  const type = keyPrefix === "d" ? "driver" : "conductor";

  const totals = items.reduce((acc, p) => {
    const key = `${keyPrefix}-${p.id}`;
    const ed = getCrewEdit(key);
    const rec: CrewRecord = {
      id: p.id, type, full_name: p.full_name,
      is_official: (p as DriverSalary).is_official,
      total_earned: p.total_earned, shifts_count: p.shifts.length, ...ed,
    };
    const toGet = calcCrewTotal(rec);
    return {
      earned: acc.earned + p.total_earned,
      shifts: acc.shifts + p.shifts.length,
      overtime: acc.overtime + p.shifts.filter(s => s.is_overtime).length,
      sickLeave: acc.sickLeave + (Number(ed.sick_leave) || 0),
      advanceCash: acc.advanceCash + (Number(ed.advance_cash) || 0),
      advanceCard: acc.advanceCard + (Number(ed.advance_card) || 0),
      salaryCard: acc.salaryCard + (Number(ed.salary_card) || 0),
      overtimeSum: acc.overtimeSum + (Number(ed.overtime_sum) || 0),
      fines: acc.fines + (Number(ed.fines) || 0),
      toGet: acc.toGet + toGet,
    };
  }, { earned: 0, shifts: 0, overtime: 0, sickLeave: 0, advanceCash: 0, advanceCard: 0, salaryCard: 0, overtimeSum: 0, fines: 0, toGet: 0 });

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <div className="bg-neutral-800 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
          {title} — {items.length} чел.
        </span>
        <button
          onClick={() => {
            const records = buildCrewRecords(type);
            printCrewStatement(records, month, year, title);
          }}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer">
          <Icon name="Printer" size={12} />
          Печать
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-neutral-400 text-sm py-6 text-center">Нет данных</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-800 text-neutral-200">
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 w-8">№</th>
                <th className="px-2 py-2 text-left font-semibold border-r border-neutral-700 min-w-[150px]">ФИО</th>
                {showOfficialBadge && <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Статус</th>}
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Смен</th>
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Подраб.</th>
                <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap">Начислено ₽</th>
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">Больнич. ₽</th>
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">Аванс нал. ₽</th>
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">Аванс карта ₽</th>
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">ЗП карта ₽</th>
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">Подработка ₽</th>
                <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">Штрафы ₽</th>
                <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap bg-emerald-900/30">К выдаче ₽</th>
                <th className="px-2 py-2 text-center font-semibold w-10">↓</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p, idx) => {
                const key = `${keyPrefix}-${p.id}`;
                const ed = getCrewEdit(key);
                const overtimeShifts = p.shifts.filter(s => s.is_overtime).length;
                const rec: CrewRecord = {
                  id: p.id, type, full_name: p.full_name,
                  is_official: (p as DriverSalary).is_official,
                  total_earned: p.total_earned, shifts_count: p.shifts.length, ...ed,
                };
                const toGet = calcCrewTotal(rec);
                return (
                  <tr key={p.id} className={`border-b border-neutral-100 ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}>
                    <td className="px-2 py-1.5 text-center text-neutral-400 border-r border-neutral-100 font-mono">{idx + 1}</td>
                    <td className="px-2 py-1.5 border-r border-neutral-100 font-medium text-neutral-800 whitespace-nowrap">{p.full_name}</td>
                    {showOfficialBadge && (
                      <td className="px-2 py-1.5 border-r border-neutral-100 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(p as DriverSalary).is_official ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                          {(p as DriverSalary).is_official ? "Офиц." : "Неофиц."}
                        </span>
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-center border-r border-neutral-100 font-mono text-neutral-700">{p.shifts.length}</td>
                    <td className="px-2 py-1.5 text-center border-r border-neutral-100">
                      {overtimeShifts > 0
                        ? <span className="font-semibold text-amber-600 font-mono">{overtimeShifts}</span>
                        : <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right border-r border-neutral-100 font-semibold font-mono text-neutral-800 whitespace-nowrap">{fmt(p.total_earned)}</td>
                    <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                      <input type="number" min="0" step="0.01" value={ed.sick_leave}
                        onChange={ev => updateCrewField(key, "sick_leave", ev.target.value)}
                        className={cellInp} />
                    </td>
                    <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                      <input type="number" min="0" step="0.01" value={ed.advance_cash}
                        onChange={ev => updateCrewField(key, "advance_cash", ev.target.value)}
                        className={cellInp} />
                    </td>
                    <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                      <input type="number" min="0" step="0.01" value={ed.advance_card}
                        onChange={ev => updateCrewField(key, "advance_card", ev.target.value)}
                        className={cellInp} />
                    </td>
                    <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                      <input type="number" min="0" step="0.01" value={ed.salary_card}
                        onChange={ev => updateCrewField(key, "salary_card", ev.target.value)}
                        className={cellInp} />
                    </td>
                    <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                      <input type="number" min="0" step="0.01" value={ed.overtime_sum}
                        onChange={ev => updateCrewField(key, "overtime_sum", ev.target.value)}
                        className={cellInp} />
                    </td>
                    <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                      <input type="number" min="0" step="0.01" value={ed.fines}
                        onChange={ev => updateCrewField(key, "fines", ev.target.value)}
                        className={cellInp} />
                    </td>
                    <td className={`px-2 py-1.5 text-right border-r border-neutral-100 font-bold font-mono bg-emerald-50/50 whitespace-nowrap ${toGet < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {toGet < 0 ? "−" : ""}{fmt(Math.abs(toGet))}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => saveCrewRecord(key, type, p.id)} disabled={crewSaving === key}
                        title="Сохранить"
                        className="p-1 rounded hover:bg-neutral-200 cursor-pointer text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-40">
                        <Icon name={crewSaving === key ? "Loader" : "Save"} size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-800 text-white text-xs font-bold">
                <td colSpan={showOfficialBadge ? 3 : 2} className="px-2 py-2 text-center border-r border-neutral-700">ИТОГО</td>
                <td className="px-2 py-2 text-center font-mono border-r border-neutral-700">{totals.shifts}</td>
                <td className="px-2 py-2 text-center font-mono border-r border-neutral-700">{totals.overtime > 0 ? totals.overtime : "—"}</td>
                <td className="px-2 py-2 text-right font-mono border-r border-neutral-700 whitespace-nowrap">{fmt(totals.earned)}</td>
                <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{totals.sickLeave > 0 ? fmt(totals.sickLeave) : "—"}</td>
                <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{totals.advanceCash > 0 ? fmt(totals.advanceCash) : "—"}</td>
                <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{totals.advanceCard > 0 ? fmt(totals.advanceCard) : "—"}</td>
                <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{totals.salaryCard > 0 ? fmt(totals.salaryCard) : "—"}</td>
                <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{totals.overtimeSum > 0 ? fmt(totals.overtimeSum) : "—"}</td>
                <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{totals.fines > 0 ? fmt(totals.fines) : "—"}</td>
                <td className={`px-2 py-2 text-right font-mono border-r border-neutral-700 whitespace-nowrap ${totals.toGet < 0 ? "text-red-400" : "text-emerald-300"}`}>
                  {totals.toGet < 0 ? "−" : ""}{fmt(Math.abs(totals.toGet))}
                </td>
                <td className="px-2 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
