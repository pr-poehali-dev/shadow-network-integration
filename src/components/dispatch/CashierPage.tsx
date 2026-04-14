import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";

// --- Типы ---
interface Restriction {
  reason: string;
  restriction_type: "block" | "limit";
  limit_amount: number | null;
}

interface ScheduleRow {
  schedule_entry_id: number;
  report_id: number | null;
  report_date: string;
  route_number: string;
  graph_number: number | null;
  organization: string | null;
  board_number: string | null;
  gov_number: string | null;
  driver_id: number | null;
  driver_name: string | null;
  is_overtime: boolean;
  cash_total: number;
  cashless_amount: number;
  notes: string | null;
  restriction: Restriction | null;
  bills_5000: number; bills_2000: number; bills_1000: number; bills_500: number;
  bills_200: number; bills_100: number; bills_50: number; bills_10: number;
  coins_10: number; coins_5: number; coins_2: number; coins_1: number;
}

interface CashRestriction {
  id: number;
  driver_id: number | null;
  driver_name: string | null;
  driver_full_name: string | null;
  reason: string;
  restriction_type: "block" | "limit";
  limit_amount: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

const BILLS: { key: string; label: string; value: number; isCoin?: boolean }[] = [
  { key: "bills_5000", label: "5 000 ₽", value: 5000 },
  { key: "bills_2000", label: "2 000 ₽", value: 2000 },
  { key: "bills_1000", label: "1 000 ₽", value: 1000 },
  { key: "bills_500",  label: "500 ₽",   value: 500 },
  { key: "bills_200",  label: "200 ₽",   value: 200 },
  { key: "bills_100",  label: "100 ₽",   value: 100 },
  { key: "bills_50",   label: "50 ₽",    value: 50 },
  { key: "bills_10",   label: "10 ₽",    value: 10 },
  { key: "coins_10",   label: "10 ₽ (м)",  value: 10, isCoin: true },
  { key: "coins_5",    label: "5 ₽",     value: 5,  isCoin: true },
  { key: "coins_2",    label: "2 ₽",     value: 2,  isCoin: true },
  { key: "coins_1",    label: "1 ₽",     value: 1,  isCoin: true },
];

function fmt(n: number) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

type TabMode = "cashier" | "restrictions";

// --- Форма покупюрного ввода ---
interface BillsFormProps {
  row: ScheduleRow;
  date: string;
  onSaved: () => void;
  onClose: () => void;
}

function BillsForm({ row, date, onSaved, onClose }: BillsFormProps) {
  const { user } = useAuth();
  const [bills, setBills] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    BILLS.forEach(b => { init[b.key] = Number((row as Record<string, unknown>)[b.key]) || 0; });
    return init;
  });
  const [cashless, setCashless] = useState(String(row.cashless_amount || "0"));
  const [notes, setNotes] = useState(row.notes || "");
  const [saving, setSaving] = useState(false);
  // Топливо за наличку
  const [fuelCash, setFuelCash] = useState(String((row as Record<string,unknown>).fuel_cash_amount || ""));
  const [fuelLiters, setFuelLiters] = useState(String((row as Record<string,unknown>).fuel_liters || ""));
  const [fuelPrice, setFuelPrice] = useState(String((row as Record<string,unknown>).fuel_price_per_liter || ""));

  const cashTotal = BILLS.reduce((s, b) => s + (bills[b.key] || 0) * b.value, 0);
  // Авторасчёт суммы топлива по литрам и цене
  const autoFuelCash = (parseFloat(fuelLiters) || 0) * (parseFloat(fuelPrice) || 0);

  async function save() {
    setSaving(true);
    const fuelCashFinal = fuelCash ? parseFloat(fuelCash) : autoFuelCash || 0;
    await api.saveCashierReport({
      report_date: date,
      schedule_entry_id: row.schedule_entry_id,
      board_number: row.board_number,
      gov_number: row.gov_number,
      driver_name: row.driver_name,
      route_number: row.route_number,
      graph_number: row.graph_number,
      organization: row.organization,
      is_overtime: row.is_overtime,
      cashless_amount: parseFloat(cashless) || 0,
      notes: notes || null,
      created_by: user?.full_name || null,
      fuel_cash_amount: fuelCashFinal,
      fuel_liters: fuelLiters ? parseFloat(fuelLiters) : null,
      fuel_price_per_liter: fuelPrice ? parseFloat(fuelPrice) : null,
      ...bills,
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div>
            <div className="font-semibold text-neutral-900">
              Борт {row.board_number || "—"} · Маршрут {row.route_number}
              {row.graph_number != null && ` · График ${row.graph_number}`}
            </div>
            {row.driver_name && <div className="text-xs text-neutral-500 mt-0.5">{row.driver_name}</div>}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
            <Icon name="X" size={18} />
          </button>
        </div>

        {row.restriction && (
          <div className={`mx-5 mt-4 p-3 rounded-lg border flex gap-2 items-start ${
            row.restriction.restriction_type === "block"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-orange-50 border-orange-200 text-orange-700"
          }`}>
            <Icon name="AlertTriangle" size={15} className="shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold">
                {row.restriction.restriction_type === "block" ? "Выдача запрещена" : "Ограниченная выдача"}
              </span>
              {row.restriction.limit_amount != null && (
                <span> — не более {fmt(row.restriction.limit_amount)} ₽</span>
              )}
              <br />
              {row.restriction.reason}
            </div>
          </div>
        )}

        {row.is_overtime && (
          <div className="mx-5 mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs text-blue-700">
            <Icon name="Clock" size={13} />
            Отмечена подработка диспетчером
          </div>
        )}

        <div className="px-5 py-4 space-y-3">
          {/* Покупюрная таблица */}
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Наличные — покупюрно</div>
          <div className="border border-neutral-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 text-xs text-neutral-500">
                  <th className="px-3 py-2 text-left font-medium">Купюра</th>
                  <th className="px-3 py-2 text-center font-medium w-20">Кол-во</th>
                  <th className="px-3 py-2 text-right font-medium">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {BILLS.map((b, i) => {
                  const qty = bills[b.key] || 0;
                  const sum = qty * b.value;
                  const showDivider = i === 7;
                  return (
                    <>
                      {showDivider && (
                        <tr key="divider">
                          <td colSpan={3} className="bg-neutral-100 px-3 py-1 text-xs text-neutral-400 font-medium">Монеты</td>
                        </tr>
                      )}
                      <tr key={b.key} className="border-t border-neutral-100">
                        <td className="px-3 py-1.5 text-neutral-700 font-medium">{b.label}</td>
                        <td className="px-3 py-1.5 text-center">
                          <input
                            type="number" min="0"
                            value={qty === 0 ? "" : qty}
                            onChange={e => setBills(prev => ({ ...prev, [b.key]: parseInt(e.target.value) || 0 }))}
                            placeholder="0"
                            className="w-16 text-center border border-neutral-200 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:border-neutral-500"
                          />
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono text-xs ${sum > 0 ? "text-neutral-800" : "text-neutral-300"}`}>
                          {sum > 0 ? fmt(sum) : "—"}
                        </td>
                      </tr>
                    </>
                  );
                })}
                <tr className="border-t-2 border-neutral-300 bg-neutral-50">
                  <td className="px-3 py-2 font-bold text-neutral-900" colSpan={2}>Итого наличных</td>
                  <td className="px-3 py-2 text-right font-bold text-green-700 font-mono">{fmt(cashTotal)} ₽</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Топливо за наличку */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
              <Icon name="Fuel" size={13} /> Топливо (оплата наличными)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Литры</label>
                <input type="number" min="0" step="0.1"
                  value={fuelLiters}
                  onChange={e => setFuelLiters(e.target.value)}
                  placeholder="0.0"
                  className="w-full border border-neutral-200 rounded px-2 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Цена, ₽/л</label>
                <input type="number" min="0" step="0.01"
                  value={fuelPrice}
                  onChange={e => setFuelPrice(e.target.value)}
                  placeholder="72.00"
                  className="w-full border border-neutral-200 rounded px-2 py-1.5 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">
                  Сумма, ₽ {autoFuelCash > 0 && fuelCash === "" ? <span className="text-amber-600">(авто)</span> : null}
                </label>
                <input type="number" min="0" step="0.01"
                  value={fuelCash || (autoFuelCash > 0 ? String(autoFuelCash.toFixed(2)) : "")}
                  onChange={e => setFuelCash(e.target.value)}
                  placeholder={autoFuelCash > 0 ? String(autoFuelCash.toFixed(2)) : "0.00"}
                  className="w-full border border-neutral-200 rounded px-2 py-1.5 text-sm bg-white" />
              </div>
            </div>
            <div className="text-xs text-neutral-500 mt-1.5">
              Сумма будет вычтена из наличных водителя. В сводке отобразятся литры.
            </div>
          </div>

          {/* Безнал */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Безналичные, ₽</label>
            <input
              type="number" min="0" step="0.01"
              value={cashless}
              onChange={e => setCashless(e.target.value)}
              placeholder="0.00"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Примечание */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Примечание</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Дополнительная информация"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Итог */}
          {(() => {
            const fuelCashFinal = fuelCash ? parseFloat(fuelCash) : autoFuelCash;
            const totalCash = cashTotal - fuelCashFinal;
            return (
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Наличные выручка</span>
                  <span className="font-semibold">{fmt(cashTotal)} ₽</span>
                </div>
                {fuelCashFinal > 0 && (
                  <div className="flex justify-between items-center text-xs text-amber-700">
                    <span>− Топливо наличными ({fuelLiters ? parseFloat(fuelLiters) : "—"} л)</span>
                    <span>−{fmt(fuelCashFinal)} ₽</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-neutral-200 pt-1.5">
                  <span className="text-sm font-medium text-neutral-700">К получению</span>
                  <span className="text-lg font-bold text-neutral-900">{fmt(Math.max(0, totalCash) + (parseFloat(cashless) || 0))} ₽</span>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-neutral-200">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-colors">
            Отмена
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Управление ограничениями ---
function RestrictionsTab() {
  const { user } = useAuth();
  const [restrictions, setRestrictions] = useState<CashRestriction[]>([]);
  const [drivers, setDrivers] = useState<{ id: number; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashRestriction | null>(null);
  const [form, setForm] = useState({
    driver_id: "", driver_name: "", reason: "",
    restriction_type: "block" as "block" | "limit",
    limit_amount: "", expires_at: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [res, drv] = await Promise.all([api.getCashRestrictions(), api.getDrivers()]);
    setRestrictions(Array.isArray(res) ? res : []);
    setDrivers(Array.isArray(drv) ? drv : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ driver_id: "", driver_name: "", reason: "", restriction_type: "block", limit_amount: "", expires_at: "" });
    setShowForm(true);
  }

  function openEdit(r: CashRestriction) {
    setEditing(r);
    setForm({
      driver_id: r.driver_id ? String(r.driver_id) : "",
      driver_name: r.driver_name || "",
      reason: r.reason,
      restriction_type: r.restriction_type,
      limit_amount: r.limit_amount ? String(r.limit_amount) : "",
      expires_at: r.expires_at || "",
    });
    setShowForm(true);
  }

  function handleDriverChange(id: string) {
    const drv = drivers.find(d => String(d.id) === id);
    setForm(f => ({ ...f, driver_id: id, driver_name: drv?.full_name || "" }));
  }

  async function save() {
    if (!form.reason) return;
    setSaving(true);
    const payload = {
      driver_id: form.driver_id ? parseInt(form.driver_id) : null,
      driver_name: form.driver_name || null,
      reason: form.reason,
      restriction_type: form.restriction_type,
      limit_amount: form.limit_amount ? parseFloat(form.limit_amount) : null,
      expires_at: form.expires_at || null,
      created_by: user?.full_name || null,
      is_active: true,
    };
    if (editing) {
      await api.updateCashRestriction(editing.id, payload);
    } else {
      await api.createCashRestriction(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function deactivate(id: number) {
    if (!confirm("Снять ограничение?")) return;
    await api.deleteCashRestriction(id);
    load();
  }

  const active = restrictions.filter(r => r.is_active);
  const inactive = restrictions.filter(r => !r.is_active);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Ограничения на выдачу</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Устанавливаются бухгалтером. Видны кассиру при внесении отчёта.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-4 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer">
          <Icon name="Plus" size={15} />
          Добавить
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div>
      ) : active.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-8">Активных ограничений нет</div>
      ) : (
        <div className="space-y-2">
          {active.map(r => (
            <div key={r.id} className={`border rounded-lg px-4 py-3 flex items-start gap-4 ${
              r.restriction_type === "block" ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"
            }`}>
              <Icon name="AlertTriangle" size={16} className={`mt-0.5 shrink-0 ${r.restriction_type === "block" ? "text-red-500" : "text-orange-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    r.restriction_type === "block" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {r.restriction_type === "block" ? "Запрет" : "Лимит"}
                    {r.limit_amount != null && ` до ${fmt(r.limit_amount)} ₽`}
                  </span>
                  <span className="text-sm font-medium text-neutral-900">
                    {r.driver_full_name || r.driver_name || "Все водители"}
                  </span>
                  {r.expires_at && <span className="text-xs text-neutral-500">до {r.expires_at}</span>}
                </div>
                <p className="text-xs text-neutral-600 mt-1">{r.reason}</p>
                {r.created_by && <p className="text-xs text-neutral-400 mt-0.5">Добавил: {r.created_by}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(r)}
                  className="p-1.5 rounded hover:bg-white/70 cursor-pointer text-neutral-500 hover:text-neutral-800 transition-colors">
                  <Icon name="Pencil" size={13} />
                </button>
                <button onClick={() => deactivate(r.id)}
                  className="p-1.5 rounded hover:bg-white/70 cursor-pointer text-neutral-500 hover:text-red-600 transition-colors">
                  <Icon name="X" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600">
            Снятые ограничения ({inactive.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {inactive.map(r => (
              <div key={r.id} className="border border-neutral-100 rounded-lg px-4 py-2 flex items-center gap-3 opacity-60">
                <span className="text-xs text-neutral-500">{r.driver_full_name || r.driver_name || "—"}</span>
                <span className="text-xs text-neutral-400 flex-1">{r.reason}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <h2 className="font-semibold text-neutral-900">
                {editing ? "Редактировать ограничение" : "Новое ограничение"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Водитель (необязательно)</label>
                <select
                  value={form.driver_id}
                  onChange={e => handleDriverChange(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Все водители —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Тип ограничения</label>
                <div className="flex gap-2">
                  {(["block", "limit"] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, restriction_type: t }))}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                        form.restriction_type === t
                          ? t === "block" ? "bg-red-600 text-white border-red-600" : "bg-orange-500 text-white border-orange-500"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      }`}>
                      {t === "block" ? "Полный запрет" : "Лимит суммы"}
                    </button>
                  ))}
                </div>
              </div>

              {form.restriction_type === "limit" && (
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Максимальная сумма, ₽</label>
                  <input type="number" min="0" step="0.01" value={form.limit_amount}
                    onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Причина *</label>
                <textarea value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Например: задолженность за предыдущий месяц"
                  rows={3}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Действует до (необязательно)</label>
                <input type="date" value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-neutral-200">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-colors">
                Отмена
              </button>
              <button onClick={save} disabled={saving || !form.reason}
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

// --- Главная страница кассы ---
export default function CashierPage() {
  const { user, hasAccess } = useAuth();
  const [tab, setTab] = useState<TabMode>("cashier");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [totalCash, setTotalCash] = useState(0);
  const [totalCashless, setTotalCashless] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeForm, setActiveForm] = useState<ScheduleRow | null>(null);
  const [expandedSummary, setExpandedSummary] = useState(false);

  const canManageRestrictions = hasAccess("cash_restrictions");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getCashierReport(date);
    setRows(data.rows || []);
    setTotalCash(Number(data.total_cash) || 0);
    setTotalCashless(Number(data.total_cashless) || 0);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const filledCount = rows.filter(r => r.report_id != null).length;
  const totalGrand = totalCash + totalCashless;

  // Сводная покупюрная таблица
  const billTotals = BILLS.map(b => {
    const qty = rows.reduce((s, r) => s + (Number((r as Record<string,unknown>)[b.key]) || 0), 0);
    return { ...b, qty, sum: qty * b.value };
  });

  function handlePrint() {
    const [y, m, d] = date.split("-");
    const dateLabel = `${d}.${m}.${y}`;
    const filledRows = rows.filter(r => r.report_id != null);

    const billRows = billTotals
      .map(b => `
        <tr>
          <td style="padding:4px 10px;border:1px solid #e5e7eb;">${b.label}</td>
          <td style="padding:4px 10px;border:1px solid #e5e7eb;text-align:center;">× ${b.qty}</td>
          <td style="padding:4px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:${b.sum > 0 ? "600" : "400"};color:${b.sum > 0 ? "#111" : "#aaa"};">
            ${b.sum > 0 ? "= " + b.sum.toLocaleString("ru-RU", {minimumFractionDigits:2}) : "—"}
          </td>
        </tr>`)
      .join("");

    const vehicleRows = filledRows.map(r => {
      const cash = Number(r.cash_total) || 0;
      const cashless = Number(r.cashless_amount) || 0;
      return `
        <tr>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">Борт ${r.board_number || "—"}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${r.route_number}${r.graph_number != null ? ` / г.${r.graph_number}` : ""}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${r.driver_name || "—"}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">${cash.toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">${cashless > 0 ? cashless.toLocaleString("ru-RU",{minimumFractionDigits:2}) : "—"}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${(cash+cashless).toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:11px;color:#555;">${r.is_overtime ? "Подработка" : ""}${r.notes ? (r.is_overtime ? ", " : "") + r.notes : ""}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Кассовый отчёт ${dateLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin: 20px 0 8px; color: #444; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th { background: #f3f4f6; padding: 5px 10px; border: 1px solid #e5e7eb; text-align: left; font-size: 12px; }
    .totals { display: flex; gap: 32px; margin: 12px 0 20px; }
    .total-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 20px; min-width: 160px; }
    .total-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .05em; }
    .total-box .value { font-size: 20px; font-weight: 700; margin-top: 2px; }
    .footer { margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { margin: 12px; } button { display: none; } }
  </style>
</head>
<body>
  <h1>Кассовый отчёт за ${dateLabel}</h1>
  <p style="color:#666;font-size:12px;">Составил: ${user?.full_name || "—"} · Сформировано: ${new Date().toLocaleString("ru-RU")}</p>

  <div class="totals">
    <div class="total-box">
      <div class="label">Наличные</div>
      <div class="value" style="color:#16a34a;">${totalCash.toLocaleString("ru-RU",{minimumFractionDigits:2})} ₽</div>
    </div>
    <div class="total-box">
      <div class="label">Безналичные</div>
      <div class="value" style="color:#2563eb;">${totalCashless.toLocaleString("ru-RU",{minimumFractionDigits:2})} ₽</div>
    </div>
    <div class="total-box">
      <div class="label">Итого</div>
      <div class="value">${(totalCash+totalCashless).toLocaleString("ru-RU",{minimumFractionDigits:2})} ₽</div>
    </div>
  </div>

  <h2>Покупюрная ведомость</h2>
  <table style="max-width:420px;">
    <thead>
      <tr>
        <th>Номинал</th>
        <th style="text-align:center;">Количество</th>
        <th style="text-align:right;">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${billRows}
      <tr style="background:#f3f4f6;font-weight:700;">
        <td colspan="2" style="padding:5px 10px;border:1px solid #e5e7eb;">Итого наличных</td>
        <td style="padding:5px 10px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;">${totalCash.toLocaleString("ru-RU",{minimumFractionDigits:2})} ₽</td>
      </tr>
    </tbody>
  </table>

  <h2>Детализация по транспортным средствам (${filledRows.length} ТС)</h2>
  <table>
    <thead>
      <tr>
        <th>Борт</th>
        <th>Маршрут / График</th>
        <th>Водитель</th>
        <th style="text-align:right;">Наличные</th>
        <th style="text-align:right;">Безнал</th>
        <th style="text-align:right;">Итого</th>
        <th>Примечание</th>
      </tr>
    </thead>
    <tbody>
      ${vehicleRows}
      <tr style="background:#f3f4f6;font-weight:700;">
        <td colspan="3" style="padding:5px 8px;border:1px solid #e5e7eb;">ИТОГО</td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;">${totalCash.toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#2563eb;">${totalCashless.toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;">${(totalCash+totalCashless).toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
        <td style="border:1px solid #e5e7eb;"></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Кассир: _________________________ / ${user?.full_name || "___________________"} /
    &nbsp;&nbsp;&nbsp;&nbsp; Подпись: _________________________
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Касса</h1>
        <div className="flex items-center gap-2">
          {tab === "cashier" && filledCount > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 border border-neutral-300 text-neutral-700 text-sm px-3 py-2 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Icon name="Printer" size={15} />
              Распечатать отчёт
            </button>
          )}
          {canManageRestrictions && (
            <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
              {(["cashier", "restrictions"] as TabMode[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                    tab === t ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"
                  }`}>
                  {t === "cashier" ? "Отчёт кассира" : "Ограничения"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === "restrictions" ? (
        <RestrictionsTab />
      ) : (
        <>
          {/* Дата */}
          <div className="flex items-center gap-3">
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d.toISOString().slice(0,10)); }}
              className="border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors">
              <Icon name="ChevronLeft" size={16} />
            </button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500" />
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d.toISOString().slice(0,10)); }}
              className="border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors">
              <Icon name="ChevronRight" size={16} />
            </button>
            <span className="text-xs text-neutral-400">{filledCount} из {rows.length} внесено</span>
          </div>

          {/* Итоговые карточки */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Наличные</div>
              <div className="text-2xl font-bold text-green-700">{fmt(totalCash)} ₽</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Безналичные</div>
              <div className="text-2xl font-bold text-blue-700">{fmt(totalCashless)} ₽</div>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <div className="text-xs text-neutral-600 font-medium uppercase tracking-wide mb-1">Итого</div>
              <div className="text-2xl font-bold text-neutral-900">{fmt(totalGrand)} ₽</div>
            </div>
          </div>

          {/* Сводная покупюрная таблица */}
          {filledCount > 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSummary(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer text-sm font-medium text-neutral-700"
              >
                <span>Сводная покупюрная таблица за день</span>
                <Icon name={expandedSummary ? "ChevronUp" : "ChevronDown"} size={16} />
              </button>
              {expandedSummary && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 text-xs text-neutral-500 border-t border-neutral-200">
                      <th className="px-4 py-2 text-left font-medium">Номинал</th>
                      <th className="px-4 py-2 text-center font-medium">× Кол-во</th>
                      <th className="px-4 py-2 text-right font-medium">= Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billTotals.map((b, i) => {
                      const showDivider = i === 8;
                      return (
                        <>
                          {showDivider && (
                            <tr key="div2">
                              <td colSpan={3} className="bg-neutral-100 px-4 py-1 text-xs text-neutral-400 font-medium border-t border-neutral-200">Монеты</td>
                            </tr>
                          )}
                          <tr key={b.key} className="border-t border-neutral-100">
                            <td className="px-4 py-1.5 font-medium text-neutral-800">{b.label}</td>
                            <td className="px-4 py-1.5 text-center font-mono text-neutral-600">
                              {b.qty > 0 ? `× ${b.qty}` : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className={`px-4 py-1.5 text-right font-mono ${b.sum > 0 ? "text-neutral-900 font-semibold" : "text-neutral-300"}`}>
                              {b.sum > 0 ? `= ${fmt(b.sum)}` : "—"}
                            </td>
                          </tr>
                        </>
                      );
                    })}
                    <tr className="border-t-2 border-neutral-300 bg-neutral-50">
                      <td colSpan={2} className="px-4 py-2 font-bold text-neutral-900">Итого наличных</td>
                      <td className="px-4 py-2 text-right font-bold text-green-700 font-mono">{fmt(totalCash)} ₽</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Список ТС */}
          {loading ? (
            <div className="text-sm text-neutral-400 text-center py-10">Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-neutral-400 text-center py-10">
              В расписании на эту дату нет записей
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map(row => {
                const hasFilled = row.report_id != null;
                const hasRestriction = !!row.restriction;
                return (
                  <div
                    key={row.schedule_entry_id}
                    onClick={() => setActiveForm(row)}
                    className={`border rounded-lg px-4 py-3 cursor-pointer hover:shadow-sm transition-all flex items-center gap-4 ${
                      hasRestriction
                        ? row.restriction!.restriction_type === "block"
                          ? "border-red-200 bg-red-50/50"
                          : "border-orange-200 bg-orange-50/50"
                        : hasFilled
                        ? "border-green-200 bg-green-50/30"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      hasFilled ? "bg-green-500" : "bg-neutral-300"
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-neutral-900 text-sm">
                          Борт {row.board_number || "—"}
                        </span>
                        {row.gov_number && (
                          <span className="text-xs border border-neutral-300 px-1.5 py-0.5 rounded text-neutral-600">{row.gov_number}</span>
                        )}
                        <span className="text-xs text-neutral-500">Маршрут {row.route_number}</span>
                        {row.graph_number != null && (
                          <span className="text-xs text-neutral-400">граф. {row.graph_number}</span>
                        )}
                        {row.is_overtime && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Icon name="Clock" size={10} /> Подработка
                          </span>
                        )}
                        {hasRestriction && (
                          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                            row.restriction!.restriction_type === "block"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            <Icon name="AlertTriangle" size={10} />
                            {row.restriction!.restriction_type === "block" ? "Запрет выдачи" : "Лимит"}
                          </span>
                        )}
                      </div>
                      {row.driver_name && (
                        <div className="text-xs text-neutral-400 mt-0.5">{row.driver_name}</div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {hasFilled ? (
                        <>
                          <div className="text-sm font-bold text-green-700">{fmt(row.cash_total)} ₽</div>
                          {Number(row.cashless_amount) > 0 && (
                            <div className="text-xs text-blue-600">+ {fmt(Number(row.cashless_amount))} безнал</div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-neutral-400">Не внесено</span>
                      )}
                    </div>

                    <Icon name="ChevronRight" size={14} className="text-neutral-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeForm && (
        <BillsForm
          row={activeForm}
          date={date}
          onSaved={load}
          onClose={() => setActiveForm(null)}
        />
      )}
    </div>
  );
}