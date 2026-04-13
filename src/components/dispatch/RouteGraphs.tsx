import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface RouteGraph {
  id: number;
  route_id: number;
  graph_number: number;
  work_date: string;
  board_number: string | null;
  gov_number: string | null;
  driver_name: string | null;
  conductor_name: string | null;
  trips_planned: number | null;
  trips_actual: number | null;
  shortage_reason: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  notes: string | null;
}

interface Route { id: number; number: string; name: string; }

const GRAPH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function fmtTime(t: string | null) {
  if (!t) return "—";
  return t.slice(0, 5);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface GraphRowProps {
  route: Route;
  graphNum: number;
  graph: RouteGraph | null;
  workDate: string;
  onSaved: () => void;
}

function GraphRow({ route, graphNum, graph, workDate, onSaved }: GraphRowProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    board_number: graph?.board_number ?? "",
    gov_number: graph?.gov_number ?? "",
    driver_name: graph?.driver_name ?? "",
    conductor_name: graph?.conductor_name ?? "",
    trips_planned: graph?.trips_planned != null ? String(graph.trips_planned) : "",
    trips_actual: graph?.trips_actual != null ? String(graph.trips_actual) : "",
    shortage_reason: graph?.shortage_reason ?? "",
    departure_time: graph?.departure_time?.slice(0, 5) ?? "",
    arrival_time: graph?.arrival_time?.slice(0, 5) ?? "",
    notes: graph?.notes ?? "",
  });

  useEffect(() => {
    setForm({
      board_number: graph?.board_number ?? "",
      gov_number: graph?.gov_number ?? "",
      driver_name: graph?.driver_name ?? "",
      conductor_name: graph?.conductor_name ?? "",
      trips_planned: graph?.trips_planned != null ? String(graph.trips_planned) : "",
      trips_actual: graph?.trips_actual != null ? String(graph.trips_actual) : "",
      shortage_reason: graph?.shortage_reason ?? "",
      departure_time: graph?.departure_time?.slice(0, 5) ?? "",
      arrival_time: graph?.arrival_time?.slice(0, 5) ?? "",
      notes: graph?.notes ?? "",
    });
    setEditing(false);
  }, [graph, workDate]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const hasShortage = form.trips_planned && form.trips_actual &&
    Number(form.trips_actual) < Number(form.trips_planned);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      route_id: route.id,
      graph_number: graphNum,
      work_date: workDate,
      board_number: form.board_number || null,
      gov_number: form.gov_number || null,
      driver_name: form.driver_name || null,
      conductor_name: form.conductor_name || null,
      trips_planned: form.trips_planned ? Number(form.trips_planned) : null,
      trips_actual: form.trips_actual ? Number(form.trips_actual) : null,
      shortage_reason: form.shortage_reason || null,
      departure_time: form.departure_time || null,
      arrival_time: form.arrival_time || null,
      notes: form.notes || null,
    };
    if (graph?.id) {
      await api.updateRouteGraph(graph.id, payload);
    } else {
      await api.saveRouteGraph(payload);
    }
    setSaving(false);
    setEditing(false);
    onSaved();
  };

  const isEmpty = !graph?.board_number && !graph?.driver_name;

  if (!editing) {
    return (
      <tr className={`border-t border-neutral-100 hover:bg-neutral-50 transition-colors group ${isEmpty ? "opacity-50" : ""}`}>
        <td className="px-3 py-2 text-center text-xs font-semibold text-neutral-500 w-10">
          {graphNum}
        </td>
        <td className="px-3 py-2 text-xs">
          {graph?.board_number
            ? <span className="font-mono font-semibold text-neutral-800">{graph.board_number}</span>
            : <span className="text-neutral-300">—</span>}
          {graph?.gov_number && <div className="text-neutral-400 text-xs">{graph.gov_number}</div>}
        </td>
        <td className="px-3 py-2 text-xs text-neutral-700">
          {graph?.driver_name || <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-neutral-700">
          {graph?.conductor_name || <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-center">
          <span className="text-neutral-500">{graph?.trips_planned ?? "—"}</span>
        </td>
        <td className="px-3 py-2 text-xs text-center">
          {graph?.trips_actual != null ? (
            <span className={`font-semibold ${hasShortage ? "text-red-600" : "text-green-700"}`}>
              {graph.trips_actual}
            </span>
          ) : <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-neutral-500 max-w-[140px]">
          {hasShortage && graph?.shortage_reason
            ? <span className="text-red-500 italic">{graph.shortage_reason}</span>
            : <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-neutral-600 text-center whitespace-nowrap">
          {graph?.departure_time ? fmtTime(graph.departure_time) : <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-3 py-2 text-xs text-neutral-600 text-center whitespace-nowrap">
          {graph?.arrival_time ? fmtTime(graph.arrival_time) : <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-3 py-2 text-right">
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            <Icon name="Pencil" size={13} />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-blue-100 bg-blue-50">
      <td className="px-3 py-2 text-center text-xs font-semibold text-neutral-500">{graphNum}</td>
      <td className="px-3 py-2" colSpan={9}>
        <div className="grid grid-cols-2 gap-2 mb-2 sm:grid-cols-4">
          <div>
            <label className="text-xs text-neutral-500 block mb-0.5">Борт №</label>
            <input value={form.board_number} onChange={e => set("board_number", e.target.value)}
              placeholder="1234" className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-0.5">Гос. номер</label>
            <input value={form.gov_number} onChange={e => set("gov_number", e.target.value)}
              placeholder="А123БВ" className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-0.5">Водитель</label>
            <input value={form.driver_name} onChange={e => set("driver_name", e.target.value)}
              placeholder="ФИО" className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-0.5">Кондуктор</label>
            <input value={form.conductor_name} onChange={e => set("conductor_name", e.target.value)}
              placeholder="ФИО" className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-0.5">Выход на линию</label>
            <input type="time" value={form.departure_time} onChange={e => set("departure_time", e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-0.5">Заход с линии</label>
            <input type="time" value={form.arrival_time} onChange={e => set("arrival_time", e.target.value)}
              className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-0.5">Рейсов по плану</label>
            <input type="number" min={0} value={form.trips_planned} onChange={e => set("trips_planned", e.target.value)}
              placeholder="0" className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs text-neutral-500 block mb-0.5">Рейсов факт</label>
            <input type="number" min={0} value={form.trips_actual} onChange={e => set("trips_actual", e.target.value)}
              placeholder="0" className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
          </div>
        </div>
        {(hasShortage) && (
          <div className="mb-2">
            <label className="text-xs text-red-600 block mb-0.5">Причина невыполнения рейсов</label>
            <input value={form.shortage_reason} onChange={e => set("shortage_reason", e.target.value)}
              placeholder="Укажите причину..." className="border border-red-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-red-400 bg-red-50" />
          </div>
        )}
        <div className="mb-2">
          <label className="text-xs text-neutral-500 block mb-0.5">Примечание</label>
          <input value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Необязательно" className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-blue-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="bg-neutral-900 text-white px-3 py-1 text-xs rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
          <button onClick={() => setEditing(false)}
            className="border border-neutral-300 px-3 py-1 text-xs rounded hover:bg-neutral-100 transition-colors cursor-pointer">
            Отмена
          </button>
        </div>
      </td>
    </tr>
  );
}

interface RouteGraphsProps {
  route: Route;
}

export default function RouteGraphs({ route }: RouteGraphsProps) {
  const [workDate, setWorkDate] = useState(todayStr());
  const [graphs, setGraphs] = useState<RouteGraph[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.getRouteGraphs(route.id, workDate);
    setGraphs(Array.isArray(r) ? r : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [route.id, workDate]);

  const getGraph = (num: number) => graphs.find(g => g.graph_number === num) ?? null;

  return (
    <div className="mt-3 border border-neutral-200 rounded-lg overflow-hidden">
      <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-2 flex items-center gap-3">
        <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Графики выходов</span>
        <input
          type="date"
          value={workDate}
          onChange={e => setWorkDate(e.target.value)}
          className="border border-neutral-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-neutral-500 ml-auto"
        />
      </div>

      {loading ? (
        <div className="text-neutral-400 text-xs py-4 text-center">Загрузка...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-neutral-100 text-neutral-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-3 py-2 text-center w-8">№</th>
                <th className="px-3 py-2 text-left">Борт / Гос №</th>
                <th className="px-3 py-2 text-left">Водитель</th>
                <th className="px-3 py-2 text-left">Кондуктор</th>
                <th className="px-3 py-2 text-center w-16">Рейсов план</th>
                <th className="px-3 py-2 text-center w-16">Факт</th>
                <th className="px-3 py-2 text-left">Причина</th>
                <th className="px-3 py-2 text-center w-16">Выход</th>
                <th className="px-3 py-2 text-center w-16">Заход</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {GRAPH_NUMBERS.map(num => (
                <GraphRow
                  key={`${route.id}-${num}-${workDate}`}
                  route={route}
                  graphNum={num}
                  graph={getGraph(num)}
                  workDate={workDate}
                  onSaved={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
