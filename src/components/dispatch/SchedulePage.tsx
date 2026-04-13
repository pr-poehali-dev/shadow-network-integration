import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Route { id: number; number: string; name: string; max_graphs: number; }
interface Bus { id: number; board_number: string; model: string; }
interface Driver { id: number; full_name: string; }
interface Conductor { id: number; full_name: string; }
interface Entry {
  id: number;
  work_date: string;
  graph_number: number | null;
  route_id: number;
  route_number: string;
  route_name: string;
  max_graphs: number;
  bus_id: number | null;
  board_number: string | null;
  bus_model: string | null;
  driver_id: number | null;
  driver_name: string | null;
  conductor_id: number | null;
  conductor_name: string | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function handlePrint(date: string, entries: Entry[]) {
  const rows = entries.map(e => `
    <tr>
      <td>${e.route_number}${e.graph_number ? ` <small>(гр.${e.graph_number})</small>` : ""}${e.route_name ? `<br/><small>${e.route_name}</small>` : ""}</td>
      <td>${e.board_number ?? "—"}${e.bus_model ? `<br/><small>${e.bus_model}</small>` : ""}</td>
      <td>${e.driver_name ?? "—"}</td>
      <td>${e.conductor_name ?? "—"}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Расписание ${formatDate(date)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; margin: 24px; color: #111; }
    h2 { font-size: 16px; margin-bottom: 4px; }
    p.sub { color: #555; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; border: 1px solid #ddd; }
    td { padding: 8px 10px; border: 1px solid #ddd; vertical-align: top; }
    td small { color: #777; font-size: 11px; }
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
      <tr><th>Маршрут / График</th><th>Бортовой №</th><th>Водитель</th><th>Кондуктор</th></tr>
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

export default function SchedulePage() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState(false);
  const [addRouteId, setAddRouteId] = useState<string>("");
  const [addGraphNum, setAddGraphNum] = useState<string>("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    Promise.all([api.getRoutes(), api.getBuses(), api.getDrivers(), api.getConductors()])
      .then(([r, b, d, c]) => {
        setRoutes(Array.isArray(r) ? r : []);
        setBuses(Array.isArray(b) ? b : []);
        setDrivers(Array.isArray(d) ? d : []);
        setConductors(Array.isArray(c) ? c : []);
      });
  }, []);

  const loadSchedule = async (d: string) => {
    setLoading(true);
    const data = await api.getSchedule(d);
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadSchedule(date); }, [date]);

  // При выборе маршрута — автоматически подставить следующий свободный график
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

  const handleUpdate = async (entry: Entry, field: string, value: string) => {
    await api.updateScheduleEntry({
      id: entry.id,
      graph_number: entry.graph_number,
      bus_id: field === "bus_id" ? (value ? Number(value) : null) : entry.bus_id,
      driver_id: field === "driver_id" ? (value ? Number(value) : null) : entry.driver_id,
      conductor_id: field === "conductor_id" ? (value ? Number(value) : null) : entry.conductor_id,
    });
    await loadSchedule(date);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить строку?")) return;
    await api.deleteScheduleEntry(id);
    await loadSchedule(date);
  };

  // Доступные графики для выбранного маршрута
  const selectedRoute = routes.find(r => String(r.id) === addRouteId);
  const usedGraphsForRoute = new Set(
    entries.filter(e => e.route_id === Number(addRouteId)).map(e => e.graph_number)
  );
  const availableGraphs = selectedRoute
    ? Array.from({ length: selectedRoute.max_graphs }, (_, i) => i + 1).filter(g => !usedGraphsForRoute.has(g))
    : [];

  // Группируем записи по маршруту для отображения
  const groupedEntries: { route: Entry; items: Entry[] }[] = [];
  const seen = new Map<number, Entry[]>();
  for (const e of entries) {
    if (!seen.has(e.route_id)) { seen.set(e.route_id, []); }
    seen.get(e.route_id)!.push(e);
  }
  seen.forEach((items) => {
    groupedEntries.push({ route: items[0], items });
  });

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

      {/* Форма добавления */}
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
          {groupedEntries.map(({ route, items }) => (
            <div key={route.route_id} className="border border-neutral-200 rounded overflow-hidden">
              {/* Заголовок маршрута */}
              <div className="bg-neutral-100 px-4 py-2 flex items-center gap-2">
                <span className="font-bold text-sm text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">
                  № {route.route_number}
                </span>
                {route.route_name && <span className="text-neutral-500 text-xs">{route.route_name}</span>}
                <span className="text-neutral-400 text-xs ml-1">{items.length} из {route.max_graphs} гр.</span>
              </div>

              {/* Строки графиков */}
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs tracking-wide border-b border-neutral-100">
                  <tr>
                    <th className="px-4 py-2 text-left w-24">График</th>
                    <th className="px-4 py-2 text-left">Бортовой №</th>
                    <th className="px-4 py-2 text-left">Водитель</th>
                    <th className="px-4 py-2 text-left">Кондуктор</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(entry => (
                    <tr key={entry.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-2">
                        {entry.graph_number
                          ? <span className="inline-block bg-neutral-900 text-white text-xs font-semibold px-2 py-0.5 rounded">гр. {entry.graph_number}</span>
                          : <span className="text-neutral-300 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-2">
                        <select value={entry.bus_id ?? ""} onChange={e => handleUpdate(entry, "bus_id", e.target.value)}
                          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                          <option value="">— не назначен —</option>
                          {buses.map(b => (
                            <option key={b.id} value={b.id}>№ {b.board_number}{b.model ? ` (${b.model})` : ""}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={entry.driver_id ?? ""} onChange={e => handleUpdate(entry, "driver_id", e.target.value)}
                          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                          <option value="">— не назначен —</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.full_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={entry.conductor_id ?? ""} onChange={e => handleUpdate(entry, "conductor_id", e.target.value)}
                          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                          <option value="">— не назначен —</option>
                          {conductors.map(c => (
                            <option key={c.id} value={c.id}>{c.full_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => handleDelete(entry.id)}
                          className="text-neutral-300 hover:text-red-500 transition-colors cursor-pointer">
                          <Icon name="Trash2" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
