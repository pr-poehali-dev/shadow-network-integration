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

export default function SalaryItrSection({
  canEditItr, itrLoading, itrData, itrEdit, itrSaving,
  showItrForm, itrForm, itrFormSaving,
  setShowItrForm, setItrForm,
  updateItrField, saveItr, handleCreateItr,
}: Props) {
  return (
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
              { key: "full_name",   label: "ФИО",              placeholder: "Иванов Иван Иванович" },
              { key: "position",    label: "Должность",         placeholder: "Главный бухгалтер" },
              { key: "base_salary", label: "Ставка, ₽/мес",    placeholder: "100000" },
              { key: "base_days",   label: "Норма дней/мес",   placeholder: "23" },
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
  );
}
