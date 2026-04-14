import Icon from "@/components/ui/icon";
import { ItrEmployee, fmt, calcItrEarned, calcAdvance } from "./salaryTypes";

interface ItrEditFields {
  days_worked: string;
  bonus: string;
  advance_paid: string;
  salary_paid: string;
  note: string;
}

interface Props {
  canEditItr: boolean;
  itrLoading: boolean;
  itrData: ItrEmployee[];
  itrEdit: Record<number, ItrEditFields>;
  itrSaving: number | null;
  showItrForm: boolean;
  itrForm: { full_name: string; position: string; base_salary: string; base_days: string };
  itrFormSaving: boolean;
  setShowItrForm: (v: boolean) => void;
  setItrForm: React.Dispatch<React.SetStateAction<{ full_name: string; position: string; base_salary: string; base_days: string }>>;
  updateItrField: (id: number, field: string, value: string) => void;
  saveItr: (emp: ItrEmployee) => void;
  handleCreateItr: () => void;
}

const cellInp = "bg-transparent border-b border-neutral-200 text-xs text-center focus:outline-none focus:border-neutral-600 py-0.5 w-full min-w-[60px]";

export default function SalaryItrSection({
  canEditItr, itrLoading, itrData, itrEdit, itrSaving,
  showItrForm, itrForm, itrFormSaving,
  setShowItrForm, setItrForm,
  updateItrField, saveItr, handleCreateItr,
}: Props) {

  const totals = itrData.reduce((acc, emp) => {
    const e = itrEdit[emp.id] ?? { days_worked: "0", bonus: "0", advance_paid: "0", salary_paid: "0", note: "" };
    const earned = calcItrEarned({ ...emp, days_worked: Number(e.days_worked) || 0 });
    const bonus = Number(e.bonus) || 0;
    const total = earned + bonus;
    const advance = Number(e.advance_paid) || 0;
    const salaryPaid = Number(e.salary_paid) || 0;
    return {
      earned: acc.earned + earned,
      bonus: acc.bonus + bonus,
      total: acc.total + total,
      advance: acc.advance + advance,
      salaryPaid: acc.salaryPaid + salaryPaid,
      remaining: acc.remaining + (total - advance - salaryPaid),
    };
  }, { earned: 0, bonus: 0, total: 0, advance: 0, salaryPaid: 0, remaining: 0 });

  return (
    <div className="space-y-4">
      {canEditItr && (
        <button onClick={() => setShowItrForm(!showItrForm)}
          className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors cursor-pointer flex items-center gap-2">
          <Icon name="UserPlus" size={15} />
          Добавить сотрудника
        </button>
      )}

      {showItrForm && canEditItr && (
        <div className="bg-neutral-50 border border-neutral-200 rounded p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: "full_name",   label: "ФИО",            placeholder: "Иванов Иван Иванович" },
              { key: "position",    label: "Должность",       placeholder: "Главный бухгалтер" },
              { key: "base_salary", label: "Ставка, ₽/мес",  placeholder: "100000" },
              { key: "base_days",   label: "Норма дней/мес", placeholder: "23" },
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
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="bg-neutral-800 px-4 py-2">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
              ИТР — {itrData.length} сотр.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-800 text-neutral-200">
                  <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 w-8">№</th>
                  <th className="px-2 py-2 text-left font-semibold border-r border-neutral-700 min-w-[140px]">ФИО</th>
                  <th className="px-2 py-2 text-left font-semibold border-r border-neutral-700 min-w-[110px]">Должность</th>
                  <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap">Ставка ₽</th>
                  <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Норма дн.</th>
                  <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">Отработано</th>
                  <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap">Начислено ₽</th>
                  <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">Надбавка ₽</th>
                  <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap bg-yellow-900/30">Итого ₽</th>
                  <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">Аванс выпл. ₽</th>
                  <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap bg-indigo-900/40">ЗП выпл. ₽</th>
                  <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap bg-emerald-900/30">Остаток ₽</th>
                  <th className="px-2 py-2 text-left font-semibold border-r border-neutral-700 min-w-[100px] bg-indigo-900/40">Примечание</th>
                  <th className="px-2 py-2 text-center font-semibold w-10">↓</th>
                </tr>
              </thead>
              <tbody>
                {itrData.map((emp, idx) => {
                  const e = itrEdit[emp.id] ?? { days_worked: "0", bonus: "0", advance_paid: "0", salary_paid: "0", note: "" };
                  const earned = calcItrEarned({ ...emp, days_worked: Number(e.days_worked) || 0 });
                  const advanceAuto = calcAdvance({ ...emp, days_worked: Number(e.days_worked) || 0 });
                  const bonus = Number(e.bonus) || 0;
                  const advance = Number(e.advance_paid) || 0;
                  const salaryPaid = Number(e.salary_paid) || 0;
                  const total = earned + bonus;
                  const remaining = total - advance - salaryPaid;
                  return (
                    <tr key={emp.id} className={`border-b border-neutral-100 ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}>
                      <td className="px-2 py-1.5 text-center text-neutral-400 border-r border-neutral-100 font-mono">{idx + 1}</td>
                      <td className="px-2 py-1.5 border-r border-neutral-100 font-medium text-neutral-800 whitespace-nowrap">{emp.full_name}</td>
                      <td className="px-2 py-1.5 border-r border-neutral-100 text-neutral-600 whitespace-nowrap">{emp.position}</td>
                      <td className="px-2 py-1.5 border-r border-neutral-100 text-right font-mono text-neutral-700 whitespace-nowrap">{emp.base_salary.toLocaleString("ru-RU")}</td>
                      <td className="px-2 py-1.5 border-r border-neutral-100 text-center text-neutral-500">{emp.base_days}</td>
                      <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                        <input type="number" min="0" max="31" value={e.days_worked}
                          onChange={ev => updateItrField(emp.id, "days_worked", ev.target.value)}
                          className={cellInp} />
                      </td>
                      <td className="px-2 py-1.5 border-r border-neutral-100 text-right font-mono text-neutral-800 font-semibold whitespace-nowrap">{fmt(earned)}</td>
                      <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                        <input type="number" min="0" value={e.bonus}
                          onChange={ev => updateItrField(emp.id, "bonus", ev.target.value)}
                          className={cellInp} />
                      </td>
                      <td className="px-2 py-1.5 border-r border-neutral-100 text-right font-bold font-mono text-neutral-900 bg-yellow-50/50 whitespace-nowrap">{fmt(total)}</td>
                      <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                        <input type="number" min="0" value={e.advance_paid}
                          onChange={ev => updateItrField(emp.id, "advance_paid", ev.target.value)}
                          className={cellInp} />
                        <div className="text-[9px] text-neutral-400 text-center mt-0.5">авт: {fmt(advanceAuto)}</div>
                      </td>
                      <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                        <input type="number" min="0" value={e.salary_paid}
                          onChange={ev => updateItrField(emp.id, "salary_paid", ev.target.value)}
                          className={cellInp} />
                      </td>
                      <td className={`px-2 py-1.5 border-r border-neutral-100 text-right font-bold font-mono bg-emerald-50/50 whitespace-nowrap ${remaining < 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {remaining < 0 ? "−" : ""}{fmt(Math.abs(remaining))}
                      </td>
                      <td className="px-2 py-1 border-r border-neutral-100 bg-indigo-50/30">
                        <input value={e.note}
                          onChange={ev => updateItrField(emp.id, "note", ev.target.value)}
                          placeholder="Заметка..."
                          className="bg-transparent border-b border-neutral-200 text-xs focus:outline-none focus:border-neutral-600 py-0.5 w-full min-w-[80px]" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => saveItr(emp)} disabled={itrSaving === emp.id}
                          title="Сохранить"
                          className="p-1 rounded hover:bg-neutral-200 cursor-pointer text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-40">
                          <Icon name="Save" size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-800 text-white text-xs font-bold">
                  <td colSpan={6} className="px-2 py-2 text-center border-r border-neutral-700">ИТОГО</td>
                  <td className="px-2 py-2 text-right font-mono border-r border-neutral-700 whitespace-nowrap">{fmt(totals.earned)}</td>
                  <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{totals.bonus > 0 ? fmt(totals.bonus) : "—"}</td>
                  <td className="px-2 py-2 text-right font-mono border-r border-neutral-700 text-yellow-300 whitespace-nowrap">{fmt(totals.total)}</td>
                  <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{fmt(totals.advance)}</td>
                  <td className="px-2 py-2 text-center font-mono border-r border-neutral-700 whitespace-nowrap">{fmt(totals.salaryPaid)}</td>
                  <td className={`px-2 py-2 text-right font-mono border-r border-neutral-700 whitespace-nowrap ${totals.remaining < 0 ? "text-red-400" : "text-emerald-300"}`}>
                    {totals.remaining < 0 ? "−" : ""}{fmt(Math.abs(totals.remaining))}
                  </td>
                  <td colSpan={2} className="px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
