import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";

// ---- Типы ----
type AccTab = "overview" | "bank" | "taxes" | "creditors" | "upcoming" | "leasing";

interface BankTransaction {
  id: number; transaction_date: string; direction: "debit" | "credit";
  amount: number; counterparty?: string; counterparty_inn?: string;
  category: string; purpose?: string; account_number?: string;
  bank_name?: string; document_number?: string; organization?: string;
  source: string; notes?: string;
}
interface BankSummary { items: BankTransaction[]; totals: { total_credit: number; total_debit: number }; by_counterparty: { counterparty: string; category: string; debit_sum: number; debit_count: number }[]; }

interface TaxPayment {
  id: number; payment_date?: string; due_date: string; tax_type: string;
  period_year?: number; period_month?: number; accrued_amount: number;
  paid_amount: number; status: string; ens_balance?: number; organization?: string; notes?: string;
}
interface Creditor {
  id: number; counterparty: string; counterparty_inn?: string; debt_type: string;
  contract_number?: string; contract_date?: string; original_amount?: number;
  current_debt: number; overdue_amount: number; last_payment_date?: string;
  next_payment_date?: string; next_payment_amount?: number; organization?: string; notes?: string;
}
interface UpcomingPayment {
  id: number; due_date: string; payment_type: string; counterparty?: string;
  description: string; planned_amount: number; paid_amount: number;
  status: string; is_recurring: boolean; recur_day?: number; organization?: string; notify_days_before: number;
}
interface LeasingContract {
  id: number; lessor: string; contract_number?: string; contract_date?: string;
  object_description?: string; bus_id?: number; total_amount?: number;
  monthly_payment?: number; payment_day?: number; start_date?: string; end_date?: string;
  payments_total?: number; payments_made: number; payments_remaining?: number;
  remaining_debt?: number; organization?: string; is_active: boolean; notes?: string;
}

// ---- Константы ----
const TX_CATEGORY_LABELS: Record<string, string> = {
  supplier: "Поставщик", leasing: "Лизинг", utilities: "Коммунальные",
  tax: "Налоги/ЕНС", salary: "Зарплата", loan: "Кредит/заём", other: "Прочее",
};
const TX_CATEGORY_COLORS: Record<string, string> = {
  supplier: "bg-blue-50 text-blue-700", leasing: "bg-purple-50 text-purple-700",
  utilities: "bg-cyan-50 text-cyan-700", tax: "bg-red-50 text-red-700",
  salary: "bg-green-50 text-green-700", loan: "bg-orange-50 text-orange-700",
  other: "bg-neutral-100 text-neutral-600",
};
const TAX_STATUS_LABELS: Record<string, string> = { pending: "К оплате", partial: "Частично", paid: "Оплачен", overdue: "Просрочен" };
const TAX_STATUS_COLORS: Record<string, string> = { pending: "bg-yellow-50 text-yellow-700", partial: "bg-orange-50 text-orange-700", paid: "bg-green-50 text-green-700", overdue: "bg-red-50 text-red-700" };
const DEBT_TYPE_LABELS: Record<string, string> = { supplier: "Поставщик", leasing: "Лизинг", loan: "Кредит", other: "Прочее" };
const PAYMENT_TYPE_LABELS: Record<string, string> = { tax: "Налог", leasing: "Лизинг", supplier: "Поставщик", salary: "Зарплата", utilities: "Коммунальные", loan: "Кредит", other: "Прочее" };
const UPCOMING_STATUS_COLORS: Record<string, string> = { planned: "bg-blue-50 text-blue-700", paid: "bg-green-50 text-green-700", partial: "bg-orange-50 text-orange-700", cancelled: "bg-neutral-100 text-neutral-500" };
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

function fmt(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
}

