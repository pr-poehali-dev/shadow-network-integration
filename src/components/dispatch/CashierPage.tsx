import { useState, useEffect, useCallback, Fragment } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import { ScheduleRow, CashierSummary, BILLS, fmt, today, TabMode } from "./cashierTypes";
import CashierBillsForm from "./CashierBillsForm";
import CashierRestrictionsTab from "./CashierRestrictionsTab";

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
  const [activeForm, setActiveForm] = useState<ScheduleRow | null>(null);

  const canManageRestrictions = hasAccess("cash_restrictions");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getCashierReport(date);
    setRows(data.rows || []);
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

  const filledCount = rows.filter(r => r.report_id != null).length;
  const totalGrand = summary.total_cash + summary.total_cashless + summary.total_bonus;

  // Итоговая сумма к сдаче = выручка − обеды − хознужды − дежурка (оплата + ДТ)
  const dutyTotal = summary.duty_car_shift_pay + summary.duty_car_fuel_cost;
  const totalToSubmit = totalGrand - summary.total_lunch - summary.garage_daily_expenses - dutyTotal;

  // Сводная покупюрная
  const billTotals = BILLS.map(b => {
    const qty = rows.reduce((s, r) => s + (Number((r as Record<string, unknown>)[b.key]) || 0), 0);
    return { ...b, qty, sum: qty * b.value };
  });

  function handlePrint() {
    const [y, m, d] = date.split("-");
    const dateLabel = `${d}.${m}.${y}`;
    const filledRows = rows.filter(r => r.report_id != null);

    const vehicleRows = filledRows.map((r, i) => {
      const cash = Number(r.cash_total) || 0;
      const cashless = Number(r.cashless_amount) || 0;
      const pBonus = Number(r.bonus_cash) || 0;
      const revenue = cash + cashless + pBonus;
      const lunch = Number(r.lunch_amount) || 0;
      const fuel = Number(r.fuel_cost) || 0;
      const toSubmit = revenue - lunch - fuel;
      const crew = [r.driver_name, r.conductor_name].filter(Boolean).join(" / ");
      return `<tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
        <td class="c">${i + 1}</td>
        <td class="c">${r.route_number}${r.graph_number != null ? ` / ${r.graph_number}` : ""}</td>
        <td class="c">${r.board_number || "—"}</td>
        <td>${crew || "—"}</td>
        <td class="c">${r.tickets_sold != null ? r.tickets_sold : "—"}</td>
        <td class="r">${cashless > 0 ? cashless.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
        <td class="r">${cash.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
        <td class="r" style="color:#7c3aed">${pBonus > 0 ? pBonus.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
        <td class="r bold">${revenue.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
        <td class="c">${lunch > 0 ? lunch.toLocaleString("ru-RU", { minimumFractionDigits: 0 }) : "—"}</td>
        <td class="c">${fuel > 0 ? fuel.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
        <td class="c">${r.is_overtime ? "✓" : ""}</td>
        <td class="r bold green">${toSubmit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
      </tr>`;
    }).join("");

    const billRowsHtml = billTotals.filter(b => b.qty > 0).map(b =>
      `<tr><td>${b.label}</td><td class="c">× ${b.qty}</td><td class="r bold">${b.sum.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Кассовый отчёт ${dateLabel}</title>
<style>
body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:15px}
h1{font-size:15px;margin-bottom:3px}
h2{font-size:12px;margin:14px 0 5px;color:#444;border-bottom:1px solid #e5e7eb;padding-bottom:3px}
table{border-collapse:collapse;width:100%;margin-bottom:10px}
th{background:#f3f4f6;padding:4px 6px;border:1px solid #d1d5db;font-size:10px;white-space:nowrap}
td{padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;white-space:nowrap}
.c{text-align:center}.r{text-align:right}.bold{font-weight:700}
.green{color:#16a34a}.blue{color:#2563eb}.red{color:#dc2626}
.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0 14px}
.sbox{border:1px solid #e5e7eb;border-radius:4px;padding:7px 10px}
.sbox .lbl{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.04em}
.sbox .val{font-size:16px;font-weight:700;margin-top:2px}
.footer{margin-top:30px;font-size:10px;color:#888;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between}
@media print{@page{size:A4 landscape;margin:8mm}}
</style></head><body>
<h1>Кассовый отчёт за ${dateLabel}</h1>
<p style="color:#666;font-size:10px">Кассир: ${user?.full_name || "—"} · Сформировано: ${new Date().toLocaleString("ru-RU")}</p>

<div class="summary-grid">
  <div class="sbox"><div class="lbl">Наличные</div><div class="val green">${summary.total_cash.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</div></div>
  <div class="sbox"><div class="lbl">Безналичные</div><div class="val blue">${summary.total_cashless.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</div></div>
  <div class="sbox"><div class="lbl">Итого выручка</div><div class="val">${totalGrand.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</div></div>
  <div class="sbox"><div class="lbl">Итого к сдаче</div><div class="val green">${totalToSubmit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</div></div>
</div>

<h2>Сводная ведомость по ТС (${filledRows.length} ТС)</h2>
<table>
<thead><tr>
  <th class="c">№</th>
  <th class="c">Маршрут / Граф.</th>
  <th class="c">Борт</th>
  <th>ФИО экипажа</th>
  <th class="c">Билеты</th>
  <th class="r">Безнал, ₽</th>
  <th class="r">Нал, ₽</th>
  <th class="r">В плюс, ₽</th>
  <th class="r">Выручка, ₽</th>
  <th class="c">Обед, ₽</th>
  <th class="c">Расход ДТ, ₽</th>
  <th class="c">Подраб.</th>
  <th class="r">К сдаче, ₽</th>
</tr></thead>
<tbody>
${vehicleRows}
<tr style="background:#f3f4f6;font-weight:700">
  <td colspan="5" class="c">ИТОГО</td>
  <td class="r blue">${summary.total_cashless.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
  <td class="r green">${summary.total_cash.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
  <td class="r" style="color:#7c3aed">${summary.total_bonus > 0 ? summary.total_bonus.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
  <td class="r">${totalGrand.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
  <td class="c">${summary.total_lunch.toLocaleString("ru-RU", { minimumFractionDigits: 0 })}</td>
  <td class="c">${summary.total_fuel_cost.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
  <td></td>
  <td class="r green">${totalToSubmit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td>
</tr>
</tbody></table>

<h2>Ежедневные расходы</h2>
<table style="max-width:420px">
<tbody>
  <tr><td>Хознужды гаража</td><td class="r bold red">−${summary.garage_daily_expenses.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>
  <tr><td>Дежурный автомобиль (оплата смены)</td><td class="r bold red">−${summary.duty_car_shift_pay.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>
  <tr><td>Дежурный автомобиль (ДТ ${summary.duty_car_fuel_liters} л × ${summary.fuel_price} ₽)</td><td class="r bold red">−${summary.duty_car_fuel_cost.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>
  <tr><td>Обеды экипажей</td><td class="r bold red">−${summary.total_lunch.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>
  <tr style="background:#f3f4f6;font-weight:700"><td>ИТОГО К СДАЧЕ В БАНК</td><td class="r green">${totalToSubmit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>
</tbody></table>

<h2>Покупюрная ведомость для банка</h2>
<table style="max-width:340px">
<thead><tr><th>Номинал</th><th class="c">Кол-во</th><th class="r">Сумма, ₽</th></tr></thead>
<tbody>
${billRowsHtml}
<tr style="background:#f3f4f6;font-weight:700"><td colspan="2">Итого наличных</td><td class="r green">${summary.total_cash.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td></tr>
</tbody></table>

<div class="footer">
  <span>Кассир: _____________________________ / ${user?.full_name || "___________________"} /</span>
  <span>Руководитель: _____________________________</span>
  <span>Дата: _____________________________</span>
</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Касса</h1>
        <div className="flex items-center gap-2">
          {tab === "cashier" && filledCount > 0 && (
            <button onClick={handlePrint}
              className="flex items-center gap-2 border border-neutral-300 text-neutral-700 text-sm px-3 py-2 rounded hover:bg-neutral-100 transition-colors cursor-pointer">
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
        <CashierRestrictionsTab />
      ) : (
        <>
          {/* Дата */}
          <div className="flex items-center gap-3">
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().slice(0, 10)); }}
              className="border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors">
              <Icon name="ChevronLeft" size={16} />
            </button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500" />
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().slice(0, 10)); }}
              className="border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors">
              <Icon name="ChevronRight" size={16} />
            </button>
            <span className="text-xs text-neutral-400">{filledCount} из {rows.length} внесено</span>
          </div>

          {/* Карточки итогов */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Наличные</div>
              <div className="text-xl font-bold text-green-700">{fmt(summary.total_cash)} ₽</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Безналичные</div>
              <div className="text-xl font-bold text-blue-700">{fmt(summary.total_cashless)} ₽</div>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              <div className="text-xs text-neutral-600 font-medium uppercase tracking-wide mb-1">Итого выручка</div>
              <div className="text-xl font-bold text-neutral-900">{fmt(totalGrand)} ₽</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3">
              <div className="text-xs text-emerald-700 font-medium uppercase tracking-wide mb-1">К сдаче в банк</div>
              <div className="text-xl font-bold text-emerald-700">{fmt(totalToSubmit)} ₽</div>
            </div>
          </div>

          {/* СВОДНАЯ ТАБЛИЦА Excel-стиль */}
          {filledCount > 0 && (
            <div className="border border-neutral-300 rounded-lg overflow-hidden">
              <div className="bg-neutral-800 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2">
                <Icon name="Table" size={14} />
                Сводная ведомость за {(() => { const [y,m,d] = date.split("-"); return `${d}.${m}.${y}`; })()}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b-2 border-neutral-300">
                      <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-neutral-700 w-8">№</th>
                      <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-neutral-700 whitespace-nowrap">Маршрут / Граф.</th>
                      <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-neutral-700 whitespace-nowrap">Борт</th>
                      <th className="border border-neutral-300 px-2 py-2 text-left font-semibold text-neutral-700 min-w-[160px]">ФИО экипажа</th>
                      <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-neutral-700 whitespace-nowrap">Билеты</th>
                      <th className="border border-neutral-300 px-2 py-2 text-right font-semibold text-blue-700 whitespace-nowrap">Безнал, ₽</th>
                      <th className="border border-neutral-300 px-2 py-2 text-right font-semibold text-green-700 whitespace-nowrap">Нал, ₽</th>
                      <th className="border border-neutral-300 px-2 py-2 text-right font-semibold text-amber-700 whitespace-nowrap bg-amber-50">ДТ, ₽</th>
                      <th className="border border-neutral-300 px-2 py-2 text-right font-semibold text-purple-700 whitespace-nowrap">В плюс, ₽</th>
                      <th className="border border-neutral-300 px-2 py-2 text-right font-semibold text-neutral-700 whitespace-nowrap bg-yellow-50">Выручка, ₽</th>
                      <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-orange-700 whitespace-nowrap">Обед, ₽</th>
                      <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-violet-700 whitespace-nowrap">Подраб.</th>
                      <th className="border border-neutral-300 px-2 py-2 text-right font-semibold text-emerald-700 whitespace-nowrap bg-emerald-50">К сдаче, ₽</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.report_id != null).map((r, i) => {
                      const cash = Number(r.cash_total) || 0;
                      const cashless = Number(r.cashless_amount) || 0;
                      const rBonus = Number(r.bonus_cash) || 0;
                      const revenue = cash + cashless + rBonus;
                      const lunch = Number(r.lunch_amount) || 0;
                      const fuel = Number(r.fuel_cost) || 0;
                      const toSubmit = revenue - lunch - fuel;
                      const crew = [r.driver_name, r.conductor_name].filter(Boolean).join(" / ");
                      return (
                        <tr key={r.schedule_entry_id}
                          className={`border-b border-neutral-200 hover:bg-blue-50/30 cursor-pointer transition-colors ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}
                          onClick={() => setActiveForm(r)}>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center text-neutral-500">{i + 1}</td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center font-semibold text-neutral-800">
                            {r.route_number}{r.graph_number != null ? ` / ${r.graph_number}` : ""}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center font-mono text-neutral-700">{r.board_number || "—"}</td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-neutral-800">
                            <div>{crew || "—"}</div>
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center text-neutral-700">
                            {r.tickets_sold != null ? r.tickets_sold : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-right text-blue-700 font-mono">
                            {cashless > 0 ? fmt(cashless) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-right text-green-700 font-mono">
                            {cash > 0 ? fmt(cash) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-right text-amber-700 font-mono bg-amber-50/50">
                            {fuel > 0 ? fmt(fuel) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-right text-purple-700 font-mono">
                            {rBonus > 0 ? fmt(rBonus) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-right font-bold text-neutral-900 bg-yellow-50 font-mono">
                            {fmt(revenue)}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center text-orange-700 font-mono">
                            {lunch > 0 ? `−${lunch.toLocaleString("ru-RU")}` : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center">
                            {r.is_overtime ? (
                              <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">✓</span>
                            ) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className={`border border-neutral-200 px-2 py-1.5 text-right font-bold font-mono bg-emerald-50 ${toSubmit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                            {fmt(toSubmit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-800 text-white font-bold text-xs">
                      <td colSpan={5} className="border border-neutral-600 px-2 py-2 text-center">ИТОГО ({rows.filter(r => r.report_id != null).length} ТС)</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-blue-300 font-mono">{fmt(summary.total_cashless)}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-green-300 font-mono">{fmt(summary.total_cash)}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-amber-300 font-mono">{fmt(summary.total_fuel_cost)}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-purple-300 font-mono">{summary.total_bonus > 0 ? fmt(summary.total_bonus) : "—"}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-yellow-300 font-mono">{fmt(totalGrand)}</td>
                      <td className="border border-neutral-600 px-2 py-2 text-center text-orange-300 font-mono">−{fmt(summary.total_lunch)}</td>
                      <td className="border border-neutral-600 px-2 py-2"></td>
                      <td className="border border-neutral-600 px-2 py-2 text-right text-emerald-300 font-mono">{fmt(totalToSubmit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Ежедневные расходы под таблицей */}
              <div className="border-t-2 border-neutral-300 bg-neutral-50 px-4 py-3">
                <div className="text-xs font-semibold text-neutral-600 mb-2 uppercase tracking-wide">Ежедневные расходы</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs max-w-lg">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Хознужды гаража (ежедн.):</span>
                    <span className="font-semibold text-red-600">−{fmt(summary.garage_daily_expenses)} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Обеды экипажей:</span>
                    <span className="font-semibold text-orange-600">−{fmt(summary.total_lunch)} ₽</span>
                  </div>
                  {summary.duty_car_shift_pay > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Дежурка — оплата смены:</span>
                      <span className="font-semibold text-red-600">−{fmt(summary.duty_car_shift_pay)} ₽</span>
                    </div>
                  )}
                  {summary.duty_car_fuel_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Дежурка — ДТ ({summary.duty_car_fuel_liters} л × {summary.fuel_price} ₽):</span>
                      <span className="font-semibold text-red-600">−{fmt(summary.duty_car_fuel_cost)} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between col-span-2 border-t border-neutral-300 pt-1 mt-1">
                    <span className="font-bold text-neutral-800">Итого к сдаче в банк:</span>
                    <span className={`font-bold text-base ${totalToSubmit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmt(totalToSubmit)} ₽</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Покупюрная сводка */}
          {filledCount > 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700 border-b border-neutral-200 flex items-center gap-2">
                <Icon name="Banknote" size={14} />
                Покупюрная ведомость для банка
              </div>
              <table className="w-full text-sm max-w-sm">
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
                      <Fragment key={b.key}>
                        {showDivider && (
                          <tr>
                            <td colSpan={3} className="bg-neutral-100 px-4 py-1 text-xs text-neutral-400 font-medium border-t border-neutral-200">Монеты</td>
                          </tr>
                        )}
                        <tr className="border-t border-neutral-100">
                          <td className="px-4 py-1.5 font-medium text-neutral-800">{b.label}</td>
                          <td className="px-4 py-1.5 text-center font-mono text-neutral-600">
                            {b.qty > 0 ? `× ${b.qty}` : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className={`px-4 py-1.5 text-right font-mono ${b.sum > 0 ? "text-neutral-900 font-semibold" : "text-neutral-300"}`}>
                            {b.sum > 0 ? `= ${fmt(b.sum)}` : "—"}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                  <tr className="border-t-2 border-neutral-300 bg-neutral-50">
                    <td colSpan={2} className="px-4 py-2 font-bold text-neutral-900">Итого наличных</td>
                    <td className="px-4 py-2 text-right font-bold text-green-700 font-mono">{fmt(summary.total_cash)} ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Список ТС — таблица */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="bg-neutral-800 px-4 py-2 flex items-center gap-2">
              <Icon name="Bus" size={14} className="text-neutral-400" />
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                Транспортные средства — {rows.length} ТС
              </span>
              <span className="text-xs text-neutral-500 ml-1">· нажмите для внесения данных</span>
            </div>
            {loading ? (
              <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-neutral-400 text-center py-8">В расписании на эту дату нет записей</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-800 text-neutral-200">
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 w-8">№</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Марш. / Граф.</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Борт</th>
                      <th className="px-2 py-2 text-left font-semibold border-r border-neutral-700 min-w-[160px]">ФИО экипажа</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Билеты</th>
                      <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap text-blue-300">Безнал ₽</th>
                      <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap text-green-300">Нал ₽</th>
                      <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap text-amber-300 bg-amber-900/20">ДТ ₽</th>
                      <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap bg-yellow-900/30">Выручка ₽</th>
                      <th className="px-2 py-2 text-right font-semibold border-r border-neutral-700 whitespace-nowrap text-purple-300">В плюс ₽</th>
                      <th className="px-2 py-2 text-center font-semibold border-r border-neutral-700 whitespace-nowrap">Ограничение</th>
                      <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const hasFilled = row.report_id != null;
                      const hasRestriction = !!row.restriction;
                      const cash = Number(row.cash_total) || 0;
                      const cashless = Number(row.cashless_amount) || 0;
                      const bonus = Number(row.bonus_cash) || 0;
                      const crew = [row.driver_name, row.conductor_name].filter(Boolean).join(" / ");
                      return (
                        <tr key={row.schedule_entry_id}
                          onClick={() => setActiveForm(row)}
                          className={`border-b border-neutral-100 cursor-pointer transition-colors ${
                            i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                          } ${
                            hasRestriction && row.restriction!.restriction_type === "block"
                              ? "bg-red-50/40"
                              : hasRestriction
                              ? "bg-orange-50/40"
                              : ""
                          } hover:bg-blue-50/40`}>
                          <td className="px-2 py-2 text-center text-neutral-400 border-r border-neutral-100 font-mono">{i + 1}</td>
                          <td className="px-2 py-2 text-center border-r border-neutral-100 font-semibold text-neutral-800 whitespace-nowrap">
                            {row.route_number}{row.graph_number != null ? ` / ${row.graph_number}` : ""}
                            {row.is_overtime && <span className="ml-1 text-[9px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded">Подраб.</span>}
                          </td>
                          <td className="px-2 py-2 text-center border-r border-neutral-100 font-mono text-neutral-700">{row.board_number || "—"}</td>
                          <td className="px-2 py-2 border-r border-neutral-100 text-neutral-800">{crew || "—"}</td>
                          <td className="px-2 py-2 text-center border-r border-neutral-100">
                            {row.tickets_sold != null
                              ? <span className="font-semibold text-indigo-700 font-mono">{row.tickets_sold}</span>
                              : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="px-2 py-2 text-right border-r border-neutral-100 font-mono text-blue-700">
                            {cashless > 0 ? fmt(cashless) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="px-2 py-2 text-right border-r border-neutral-100 font-mono text-green-700">
                            {cash > 0 ? fmt(cash) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="px-2 py-2 text-right border-r border-neutral-100 font-mono text-amber-700 bg-amber-50/30">
                            {Number(row.fuel_cash_amount) > 0 ? fmt(Number(row.fuel_cash_amount)) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="px-2 py-2 text-right border-r border-neutral-100 font-bold font-mono text-neutral-900 bg-yellow-50/50">
                            {hasFilled ? fmt(cash + cashless + bonus) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="px-2 py-2 text-right border-r border-neutral-100 font-mono text-purple-700">
                            {bonus > 0 ? fmt(bonus) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="px-2 py-2 text-center border-r border-neutral-100">
                            {hasRestriction ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                row.restriction!.restriction_type === "block" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                              }`}>
                                {row.restriction!.restriction_type === "block" ? "Запрет" : "Лимит"}
                              </span>
                            ) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {hasFilled
                              ? <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">✓ внесено</span>
                              : <span className="text-[10px] bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded">ожидание</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeForm && (
        <CashierBillsForm
          row={activeForm}
          date={date}
          ticketPrice={summary.ticket_price}
          fuelPriceDefault={summary.fuel_price}
          onSaved={load}
          onClose={() => setActiveForm(null)}
        />
      )}
    </div>
  );
}