import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import RouteGraphs from "./RouteGraphs";

interface Route { id: number; number: string; name: string; }

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ number: "", name: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ number: "", name: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.getRoutes();
    setRoutes(Array.isArray(r) ? r : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!addForm.number.trim()) return;
    setSaving(true);
    await api.createRoute({ number: addForm.number.trim(), name: addForm.name.trim() });
    setAddForm({ number: "", name: "" });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editId || !editForm.number.trim()) return;
    setSaving(true);
    await api.updateRoute(editId, { number: editForm.number.trim(), name: editForm.name.trim() });
    setEditId(null);
    setSaving(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить маршрут и все его графики?")) return;
    await api.deleteRoute(id);
    if (expandedId === id) setExpandedId(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Маршруты</h2>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <Icon name="Plus" size={14} />
            Добавить маршрут
          </button>
        )}
      </div>

      {showAdd && (
        <div className="border border-neutral-200 rounded-lg p-4 mb-4 bg-neutral-50">
          <div className="flex gap-3 mb-3">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Номер маршрута</label>
              <input
                value={addForm.number}
                onChange={e => setAddForm(f => ({ ...f, number: e.target.value }))}
                placeholder="Напр. 15А"
                className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600 w-32"
                autoFocus
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-neutral-500 block mb-1">Название</label>
              <input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Необязательно"
                className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600 w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !addForm.number.trim()}
              className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 disabled:opacity-50 transition-colors cursor-pointer">
              {saving ? "Сохраняю..." : "Добавить"}
            </button>
            <button onClick={() => { setShowAdd(false); setAddForm({ number: "", name: "" }); }}
              className="border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer">
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Загрузка...</div>
      ) : routes.length === 0 ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Нет маршрутов</div>
      ) : (
        <div className="flex flex-col gap-2">
          {routes.map(route => (
            <div key={route.id} className="border border-neutral-200 rounded-lg overflow-hidden">
              {/* Строка маршрута */}
              <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${expandedId === route.id ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-50"}`}>

                {editId === route.id ? (
                  <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                    <input
                      value={editForm.number}
                      onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))}
                      className="border border-neutral-300 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:border-neutral-600 text-neutral-900"
                      autoFocus
                    />
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Название"
                      className="border border-neutral-300 rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:border-neutral-600 text-neutral-900"
                    />
                    <button onClick={handleUpdate} disabled={saving}
                      className="bg-neutral-900 text-white px-3 py-1 text-xs rounded hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">
                      ОК
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="text-neutral-500 hover:text-neutral-700 cursor-pointer px-1 text-xs">
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                    onClick={() => setExpandedId(expandedId === route.id ? null : route.id)}
                  >
                    <span className={`font-bold text-sm px-2 py-0.5 rounded ${expandedId === route.id ? "bg-white text-neutral-900" : "bg-neutral-100 text-neutral-800"}`}>
                      № {route.number}
                    </span>
                    <span className={`text-sm ${expandedId === route.id ? "text-neutral-300" : "text-neutral-500"}`}>
                      {route.name || ""}
                    </span>
                    <Icon
                      name={expandedId === route.id ? "ChevronUp" : "ChevronDown"}
                      size={14}
                      className={`ml-auto ${expandedId === route.id ? "text-neutral-300" : "text-neutral-400"}`}
                    />
                  </button>
                )}

                {editId !== route.id && (
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={e => { e.stopPropagation(); setEditId(route.id); setEditForm({ number: route.number, name: route.name ?? "" }); setExpandedId(null); }}
                      className={`cursor-pointer transition-colors ${expandedId === route.id ? "text-neutral-400 hover:text-white" : "text-neutral-300 hover:text-neutral-600"}`}
                    >
                      <Icon name="Pencil" size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(route.id); }}
                      className={`cursor-pointer transition-colors ${expandedId === route.id ? "text-neutral-400 hover:text-red-400" : "text-neutral-300 hover:text-red-500"}`}
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Графики */}
              {expandedId === route.id && (
                <div className="px-4 pb-4">
                  <RouteGraphs route={route} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
