import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import {
  BankTransaction,
  BankSummary,
  TX_CATEGORY_LABELS,
  TX_CATEGORY_COLORS,
  fmt,
  fmtDate,
} from "./accountingTypes";

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

export default BankTab;