// ---- Обзор (дашборд) ----
function OverviewTab() {
  const [taxData, setTaxData] = useState<{ upcoming: TaxPayment[]; totals: { total_accrued: number; total_paid: number; total_debt: number } } | null>(null);
  const [upcomingData, setUpcomingData] = useState<{ items: UpcomingPayment[]; overdue: UpcomingPayment[]; total_planned: number } | null>(null);
  const [credData, setCredData] = useState<{ totals: { total_debt: number; total_overdue: number } } | null>(null);
  const [leasingData, setLeasingData] = useState<{ totals: { total_remaining: number; total_monthly: number } } | null>(null);

  useEffect(() => {
    api.getTaxPayments({}).then(r => setTaxData(r));
    api.getUpcomingPayments({ days_ahead: "14" }).then(r => setUpcomingData(r));
    api.getCreditors({}).then(r => setCredData(r));
    api.getLeasingContracts({}).then(r => setLeasingData(r));
  }, []);

  const urgentTaxes = taxData?.upcoming?.filter(t => {
    const d = daysUntil(t.due_date);
    return d != null && d <= 7;
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Алерты */}
      {(urgentTaxes.length > 0 || (upcomingData?.overdue?.length ?? 0) > 0) && (
        <div className="space-y-2">
          {urgentTaxes.map(t => (
            <div key={t.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <Icon name="AlertTriangle" size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold text-red-800">{t.tax_type}</span>
                <span className="text-red-600"> — срок {fmtDate(t.due_date)}, к оплате {fmt(t.accrued_amount - t.paid_amount)} ₽</span>
              </div>
            </div>
          ))}
          {upcomingData?.overdue?.map(p => (
            <div key={p.id} className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <Icon name="Clock" size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold text-orange-800">Просрочен: {p.description}</span>
                <span className="text-orange-600"> — {fmt(p.planned_amount - p.paid_amount)} ₽ (срок был {fmtDate(p.due_date)})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Сводные карточки */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Icon name="Receipt" size={16} /> Налоги и ЕНС
          </div>
          {taxData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Начислено</span><span className="font-medium">{fmt(taxData.totals.total_accrued)} ₽</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Оплачено</span><span className="font-medium text-green-600">{fmt(taxData.totals.total_paid)} ₽</span></div>
              <div className="flex justify-between text-sm border-t border-neutral-100 pt-1.5"><span className="text-neutral-500">Остаток к оплате</span><span className="font-bold text-red-600">{fmt(taxData.totals.total_debt)} ₽</span></div>
            </div>
          ) : <div className="text-xs text-neutral-400">Загрузка...</div>}
        </div>

        <div className="border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Icon name="AlertCircle" size={16} /> Кредиторская задолженность
          </div>
          {credData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Общий долг</span><span className="font-bold text-neutral-900">{fmt(credData.totals.total_debt)} ₽</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Просрочено</span><span className={`font-bold ${Number(credData.totals.total_overdue) > 0 ? "text-red-600" : "text-neutral-400"}`}>{fmt(credData.totals.total_overdue)} ₽</span></div>
            </div>
          ) : <div className="text-xs text-neutral-400">Загрузка...</div>}
        </div>

        <div className="border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Icon name="CalendarClock" size={16} /> Предстоящие платежи (14 дней)
          </div>
          {upcomingData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Запланировано</span><span className="font-bold text-blue-700">{fmt(upcomingData.total_planned)} ₽</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Позиций</span><span className="font-medium">{upcomingData.items.length} шт.</span></div>
            </div>
          ) : <div className="text-xs text-neutral-400">Загрузка...</div>}
        </div>

        <div className="border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Icon name="Car" size={16} /> Лизинг
          </div>
          {leasingData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Остаток долга</span><span className="font-bold text-neutral-900">{fmt(leasingData.totals.total_remaining)} ₽</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Ежемесячный платёж</span><span className="font-medium text-purple-600">{fmt(leasingData.totals.total_monthly)} ₽</span></div>
            </div>
          ) : <div className="text-xs text-neutral-400">Загрузка...</div>}
        </div>
      </div>

      {/* Ближайшие платежи */}
      {(upcomingData?.items?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">Ближайшие платежи</h3>
          <div className="space-y-1.5">
            {upcomingData!.items.slice(0, 8).map(p => {
              const days = daysUntil(p.due_date);
              return (
                <div key={p.id} className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2.5">
                  <div className={`text-xs font-medium px-2 py-0.5 rounded ${days != null && days <= 3 ? "bg-red-100 text-red-700" : days != null && days <= 7 ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                    {days != null && days >= 0 ? `${days} дн.` : "сегодня"}
                  </div>
                  <div className="flex-1 text-sm text-neutral-800">{p.description}</div>
                  <div className="text-xs text-neutral-400">{fmtDate(p.due_date)}</div>
                  <div className="text-sm font-semibold text-neutral-900">{fmt(p.planned_amount - p.paid_amount)} ₽</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Импорт CSV из 1С ----
interface CsvImportProps { onImported: () => void; }

function CsvImport({ onImported }: CsvImportProps) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [allRows, setAllRows] = useState<object[]>([]);
  const [preview, setPreview] = useState<object[]>([]);
  const [error, setError] = useState("");
  const [batchId] = useState(() => `1c_${Date.now()}`);

  function parseCsv(text: string): object[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const rows: object[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
      rows.push(row);
    }
    return rows;
  }

  function mapRow(row: Record<string, string>): Record<string, unknown> | null {
    const dateRaw = row["дата"] || row["date"] || row["дата операции"] || row["дата платежа"] || "";
    const amountRaw = row["сумма"] || row["amount"] || row["сумма операции"] || "";
    if (!dateRaw || !amountRaw) return null;

    let txDate = "";
    if (dateRaw.includes(".")) {
      const [d, m, y] = dateRaw.split(".");
      txDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else {
      txDate = dateRaw.slice(0, 10);
    }

    const amount = parseFloat(amountRaw.replace(/\s/g, "").replace(",", "."));
    if (!amount || isNaN(amount)) return null;

    const debitRaw = row["дебет"] || row["расход"] || row["списание"] || "";
    const creditRaw = row["кредит"] || row["приход"] || row["поступление"] || "";
    let direction = "debit";
    if (creditRaw && parseFloat(creditRaw.replace(/\s/g, "").replace(",", ".")) > 0) direction = "credit";
    if (debitRaw && parseFloat(debitRaw.replace(/\s/g, "").replace(",", ".")) > 0) direction = "debit";

    const counterparty = row["контрагент"] || row["получатель"] || row["плательщик"] || row["организация"] || "";
    const purpose = row["назначение платежа"] || row["назначение"] || row["основание"] || "";
    const inn = row["инн"] || row["инн контрагента"] || "";
    const docNum = row["номер документа"] || row["номер п/п"] || row["документ"] || "";

    let category = "other";
    const p = purpose.toLowerCase() + " " + counterparty.toLowerCase();
    if (p.includes("лизинг") || p.includes("leasing")) category = "leasing";
    else if (p.includes("ндс") || p.includes("налог") || p.includes("енс") || p.includes("ифнс") || p.includes("фнс")) category = "tax";
    else if (p.includes("зарплат") || p.includes("оклад") || p.includes("ндфл")) category = "salary";
    else if (p.includes("коммунал") || p.includes("электро") || p.includes("вода") || p.includes("газ")) category = "utilities";
    else if (p.includes("кредит") || p.includes("займ") || p.includes("банк")) category = "loan";
    else if (counterparty) category = "supplier";

    return {
      transaction_date: txDate,
      direction,
      amount: Math.abs(amount),
      counterparty: counterparty || null,
      counterparty_inn: inn || null,
      category,
      purpose: purpose || null,
      document_number: docNum || null,
      source: "import_1c",
      import_batch: batchId,
      created_by: user?.full_name || null,
    };
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setAllRows([]);
    setPreview([]);
    const text = await file.text();
    const rows = parseCsv(text);
    const mapped = rows.map(r => mapRow(r as Record<string, string>)).filter(Boolean) as object[];
    if (mapped.length === 0) {
      setError("Не удалось распознать данные. Проверьте формат файла.");
      return;
    }
    setAllRows(mapped);
    setPreview(mapped.slice(0, 5));
  }

  async function doImport() {
    if (!allRows.length) return;
    setImporting(true);
    setImportProgress(0);
    for (let i = 0; i < allRows.length; i++) {
      await api.createBankTransaction(allRows[i] as object);
      setImportProgress(Math.round(((i + 1) / allRows.length) * 100));
    }
    setImporting(false);
    setShow(false);
    setAllRows([]);
    setPreview([]);
    onImported();
  }

  function handleClose() {
    if (importing) return;
    setShow(false);
    setAllRows([]);
    setPreview([]);
    setError("");
  }

  return (
    <>
      <button onClick={() => setShow(true)}
        className="flex items-center gap-2 border border-purple-200 bg-purple-50 text-purple-700 text-sm px-3 py-2 rounded hover:bg-purple-100 cursor-pointer transition-colors">
        <Icon name="Upload" size={14} /> Импорт из 1С (CSV)
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={handleClose}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-neutral-900">Импорт выписки из 1С</h2>
              <button onClick={handleClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18} /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700 space-y-1">
                <div className="font-semibold">Формат файла CSV из 1С:</div>
                <div>Обязательные столбцы: <span className="font-mono">Дата, Сумма</span></div>
                <div>Рекомендуемые: <span className="font-mono">Контрагент, Назначение платежа, ИНН, Номер документа, Дебет/Кредит</span></div>
                <div>Разделитель: точка с запятой (;) или запятая (,)</div>
                <div>Категории определяются автоматически по назначению платежа</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">Выберите файл CSV</label>
                <input type="file" accept=".csv,.txt" onChange={handleFile}
                  className="block w-full text-sm text-neutral-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-neutral-900 file:text-white file:text-sm file:cursor-pointer hover:file:bg-neutral-700" />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <Icon name="AlertCircle" size={14} /> {error}
                </div>
              )}

              {allRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-600">
                      Найдено строк: <span className="font-bold text-neutral-900">{allRows.length}</span>
                    </span>
                    <span className="text-xs text-neutral-400">Предпросмотр первых 5</span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {(preview as Record<string, unknown>[]).map((r, i) => (
                      <div key={i} className="text-xs bg-neutral-50 border border-neutral-200 rounded px-3 py-2 grid grid-cols-3 gap-2">
                        <span className="text-neutral-500">{String(r.transaction_date)}</span>
                        <span className={`font-medium ${r.direction === "credit" ? "text-green-600" : "text-red-600"}`}>
                          {r.direction === "credit" ? "+" : "-"}{Number(r.amount).toLocaleString("ru-RU")} ₽
                        </span>
                        <span className="text-neutral-700 truncate">{String(r.counterparty || r.purpose || "—")}</span>
                      </div>
                    ))}
                    {allRows.length > 5 && (
                      <div className="text-xs text-neutral-400 text-center py-1">
                        ... и ещё {allRows.length - 5} строк
                      </div>
                    )}
                  </div>
                </div>
              )}

              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>Импортирую...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${importProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={handleClose} disabled={importing}
                className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer disabled:opacity-50">
                Отмена
              </button>
              <button onClick={doImport} disabled={importing || allRows.length === 0}
                className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">
                {importing ? `Импортирую... ${importProgress}%` : `Импортировать ${allRows.length} строк`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---- Банковские транзакции ----
function BankTab() {
  const { user } = useAuth();
  const [data, setData] = useState<BankSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0,10));
  const [filterCat, setFilterCat] = useState("");
  const [filterDir, setFilterDir] = useState("");
  const [view, setView] = useState<"list"|"counterparty">("list");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BankTransaction | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({ transaction_date: new Date().toISOString().slice(0,10), direction:"debit", amount:"", counterparty:"", counterparty_inn:"", category:"other", purpose:"", account_number:"", bank_name:"", document_number:"", organization:"", notes:"" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string,string> = { date_from: dateFrom, date_to: dateTo };
    if (filterCat) params.category = filterCat;
    if (filterDir) params.direction = filterDir;
    const r = await api.getBankTransactions(params);
    setData(r);
    setLoading(false);
  }, [dateFrom, dateTo, filterCat, filterDir]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ transaction_date: new Date().toISOString().slice(0,10), direction:"debit", amount:"", counterparty:"", counterparty_inn:"", category:"other", purpose:"", account_number:"", bank_name:"", document_number:"", organization:"", notes:"" }); setShowForm(true); }
  function openEdit(t: BankTransaction) { setEditing(t); setForm({ transaction_date: t.transaction_date, direction: t.direction, amount: String(t.amount), counterparty: t.counterparty||"", counterparty_inn: t.counterparty_inn||"", category: t.category, purpose: t.purpose||"", account_number: t.account_number||"", bank_name: t.bank_name||"", document_number: t.document_number||"", organization: t.organization||"", notes: t.notes||"" }); setShowForm(true); }

  async function save() {
    setSaving(true);
    const payload = { ...form, amount: parseFloat(form.amount) || 0, created_by: user?.full_name || null };
    if (editing) { await api.updateBankTransaction(editing.id, payload); }
    else { await api.createBankTransaction(payload); }
    setSaving(false); setShowForm(false); load();
  }
  async function del(id: number) { if (!confirm("Удалить транзакцию?")) return; await api.deleteBankTransaction(id); load(); }

  const balance = (Number(data?.totals.total_credit)||0) - (Number(data?.totals.total_debit)||0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={openCreate} className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 cursor-pointer transition-colors">
          <Icon name="Plus" size={14}/> Добавить
        </button>
        <CsvImport onImported={load} />
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span>с</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border border-neutral-200 rounded px-2 py-1.5 text-sm"/>
          <span>по</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="border border-neutral-200 rounded px-2 py-1.5 text-sm"/>
        </div>
        <select value={filterDir} onChange={e=>setFilterDir(e.target.value)} className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer">
          <option value="">Все операции</option>
          <option value="debit">Расход</option>
          <option value="credit">Приход</option>
        </select>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer">
          <option value="">Все категории</option>
          {Object.entries(TX_CATEGORY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5 ml-auto">
          {(["list","counterparty"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${view===v?"bg-white text-neutral-900 shadow-sm font-medium":"text-neutral-500 hover:text-neutral-700"}`}>
              {v==="list"?"Список":"По поставщикам"}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3"><div className="text-xs text-green-600 font-medium mb-1">Приход</div><div className="text-lg font-bold text-green-700">+{fmt(data.totals.total_credit)} ₽</div></div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3"><div className="text-xs text-red-600 font-medium mb-1">Расход</div><div className="text-lg font-bold text-red-700">−{fmt(data.totals.total_debit)} ₽</div></div>
          <div className={`border rounded-lg p-3 ${balance>=0?"bg-blue-50 border-blue-200":"bg-orange-50 border-orange-200"}`}><div className={`text-xs font-medium mb-1 ${balance>=0?"text-blue-600":"text-orange-600"}`}>Баланс</div><div className={`text-lg font-bold ${balance>=0?"text-blue-700":"text-orange-700"}`}>{balance>=0?"+":"-"}{fmt(Math.abs(balance))} ₽</div></div>
        </div>
      )}

      {loading ? <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div> : view === "counterparty" ? (
        <div className="space-y-1.5">
          {(data?.by_counterparty ?? []).map((cp, i) => (
            <div key={i} className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2.5">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TX_CATEGORY_COLORS[cp.category]||TX_CATEGORY_COLORS.other}`}>{TX_CATEGORY_LABELS[cp.category]||cp.category}</span>
              <span className="flex-1 text-sm text-neutral-800 truncate">{cp.counterparty}</span>
              <span className="text-xs text-neutral-400">{cp.debit_count} оп.</span>
              <span className="text-sm font-bold text-red-600">{fmt(cp.debit_sum)} ₽</span>
            </div>
          ))}
          {(data?.by_counterparty ?? []).length === 0 && <div className="text-sm text-neutral-400 text-center py-8">Нет данных</div>}
        </div>
      ) : (
        <div className="space-y-1.5">
          {(data?.items ?? []).map(t => {
            const exp = expandedId === t.id;
            return (
              <div key={t.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-neutral-50 transition-colors" onClick={()=>setExpandedId(exp?null:t.id)}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${t.direction==="credit"?"bg-green-500":"bg-red-500"}`}/>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${TX_CATEGORY_COLORS[t.category]||TX_CATEGORY_COLORS.other}`}>{TX_CATEGORY_LABELS[t.category]||t.category}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-800 truncate">{t.counterparty || t.purpose || "—"}</div>
                    {t.document_number && <div className="text-xs text-neutral-400">№ {t.document_number}</div>}
                  </div>
                  <div className="text-xs text-neutral-400 shrink-0">{fmtDate(t.transaction_date)}</div>
                  <div className={`text-sm font-bold shrink-0 ${t.direction==="credit"?"text-green-600":"text-red-600"}`}>{t.direction==="credit"?"+":"−"}{fmt(t.amount)} ₽</div>
                  <div className="flex gap-1 shrink-0" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>openEdit(t)} className="p-1 rounded hover:bg-neutral-200 cursor-pointer text-neutral-400 hover:text-neutral-700"><Icon name="Pencil" size={12}/></button>
                    <button onClick={()=>del(t.id)} className="p-1 rounded hover:bg-red-100 cursor-pointer text-neutral-400 hover:text-red-500"><Icon name="Trash2" size={12}/></button>
                  </div>
                  <Icon name={exp?"ChevronUp":"ChevronDown"} size={13} className="text-neutral-400 shrink-0"/>
                </div>
                {exp && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    {t.purpose && <div className="col-span-2"><span className="text-neutral-400">Назначение:</span> <span className="text-neutral-700">{t.purpose}</span></div>}
                    {t.counterparty_inn && <div><span className="text-neutral-400">ИНН:</span> <span className="text-neutral-700">{t.counterparty_inn}</span></div>}
                    {t.bank_name && <div><span className="text-neutral-400">Банк:</span> <span className="text-neutral-700">{t.bank_name}</span></div>}
                    {t.account_number && <div><span className="text-neutral-400">Счёт:</span> <span className="text-neutral-700 font-mono text-xs">{t.account_number}</span></div>}
                    {t.organization && <div><span className="text-neutral-400">Организация:</span> <span className="text-neutral-700">{t.organization}</span></div>}
                    <div><span className="text-neutral-400">Источник:</span> <span className="text-neutral-700">{t.source === "import_1c" ? "Импорт 1С" : "Ручной ввод"}</span></div>
                    {t.notes && <div className="col-span-2"><span className="text-neutral-400">Примечание:</span> <span className="text-neutral-700">{t.notes}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
          {(data?.items ?? []).length === 0 && !loading && <div className="text-sm text-neutral-400 text-center py-8">Нет данных за период</div>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <h2 className="font-semibold text-neutral-900">{editing?"Редактировать":"Новая транзакция"}</h2>
              <button onClick={()=>setShowForm(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18}/></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Направление</label>
                  <div className="flex gap-2">
                    {[{v:"debit",l:"Расход"},{v:"credit",l:"Приход"}].map(o=>(
                      <button key={o.v} onClick={()=>setForm(f=>({...f,direction:o.v}))} className={`flex-1 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors ${form.direction===o.v?(o.v==="debit"?"bg-red-600 text-white border-red-600":"bg-green-600 text-white border-green-600"):"border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}>{o.l}</button>
                    ))}
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Дата</label>
                  <input type="date" value={form.transaction_date} onChange={e=>setForm(f=>({...f,transaction_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Сумма, ₽ *</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Категория</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                    {Object.entries(TX_CATEGORY_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Контрагент</label>
                  <input value={form.counterparty} onChange={e=>setForm(f=>({...f,counterparty:e.target.value}))} placeholder="Наименование организации" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">ИНН контрагента</label>
                  <input value={form.counterparty_inn} onChange={e=>setForm(f=>({...f,counterparty_inn:e.target.value}))} placeholder="ИНН" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">№ документа</label>
                  <input value={form.document_number} onChange={e=>setForm(f=>({...f,document_number:e.target.value}))} placeholder="Номер п/п" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Назначение платежа</label>
                  <textarea value={form.purpose} onChange={e=>setForm(f=>({...f,purpose:e.target.value}))} rows={2} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Назначение из банка / 1С"/>
                </div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Организация</label>
                  <input value={form.organization} onChange={e=>setForm(f=>({...f,organization:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Банк</label>
                  <input value={form.bank_name} onChange={e=>setForm(f=>({...f,bank_name:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-neutral-200">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer">Отмена</button>
              <button onClick={save} disabled={saving||!form.amount} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">{saving?"Сохранение...":editing?"Сохранить":"Добавить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Налоги и ЕНС ----
function TaxesTab() {
  const { user } = useAuth();
  const [data, setData] = useState<{ items: TaxPayment[]; totals: { total_accrued: number; total_paid: number; total_debt: number }; upcoming: TaxPayment[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaxPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ due_date:"", payment_date:"", tax_type:"", period_year:String(new Date().getFullYear()), period_month:"", accrued_amount:"", paid_amount:"0", status:"pending", ens_balance:"", organization:"", notes:"" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.getTaxPayments(filterYear ? { year: filterYear } : {});
    setData(r); setLoading(false);
  }, [filterYear]);

  useEffect(() => { load(); }, [load]);

  function openEdit(t: TaxPayment) {
    setEditing(t);
    setForm({ due_date: t.due_date, payment_date: t.payment_date||"", tax_type: t.tax_type, period_year: t.period_year?String(t.period_year):"", period_month: t.period_month?String(t.period_month):"", accrued_amount: String(t.accrued_amount), paid_amount: String(t.paid_amount), status: t.status, ens_balance: t.ens_balance!=null?String(t.ens_balance):"", organization: t.organization||"", notes: t.notes||"" });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    const p = { ...form, accrued_amount: parseFloat(form.accrued_amount)||0, paid_amount: parseFloat(form.paid_amount)||0, ens_balance: form.ens_balance?parseFloat(form.ens_balance):null, period_year: form.period_year?parseInt(form.period_year):null, period_month: form.period_month?parseInt(form.period_month):null, created_by: user?.full_name||null, payment_date: form.payment_date||null };
    if (editing) { await api.updateTaxPayment(editing.id, p); } else { await api.createTaxPayment(p); }
    setSaving(false); setShowForm(false); load();
  }
  async function del(id: number) { if (!confirm("Удалить запись?")) return; await api.deleteTaxPayment(id); load(); }

  const years = Array.from({length:4},(_,i)=>String(new Date().getFullYear()-i));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={()=>{setEditing(null);setForm({due_date:"",payment_date:"",tax_type:"",period_year:String(new Date().getFullYear()),period_month:"",accrued_amount:"",paid_amount:"0",status:"pending",ens_balance:"",organization:"",notes:""});setShowForm(true);}} className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 cursor-pointer transition-colors"><Icon name="Plus" size={14}/>Добавить</button>
        <select value={filterYear} onChange={e=>setFilterYear(e.target.value)} className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer">
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3"><div className="text-xs text-neutral-500 mb-1">Начислено</div><div className="text-lg font-bold text-neutral-900">{fmt(data.totals.total_accrued)} ₽</div></div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3"><div className="text-xs text-green-600 mb-1">Оплачено</div><div className="text-lg font-bold text-green-700">{fmt(data.totals.total_paid)} ₽</div></div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3"><div className="text-xs text-red-600 mb-1">К оплате</div><div className="text-lg font-bold text-red-700">{fmt(data.totals.total_debt)} ₽</div></div>
        </div>
      )}

      {loading ? <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div> : (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-neutral-50 text-xs text-neutral-500 border-b border-neutral-200">
              <th className="px-4 py-2.5 text-left font-medium">Налог</th>
              <th className="px-4 py-2.5 text-left font-medium">Период</th>
              <th className="px-4 py-2.5 text-left font-medium">Срок</th>
              <th className="px-4 py-2.5 text-right font-medium">Начислено</th>
              <th className="px-4 py-2.5 text-right font-medium">Оплачено</th>
              <th className="px-4 py-2.5 text-right font-medium">Остаток</th>
              <th className="px-4 py-2.5 text-center font-medium">Статус</th>
              <th className="px-3 py-2.5"/>
            </tr></thead>
            <tbody>
              {(data?.items ?? []).map(t => {
                const days = daysUntil(t.due_date);
                const debt = Number(t.accrued_amount) - Number(t.paid_amount);
                return (
                  <tr key={t.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium text-neutral-900">{t.tax_type}</td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">{t.period_year && t.period_month ? `${MONTHS[t.period_month-1]} ${t.period_year}` : t.period_year || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-neutral-700">{fmtDate(t.due_date)}</div>
                      {days != null && days >= 0 && days <= 14 && t.status !== "paid" && <div className={`text-xs ${days<=3?"text-red-500":"text-orange-500"}`}>{days===0?"Сегодня":`Через ${days} дн.`}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{fmt(t.accrued_amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-green-600">{fmt(t.paid_amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{debt > 0 ? <span className="text-red-600">{fmt(debt)}</span> : <span className="text-neutral-400">—</span>}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded font-medium ${TAX_STATUS_COLORS[t.status]||""}`}>{TAX_STATUS_LABELS[t.status]||t.status}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button onClick={()=>openEdit(t)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer mr-2"><Icon name="Pencil" size={13}/></button>
                      <button onClick={()=>del(t.id)} className="text-neutral-400 hover:text-red-500 cursor-pointer"><Icon name="Trash2" size={13}/></button>
                    </td>
                  </tr>
                );
              })}
              {(data?.items ?? []).length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-400 text-sm">Нет записей</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-semibold text-neutral-900">{editing?"Редактировать":"Новый налоговый платёж"}</h2><button onClick={()=>setShowForm(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18}/></button></div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Вид налога *</label><input value={form.tax_type} onChange={e=>setForm(f=>({...f,tax_type:e.target.value}))} placeholder="НДС, НДФЛ, ЕНС..." className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Год</label><input type="number" value={form.period_year} onChange={e=>setForm(f=>({...f,period_year:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Месяц</label><select value={form.period_month} onChange={e=>setForm(f=>({...f,period_month:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"><option value="">—</option>{MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Срок уплаты *</label><input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Дата оплаты</label><input type="date" value={form.payment_date} onChange={e=>setForm(f=>({...f,payment_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Начислено, ₽</label><input type="number" value={form.accrued_amount} onChange={e=>setForm(f=>({...f,accrued_amount:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Оплачено, ₽</label><input type="number" value={form.paid_amount} onChange={e=>setForm(f=>({...f,paid_amount:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Остаток ЕНС, ₽</label><input type="number" value={form.ens_balance} onChange={e=>setForm(f=>({...f,ens_balance:e.target.value}))} placeholder="Баланс ЕНС" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Статус</label><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">{Object.entries(TAX_STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Примечание</label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer">Отмена</button><button onClick={save} disabled={saving||!form.tax_type||!form.due_date} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">{saving?"Сохранение...":editing?"Сохранить":"Добавить"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Кредиторская задолженность ----
function CreditorsTab() {
  const { user } = useAuth();
  const [data, setData] = useState<{ items: Creditor[]; totals: { total_debt: number; total_overdue: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Creditor | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { counterparty:"", counterparty_inn:"", debt_type:"supplier", contract_number:"", contract_date:"", original_amount:"", current_debt:"", overdue_amount:"0", last_payment_date:"", next_payment_date:"", next_payment_amount:"", organization:"", notes:"" };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.getCreditors(showInactive ? { show_inactive:"1" } : {});
    setData(r); setLoading(false);
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  function openEdit(c: Creditor) { setEditing(c); setForm({ counterparty:c.counterparty, counterparty_inn:c.counterparty_inn||"", debt_type:c.debt_type, contract_number:c.contract_number||"", contract_date:c.contract_date||"", original_amount:c.original_amount!=null?String(c.original_amount):"", current_debt:String(c.current_debt), overdue_amount:String(c.overdue_amount), last_payment_date:c.last_payment_date||"", next_payment_date:c.next_payment_date||"", next_payment_amount:c.next_payment_amount!=null?String(c.next_payment_amount):"", organization:c.organization||"", notes:c.notes||"" }); setShowForm(true); }

  async function save() {
    setSaving(true);
    const p = { ...form, original_amount: form.original_amount?parseFloat(form.original_amount):null, current_debt: parseFloat(form.current_debt)||0, overdue_amount: parseFloat(form.overdue_amount)||0, next_payment_amount: form.next_payment_amount?parseFloat(form.next_payment_amount):null, contract_date:form.contract_date||null, last_payment_date:form.last_payment_date||null, next_payment_date:form.next_payment_date||null, is_active:true, created_by:user?.full_name||null };
    if (editing) { await api.updateCreditor(editing.id, p); } else { await api.createCreditor(p); }
    setSaving(false); setShowForm(false); load();
  }
  async function deactivate(id: number) { if (!confirm("Закрыть задолженность?")) return; await api.deleteCreditor(id); load(); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={()=>{setEditing(null);setForm(emptyForm);setShowForm(true);}} className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 cursor-pointer transition-colors"><Icon name="Plus" size={14}/>Добавить</button>
        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer ml-auto"><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)} className="cursor-pointer"/>Показать закрытые</label>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3"><div className="text-xs text-neutral-500 mb-1">Общий долг</div><div className="text-lg font-bold text-neutral-900">{fmt(data.totals.total_debt)} ₽</div></div>
          <div className={`border rounded-lg p-3 ${Number(data.totals.total_overdue)>0?"bg-red-50 border-red-200":"bg-neutral-50 border-neutral-200"}`}><div className={`text-xs mb-1 ${Number(data.totals.total_overdue)>0?"text-red-600":"text-neutral-500"}`}>Просрочено</div><div className={`text-lg font-bold ${Number(data.totals.total_overdue)>0?"text-red-700":"text-neutral-400"}`}>{fmt(data.totals.total_overdue)} ₽</div></div>
        </div>
      )}

      {loading ? <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div> : (
        <div className="space-y-2">
          {(data?.items ?? []).map(c => {
            const days = daysUntil(c.next_payment_date);
            return (
              <div key={c.id} className={`border rounded-lg px-4 py-3 flex items-start gap-4 ${Number(c.overdue_amount)>0?"border-red-200 bg-red-50/40":"border-neutral-200"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-neutral-900 text-sm">{c.counterparty}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600`}>{DEBT_TYPE_LABELS[c.debt_type]||c.debt_type}</span>
                    {c.counterparty_inn && <span className="text-xs text-neutral-400">ИНН: {c.counterparty_inn}</span>}
                  </div>
                  {c.contract_number && <div className="text-xs text-neutral-400 mt-0.5">Договор: {c.contract_number}{c.contract_date ? ` от ${fmtDate(c.contract_date)}` : ""}</div>}
                  {c.next_payment_date && <div className={`text-xs mt-1 ${days!=null&&days<=7?"text-orange-600 font-medium":"text-neutral-500"}`}>Следующий платёж: {fmtDate(c.next_payment_date)}{c.next_payment_amount!=null?` — ${fmt(c.next_payment_amount)} ₽`:""}{days!=null&&days>=0&&days<=14?` (через ${days} дн.)`:"" }</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-neutral-900">{fmt(c.current_debt)} ₽</div>
                  {Number(c.overdue_amount)>0 && <div className="text-xs font-semibold text-red-600">просрочено: {fmt(c.overdue_amount)} ₽</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={()=>openEdit(c)} className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer text-neutral-400 hover:text-neutral-700"><Icon name="Pencil" size={13}/></button>
                  <button onClick={()=>deactivate(c.id)} className="p-1.5 rounded hover:bg-green-100 cursor-pointer text-neutral-400 hover:text-green-600" title="Закрыть"><Icon name="CheckCircle2" size={13}/></button>
                </div>
              </div>
            );
          })}
          {(data?.items ?? []).length === 0 && <div className="text-sm text-neutral-400 text-center py-8">Задолженностей нет</div>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-semibold text-neutral-900">{editing?"Редактировать":"Новая задолженность"}</h2><button onClick={()=>setShowForm(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18}/></button></div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Контрагент *</label><input value={form.counterparty} onChange={e=>setForm(f=>({...f,counterparty:e.target.value}))} placeholder="Наименование организации" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">ИНН</label><input value={form.counterparty_inn} onChange={e=>setForm(f=>({...f,counterparty_inn:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Тип долга</label><select value={form.debt_type} onChange={e=>setForm(f=>({...f,debt_type:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">{Object.entries(DEBT_TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">№ договора</label><input value={form.contract_number} onChange={e=>setForm(f=>({...f,contract_number:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Дата договора</label><input type="date" value={form.contract_date} onChange={e=>setForm(f=>({...f,contract_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Текущий долг, ₽ *</label><input type="number" value={form.current_debt} onChange={e=>setForm(f=>({...f,current_debt:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Просрочено, ₽</label><input type="number" value={form.overdue_amount} onChange={e=>setForm(f=>({...f,overdue_amount:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Дата след. платежа</label><input type="date" value={form.next_payment_date} onChange={e=>setForm(f=>({...f,next_payment_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Сумма след. платежа</label><input type="number" value={form.next_payment_amount} onChange={e=>setForm(f=>({...f,next_payment_amount:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Примечание</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none"/></div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer">Отмена</button><button onClick={save} disabled={saving||!form.counterparty||!form.current_debt} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">{saving?"Сохранение...":editing?"Сохранить":"Добавить"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Предстоящие платежи ----
function UpcomingTab() {
  const { user } = useAuth();
  const [data, setData] = useState<{ items: UpcomingPayment[]; overdue: UpcomingPayment[]; total_planned: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [daysAhead, setDaysAhead] = useState("30");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UpcomingPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const ef = { due_date:"", payment_type:"other", counterparty:"", description:"", planned_amount:"", paid_amount:"0", status:"planned", is_recurring:false, recur_day:"", organization:"", notify_days_before:"5" };
  const [form, setForm] = useState(ef);

  const load = useCallback(async () => { setLoading(true); const r = await api.getUpcomingPayments({ days_ahead: daysAhead }); setData(r); setLoading(false); }, [daysAhead]);
  useEffect(() => { load(); }, [load]);

  function openEdit(p: UpcomingPayment) { setEditing(p); setForm({ due_date:p.due_date, payment_type:p.payment_type, counterparty:p.counterparty||"", description:p.description, planned_amount:String(p.planned_amount), paid_amount:String(p.paid_amount), status:p.status, is_recurring:p.is_recurring, recur_day:p.recur_day?String(p.recur_day):"", organization:p.organization||"", notify_days_before:String(p.notify_days_before) }); setShowForm(true); }

  async function save() {
    setSaving(true);
    const p = { ...form, planned_amount:parseFloat(form.planned_amount)||0, paid_amount:parseFloat(form.paid_amount)||0, notify_days_before:parseInt(form.notify_days_before)||5, recur_day:form.recur_day?parseInt(form.recur_day):null, created_by:user?.full_name||null };
    if (editing) { await api.updateUpcomingPayment(editing.id, p); } else { await api.createUpcomingPayment(p); }
    setSaving(false); setShowForm(false); load();
  }
  async function markPaid(p: UpcomingPayment) { await api.updateUpcomingPayment(p.id, { ...p, status:"paid", paid_amount:p.planned_amount }); load(); }
  async function cancel(id: number) { if (!confirm("Отменить платёж?")) return; await api.deleteUpcomingPayment(id); load(); }

  const allItems = [...(data?.overdue ?? []), ...(data?.items ?? [])];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={()=>{setEditing(null);setForm(ef);setShowForm(true);}} className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 cursor-pointer transition-colors"><Icon name="Plus" size={14}/>Добавить</button>
        <select value={daysAhead} onChange={e=>setDaysAhead(e.target.value)} className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer">
          <option value="7">7 дней</option><option value="14">14 дней</option><option value="30">30 дней</option><option value="60">60 дней</option><option value="90">90 дней</option>
        </select>
        {data && <span className="text-sm text-neutral-500 ml-auto">Итого к оплате: <span className="font-bold text-neutral-900">{fmt(data.total_planned)} ₽</span></span>}
      </div>

      {loading ? <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div> : (
        <div className="space-y-2">
          {allItems.length === 0 && <div className="text-sm text-neutral-400 text-center py-8">Нет предстоящих платежей</div>}
          {allItems.map(p => {
            const days = daysUntil(p.due_date);
            const isOverdue = days != null && days < 0;
            const remaining = Number(p.planned_amount) - Number(p.paid_amount);
            return (
              <div key={p.id} className={`border rounded-lg px-4 py-3 flex items-center gap-4 ${isOverdue?"border-red-200 bg-red-50/40":days!=null&&days<=3?"border-orange-200 bg-orange-50/20":"border-neutral-200"}`}>
                <div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded ${UPCOMING_STATUS_COLORS[p.status]||""}`}>{p.status==="planned"?"К оплате":p.status==="partial"?"Частично":p.status==="paid"?"Оплачен":"Отменён"}</div>
                  <div className={`text-xs mt-1 ${isOverdue?"text-red-600 font-medium":days!=null&&days<=3?"text-orange-600":""}`}>{isOverdue?`просрочен ${Math.abs(days!)} дн.`:days===0?"сегодня":days!=null?`через ${days} дн.`:""}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{PAYMENT_TYPE_LABELS[p.payment_type]||p.payment_type}</span>
                    {p.is_recurring && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Повторяющийся</span>}
                  </div>
                  <div className="text-sm font-medium text-neutral-900 mt-0.5">{p.description}</div>
                  {p.counterparty && <div className="text-xs text-neutral-400">{p.counterparty}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-neutral-400">{fmtDate(p.due_date)}</div>
                  <div className="text-sm font-bold text-neutral-900">{fmt(remaining)} ₽</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {p.status !== "paid" && p.status !== "cancelled" && <button onClick={()=>markPaid(p)} className="p-1.5 rounded hover:bg-green-100 cursor-pointer text-neutral-400 hover:text-green-600" title="Отметить оплаченным"><Icon name="CheckCircle2" size={14}/></button>}
                  <button onClick={()=>openEdit(p)} className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer text-neutral-400 hover:text-neutral-700"><Icon name="Pencil" size={13}/></button>
                  <button onClick={()=>cancel(p.id)} className="p-1.5 rounded hover:bg-red-100 cursor-pointer text-neutral-400 hover:text-red-500"><Icon name="X" size={13}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-semibold text-neutral-900">{editing?"Редактировать":"Новый платёж"}</h2><button onClick={()=>setShowForm(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18}/></button></div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Описание *</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Тип платежа</label><select value={form.payment_type} onChange={e=>setForm(f=>({...f,payment_type:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">{Object.entries(PAYMENT_TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Срок оплаты *</label><input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Сумма, ₽ *</label><input type="number" value={form.planned_amount} onChange={e=>setForm(f=>({...f,planned_amount:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Оплачено, ₽</label><input type="number" value={form.paid_amount} onChange={e=>setForm(f=>({...f,paid_amount:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Контрагент</label><input value={form.counterparty} onChange={e=>setForm(f=>({...f,counterparty:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Предупредить за (дней)</label><input type="number" min="1" value={form.notify_days_before} onChange={e=>setForm(f=>({...f,notify_days_before:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div className="flex items-center gap-2 pt-5"><label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer"><input type="checkbox" checked={form.is_recurring} onChange={e=>setForm(f=>({...f,is_recurring:e.target.checked}))} className="cursor-pointer"/>Повторяется ежемесячно</label></div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer">Отмена</button><button onClick={save} disabled={saving||!form.description||!form.planned_amount||!form.due_date} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">{saving?"Сохранение...":editing?"Сохранить":"Добавить"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Лизинг ----
function LeasingTab() {
  const { user } = useAuth();
  const [data, setData] = useState<{ items: LeasingContract[]; totals: { total_remaining: number; total_monthly: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LeasingContract | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const ef = { lessor:"", contract_number:"", contract_date:"", object_description:"", total_amount:"", monthly_payment:"", payment_day:"", start_date:"", end_date:"", payments_total:"", payments_made:"0", remaining_debt:"", organization:"", notes:"" };
  const [form, setForm] = useState(ef);

  const load = useCallback(async () => { setLoading(true); const r = await api.getLeasingContracts(showInactive?{show_inactive:"1"}:{}); setData(r); setLoading(false); }, [showInactive]);
  useEffect(() => { load(); }, [load]);

  function openEdit(c: LeasingContract) { setEditing(c); setForm({ lessor:c.lessor, contract_number:c.contract_number||"", contract_date:c.contract_date||"", object_description:c.object_description||"", total_amount:c.total_amount!=null?String(c.total_amount):"", monthly_payment:c.monthly_payment!=null?String(c.monthly_payment):"", payment_day:c.payment_day!=null?String(c.payment_day):"", start_date:c.start_date||"", end_date:c.end_date||"", payments_total:c.payments_total!=null?String(c.payments_total):"", payments_made:String(c.payments_made), remaining_debt:c.remaining_debt!=null?String(c.remaining_debt):"", organization:c.organization||"", notes:c.notes||"" }); setShowForm(true); }

  async function save() {
    setSaving(true);
    const p = { ...form, total_amount:form.total_amount?parseFloat(form.total_amount):null, monthly_payment:form.monthly_payment?parseFloat(form.monthly_payment):null, payment_day:form.payment_day?parseInt(form.payment_day):null, payments_total:form.payments_total?parseInt(form.payments_total):null, payments_made:parseInt(form.payments_made)||0, remaining_debt:form.remaining_debt?parseFloat(form.remaining_debt):null, contract_date:form.contract_date||null, start_date:form.start_date||null, end_date:form.end_date||null, is_active:true, created_by:user?.full_name||null };
    if (editing) { await api.updateLeasingContract(editing.id, p); } else { await api.createLeasingContract(p); }
    setSaving(false); setShowForm(false); load();
  }
  async function deactivate(id: number) { if (!confirm("Закрыть договор?")) return; await api.deleteLeasingContract(id); load(); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={()=>{setEditing(null);setForm(ef);setShowForm(true);}} className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 cursor-pointer transition-colors"><Icon name="Plus" size={14}/>Добавить договор</button>
        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer ml-auto"><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)} className="cursor-pointer"/>Показать закрытые</label>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3"><div className="text-xs text-purple-600 mb-1">Общий остаток долга</div><div className="text-lg font-bold text-purple-700">{fmt(data.totals.total_remaining)} ₽</div></div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3"><div className="text-xs text-neutral-500 mb-1">Ежемесячный платёж</div><div className="text-lg font-bold text-neutral-900">{fmt(data.totals.total_monthly)} ₽</div></div>
        </div>
      )}

      {loading ? <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div> : (
        <div className="space-y-2">
          {(data?.items ?? []).map(c => {
            const exp = expandedId === c.id;
            const pct = c.payments_total && c.payments_total > 0 ? Math.round((c.payments_made / c.payments_total) * 100) : null;
            const daysLeft = daysUntil(c.end_date);
            return (
              <div key={c.id} className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors" onClick={()=>setExpandedId(exp?null:c.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-900 text-sm">{c.lessor}</span>
                      {c.contract_number && <span className="text-xs text-neutral-400">#{c.contract_number}</span>}
                    </div>
                    {c.object_description && <div className="text-xs text-neutral-500 mt-0.5">{c.object_description}</div>}
                    {pct !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-neutral-200 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{width:`${pct}%`}}/></div>
                        <span className="text-xs text-neutral-500">{c.payments_made}/{c.payments_total} платежей</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {c.monthly_payment != null && <div className="text-xs text-neutral-500">{fmt(c.monthly_payment)} ₽/мес</div>}
                    {c.remaining_debt != null && <div className="text-sm font-bold text-purple-700">{fmt(c.remaining_debt)} ₽</div>}
                    {c.payment_day && <div className="text-xs text-neutral-400">{c.payment_day}-го числа</div>}
                    {c.end_date && daysLeft != null && daysLeft <= 90 && <div className={`text-xs ${daysLeft<=30?"text-orange-600":"text-neutral-400"}`}>до {fmtDate(c.end_date)}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>openEdit(c)} className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer text-neutral-400 hover:text-neutral-700"><Icon name="Pencil" size={13}/></button>
                    <button onClick={()=>deactivate(c.id)} className="p-1.5 rounded hover:bg-green-100 cursor-pointer text-neutral-400 hover:text-green-600" title="Закрыть договор"><Icon name="CheckCircle2" size={13}/></button>
                  </div>
                  <Icon name={exp?"ChevronUp":"ChevronDown"} size={13} className="text-neutral-400 shrink-0"/>
                </div>
                {exp && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                    {c.contract_date && <div><span className="text-neutral-400">Дата договора:</span> <span className="text-neutral-700">{fmtDate(c.contract_date)}</span></div>}
                    {c.start_date && <div><span className="text-neutral-400">Начало:</span> <span className="text-neutral-700">{fmtDate(c.start_date)}</span></div>}
                    {c.end_date && <div><span className="text-neutral-400">Окончание:</span> <span className="text-neutral-700">{fmtDate(c.end_date)}</span></div>}
                    {c.total_amount != null && <div><span className="text-neutral-400">Сумма договора:</span> <span className="text-neutral-700">{fmt(c.total_amount)} ₽</span></div>}
                    {c.organization && <div><span className="text-neutral-400">Организация:</span> <span className="text-neutral-700">{c.organization}</span></div>}
                    {c.notes && <div className="col-span-2"><span className="text-neutral-400">Примечание:</span> <span className="text-neutral-700">{c.notes}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
          {(data?.items ?? []).length === 0 && <div className="text-sm text-neutral-400 text-center py-8">Договоров нет</div>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={()=>setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="font-semibold text-neutral-900">{editing?"Редактировать договор":"Новый лизинговый договор"}</h2><button onClick={()=>setShowForm(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18}/></button></div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Лизингодатель *</label><input value={form.lessor} onChange={e=>setForm(f=>({...f,lessor:e.target.value}))} placeholder="Наименование лизинговой компании" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">№ договора</label><input value={form.contract_number} onChange={e=>setForm(f=>({...f,contract_number:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Дата договора</label><input type="date" value={form.contract_date} onChange={e=>setForm(f=>({...f,contract_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Предмет лизинга</label><input value={form.object_description} onChange={e=>setForm(f=>({...f,object_description:e.target.value}))} placeholder="Марка, модель ТС, гос. номер" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Сумма договора, ₽</label><input type="number" value={form.total_amount} onChange={e=>setForm(f=>({...f,total_amount:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Ежемесячный платёж, ₽</label><input type="number" value={form.monthly_payment} onChange={e=>setForm(f=>({...f,monthly_payment:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">День оплаты</label><input type="number" min="1" max="31" value={form.payment_day} onChange={e=>setForm(f=>({...f,payment_day:e.target.value}))} placeholder="1-31" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Остаток долга, ₽</label><input type="number" value={form.remaining_debt} onChange={e=>setForm(f=>({...f,remaining_debt:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Всего платежей</label><input type="number" value={form.payments_total} onChange={e=>setForm(f=>({...f,payments_total:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Оплачено платежей</label><input type="number" value={form.payments_made} onChange={e=>setForm(f=>({...f,payments_made:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Дата начала</label><input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Дата окончания</label><input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-neutral-600 mb-1">Примечание</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none"/></div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t"><button onClick={()=>setShowForm(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer">Отмена</button><button onClick={save} disabled={saving||!form.lessor} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">{saving?"Сохранение...":editing?"Сохранить":"Добавить"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Главная страница ----
export default function AccountingPage() {
  const [tab, setTab] = useState<AccTab>("overview");

  const tabs: { id: AccTab; label: string; icon: string }[] = [
    { id: "overview",   label: "Обзор",             icon: "LayoutDashboard" },
    { id: "bank",       label: "Банк / 1С",         icon: "Building2" },
    { id: "taxes",      label: "Налоги и ЕНС",      icon: "Receipt" },
    { id: "creditors",  label: "Кредиторы",         icon: "AlertCircle" },
    { id: "upcoming",   label: "Предстоящие",        icon: "CalendarClock" },
    { id: "leasing",    label: "Лизинг",            icon: "Car" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">Бухгалтерия</h1>

      <div className="flex gap-1 flex-wrap bg-neutral-100 rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${tab===t.id?"bg-white text-neutral-900 shadow-sm font-medium":"text-neutral-500 hover:text-neutral-700"}`}>
            <Icon name={t.icon} size={13}/>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview"  && <OverviewTab />}
      {tab === "bank"      && <BankTab />}
      {tab === "taxes"     && <TaxesTab />}
      {tab === "creditors" && <CreditorsTab />}
      {tab === "upcoming"  && <UpcomingTab />}
      {tab === "leasing"   && <LeasingTab />}
    </div>
  );
}