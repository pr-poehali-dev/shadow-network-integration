import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Route { id: number; number: string; name: string; }
interface Bus { id: number; board_number: string; model: string; }
interface Driver { id: number; full_name: string; }
interface Conductor { id: number; full_name: string; }
interface Entry {
  id: number;
  work_date: string;
  route_id: number;
  route_number: string;
  route_name: string;
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

export default function SchedulePage() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState(false);
  const [addRouteId, setAddRouteId] = useState<string>("");
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

  const handleAddRoute = async () => {
    if (!addRouteId) return;
    setAdding(true);
    await api.createScheduleEntry({ work_date: date, route_id: Number(addRouteId) });
    setAddRouteId("");
    await loadSchedule(date);
    setAdding(false);
  };

  const handleUpdate = async (entry: Entry, field: string, value: string) => {
    await api.updateScheduleEntry({
      id: entry.id,
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

  const usedRouteIds = new Set(entries.map(e => e.route_id));
  const availableRoutes = routes.filter(r => !usedRouteIds.has(r.id));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Расписание на день</h2>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
        />
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-6 flex flex-wrap gap-3 items-center">
        <select
          value={addRouteId}
          onChange={e => setAddRouteId(e.target.value)}
          className="border border-neutral-300 rounded px-3 py-2 text-sm flex-1 min-w-[180px] focus:outline-none focus:border-neutral-600 bg-white"
        >
          <option value="">— Выберите маршрут —</option>
          {availableRoutes.map(r => (
            <option key={r.id} value={r.id}>
              {r.number}{r.name ? ` — ${r.name}` : ""}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddRoute}
          disabled={adding || !addRouteId}
          className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {adding ? "Добавляю..." : "Добавить маршрут"}
        </button>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : entries.length === 0 ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Нет маршрутов на этот день — добавьте выше</div>
      ) : (
        <div className="border border-neutral-200 rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-neutral-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Маршрут</th>
                <th className="px-4 py-3 text-left">Бортовой №</th>
                <th className="px-4 py-3 text-left">Водитель</th>
                <th className="px-4 py-3 text-left">Кондуктор</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-neutral-900 whitespace-nowrap">
                    {entry.route_number}
                    {entry.route_name && <span className="font-normal text-neutral-500 ml-1 text-xs">{entry.route_name}</span>}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={entry.bus_id ?? ""}
                      onChange={e => handleUpdate(entry, "bus_id", e.target.value)}
                      className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500"
                    >
                      <option value="">— не назначен —</option>
                      {buses.map(b => (
                        <option key={b.id} value={b.id}>{b.board_number}{b.model ? ` (${b.model})` : ""}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={entry.driver_id ?? ""}
                      onChange={e => handleUpdate(entry, "driver_id", e.target.value)}
                      className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500"
                    >
                      <option value="">— не назначен —</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.full_name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={entry.conductor_id ?? ""}
                      onChange={e => handleUpdate(entry, "conductor_id", e.target.value)}
                      className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500"
                    >
                      <option value="">— не назначен —</option>
                      {conductors.map(c => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(entry.id)} className="text-neutral-300 hover:text-red-500 cursor-pointer transition-colors">
                      <Icon name="Trash2" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
