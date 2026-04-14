import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface SalesRow {
  schedule_entry_id: number;
  report_id: number | null;
  route_number: string;
  graph_number: number | null;
  board_number: string | null;
  driver_name: string | null;
  conductor_name: string | null;
  is_overtime: boolean;
  tickets_sold: number | null;
  fuel_spent: number | null;
  fuel_liters_total: number;
  cashless_amount: number;
  cash_total: number;
  fuel_cost: number;
  lunch_amount: number;
  organization: string | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n: number) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalesPage() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalFuelLiters, setTotalFuelLiters] = useState(0);
  const [totalCashless, setTotalCashless] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getCashierReport(date);
    const r: SalesRow[] = data.rows || [];
    setRows(r);
    setTotalTickets(r.reduce((s, row) => s + (Number(row.tickets_sold) || 0), 0));
    setTotalFuelLiters(r.reduce((s, row) => s + (Number(row.fuel_liters_total) || Number(row.fuel_spent) || 0), 0));
    setTotalCashless(Number(data.total_cashless) || 0);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const allRows = rows;
  const filledRows = rows.filter(r => r.report_id != null);
  const orgs = [...new Set(allRows.map(r => r.organization || ""))].filter(Boolean);

  const [y, m, d] = date.split("-");
  const dateLabel = `${d}.${m}.${y}`;

  function handlePrint() {
    const showOrgHeader = orgs.length > 1;
    let rowNum = 0;

    const buildTableRows = (filtered: SalesRow[]) =>
      filtered.map(r => {
        rowNum++;
        const crew = [r.driver_name, r.conductor_name].filter(Boolean).join(" / ");
        const fuelVal = Number(r.fuel_liters_total) || Number(r.fuel_spent) || 0;
        const cashless = Number(r.cashless_amount) || 0;
        const hasFilled = r.report_id != null;
        return `<tr style="background:${rowNum % 2 === 0 ? "#f9fafb" : "#fff"};${!hasFilled ? "opacity:.45;" : ""}">
          <td class="c">${rowNum}</td>
          <td class="c bold">${r.route_number}${r.graph_number != null ? ` / ${r.graph_number}` : ""}</td>
          <td class="c mono">${r.board_number || "—"}</td>
          <td>${crew || "—"}</td>
          <td class="c bold indigo">${r.tickets_sold != null ? r.tickets_sold : "—"}</td>
          <td class="c bold amber">${fuelVal > 0 ? fuelVal.toFixed(1) : "—"}</td>
          <td class="r mono blue">${cashless > 0 ? fmt(cashless) : "—"}</td>
          <td class="c">${r.is_overtime ? "✓" : "—"}</td>
        </tr>`;
      }).join("");

    let bodyRows = "";
    if (showOrgHeader) {
      orgs.forEach(org => {
        const orgRows = allRows.filter(r => (r.organization || "") === org);
        const orgTickets = orgRows.reduce((s, r) => s + (Number(r.tickets_sold) || 0), 0);
        const orgFuel = orgRows.reduce((s, r) => s + (Number(r.fuel_liters_total) || Number(r.fuel_spent) || 0), 0);
        bodyRows += `<tr style="background:#e5e7eb;border-top:2px solid #9ca3af">
          <td colspan="8" style="padding:5px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#374151">
            ${org}
            ${orgTickets > 0 ? `<span style="margin-left:12px;color:#4338ca">билеты: ${orgTickets}</span>` : ""}
            ${orgFuel > 0 ? `<span style="margin-left:12px;color:#b45309">ДТ: ${orgFuel.toFixed(1)} л</span>` : ""}
          </td>
        </tr>`;
        bodyRows += buildTableRows(orgRows);
      });
    } else {
      bodyRows = buildTableRows(allRows);
    }

    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Продажи ${dateLabel}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:15px}
  h1{font-size:15px;margin-bottom:3px}
  p.sub{font-size:10px;color:#666;margin:0 0 10px}
  .cards{display:flex;gap:12px;margin-bottom:12px}
  .card{border:1px solid #e5e7eb;border-radius:4px;padding:7px 14px;min-width:130px}
  .card .lbl{font-size:9px;color:#666;text-transform:uppercase;letter-spacing:.04em}
  .card .val{font-size:16px;font-weight:700;margin-top:1px}
  .indigo{color:#4338ca} .amber{color:#b45309} .blue{color:#1d4ed8}
  table{border-collapse:collapse;width:100%;margin-top:8px}
  th{background:#f3f4f6;padding:4px 6px;border:1px solid #d1d5db;font-size:10px;white-space:nowrap;text-align:left}
  td{padding:3px 6px;border:1px solid #e5e7eb;font-size:10px;white-space:nowrap}
  .c{text-align:center} .r{text-align:right} .bold{font-weight:700} .mono{font-family:monospace}
  tfoot tr{background:#1f2937!important;color:#fff}
  tfoot td{border-color:#374151}
  .footer{margin-top:20px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px;display:flex;justify-content:space-between}
  @media print{@page{size:A4 portrait;margin:8mm}}
</style></head><body>
<h1>Сводная таблица продаж за ${dateLabel}</h1>
<p class="sub">Сформировано: ${new Date().toLocaleString("ru-RU")} &nbsp;·&nbsp; ${filledRows.length} из ${allRows.length} ТС с отчётом кассира</p>

<div class="cards">
  <div class="card"><div class="lbl">Билетов продано</div><div class="val indigo">${totalTickets > 0 ? totalTickets : "—"}</div></div>
  <div class="card"><div class="lbl">Расход ДТ</div><div class="val amber">${totalFuelLiters > 0 ? totalFuelLiters.toFixed(1) + " л" : "—"}</div></div>
  <div class="card"><div class="lbl">Безналичные</div><div class="val blue">${totalCashless > 0 ? fmt(totalCashless) + " ₽" : "—"}</div></div>
</div>

<table>
<thead><tr>
  <th class="c" style="width:28px">№</th>
  <th class="c">Маршрут / Граф.</th>
  <th class="c">Борт</th>
  <th>ФИО экипажа</th>
  <th class="c" style="background:#eef2ff;color:#4338ca">Билеты</th>
  <th class="c" style="background:#fffbeb;color:#b45309">ДТ, л</th>
  <th class="r" style="color:#1d4ed8">Безнал, ₽</th>
  <th class="c">Подраб.</th>
</tr></thead>
<tbody>${bodyRows}</tbody>
<tfoot><tr>
  <td colspan="4" class="c bold">ИТОГО (${allRows.length} ТС)</td>
  <td class="c bold mono">${totalTickets > 0 ? totalTickets : "—"}</td>
  <td class="c bold mono">${totalFuelLiters > 0 ? totalFuelLiters.toFixed(1) : "—"}</td>
  <td class="r bold mono">${totalCashless > 0 ? fmt(totalCashless) : "—"}</td>
  <td></td>
</tr></tfoot>
</table>

<div class="footer">
  <span>Диспетчер: _____________________________</span>
  <span>Дата: ${dateLabel}</span>
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
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Продажи</h1>
        <div className="flex items-center gap-2">
          {allRows.length > 0 && (
            <button onClick={handlePrint}
              className="flex items-center gap-2 border border-neutral-300 text-neutral-700 text-sm px-3 py-2 rounded hover:bg-neutral-100 transition-colors cursor-pointer">
              <Icon name="Printer" size={15} />
              Распечатать
            </button>
          )}
          <div className="text-xs text-neutral-400">Данные заполняются кассиром</div>
        </div>
      </div>

      {/* Дата */}
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
        <span className="text-xs text-neutral-400">{dateLabel}</span>
        <button onClick={load} className="ml-2 border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors" title="Обновить">
          <Icon name="RefreshCw" size={14} />
        </button>
      </div>

      {/* Карточки итогов */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
          <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Icon name="Ticket" size={13} /> Билетов продано
          </div>
          <div className="text-2xl font-bold text-indigo-700">
            {totalTickets > 0 ? totalTickets : <span className="text-neutral-400 text-base font-normal">нет данных</span>}
          </div>
          <div className="text-xs text-indigo-400 mt-1">из {filledRows.length} ТС с отчётом</div>
        </div>
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Icon name="Fuel" size={13} /> Расход ДТ
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {totalFuelLiters > 0 ? `${totalFuelLiters.toFixed(1)} л` : <span className="text-neutral-400 text-base font-normal">нет данных</span>}
          </div>
          <div className="text-xs text-amber-400 mt-1">суммарно по всем ТС</div>
        </div>
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
          <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Icon name="CreditCard" size={13} /> Безналичные
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {totalCashless > 0 ? `${fmt(totalCashless)} ₽` : <span className="text-neutral-400 text-base font-normal">нет данных</span>}
          </div>
          <div className="text-xs text-blue-400 mt-1">с терминалов</div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-10">Загрузка...</div>
      ) : allRows.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-10">В расписании на эту дату нет записей</div>
      ) : (
        <div className="border border-neutral-300 rounded-lg overflow-hidden">
          <div className="bg-neutral-800 text-white px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
            <Icon name="BarChart2" size={14} />
            Сводная таблица продаж за {dateLabel}
            <span className="ml-auto text-xs text-neutral-400 font-normal">{filledRows.length} из {allRows.length} ТС заполнено</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b-2 border-neutral-300">
                  <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-neutral-700 w-8">№</th>
                  <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-neutral-700 whitespace-nowrap">Маршрут / Граф.</th>
                  <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-neutral-700 whitespace-nowrap">Борт</th>
                  <th className="border border-neutral-300 px-2 py-2 text-left font-semibold text-neutral-700 min-w-[150px]">ФИО экипажа</th>
                  <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-indigo-700 whitespace-nowrap bg-indigo-50">Билеты</th>
                  <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-amber-700 whitespace-nowrap bg-amber-50">ДТ, л</th>
                  <th className="border border-neutral-300 px-2 py-2 text-right font-semibold text-blue-700 whitespace-nowrap">Безнал, ₽</th>
                  <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-violet-700 whitespace-nowrap">Подраб.</th>
                  <th className="border border-neutral-300 px-2 py-2 text-center font-semibold text-neutral-500 whitespace-nowrap">Статус</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const showOrgHeader = orgs.length > 1;
                  let rowNum = 0;
                  const result: React.ReactNode[] = [];

                  const renderRows = (filtered: SalesRow[]) =>
                    filtered.map((r) => {
                      rowNum++;
                      const crew = [r.driver_name, r.conductor_name].filter(Boolean).join(" / ");
                      const hasFilled = r.report_id != null;
                      const fuelVal = Number(r.fuel_liters_total) || Number(r.fuel_spent) || 0;
                      const cashless = Number(r.cashless_amount) || 0;
                      return (
                        <tr key={r.schedule_entry_id}
                          className={`border-b border-neutral-200 ${rowNum % 2 === 0 ? "bg-neutral-50/50" : "bg-white"} ${!hasFilled ? "opacity-50" : ""}`}>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center text-neutral-400">{rowNum}</td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center font-semibold text-neutral-800">
                            {r.route_number}{r.graph_number != null ? ` / ${r.graph_number}` : ""}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center font-mono text-neutral-700">{r.board_number || "—"}</td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-neutral-800">{crew || "—"}</td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center bg-indigo-50">
                            {r.tickets_sold != null ? (
                              <span className="font-bold text-indigo-700 font-mono">{r.tickets_sold}</span>
                            ) : (
                              <span className="text-neutral-300">—</span>
                            )}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center bg-amber-50">
                            {fuelVal > 0 ? (
                              <span className="font-semibold text-amber-700 font-mono">{fuelVal.toFixed(1)}</span>
                            ) : (
                              <span className="text-neutral-300">—</span>
                            )}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-right font-mono text-blue-700">
                            {cashless > 0 ? fmt(cashless) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center">
                            {r.is_overtime ? (
                              <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">✓</span>
                            ) : <span className="text-neutral-300">—</span>}
                          </td>
                          <td className="border border-neutral-200 px-2 py-1.5 text-center">
                            {hasFilled ? (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">заполнено</span>
                            ) : (
                              <span className="text-xs bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded">ожидание</span>
                            )}
                          </td>
                        </tr>
                      );
                    });

                  if (showOrgHeader) {
                    orgs.forEach(org => {
                      const orgRows = allRows.filter(r => (r.organization || "") === org);
                      const orgTickets = orgRows.reduce((s, r) => s + (Number(r.tickets_sold) || 0), 0);
                      const orgFuel = orgRows.reduce((s, r) => s + (Number(r.fuel_liters_total) || Number(r.fuel_spent) || 0), 0);
                      result.push(
                        <tr key={`org-${org}`} className="bg-neutral-200 border-t-2 border-neutral-400">
                          <td colSpan={9} className="px-3 py-1.5 text-xs font-bold text-neutral-700 uppercase tracking-wide">
                            {org}
                            {orgTickets > 0 && <span className="ml-3 text-indigo-700">билеты: {orgTickets}</span>}
                            {orgFuel > 0 && <span className="ml-3 text-amber-700">ДТ: {orgFuel.toFixed(1)} л</span>}
                          </td>
                        </tr>
                      );
                      result.push(...renderRows(orgRows));
                    });
                  } else {
                    result.push(...renderRows(allRows));
                  }

                  return result;
                })()}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-800 text-white font-bold text-xs">
                  <td colSpan={4} className="border border-neutral-600 px-2 py-2 text-center">
                    ИТОГО ({allRows.length} ТС)
                  </td>
                  <td className="border border-neutral-600 px-2 py-2 text-center bg-indigo-900 font-mono">
                    {totalTickets > 0 ? totalTickets : "—"}
                  </td>
                  <td className="border border-neutral-600 px-2 py-2 text-center bg-amber-900 font-mono">
                    {totalFuelLiters > 0 ? `${totalFuelLiters.toFixed(1)} л` : "—"}
                  </td>
                  <td className="border border-neutral-600 px-2 py-2 text-right text-blue-300 font-mono">
                    {totalCashless > 0 ? fmt(totalCashless) : "—"}
                  </td>
                  <td colSpan={2} className="border border-neutral-600 px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
