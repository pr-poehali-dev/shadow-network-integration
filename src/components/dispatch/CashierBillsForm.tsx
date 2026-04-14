import { useState, Fragment } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import { ScheduleRow, BILLS, fmt } from "./cashierTypes";

interface BillsFormProps {
  row: ScheduleRow;
  date: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function CashierBillsForm({ row, date, onSaved, onClose }: BillsFormProps) {
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
    const cashlessVal = parseFloat(cashless) || 0;
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
      cashless_amount: cashlessVal,
      notes: notes || null,
      created_by: user?.full_name || null,
      fuel_cash_amount: fuelCashFinal,
      fuel_liters: fuelLiters ? parseFloat(fuelLiters) : null,
      fuel_price_per_liter: fuelPrice ? parseFloat(fuelPrice) : null,
      ...bills,
    });
    // Синхронизируем данные кассы в наряд
    if (row.schedule_entry_id) {
      await api.patchScheduleRevenue({
        id: row.schedule_entry_id,
        revenue_cash: cashTotal,
        revenue_cashless: cashlessVal,
        revenue_total: cashTotal + cashlessVal,
        fuel_spent: fuelCashFinal > 0 && fuelLiters ? parseFloat(fuelLiters) : null,
        fuel_price_override: fuelPrice ? parseFloat(fuelPrice) : null,
      });
    }
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
                    <Fragment key={b.key}>
                      {showDivider && (
                        <tr>
                          <td colSpan={3} className="bg-neutral-100 px-3 py-1 text-xs text-neutral-400 font-medium">Монеты</td>
                        </tr>
                      )}
                      <tr className="border-t border-neutral-100">
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
                        <td className={`px-3 py-1.5 text-right font-mono text-xs ${sum > 0 ? "text-neutral-800 font-semibold" : "text-neutral-300"}`}>
                          {sum > 0 ? fmt(sum) : "—"}
                        </td>
                      </tr>
                    </Fragment>
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