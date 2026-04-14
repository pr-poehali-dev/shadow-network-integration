import { useState, useEffect, useCallback, Fragment } from "react";
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

  const filledRows = rows.filter(r => r.report_id != null);
  const allRows = rows; // все ТС из расписания

  // Группируем по организации
  const orgs = [...new Set(allRows.map(r => r.organization || ""))].filter(Boolean);

  const [y, m, d] = date.split("-");
  const dateLabel = `${d}.${m}.${y}`;

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Продажи</h1>
        <div className="text-xs text-neutral-400">Данные заполняются кассиром</div>
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
                  // Группируем по организации если есть несколько
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
