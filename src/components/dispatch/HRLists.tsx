import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";
import { Position, Driver, Conductor, StaffMember, fmtDate } from "./hrTypes";
import { DriverForm, ConductorForm, StaffForm } from "./HRForms";

// ---- Счётчик записей ----
function rowCount(n: number) {
  if (n === 1) return "1 запись";
  if (n >= 2 && n <= 4) return `${n} записи`;
  return `${n} записей`;
}

// ---- Список сотрудников по должности (staff таблица) ----
interface StaffListProps {
  position: Position;
  canEdit: boolean;
}

export function StaffList({ position, canEdit }: StaffListProps) {
  const [items, setItems] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.getStaff({ position, show_inactive: showInactive ? "1" : "0" });
    setItems(Array.isArray(r) ? r : []);
    setLoading(false);
  }, [position, showInactive]);

  useEffect(() => { load(); }, [load]);

  async function deactivate(id: number) {
    if (!confirm("Уволить сотрудника?")) return;
    await api.deleteStaff(id);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {canEdit && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <Icon name="UserPlus" size={14} /> Добавить
          </button>
        )}
        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="cursor-pointer"
          />
          Показать уволенных
        </label>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-6">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-6">Список пуст</div>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center px-4 py-2 bg-neutral-800">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
              Сотрудники — {rowCount(items.length)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-800 text-neutral-200">
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap border-r border-neutral-700 w-8">№</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[160px]">ФИО</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">Статус</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[130px]">Организация</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[110px]">Телефон</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Дата рожд.</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[110px]">СНИЛС</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">ИНН</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[110px]">Паспорт</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Принят</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Уволен</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[150px]">Примечание</th>
                  {canEdit && (
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-16">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={`group border-b border-neutral-100 transition-colors hover:bg-neutral-100/60 ${
                      !m.is_active ? "opacity-60" : ""
                    } ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}
                  >
                    <td className="px-2 py-2 text-center text-neutral-400 border-r border-neutral-100 font-mono">{idx + 1}</td>
                    <td className="px-2 py-2 border-r border-neutral-100 font-medium text-neutral-900 whitespace-nowrap">
                      {m.full_name}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100">
                      {!m.is_active ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-500">
                          Уволен
                        </span>
                      ) : m.is_official ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                          Официальный
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                          Неофициальный
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 truncate max-w-[130px]" title={m.organization || ""}>
                      {m.organization || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap">
                      {m.phone || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {fmtDate(m.birth_date)}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {m.snils || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {m.inn || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {(m.passport_series || m.passport_number)
                        ? `${m.passport_series || ""} ${m.passport_number || ""}`.trim()
                        : <span className="text-neutral-300">—</span>
                      }
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {fmtDate(m.hire_date)}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {fmtDate(m.fire_date)}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-500 truncate max-w-[150px]" title={m.notes || ""}>
                      {m.notes || <span className="text-neutral-300">—</span>}
                    </td>
                    {canEdit && (
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {m.is_active && (
                            <>
                              <button
                                title="Редактировать"
                                onClick={() => { setEditing(m); setShowForm(true); }}
                                className="p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
                              >
                                <Icon name="Pencil" size={13} />
                              </button>
                              <button
                                title="Уволить"
                                onClick={() => deactivate(m.id)}
                                className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                              >
                                <Icon name="UserMinus" size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <StaffForm
          position={position}
          initial={editing || undefined}
          onSaved={load}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ---- Водители ----
interface DriverListProps { canEdit: boolean; }

export function DriverList({ canEdit }: DriverListProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "official" | "unofficial">("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await catalogCache.getDrivers();
    setDrivers(Array.isArray(r) ? r : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = drivers.filter(d =>
    filter === "official" ? d.is_official : filter === "unofficial" ? !d.is_official : true
  );

  async function del(id: number) {
    if (!confirm("Удалить водителя?")) return;
    await api.deleteDriver(id);
    catalogCache.invalidateDrivers();
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {canEdit && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <Icon name="UserPlus" size={14} /> Добавить
          </button>
        )}
        <div className="flex gap-1 ml-auto">
          {(["all", "official", "unofficial"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded cursor-pointer transition-colors ${
                filter === f
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {f === "all"
                ? `Все (${drivers.length})`
                : f === "official"
                  ? `Официальные (${drivers.filter(d => d.is_official).length})`
                  : `Неофициальные (${drivers.filter(d => !d.is_official).length})`
              }
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-6">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-6">Список пуст</div>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center px-4 py-2 bg-neutral-800">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
              Водители — {rowCount(filtered.length)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-800 text-neutral-200">
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap border-r border-neutral-700 w-8">№</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[180px]">ФИО</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[110px]">Статус</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[120px]">Телефон</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[120px]">Номер ВУ</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Дата рожд.</th>
                  {canEdit && (
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-16">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, idx) => (
                  <tr
                    key={d.id}
                    className={`group border-b border-neutral-100 transition-colors hover:bg-neutral-100/60 ${
                      idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                    }`}
                  >
                    <td className="px-2 py-2 text-center text-neutral-400 border-r border-neutral-100 font-mono">{idx + 1}</td>
                    <td className="px-2 py-2 border-r border-neutral-100 font-medium text-neutral-900 whitespace-nowrap">
                      {d.full_name}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100">
                      {d.is_official ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                          Официальный
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                          Неофициальный
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap">
                      {d.phone || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {d.license_number || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {fmtDate(d.birth_date)}
                    </td>
                    {canEdit && (
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            title="Редактировать"
                            onClick={() => { setEditing(d); setShowForm(true); }}
                            className="p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
                          >
                            <Icon name="Pencil" size={13} />
                          </button>
                          <button
                            title="Удалить"
                            onClick={() => del(d.id)}
                            className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                          >
                            <Icon name="Trash2" size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <DriverForm
          initial={editing || undefined}
          onSaved={load}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ---- Кондукторы ----
interface ConductorListProps { canEdit: boolean; }

export function ConductorList({ canEdit }: ConductorListProps) {
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Conductor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await catalogCache.getConductors();
    setConductors(Array.isArray(r) ? r : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(id: number) {
    if (!confirm("Удалить кондуктора?")) return;
    await api.deleteConductor(id);
    catalogCache.invalidateConductors();
    load();
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer"
        >
          <Icon name="UserPlus" size={14} /> Добавить
        </button>
      )}

      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-6">Загрузка...</div>
      ) : conductors.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-6">Список пуст</div>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center px-4 py-2 bg-neutral-800">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
              Кондукторы — {rowCount(conductors.length)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-800 text-neutral-200">
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap border-r border-neutral-700 w-8">№</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[180px]">ФИО</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[120px]">Телефон</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Дата рожд.</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[110px]">СНИЛС</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">ИНН</th>
                  {canEdit && (
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-16">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {conductors.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={`group border-b border-neutral-100 transition-colors hover:bg-neutral-100/60 ${
                      idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                    }`}
                  >
                    <td className="px-2 py-2 text-center text-neutral-400 border-r border-neutral-100 font-mono">{idx + 1}</td>
                    <td className="px-2 py-2 border-r border-neutral-100 font-medium text-neutral-900 whitespace-nowrap">
                      {c.full_name}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap">
                      {c.phone || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {fmtDate(c.birth_date)}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {c.snils || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 whitespace-nowrap font-mono">
                      {c.inn || <span className="text-neutral-300">—</span>}
                    </td>
                    {canEdit && (
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            title="Редактировать"
                            onClick={() => { setEditing(c); setShowForm(true); }}
                            className="p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
                          >
                            <Icon name="Pencil" size={13} />
                          </button>
                          <button
                            title="Удалить"
                            onClick={() => del(c.id)}
                            className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                          >
                            <Icon name="Trash2" size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <ConductorForm
          initial={editing || undefined}
          onSaved={load}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
