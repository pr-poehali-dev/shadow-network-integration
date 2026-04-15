import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import { ScheduleRow, CashierSummary, fmt, today, TabMode } from "./cashierTypes";
import CashierRestrictionsTab from "./CashierRestrictionsTab";

type EditMap = Record<number, { cash: string; fuel: string; cashless: string; bonus: string; tickets: string }>;

export default function CashierPage() {
  const { user, hasAccess } = useAuth();
  const [tab, setTab] = useState<TabMode>("cashier");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [summary, setSummary] = useState<CashierSummary>({
    total_cash: 0, total_cashless: 0, total_lunch: 0, total_fuel_cost: 0,
    garage_daily_expenses: 5000, duty_car_shift_pay: 0,
    duty_car_fuel_liters: 0, duty_car_fuel_cost: 0, fuel_price: 72, ticket_price: 35, total_bonus: 0,
  });
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<EditMap>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const canManageRestrictions = hasAccess("cash_restrictions");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getCashierReport(date);
    const r: ScheduleRow[] = data.rows || [];
    setRows(r);
    const map: EditMap = {};
    r.forEach(row => {
      map[row.schedule_entry_id] = {
        cash: row.cash_manual != null ? String(row.cash_manual) : (Number(row.cash_total) > 0 ? String(row.cash_total) : ""),
        fuel: Number(row.fuel_cash_amount) > 0 ? String(row.fuel_cash_amount) : "",
        cashless: Number(row.cashless_amount) > 0 ? String(row.cashless_amount) : "",
        bonus: Number(row.bonus_cash) > 0 ? String(row.bonus_cash) : "",
        tickets: row.tickets_sold != null ? String(row.tickets_sold) : "",
      };
    });
    setEdits(map);
    setSummary({
      total_cash: Number(data.total_cash) || 0,
      total_cashless: Number(data.total_cashless) || 0,
      total_lunch: Number(data.total_lunch) || 0,
      total_fuel_cost: Number(data.total_fuel_cost) || 0,
      garage_daily_expenses: Number(data.garage_daily_expenses) || 5000,
      duty_car_shift_pay: Number(data.duty_car_shift_pay) || 0,
      duty_car_fuel_liters: Number(data.duty_car_fuel_liters) || 0,
      duty_car_fuel_cost: Number(data.duty_car_fuel_cost) || 0,
      fuel_price: Number(data.fuel_price) || 72,
      ticket_price: Number(data.ticket_price) || 35,
      total_bonus: Number(data.total_bonus) || 0,
    });
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const updateField = (id: number, field: keyof EditMap[number], value: string) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveRow = useCallback(async (row: ScheduleRow) => {
    const e = edits[row.schedule_entry_id];
    if (!e) return;
    setSavingId(row.schedule_entry_id);
    const cashVal = parseFloat(e.cash) || 0;
    const cashlessVal = parseFloat(e.cashless) || 0;
    const fuelVal = parseFloat(e.fuel) || 0;
    const bonusVal = parseFloat(e.bonus) || 0;
    const ticketsNum = e.tickets ? parseInt(e.tickets) : (summary.ticket_price > 0 && cashVal > 0 ? Math.floor(cashVal / summary.ticket_price) : null);
    const fpVal = summary.fuel_price || 72;
    const fuelLiters = fuelVal > 0 && fpVal > 0 ? Math.round((fuelVal / fpVal) * 100) / 100 : null;
    const revenue = cashVal + cashlessVal + bonusVal;

    await Promise.all([
      api.saveCashierReport({
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
        notes: null,
        created_by: user?.full_name || null,
        fuel_cash_amount: fuelVal,
        fuel_liters: fuelLiters,
        fuel_price_per_liter: fpVal,
        tickets_sold: ticketsNum,
        bonus_cash: bonusVal,
        cash_manual: cashVal > 0 ? cashVal : null,
        bills_5000: 0, bills_2000: 0, bills_1000: 0, bills_500: 0,
        bills_200: 0, bills_100: 0, bills_50: 0, bills_10: 0,
        coins_10: 0, coins_5: 0, coins_2: 0, coins_1: 0,
      }),
      api.patchScheduleRevenue({
        id: row.schedule_entry_id,
        revenue_cash: cashVal,
        revenue_cashless: cashlessVal,
        revenue_total: revenue,
        fuel_spent: fuelLiters,
        fuel_price_override: fpVal,
        tickets_sold: ticketsNum,
      }),
    ]);
    setSavingId(null);
    load();
  }, [edits, date, summary, user, load]);

  const scheduleAutoSave = useCallback((row: ScheduleRow) => {
    const id = row.schedule_entry_id;
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => saveRow(row), 1500);
  }, [saveRow]);

  const handleBlur = (row: ScheduleRow) => {
    if (saveTimers.current[row.schedule_entry_id]) {
      clearTimeout(saveTimers.current[row.schedule_entry_id]);
    }
    saveRow(row);
  };

  const getRowCalc = (row: ScheduleRow) => {
    const e = edits[row.schedule_entry_id];
    if (!e) return { cash: 0, cashless: 0, fuel: 0, bonus: 0, revenue: 0 };
    const cash = parseFloat(e.cash) || 0;
    const cashless = parseFloat(e.cashless) || 0;
    const fuel = parseFloat(e.fuel) || 0;
    const bonus = parseFloat(e.bonus) || 0;
    return { cash, cashless, fuel, bonus, revenue: cash + cashless + bonus };
  };

  const liveTotal = rows.reduce((acc, r) => {
    const c = getRowCalc(r);
    return { cash: acc.cash + c.cash, cashless: acc.cashless + c.cashless, fuel: acc.fuel + c.fuel, bonus: acc.bonus + c.bonus, revenue: acc.revenue + c.revenue };
  }, { cash: 0, cashless: 0, fuel: 0, bonus: 0, revenue: 0 });

  const dutyTotal = summary.duty_car_shift_pay + summary.duty_car_fuel_cost;
  const totalToSubmit = liveTotal.revenue - summary.total_lunch - summary.garage_daily_expenses - dutyTotal;

  const cellCls = "px-1 py-0 border-r border-neutral-100";
  const inputCls = "w-full bg-transparent text-right text-xs font-mono py-1.5 px-1 focus:outline-none focus:bg-blue-50 tabular-nums";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Касса</h1>
        <div className="flex items-center gap-2">
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
        <CashierRestrictionsTab />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => { const dt = new Date(date); dt.setDate(dt.getDate() - 1); setDate(dt.toISOString().slice(0, 10)); }}
              className="border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors">
              <Icon name="ChevronLeft" size={16} />
            </button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500" />
            <button onClick={() => { const dt = new Date(date); dt.setDate(dt.getDate() + 1); setDate(dt.toISOString().slice(0, 10)); }}
              className="border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors">
              <Icon name="ChevronRight" size={16} />
            </button>
            <span className="text-xs text-neutral-400">
              {rows.filter(r => r.report_id != null).length} из {rows.length} внесено
            </span>
            {savingId && <span className="text-xs text-blue-500 flex items-center gap-1"><Icon name="Loader2" size={12} className="animate-spin" />сохранение...</span>}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Наличные</div>
              <div className="text-xl font-bold text-green-700">{fmt(liveTotal.cash)} ₽</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Безналичные</div>
              <div className="text-xl font-bold text-blue-700">{fmt(liveTotal.cashless)} ₽</div>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              <div className="text-xs text-neutral-600 font-medium uppercase tracking-wide mb-1">Выручка</div>
              <div className="text-xl font-bold text-neutral-900">{fmt(liveTotal.revenue)} ₽</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3">
              <div className="text-xs text-emerald-700 font-medium uppercase tracking-wide mb-1">К сдаче</div>
              <div className="text-xl font-bold text-emerald-700">{fmt(totalToSubmit)} ₽</div>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-neutral-400 text-center py-8">В расписании на эту дату нет записей</div>
          ) : (
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-800 text-neutral-200">
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 w-7">№</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Марш.</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Борт</th>
                      <th className="px-2 py-2 text-left font-semibold border-r border-neutral-700 min-w-[120px]">Экипаж</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap w-14">Билеты</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap text-blue-300 w-20">Безнал</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap text-green-300 w-20">Нал</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap text-amber-300 w-20">ДТ ₽</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap text-purple-300 w-20">В плюс</th>
                      <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap bg-yellow-900/30 w-20">Выручка</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap w-12">Огр.</th>
                      <th className="px-2 py-2 text-center font-semibold w-8">↓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const e = edits[row.schedule_entry_id];
                      const calc = getRowCalc(row);
                      const hasRestriction = !!row.restriction;
                      const isSaving = savingId === row.schedule_entry_id;
                      const crew = [row.driver_name, row.conductor_name].filter(Boolean).join(" / ");
                      return (
                        <tr key={row.schedule_entry_id}
                          className={`border-b border-neutral-100 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"} ${
                            hasRestriction && row.restriction!.restriction_type === "block" ? "bg-red-50/40" : hasRestriction ? "bg-orange-50/30" : ""
                          }`}>
                          <td className="px-1.5 py-1.5 text-center text-neutral-400 border-r border-neutral-100 font-mono">{i + 1}</td>
                          <td className="px-1.5 py-1.5 text-center border-r border-neutral-100 font-semibold text-neutral-800 whitespace-nowrap">
                            {row.route_number}{row.graph_number != null ? `/${row.graph_number}` : ""}
                            {row.is_overtime && <span className="ml-0.5 text-[8px] text-violet-600">П</span>}
                          </td>
                          <td className="px-1.5 py-1.5 text-center border-r border-neutral-100 font-mono text-neutral-700 text-[10px]">{row.board_number || "—"}</td>
                          <td className="px-1.5 py-1.5 border-r border-neutral-100 text-neutral-700 truncate max-w-[140px]" title={crew}>{crew || "—"}</td>
                          <td className={cellCls}>
                            <input type="number" min="0" step="1"
                              value={e?.tickets ?? ""}
                              onChange={ev => { updateField(row.schedule_entry_id, "tickets", ev.target.value); scheduleAutoSave(row); }}
                              onBlur={() => handleBlur(row)}
                              placeholder={calc.cash > 0 && summary.ticket_price > 0 ? String(Math.floor(calc.cash / summary.ticket_price)) : "—"}
                              className={`${inputCls} text-center text-indigo-700`} />
                          </td>
                          <td className={cellCls}>
                            <input type="number" min="0" step="0.01"
                              value={e?.cashless ?? ""}
                              onChange={ev => { updateField(row.schedule_entry_id, "cashless", ev.target.value); scheduleAutoSave(row); }}
                              onBlur={() => handleBlur(row)}
                              placeholder="0"
                              className={`${inputCls} text-blue-700`} />
                          </td>
                          <td className={cellCls + " bg-green-50/40"}>
                            <input type="number" min="0" step="0.01"
                              value={e?.cash ?? ""}
                              onChange={ev => { updateField(row.schedule_entry_id, "cash", ev.target.value); scheduleAutoSave(row); }}
                              onBlur={() => handleBlur(row)}
                              placeholder="0"
                              className={`${inputCls} text-green-700 font-semibold`} />
                          </td>
                          <td className={cellCls + " bg-amber-50/30"}>
                            <input type="number" min="0" step="0.01"
                              value={e?.fuel ?? ""}
                              onChange={ev => { updateField(row.schedule_entry_id, "fuel", ev.target.value); scheduleAutoSave(row); }}
                              onBlur={() => handleBlur(row)}
                              placeholder="0"
                              className={`${inputCls} text-amber-700`} />
                          </td>
                          <td className={cellCls + " bg-purple-50/30"}>
                            <input type="number" min="0" step="0.01"
                              value={e?.bonus ?? ""}
                              onChange={ev => { updateField(row.schedule_entry_id, "bonus", ev.target.value); scheduleAutoSave(row); }}
                              onBlur={() => handleBlur(row)}
                              placeholder="0"
                              className={`${inputCls} text-purple-700`} />
                          </td>
                          <td className="px-1.5 py-1.5 text-right border-r border-neutral-100 font-bold font-mono text-neutral-900 bg-yellow-50/50 text-xs tabular-nums">
                            {calc.revenue > 0 ? fmt(calc.revenue) : "—"}
                          </td>
                          <td className="px-1 py-1.5 text-center border-r border-neutral-100">
                            {hasRestriction ? (
                              <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                                row.restriction!.restriction_type === "block" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                              }`} title={row.restriction!.reason}>
                                {row.restriction!.restriction_type === "block" ? "⛔" : "⚠"}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            {isSaving ? (
                              <Icon name="Loader2" size={12} className="animate-spin text-blue-500 mx-auto" />
                            ) : (
                              <button onClick={() => saveRow(row)}
                                className="text-neutral-300 hover:text-green-600 cursor-pointer transition-colors"
                                title="Сохранить">
                                <Icon name="Check" size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-800 text-white font-bold text-xs">
                      <td colSpan={4} className="border border-neutral-600 px-2 py-2 text-center">ИТОГО ({rows.length} ТС)</td>
                      <td className="border border-neutral-600 px-2 py-2 text-center font-mono">
                        {rows.reduce((s, r) => s + (parseInt(edits[r.schedule_entry_id]?.tickets || "0") || (getRowCalc(r).cash > 0 && summary.ticket_price > 0 ? Math.floor(getRowCalc(r).cash / summary.ticket_price) : 0)), 0) || "—"}
                      </td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-blue-300 font-mono">{liveTotal.cashless > 0 ? fmt(liveTotal.cashless) : "—"}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-green-300 font-mono">{fmt(liveTotal.cash)}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-amber-300 font-mono">{liveTotal.fuel > 0 ? fmt(liveTotal.fuel) : "—"}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-purple-300 font-mono">{liveTotal.bonus > 0 ? fmt(liveTotal.bonus) : "—"}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-yellow-300 font-mono">{fmt(liveTotal.revenue)}</td>
                      <td className="border border-neutral-600 px-2 py-2" colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="border-t-2 border-neutral-300 bg-neutral-50 px-4 py-3">
                <div className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Расходы</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs max-w-lg">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Хознужды гаража:</span>
                    <span className="font-semibold text-red-600">−{fmt(summary.garage_daily_expenses)} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Обеды:</span>
                    <span className="font-semibold text-orange-600">−{fmt(summary.total_lunch)} ₽</span>
                  </div>
                  {summary.duty_car_shift_pay > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Дежурка (смена):</span>
                      <span className="font-semibold text-red-600">−{fmt(summary.duty_car_shift_pay)} ₽</span>
                    </div>
                  )}
                  {summary.duty_car_fuel_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Дежурка (ДТ):</span>
                      <span className="font-semibold text-red-600">−{fmt(summary.duty_car_fuel_cost)} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between col-span-2 border-t border-neutral-300 pt-1 mt-1">
                    <span className="font-bold text-neutral-800">К сдаче в банк:</span>
                    <span className={`font-bold text-base ${totalToSubmit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmt(totalToSubmit)} ₽</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
