import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import { ScheduleRow, fmt } from "./cashierTypes";

interface BillsFormProps {
  row: ScheduleRow;
  date: string;
  ticketPrice?: number;
  fuelPriceDefault?: number;
  onSaved: () => void;
  onClose: () => void;
}

export default function CashierBillsForm({ row, date, ticketPrice = 35, fuelPriceDefault = 72, onSaved, onClose }: BillsFormProps) {
  const { user } = useAuth();
  const [cashManual, setCashManual] = useState(String(
    (row as Record<string, unknown>).cash_manual ?? (Number(row.cash_total) > 0 ? row.cash_total : "")
  ));
  const [cashless, setCashless] = useState(String(row.cashless_amount || ""));
  const [fuelCash, setFuelCash] = useState(String((row as Record<string, unknown>).fuel_cash_amount || ""));
  const [bonusCash, setBonusCash] = useState(String((row as Record<string, unknown>).bonus_cash || ""));
  const [ticketsSold, setTicketsSold] = useState(String(row.tickets_sold ?? ""));
  const [notes, setNotes] = useState(row.notes || "");
  const [saving, setSaving] = useState(false);

  const cashVal = parseFloat(cashManual) || 0;
  const cashlessVal = parseFloat(cashless) || 0;
  const fuelVal = parseFloat(fuelCash) || 0;
  const bonusVal = parseFloat(bonusCash) || 0;
  const revenue = cashVal + cashlessVal + bonusVal;
  const autoTickets = ticketPrice > 0 && cashVal > 0 ? Math.floor(cashVal / ticketPrice) : 0;

  async function save() {
    setSaving(true);
    const ticketsNum = ticketsSold ? parseInt(ticketsSold) : (autoTickets > 0 ? autoTickets : null);
    const fpVal = fuelPriceDefault || 72;
    let fuelLitersCalc: number | null = null;
    if (fuelVal > 0 && fpVal > 0) {
      fuelLitersCalc = Math.round((fuelVal / fpVal) * 100) / 100;
    }
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
      fuel_cash_amount: fuelVal,
      fuel_liters: fuelLitersCalc,
      fuel_price_per_liter: fpVal,
      tickets_sold: ticketsNum,
      bonus_cash: bonusVal,
      cash_manual: cashVal > 0 ? cashVal : null,
      bills_5000: 0, bills_2000: 0, bills_1000: 0, bills_500: 0,
      bills_200: 0, bills_100: 0, bills_50: 0, bills_10: 0,
      coins_10: 0, coins_5: 0, coins_2: 0, coins_1: 0,
    });
    if (row.schedule_entry_id) {
      await api.patchScheduleRevenue({
        id: row.schedule_entry_id,
        revenue_cash: cashVal,
        revenue_cashless: cashlessVal,
        revenue_total: revenue,
        fuel_spent: fuelLitersCalc,
        fuel_price_override: fpVal,
        tickets_sold: ticketsNum,
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div>
            <div className="font-semibold text-neutral-900">
              Борт {row.board_number || "—"} · Маршрут {row.route_number}
              {row.graph_number != null && ` · График ${row.graph_number}`}
            </div>
            {(row.driver_name || row.conductor_name) && (
              <div className="text-xs text-neutral-500 mt-0.5">
                {[row.driver_name, row.conductor_name].filter(Boolean).join(" / ")}
              </div>
            )}
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
            Подработка
          </div>
        )}

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-green-700 mb-1.5 uppercase tracking-wide">
              Нал, ₽
            </label>
            <input
              type="number" min="0" step="0.01"
              value={cashManual}
              onChange={e => setCashManual(e.target.value)}
              placeholder="0.00"
              className="w-full border-2 border-green-300 rounded-lg px-3 py-2.5 text-lg font-bold text-green-800 focus:outline-none focus:border-green-500 bg-green-50/50"
              autoFocus
            />
            {autoTickets > 0 && !ticketsSold && (
              <div className="text-xs text-green-600 mt-1">
                ≈ {autoTickets} билетов ({fmt(cashVal)} ÷ {ticketPrice} ₽)
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">
              ДТ, ₽
            </label>
            <input
              type="number" min="0" step="0.01"
              value={fuelCash}
              onChange={e => setFuelCash(e.target.value)}
              placeholder="0.00"
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-semibold text-amber-800 focus:outline-none focus:border-amber-500 bg-amber-50/50"
            />
            {fuelVal > 0 && fuelPriceDefault > 0 && (
              <div className="text-xs text-amber-600 mt-1">
                ≈ {(fuelVal / fuelPriceDefault).toFixed(1)} л (по {fuelPriceDefault} ₽/л)
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-blue-700 mb-1.5 uppercase tracking-wide">
              Безнал, ₽
            </label>
            <input
              type="number" min="0" step="0.01"
              value={cashless}
              onChange={e => setCashless(e.target.value)}
              placeholder="0.00"
              className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 focus:outline-none focus:border-blue-500 bg-blue-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-700 mb-1.5 uppercase tracking-wide">
              В плюс, ₽
            </label>
            <input
              type="number" min="0" step="0.01"
              value={bonusCash}
              onChange={e => setBonusCash(e.target.value)}
              placeholder="0.00"
              className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm font-semibold text-purple-800 focus:outline-none focus:border-purple-500 bg-purple-50/50"
            />
            <div className="text-xs text-purple-500 mt-1">Наличные, которые плюсуются к выручке</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              Билеты
              {autoTickets > 0 && !ticketsSold && (
                <span className="text-green-600 ml-1">(авто: {autoTickets})</span>
              )}
            </label>
            <input
              type="number" min="0" step="1"
              value={ticketsSold}
              onChange={e => setTicketsSold(e.target.value)}
              placeholder={autoTickets > 0 ? String(autoTickets) : "0"}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

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

          <div className="bg-neutral-100 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Нал</span>
              <span className="font-semibold text-green-700 font-mono">{fmt(cashVal)} ₽</span>
            </div>
            {cashlessVal > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Безнал</span>
                <span className="font-semibold text-blue-700 font-mono">+ {fmt(cashlessVal)} ₽</span>
              </div>
            )}
            {bonusVal > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">В плюс</span>
                <span className="font-semibold text-purple-700 font-mono">+ {fmt(bonusVal)} ₽</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-neutral-300 pt-1.5 mt-1.5">
              <span className="font-bold text-neutral-800">Выручка</span>
              <span className="font-bold text-neutral-900 font-mono">{fmt(revenue)} ₽</span>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 px-5 py-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-neutral-300 text-neutral-700 rounded-lg py-2.5 text-sm hover:bg-neutral-100 transition-colors cursor-pointer">
            Отмена
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 bg-neutral-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
