import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Route { id: number; number: string; name: string; organization?: string; max_graphs: number; }
interface Bus { id: number; board_number: string; model: string; }
interface Driver { id: number; full_name: string; }
interface Conductor { id: number; full_name: string; }
interface Terminal { id: number; number: string; name: string; organization: string; }
interface Entry {
  id: number;
  work_date: string;
  graph_number: number | null;
  route_id: number;
  route_number: string;
  route_name: string;
  route_organization?: string;
  max_graphs: number;
  bus_id: number | null;
  board_number: string | null;
  bus_model: string | null;
  driver_id: number | null;
  driver_name: string | null;
  conductor_id: number | null;
  conductor_name: string | null;
  terminal_id: number | null;
  terminal_name: string | null;
  terminal_number: string | null;
  terminal_org: string | null;
  fuel_spent: number | null;
  revenue_cash: number | null;
  revenue_cashless: number | null;
  revenue_total: number | null;
  ticket_price: number | null;
  tickets_sold: number | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function fmtMoney(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}

function handlePrint(date: string, entries: Entry[]) {
  const rows = entries.map(e => {
    const total = e.revenue_total ?? (((e.revenue_cash ?? 0) + (e.revenue_cashless ?? 0)) || null);
    return `
    <tr>
      <td>${e.route_number}${e.graph_number ? ` <small>(гр.${e.graph_number})</small>` : ""}${e.route_name ? `<br/><small>${e.route_name}</small>` : ""}</td>
      <td>${e.board_number ?? "—"}${e.bus_model ? `<br/><small>${e.bus_model}</small>` : ""}</td>
      <td>${e.driver_name ?? "—"}</td>
      <td>${e.conductor_name ?? "—"}</td>
      <td>${e.terminal_name ?? "—"}</td>
      <td style="text-align:right">${e.fuel_spent != null ? e.fuel_spent + " л" : "—"}</td>
      <td style="text-align:right">${e.revenue_cash != null ? e.revenue_cash.toFixed(2) : "—"}</td>
      <td style="text-align:right">${e.revenue_cashless != null ? e.revenue_cashless.toFixed(2) : "—"}</td>
      <td style="text-align:right; font-weight:600">${total != null ? total.toFixed(2) : "—"}</td>
      <td style="text-align:center">${e.tickets_sold ?? "—"}</td>
    </tr>
  `;}).join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Расписание ${formatDate(date)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
    h2 { font-size: 16px; margin-bottom: 4px; }
    p.sub { color: #555; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; border: 1px solid #ddd; }
    td { padding: 6px 8px; border: 1px solid #ddd; vertical-align: top; }
    td small { color: #777; font-size: 10px; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 24px; font-size: 11px; color: #aaa; text-align: right; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h2>Расписание на ${formatDate(date)}</h2>
  <p class="sub">RoutePayroll — сформировано ${new Date().toLocaleString("ru")}</p>
  <table>
    <thead>
      <tr><th>Маршрут</th><th>Борт №</th><th>Водитель</th><th>Кондуктор</th><th>Терминал</th><th style="text-align:right">ДТ, л</th><th style="text-align:right">Нал.</th><th style="text-align:right">Безнал.</th><th style="text-align:right">Итого</th><th style="text-align:center">Билеты</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Всего записей: ${entries.length}</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

function NumInput({ value, placeholder, onSave, className = "" }: {
  value: number | null; placeholder: string; onSave: (v: string) => void; className?: string;
}) {
  return (
    <input
      type="number" step="0.01" min="0"
      defaultValue={value ?? ""}
      placeholder={placeholder}
      onBlur={e => { const v = e.target.value; if ((v ? Number(v) : null) !== value) onSave(v); }}
      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500 text-right ${className}`}
    />
  );
}

export default function SchedulePage() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(false);
  const [addRouteId, setAddRouteId] = useState<string>("");
  const [addGraphNum, setAddGraphNum] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [ticketPrice, setTicketPrice] = useState(33);

  useEffect(() => {
    api.getSettings().then(s => {
      if (s?.ticket_price) setTicketPrice(Number(s.ticket_price));
    });
  }, []);

  useEffect(() => {
    Promise.all([api.getRoutes(), api.getBuses(), api.getDrivers(), api.getConductors(), api.getTerminals()])
      .then(([r, b, d, c, t]) => {
        setRoutes(Array.isArray(r) ? r : []);
        setBuses(Array.isArray(b) ? b : []);
        setDrivers(Array.isArray(d) ? d : []);
        setConductors(Array.isArray(c) ? c : []);
        setTerminals(Array.isArray(t) ? t : []);
      });
  }, []);

  const loadSchedule = async (d: string) => {
    setLoading(true);
    const data = await api.getSchedule(d);
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadSchedule(date); }, [date]);

  const handleRouteChange = (routeId: string) => {
    setAddRouteId(routeId);
    if (!routeId) { setAddGraphNum(""); return; }
    const route = routes.find(r => String(r.id) === routeId);
    if (!route) { setAddGraphNum(""); return; }
    const usedGraphs = new Set(
      entries.filter(e => e.route_id === Number(routeId)).map(e => e.graph_number)
    );
    for (let g = 1; g <= route.max_graphs; g++) {
      if (!usedGraphs.has(g)) { setAddGraphNum(String(g)); return; }
    }
    setAddGraphNum("");
  };

  const handleAddRoute = async () => {
    if (!addRouteId) return;
    setAdding(true);
    await api.createScheduleEntry({
      work_date: date,
      route_id: Number(addRouteId),
      graph_number: addGraphNum ? Number(addGraphNum) : null,
    });
    setAddRouteId("");
    setAddGraphNum("");
    await loadSchedule(date);
    setAdding(false);
  };

  const handleUpdate = async (entry: Entry, fields: Record<string, unknown>) => {
    await api.updateScheduleEntry({
      id: entry.id,
      graph_number: entry.graph_number,
      bus_id: entry.bus_id,
      driver_id: entry.driver_id,
      conductor_id: entry.conductor_id,
      terminal_id: entry.terminal_id,
      fuel_spent: entry.fuel_spent,
      revenue_cash: entry.revenue_cash,
      revenue_cashless: entry.revenue_cashless,
      revenue_total: entry.revenue_total,
      ticket_price: entry.ticket_price,
      tickets_sold: entry.tickets_sold,
      ...fields,
    });
    await loadSchedule(date);
  };

  const handleSelectUpdate = (entry: Entry, field: string, value: string) => {
    const v = value ? Number(value) : null;
    handleUpdate(entry, { [field]: v });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить строку?")) return;
    await api.deleteScheduleEntry(id);
    await loadSchedule(date);
  };

  const selectedRoute = routes.find(r => String(r.id) === addRouteId);
  const usedGraphsForRoute = new Set(
    entries.filter(e => e.route_id === Number(addRouteId)).map(e => e.graph_number)
  );
  const availableGraphs = selectedRoute
    ? Array.from({ length: selectedRoute.max_graphs }, (_, i) => i + 1).filter(g => !usedGraphsForRoute.has(g))
    : [];

  const terminalsByOrg = terminals.reduce<Record<string, Terminal[]>>((acc, t) => {
    if (!acc[t.organization]) acc[t.organization] = [];
    acc[t.organization].push(t);
    return acc;
  }, {});

  const groupedEntries: { route: Entry; items: Entry[] }[] = [];
  const seen = new Map<number, Entry[]>();
  for (const e of entries) {
    if (!seen.has(e.route_id)) { seen.set(e.route_id, []); }
    seen.get(e.route_id)!.push(e);
  }
  seen.forEach((items) => {
    groupedEntries.push({ route: items[0], items });
  });

  const calcEntryTotal = (e: Entry) => Number(e.revenue_total) || ((Number(e.revenue_cash ?? 0) + Number(e.revenue_cashless ?? 0)) || 0);
  const calcEntryTickets = (e: Entry) => {
    const t = calcEntryTotal(e);
    return t ? Math.floor(t / ticketPrice) : 0;
  };

  const dayTotalCash = entries.reduce((s, e) => s + Number(e.revenue_cash ?? 0), 0);
  const dayTotalCashless = entries.reduce((s, e) => s + Number(e.revenue_cashless ?? 0), 0);
  const dayTotalRevenue = entries.reduce((s, e) => s + calcEntryTotal(e), 0);
  const dayTotalTickets = entries.reduce((s, e) => s + calcEntryTickets(e), 0);
  const dayTotalFuel = entries.reduce((s, e) => s + Number(e.fuel_spent ?? 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Расписание на день</h2>
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
        />
        {entries.length > 0 && (
          <button onClick={() => handlePrint(date, entries)}
            className="ml-auto flex items-center gap-2 border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-700">
            <Icon name="Printer" size={15} />
            Распечатать
          </button>
        )}
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-neutral-500 block mb-1">Маршрут</label>
          <select value={addRouteId} onChange={e => handleRouteChange(e.target.value)}
            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600 bg-white">
            <option value="">— Выберите маршрут —</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>
                № {r.number}{r.name ? ` — ${r.name}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedRoute && (
          <div className="w-36">
            <label className="text-xs text-neutral-500 block mb-1">
              График
              {availableGraphs.length === 0 && <span className="text-orange-500 ml-1">(все заняты)</span>}
            </label>
            <select value={addGraphNum} onChange={e => setAddGraphNum(e.target.value)}
              className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600 bg-white">
              <option value="">— без графика —</option>
              {availableGraphs.map(g => (
                <option key={g} value={g}>График {g}</option>
              ))}
            </select>
          </div>
        )}

        <button onClick={handleAddRoute} disabled={adding || !addRouteId}
          className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
          {adding ? "Добавляю..." : "Добавить"}
        </button>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : entries.length === 0 ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Нет маршрутов на этот день — добавьте выше</div>
      ) : (
        <div className="flex flex-col gap-3">
          {groupedEntries.map(({ route, items }) => {
            const orgTerminals = terminalsByOrg[route.route_organization ?? ""] ?? terminals;
            return (
              <div key={route.route_id} className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-100 px-4 py-2 flex items-center gap-2">
                  <span className="font-bold text-sm text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    № {route.route_number}
                  </span>
                  {route.route_name && <span className="text-neutral-500 text-xs">{route.route_name}</span>}
                  <span className="text-neutral-400 text-xs ml-1">{items.length} из {route.max_graphs} гр.</span>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs tracking-wide border-b border-neutral-100">
                    <tr>
                      <th className="px-4 py-2 text-left w-20">График</th>
                      <th className="px-4 py-2 text-left">Бортовой №</th>
                      <th className="px-4 py-2 text-left">Водитель</th>
                      <th className="px-4 py-2 text-left">Кондуктор</th>
                      <th className="px-4 py-2 text-left">Терминал</th>
                      <th className="px-4 py-2 text-right w-24">ДТ, л</th>
                      <th className="px-4 py-2 text-right w-28">Выручка</th>
                      <th className="px-4 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(entry => {
                      const isExpanded = expandedId === entry.id;
                      const totalRev = (entry.revenue_cash ?? 0) + (entry.revenue_cashless ?? 0);
                      const displayTotal = entry.revenue_total ?? (totalRev || null);
                      const calcTickets = displayTotal ? Math.floor(displayTotal / ticketPrice) : null;

                      return (
                        <tr key={entry.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors align-top">
                          <td className="px-4 py-2">
                            {entry.graph_number
                              ? <span className="inline-block bg-neutral-900 text-white text-xs font-semibold px-2 py-0.5 rounded">гр. {entry.graph_number}</span>
                              : <span className="text-neutral-300 text-xs">—</span>
                            }
                          </td>
                          <td className="px-4 py-2">
                            <select value={entry.bus_id ?? ""} onChange={e => handleSelectUpdate(entry, "bus_id", e.target.value)}
                              className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                              <option value="">— не назначен —</option>
                              {buses.map(b => (
                                <option key={b.id} value={b.id}>№ {b.board_number}{b.model ? ` (${b.model})` : ""}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select value={entry.driver_id ?? ""} onChange={e => handleSelectUpdate(entry, "driver_id", e.target.value)}
                              className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                              <option value="">— не назначен —</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.full_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select value={entry.conductor_id ?? ""} onChange={e => handleSelectUpdate(entry, "conductor_id", e.target.value)}
                              className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                              <option value="">— не назначен —</option>
                              {conductors.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select value={entry.terminal_id ?? ""} onChange={e => handleSelectUpdate(entry, "terminal_id", e.target.value)}
                              className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                              <option value="">— не выбран —</option>
                              {orgTerminals.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <NumInput value={entry.fuel_spent} placeholder="л"
                              onSave={v => handleUpdate(entry, { fuel_spent: v ? Number(v) : null })} />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                              className={`flex items-center gap-1.5 w-full justify-end text-sm cursor-pointer rounded px-2 py-1.5 transition-colors ${
                                isExpanded ? "bg-neutral-200 text-neutral-900" : "hover:bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {displayTotal != null ? (
                                <span className="font-semibold">{fmtMoney(displayTotal)}</span>
                              ) : (
                                <span className="text-neutral-400">Ввести</span>
                              )}
                              <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={13} />
                            </button>
                            {isExpanded && (
                              <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded space-y-2">
                                <div>
                                  <label className="text-xs text-neutral-500 block mb-0.5">Наличные, ₽</label>
                                  <NumInput value={entry.revenue_cash} placeholder="0.00"
                                    onSave={v => {
                                      const cash = v ? Number(v) : null;
                                      const cashless = entry.revenue_cashless ?? 0;
                                      const total = (cash ?? 0) + cashless;
                                      handleUpdate(entry, {
                                        revenue_cash: cash,
                                        revenue_total: total || null,
                                        tickets_sold: total ? Math.floor(total / ticketPrice) : null,
                                      });
                                    }} />
                                </div>
                                <div>
                                  <label className="text-xs text-neutral-500 block mb-0.5">Безналичные, ₽</label>
                                  <NumInput value={entry.revenue_cashless} placeholder="0.00"
                                    onSave={v => {
                                      const cashless = v ? Number(v) : null;
                                      const cash = entry.revenue_cash ?? 0;
                                      const total = cash + (cashless ?? 0);
                                      handleUpdate(entry, {
                                        revenue_cashless: cashless,
                                        revenue_total: total || null,
                                        tickets_sold: total ? Math.floor(total / ticketPrice) : null,
                                      });
                                    }} />
                                </div>
                                <div className="pt-1 border-t border-neutral-200">
                                  <div className="flex justify-between items-center text-xs text-neutral-600 mb-1">
                                    <span>Итого привезено:</span>
                                    <span className="font-bold text-neutral-900 text-sm">{fmtMoney(displayTotal)}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-neutral-600 pt-1 border-t border-neutral-200">
                                  <span>Продано билетов <span className="text-neutral-400">(по {ticketPrice} ₽)</span>:</span>
                                  <span className="font-bold text-neutral-900 text-sm">{calcTickets ?? "—"}</span>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => handleDelete(entry.id)}
                              className="text-neutral-300 hover:text-red-500 transition-colors cursor-pointer">
                              <Icon name="Trash2" size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length > 1 && (() => {
                      const rCash = items.reduce((s, e) => s + Number(e.revenue_cash ?? 0), 0);
                      const rCashless = items.reduce((s, e) => s + Number(e.revenue_cashless ?? 0), 0);
                      const rTotal = items.reduce((s, e) => s + calcEntryTotal(e), 0);
                      const rTickets = items.reduce((s, e) => s + calcEntryTickets(e), 0);
                      const rFuel = items.reduce((s, e) => s + Number(e.fuel_spent ?? 0), 0);
                      return (
                        <tr className="bg-neutral-100 border-t border-neutral-200 font-semibold text-xs text-neutral-700">
                          <td className="px-4 py-2" colSpan={8}>
                            <span className="inline-flex flex-wrap items-center gap-3">
                              <span>Итого м. {route.route_number}:</span>
                              {rTotal > 0 && <span>{Math.round(rTotal)} ₽</span>}
                              {rCash > 0 && <span className="font-normal text-neutral-500">нал. {Math.round(rCash)} ₽</span>}
                              {rCashless > 0 && <span className="font-normal text-neutral-500">безнал. {Math.round(rCashless)} ₽</span>}
                              {rTickets > 0 && <span>{rTickets} бил.</span>}
                              {rFuel > 0 && <span className="font-normal text-neutral-500">{rFuel.toFixed(1)} л</span>}
                            </span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            );
          })}

          {entries.length > 0 && (
            <div className="border border-neutral-300 rounded bg-neutral-900 text-white px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="font-bold uppercase tracking-wide">Итого за день:</span>
              {dayTotalRevenue > 0 && <span className="text-lg font-bold">{Math.round(dayTotalRevenue)} ₽</span>}
              {dayTotalCash > 0 && <span>нал. {Math.round(dayTotalCash)} ₽</span>}
              {dayTotalCashless > 0 && <span>безнал. {Math.round(dayTotalCashless)} ₽</span>}
              {dayTotalTickets > 0 && <span>{dayTotalTickets} бил.</span>}
              {dayTotalFuel > 0 && <span>{dayTotalFuel.toFixed(1)} л</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}