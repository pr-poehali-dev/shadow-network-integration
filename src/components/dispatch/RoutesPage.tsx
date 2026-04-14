import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";
import RouteGraphs from "./RouteGraphs";

interface Route {
  id: number;
  number: string;
  name: string;
  organization: string | null;
  max_graphs: number;
}

const ORGS = ['ООО "Дальавтотранс"', 'ООО "Техника и Технологии"'];

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ number: "", name: "", organization: "", max_graphs: "10" });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ number: "", name: "", organization: ORGS[0], max_graphs: "10" });
  const [saving, setSaving] = useState(false);

  const load = async (invalidate = false) => {
    setLoading(true);
    if (invalidate) catalogCache.invalidateRoutes();
    const r = await catalogCache.getRoutes();
    setRoutes(Array.isArray(r) ? r : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!addForm.number.trim()) return;
    setSaving(true);
    await api.createRoute({
      number: addForm.number.trim(),
      name: addForm.name.trim(),
      organization: addForm.organization || undefined,
      max_graphs: Number(addForm.max_graphs) || 10,
    });
    setAddForm({ number: "", name: "", organization: ORGS[0], max_graphs: "10" });
    setShowAdd(false);
    setSaving(false);
    load(true);
  };

  const handleUpdate = async () => {
    if (!editId || !editForm.number.trim()) return;
    setSaving(true);
    await api.updateRoute(editId, {
      number: editForm.number.trim(),
      name: editForm.name.trim(),
      organization: editForm.organization || undefined,
      max_graphs: Number(editForm.max_graphs) || 10,
    });
    setEditId(null);
    setSaving(false);
    load(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить маршрут и все его графики?")) return;
    await api.deleteRoute(id);
    if (expandedId === id) setExpandedId(null);
    load(true);
  };

  const grouped: Record<string, Route[]> = {};
  for (const r of routes) {
    const org = r.organization || "Без организации";
    if (!grouped[org]) grouped[org] = [];
    grouped[org].push(r);
  }
  const orgOrder = [...ORGS, "Без организации"];
  const sortedOrgs = orgOrder.filter(o => grouped[o]?.length);

  const orgBorder: Record<string, string> = {
    'ООО "Дальавтотранс"': "border-blue-200",
    'ООО "Техника и Технологии"': "border-green-200",
    "Без организации": "border-neutral-200",
  };
  const orgHeader: Record<string, string> = {
    'ООО "Дальавтотранс"': "text-blue-900 bg-blue-50 border-blue-200",
    'ООО "Техника и Технологии"': "text-green-900 bg-green-50 border-green-200",
    "Без организации": "text-neutral-600 bg-neutral-50 border-neutral-200",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Маршруты</h2>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors cursor-pointer">
            <Icon name="Plus" size={14} />
            Добавить маршрут
          </button>
        )}
      </div>

      {showAdd && (
        <div className="border border-neutral-200 rounded-lg p-4 mb-5 bg-neutral-50">
          <div className="grid grid-cols-2 gap-3 mb-3 sm:grid-cols-4">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Номер маршрута</label>
              <input value={addForm.number} onChange={e => setAddForm(f => ({ ...f, number: e.target.value }))}
                placeholder="Напр. 15А" autoFocus
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Название</label>
              <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Необязательно"
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Организация</label>
              <select value={addForm.organization} onChange={e => setAddForm(f => ({ ...f, organization: e.target.value }))}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full bg-white focus:outline-none focus:border-neutral-600">
                {ORGS.map(o => <option key={o}>{o}</option>)}
                <option value="">— без организации</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Кол-во графиков</label>
              <input type="number" min={1} max={10} value={addForm.max_graphs}
                onChange={e => setAddForm(f => ({ ...f, max_graphs: e.target.value }))}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !addForm.number.trim()}
              className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 disabled:opacity-50 transition-colors cursor-pointer">
              {saving ? "Сохраняю..." : "Добавить"}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer">
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Загрузка...</div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedOrgs.map(org => (
            <div key={org}>
              <div className={`px-4 py-2.5 rounded-t-lg border text-sm font-semibold ${orgHeader[org] ?? orgHeader["Без организации"]}`}>
                {org}
                <span className="font-normal text-xs ml-2 opacity-60">{grouped[org].length} маршр.</span>
              </div>
              <div className={`border border-t-0 rounded-b-lg overflow-hidden divide-y divide-neutral-100 ${orgBorder[org] ?? ""}`}>
                {grouped[org].map(route => (
                  <div key={route.id} className="bg-white">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors group">
                      {editId === route.id ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap" onClick={e => e.stopPropagation()}>
                          <input value={editForm.number} onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))}
                            className="border border-neutral-300 rounded px-2 py-1 text-sm w-20 focus:outline-none" autoFocus />
                          <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Название" className="border border-neutral-300 rounded px-2 py-1 text-sm w-36 focus:outline-none" />
                          <select value={editForm.organization} onChange={e => setEditForm(f => ({ ...f, organization: e.target.value }))}
                            className="border border-neutral-300 rounded px-2 py-1 text-sm bg-white focus:outline-none">
                            {ORGS.map(o => <option key={o}>{o}</option>)}
                            <option value="">— без организации</option>
                          </select>
                          <div className="flex items-center gap-1">
                            <input type="number" min={1} max={10} value={editForm.max_graphs}
                              onChange={e => setEditForm(f => ({ ...f, max_graphs: e.target.value }))}
                              className="border border-neutral-300 rounded px-2 py-1 text-sm w-14 focus:outline-none" />
                            <span className="text-xs text-neutral-400">гр.</span>
                          </div>
                          <button onClick={handleUpdate} disabled={saving}
                            className="bg-neutral-900 text-white px-3 py-1 text-xs rounded hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">
                            ОК
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="text-neutral-500 hover:text-neutral-700 cursor-pointer text-xs">
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                          onClick={() => setExpandedId(expandedId === route.id ? null : route.id)}>
                          <span className="font-bold text-sm bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                            № {route.number}
                          </span>
                          {route.name && <span className="text-neutral-500 text-sm">{route.name}</span>}
                          <span className="text-xs text-neutral-400">{route.max_graphs} гр.</span>
                          <Icon name={expandedId === route.id ? "ChevronUp" : "ChevronDown"}
                            size={14} className="ml-auto text-neutral-400" />
                        </button>
                      )}
                      {editId !== route.id && (
                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); setEditId(route.id); setEditForm({ number: route.number, name: route.name ?? "", organization: route.organization ?? "", max_graphs: String(route.max_graphs) }); setExpandedId(null); }}
                            className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                            <Icon name="Pencil" size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(route.id); }}
                            className="text-neutral-400 hover:text-red-500 cursor-pointer">
                            <Icon name="Trash2" size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    {expandedId === route.id && (
                      <div className="px-4 pb-4 bg-white">
                        <RouteGraphs route={route} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}