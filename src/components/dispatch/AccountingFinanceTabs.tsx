import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import {
  TaxPayment,
  Creditor,
  UpcomingPayment,
  LeasingContract,
  TAX_STATUS_LABELS,
  TAX_STATUS_COLORS,
  DEBT_TYPE_LABELS,
  PAYMENT_TYPE_LABELS,
  UPCOMING_STATUS_COLORS,
  MONTHS,
  fmt,
  fmtDate,
  daysUntil,
} from "./accountingTypes";

// ---- Налоги и ЕНС ----
export function TaxesTab() {
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
export function CreditorsTab() {
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
export function UpcomingTab() {
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
export function LeasingTab() {
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

// ---- Ограничения выдачи наличных (перенесены из отдельного раздела в Бухгалтерию) ----
export function CashRestrictionsTab() {
  const { user } = useAuth();
  const [restrictions, setRestrictions] = useState<{id:number;driver_name:string;reason:string;restriction_type:string;limit_amount?:number;is_active:boolean;expires_at?:string;created_at:string}[]>([]);
  const [drivers, setDrivers] = useState<{id:number;full_name:string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{id:number;driver_id?:number;driver_name:string;reason:string;restriction_type:string;limit_amount:string;expires_at:string}|null>(null);
  const emptyForm = {id:0,driver_name:"",reason:"",restriction_type:"block",limit_amount:"",expires_at:""};
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    const [r,d]=await Promise.all([api.getCashRestrictions(), api.getDrivers()]);
    setRestrictions(Array.isArray(r)?r:[]);
    setDrivers(Array.isArray(d)?d:[]);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  async function save(){
    setSaving(true);
    const payload={driver_name:form.driver_name,reason:form.reason,restriction_type:form.restriction_type,limit_amount:form.limit_amount||undefined,expires_at:form.expires_at||undefined,is_active:true};
    if(editing?.id){await api.updateCashRestriction(editing.id,payload);}
    else{await api.createCashRestriction(payload);}
    setSaving(false);setShowForm(false);setEditing(null);setForm(emptyForm);load();
  }
  async function toggleActive(id:number,is_active:boolean){
    await api.updateCashRestriction(id,{is_active:!is_active});load();
  }

  const canEdit=user?.role==="admin"||user?.role==="accountant"||user?.role==="accountant_head";

  return(
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-neutral-900">Ограничения выдачи наличных</div>
          <div className="text-xs text-neutral-500 mt-0.5">Привязка к расчёту зарплаты — ограничения учитываются при выдаче наличных водителям</div>
        </div>
        {canEdit&&<button onClick={()=>{setEditing(null);setForm(emptyForm);setShowForm(true);}} className="flex items-center gap-1.5 bg-neutral-900 text-white text-xs px-3 py-2 rounded-lg hover:bg-neutral-700 cursor-pointer"><Icon name="Plus" size={13}/>Добавить</button>}
      </div>
      {loading?<div className="text-sm text-neutral-400 text-center py-6">Загрузка...</div>:restrictions.length===0?<div className="text-sm text-neutral-400 text-center py-6">Ограничений нет</div>:(
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Сотрудник</th>
                <th className="px-4 py-2 text-left">Причина</th>
                <th className="px-4 py-2 text-center">Тип</th>
                <th className="px-4 py-2 text-right">Лимит</th>
                <th className="px-4 py-2 text-center">Истекает</th>
                <th className="px-4 py-2 text-center">Статус</th>
                {canEdit&&<th className="px-4 py-2 w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {restrictions.map(r=>(
                <tr key={r.id} className={`border-b border-neutral-100 last:border-0 ${!r.is_active?"opacity-50":""}`}>
                  <td className="px-4 py-3 font-medium">{r.driver_name||"—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.reason}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.restriction_type==="block"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                      {r.restriction_type==="block"?"Блокировка":"Лимит"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{r.limit_amount?fmt(r.limit_amount)+" ₽":"—"}</td>
                  <td className="px-4 py-3 text-center text-neutral-500">{fmtDate(r.expires_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active?"bg-green-100 text-green-700":"bg-neutral-100 text-neutral-500"}`}>
                      {r.is_active?"Активно":"Снято"}
                    </span>
                  </td>
                  {canEdit&&<td className="px-4 py-3 text-right">
                    <button onClick={()=>toggleActive(r.id,r.is_active)} className="text-xs text-neutral-400 hover:text-neutral-700 mr-2 cursor-pointer">{r.is_active?"Снять":"Вкл."}</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>{setShowForm(false);setEditing(null);}}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b"><span className="font-semibold">Ограничение выдачи</span><button onClick={()=>{setShowForm(false);setEditing(null);}} className="text-neutral-400 cursor-pointer"><Icon name="X" size={16}/></button></div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">Водитель</label>
                <select value={form.driver_name} onChange={e=>setForm(f=>({...f,driver_name:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">— Выберите или введите вручную —</option>
                  {drivers.map(d=><option key={d.id} value={d.full_name}>{d.full_name}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-medium text-neutral-600 mb-1">Причина *</label><input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-neutral-600 mb-1">Тип</label>
                  <select value={form.restriction_type} onChange={e=>setForm(f=>({...f,restriction_type:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="block">Полная блокировка</option><option value="limit">Лимит суммы</option>
                  </select>
                </div>
                {form.restriction_type==="limit"&&<div><label className="block text-xs font-medium text-neutral-600 mb-1">Лимит, ₽</label><input type="number" value={form.limit_amount} onChange={e=>setForm(f=>({...f,limit_amount:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>}
              </div>
              <div><label className="block text-xs font-medium text-neutral-600 mb-1">Действует до</label><input type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"/></div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t"><button onClick={()=>{setShowForm(false);setEditing(null);}} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 cursor-pointer">Отмена</button><button onClick={save} disabled={saving||!form.reason} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg disabled:opacity-40 cursor-pointer">{saving?"...":"Сохранить"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
