import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";
import { RouteRow } from "./settingsTypes";

export default function SettingsRoutesTable() {
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [routeEdits, setRouteEdits] = useState<Record<number, { min_vehicles: string; required_trips: string }>>({});
  const [routeSaving, setRouteSaving] = useState<number | null>(null);
  const [routeSaved, setRouteSaved] = useState<number | null>(null);

  const loadRoutes = useCallback(async () => {
    const r = await catalogCache.getRoutes();
    const arr: RouteRow[] = Array.isArray(r) ? r : [];
    setRoutes(arr);
    const edits: typeof routeEdits = {};
    arr.forEach(rt => {
      edits[rt.id] = {
        min_vehicles: rt.min_vehicles != null ? String(rt.min_vehicles) : "",
        required_trips: rt.required_trips != null ? String(rt.required_trips) : "",
      };
    });
    setRouteEdits(edits);
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const saveRoute = async (rt: RouteRow) => {
    const ed = routeEdits[rt.id];
    if (!ed) return;
    setRouteSaving(rt.id);
    await api.updateRoute(rt.id, {
      number: rt.number,
      name: rt.name,
      organization: rt.organization || undefined,
      max_graphs: rt.max_graphs,
      min_vehicles: ed.min_vehicles ? Number(ed.min_vehicles) : undefined,
      required_trips: ed.required_trips ? Number(ed.required_trips) : undefined,
    });
    catalogCache.invalidateRoutes();
    await loadRoutes();
    setRouteSaving(null);
    setRouteSaved(rt.id);
    setTimeout(() => setRouteSaved(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon name="Map" size={16} className="text-neutral-500" />
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Параметры маршрутов</span>
      </div>
      <p className="text-xs text-neutral-400 mb-3">
        Минимальное количество ТС на линии и обязательное кол-во рейсов в день для каждого маршрута.
        При нехватке ТС в Наряде будет показано предупреждение.
      </p>
      <div className="border border-neutral-200 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase border-b border-neutral-200">
            <tr>
              <th className="px-4 py-2 text-left">Маршрут</th>
              <th className="px-4 py-2 text-left">Организация</th>
              <th className="px-4 py-2 text-center w-28">Макс. гр.</th>
              <th className="px-4 py-2 text-center w-32">Мин. ТС</th>
              <th className="px-4 py-2 text-center w-36">Рейсов/день</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {routes.map((rt, i) => {
              const ed = routeEdits[rt.id] ?? { min_vehicles: "", required_trips: "" };
              const isSaving = routeSaving === rt.id;
              const isSaved = routeSaved === rt.id;
              return (
                <tr key={rt.id} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}>
                  <td className="px-4 py-2.5">
                    <span className="font-bold text-neutral-900">№ {rt.number}</span>
                    {rt.name && <span className="text-neutral-400 text-xs ml-2">{rt.name}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-neutral-500">{rt.organization ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center text-neutral-600">{rt.max_graphs}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number" min={1} max={20}
                      value={ed.min_vehicles}
                      onChange={e => setRouteEdits(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], min_vehicles: e.target.value } }))}
                      placeholder="не задано"
                      className="border border-neutral-300 rounded px-2 py-1 text-sm w-full text-center focus:outline-none focus:border-neutral-600"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number" min={1} max={100}
                      value={ed.required_trips}
                      onChange={e => setRouteEdits(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], required_trips: e.target.value } }))}
                      placeholder="не задано"
                      className="border border-neutral-300 rounded px-2 py-1 text-sm w-full text-center focus:outline-none focus:border-neutral-600"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isSaved ? (
                      <span className="text-green-600 text-xs flex items-center gap-1 justify-end">
                        <Icon name="Check" size={12} /> Сохранено
                      </span>
                    ) : (
                      <button
                        onClick={() => saveRoute(rt)}
                        disabled={isSaving}
                        className="bg-neutral-900 text-white px-3 py-1 text-xs rounded hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
                        {isSaving ? "..." : "Сохранить"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
