import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

type OperationType = "income" | "expense";
type Category =
  | "salary_payment"
  | "loan"
  | "loan_repayment"
  | "household"
  | "fuel"
  | "other_income"
  | "other_expense";

interface CashOperation {
  id: number;
  operation_date: string;
  operation_type: OperationType;
  category: Category;
  amount: number;
  description: string | null;
  organization: string | null;
  employee_name: string | null;
  loan_term_days: number | null;
  monthly_deduction: number | null;
  recipient_name: string | null;
  purpose: string | null;
  salary_period: string | null;
  created_by: string | null;
  created_at: string;
}

interface FormState {
  operation_date: string;
  operation_type: OperationType;
  category: Category;
  amount: string;
  description: string;
  organization: string;
  employee_name: string;
  loan_term_days: string;
  monthly_deduction: string;
  recipient_name: string;
  purpose: string;
  salary_period: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  salary_payment: "Выплата зарплаты",
  loan: "Займ сотруднику",
  loan_repayment: "Погашение займа",
  household: "Хозяйственные расходы",
  fuel: "Топливо",
  other_income: "Прочий приход",
  other_expense: "Прочий расход",
};

const INCOME_CATEGORIES: Category[] = ["other_income", "loan_repayment"];
const EXPENSE_CATEGORIES: Category[] = [
  "salary_payment",
  "loan",
  "household",
  "fuel",
  "other_expense",
];

const EMPTY_FORM: FormState = {
  operation_date: new Date().toISOString().slice(0, 10),
  operation_type: "expense",
  category: "salary_payment",
  amount: "",
  description: "",
  organization: "",
  employee_name: "",
  loan_term_days: "",
  monthly_deduction: "",
  recipient_name: "",
  purpose: "",
  salary_period: "",
};

function fmt(n: number) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CashPage() {
  const [items, setItems] = useState<CashOperation[]>([]);
  const [totals, setTotals] = useState({ total_income: 0, total_expense: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashOperation | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<"" | OperationType>("");
  const [filterCategory, setFilterCategory] = useState<"" | Category>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (filterCategory) params.category = filterCategory;
    const data = await api.getCash(params);
    setItems(data.items || []);
    setTotals(data.totals || { total_income: 0, total_expense: 0 });
    setLoading(false);
  }

  useEffect(() => { load(); }, [dateFrom, dateTo, filterCategory]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(item: CashOperation) {
    setEditing(item);
    setForm({
      operation_date: item.operation_date,
      operation_type: item.operation_type,
      category: item.category,
      amount: String(item.amount),
      description: item.description || "",
      organization: item.organization || "",
      employee_name: item.employee_name || "",
      loan_term_days: item.loan_term_days ? String(item.loan_term_days) : "",
      monthly_deduction: item.monthly_deduction ? String(item.monthly_deduction) : "",
      recipient_name: item.recipient_name || "",
      purpose: item.purpose || "",
      salary_period: item.salary_period || "",
    });
    setShowForm(true);
  }

  function handleTypeChange(type: OperationType) {
    const defaultCat = type === "income" ? "other_income" : "salary_payment";
    setForm(f => ({ ...f, operation_type: type, category: defaultCat as Category }));
  }

  async function save() {
    if (!form.amount || !form.operation_date || !form.category) return;
    setSaving(true);
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      loan_term_days: form.loan_term_days ? parseInt(form.loan_term_days) : null,
      monthly_deduction: form.monthly_deduction ? parseFloat(form.monthly_deduction) : null,
    };
    if (editing) {
      await api.updateCash(editing.id, payload);
    } else {
      await api.createCash(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Удалить запись?")) return;
    await api.deleteCash(id);
    load();
  }

  const filtered = filterType ? items.filter(i => i.operation_type === filterType) : items;
  const balance = totals.total_income - totals.total_expense;
  const availableCategories =
    form.operation_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">Наличные</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-4 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer"
        >
          <Icon name="Plus" size={15} />
          Добавить операцию
        </button>
      </div>

      {/* Итоги */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Приход</div>
          <div className="text-2xl font-bold text-green-700">+{fmt(Number(totals.total_income))}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">Расход</div>
          <div className="text-2xl font-bold text-red-700">−{fmt(Number(totals.total_expense))}</div>
        </div>
        <div className={`border rounded-lg p-4 ${balance >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
          <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>Остаток</div>
          <div className={`text-2xl font-bold ${balance >= 0 ? "text-blue-700" : "text-orange-700"}`}>
            {balance >= 0 ? "+" : "−"}{fmt(Math.abs(balance))}
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          {(["", "income", "expense"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${filterType === t ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}
            >
              {t === "" ? "Все" : t === "income" ? "Приход" : "Расход"}
            </button>
          ))}
        </div>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as "" | Category)}
          className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer"
        >
          <option value="">Все категории</option>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-sm text-neutral-500">
          <span>с</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-neutral-200 rounded px-2 py-1.5 text-neutral-900" />
          <span>по</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-neutral-200 rounded px-2 py-1.5 text-neutral-900" />
        </div>
        {(dateFrom || dateTo || filterCategory || filterType) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); setFilterCategory(""); setFilterType(""); }}
            className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer flex items-center gap-1">
            <Icon name="X" size={12} /> Сбросить
          </button>
        )}
      </div>

      {/* Список */}
      {loading ? (
        <div className="text-sm text-neutral-400 py-8 text-center">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-neutral-400 py-12 text-center">Операций не найдено</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const isExpanded = expandedId === item.id;
            const isIncome = item.operation_type === "income";
            return (
              <div key={item.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isIncome ? "bg-green-500" : "bg-red-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-900">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      {item.employee_name && (
                        <span className="text-xs text-neutral-500">— {item.employee_name}</span>
                      )}
                      {item.recipient_name && (
                        <span className="text-xs text-neutral-500">— {item.recipient_name}</span>
                      )}
                      {item.salary_period && (
                        <span className="text-xs text-neutral-500">({item.salary_period})</span>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-xs text-neutral-400 mt-0.5 truncate">{item.description}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-bold ${isIncome ? "text-green-600" : "text-red-600"}`}>
                      {isIncome ? "+" : "−"}{fmt(Number(item.amount))} ₽
                    </div>
                    <div className="text-xs text-neutral-400">{item.operation_date}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); openEdit(item); }}
                      className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer text-neutral-400 hover:text-neutral-700 transition-colors">
                      <Icon name="Pencil" size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); remove(item.id); }}
                      className="p-1.5 rounded hover:bg-red-100 cursor-pointer text-neutral-400 hover:text-red-600 transition-colors">
                      <Icon name="Trash2" size={13} />
                    </button>
                    <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-neutral-400" />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-sm grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {item.organization && <div><span className="text-neutral-400">Организация:</span> <span className="text-neutral-700">{item.organization}</span></div>}
                    {item.employee_name && <div><span className="text-neutral-400">Сотрудник:</span> <span className="text-neutral-700">{item.employee_name}</span></div>}
                    {item.loan_term_days && <div><span className="text-neutral-400">Срок займа:</span> <span className="text-neutral-700">{item.loan_term_days} дн.</span></div>}
                    {item.monthly_deduction && <div><span className="text-neutral-400">Удержание в месяц:</span> <span className="text-neutral-700">{fmt(Number(item.monthly_deduction))} ₽</span></div>}
                    {item.recipient_name && <div><span className="text-neutral-400">Получатель:</span> <span className="text-neutral-700">{item.recipient_name}</span></div>}
                    {item.purpose && <div className="col-span-2"><span className="text-neutral-400">На что потрачено:</span> <span className="text-neutral-700">{item.purpose}</span></div>}
                    {item.salary_period && <div><span className="text-neutral-400">Период ЗП:</span> <span className="text-neutral-700">{item.salary_period}</span></div>}
                    {item.description && <div className="col-span-2"><span className="text-neutral-400">Примечание:</span> <span className="text-neutral-700">{item.description}</span></div>}
                    {item.created_by && <div><span className="text-neutral-400">Добавил:</span> <span className="text-neutral-700">{item.created_by}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Форма */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <h2 className="font-semibold text-neutral-900">
                {editing ? "Редактировать операцию" : "Новая операция"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Тип операции */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Тип операции</label>
                <div className="flex gap-2">
                  {(["expense", "income"] as OperationType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => handleTypeChange(t)}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                        form.operation_type === t
                          ? t === "income"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-red-600 text-white border-red-600"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {t === "income" ? "Приход" : "Расход"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Категория */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Категория *</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                >
                  {availableCategories.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              {/* Сумма и дата */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Сумма, ₽ *</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Дата *</label>
                  <input
                    type="date"
                    value={form.operation_date}
                    onChange={e => setForm(f => ({ ...f, operation_date: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Организация */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Организация</label>
                <input
                  type="text" value={form.organization}
                  onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                  placeholder="Название организации"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Займ */}
              {form.category === "loan" && (
                <div className="space-y-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Параметры займа</div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">Сотрудник</label>
                    <input type="text" value={form.employee_name}
                      onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))}
                      placeholder="ФИО сотрудника"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1.5">Срок (дней)</label>
                      <input type="number" min="1" value={form.loan_term_days}
                        onChange={e => setForm(f => ({ ...f, loan_term_days: e.target.value }))}
                        placeholder="30"
                        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1.5">Удержание в мес, ₽</label>
                      <input type="number" min="0" step="0.01" value={form.monthly_deduction}
                        onChange={e => setForm(f => ({ ...f, monthly_deduction: e.target.value }))}
                        placeholder="0.00"
                        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Зарплата */}
              {form.category === "salary_payment" && (
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Период ЗП</label>
                  <input type="text" value={form.salary_period}
                    onChange={e => setForm(f => ({ ...f, salary_period: e.target.value }))}
                    placeholder="Апрель 2026"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              {/* Хозрасходы */}
              {form.category === "household" && (
                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Хозяйственные расходы</div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">Кто получил</label>
                    <input type="text" value={form.recipient_name}
                      onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                      placeholder="ФИО получателя"
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1.5">На какие нужды</label>
                    <textarea value={form.purpose}
                      onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                      placeholder="Опишите на что израсходованы средства"
                      rows={2}
                      className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white resize-none" />
                  </div>
                </div>
              )}

              {/* Примечание */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Примечание</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Дополнительная информация"
                  rows={2}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-neutral-200">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-colors">
                Отмена
              </button>
              <button onClick={save} disabled={saving || !form.amount || !form.operation_date}
                className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
                {saving ? "Сохранение..." : editing ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
