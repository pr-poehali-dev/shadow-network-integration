import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";
import { Position, Driver, Conductor, StaffMember, fmtDate } from "./hrTypes";
import { DriverForm, ConductorForm, StaffForm } from "./HRForms";

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
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer">
            <Icon name="UserPlus" size={14} /> Добавить
          </button>
        )}
        <label className="flex items-center gap-2 text-xs text-neutral-500 cursor-pointer ml-auto">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="cursor-pointer" />
          Показать уволенных
        </label>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-6">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-6">Список пуст</div>
      ) : (
        <div className="space-y-1.5">
          {items.map(m => {
            const expanded = expandedId === m.id;
            return (
              <div key={m.id} className={`border rounded-lg overflow-hidden ${!m.is_active ? "opacity-60" : "border-neutral-200"}`}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : m.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-900">{m.full_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${m.is_official ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                        {m.is_official ? "Официальный" : "Неофициальный"}
                      </span>
                      {!m.is_active && <span className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">Уволен</span>}
                      {m.phone && <span className="text-xs text-neutral-500">{m.phone}</span>}
                    </div>
                    {m.organization && <div className="text-xs text-neutral-400 mt-0.5">{m.organization}</div>}
                  </div>
                  {canEdit && m.is_active && (
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditing(m); setShowForm(true); }}
                        className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer text-neutral-400 hover:text-neutral-700 transition-colors">
                        <Icon name="Pencil" size={13} />
                      </button>
                      <button onClick={() => deactivate(m.id)}
                        className="p-1.5 rounded hover:bg-red-100 cursor-pointer text-neutral-400 hover:text-red-500 transition-colors">
                        <Icon name="UserMinus" size={13} />
                      </button>
                    </div>
                  )}
                  <Icon name={expanded ? "ChevronUp" : "ChevronDown"} size={14} className="text-neutral-400 shrink-0" />
                </div>
                {expanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                    {m.birth_date && <div><span className="text-neutral-400">Дата рождения:</span> <span className="text-neutral-700">{fmtDate(m.birth_date)}</span></div>}
                    {m.snils && <div><span className="text-neutral-400">СНИЛС:</span> <span className="text-neutral-700">{m.snils}</span></div>}
                    {m.inn && <div><span className="text-neutral-400">ИНН:</span> <span className="text-neutral-700">{m.inn}</span></div>}
                    {(m.passport_series || m.passport_number) && (
                      <div><span className="text-neutral-400">Паспорт:</span> <span className="text-neutral-700">{m.passport_series} {m.passport_number}</span></div>
                    )}
                    {m.passport_issued_by && <div className="col-span-2"><span className="text-neutral-400">Кем выдан:</span> <span className="text-neutral-700">{m.passport_issued_by}</span></div>}
                    {m.address && <div className="col-span-2"><span className="text-neutral-400">Адрес:</span> <span className="text-neutral-700">{m.address}</span></div>}
                    {m.hire_date && <div><span className="text-neutral-400">Принят:</span> <span className="text-neutral-700">{fmtDate(m.hire_date)}</span></div>}
                    {m.fire_date && <div><span className="text-neutral-400">Уволен:</span> <span className="text-neutral-700">{fmtDate(m.fire_date)}</span></div>}
                    {m.notes && <div className="col-span-2"><span className="text-neutral-400">Примечание:</span> <span className="text-neutral-700">{m.notes}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <StaffForm position={position} initial={editing || undefined}
          onSaved={load} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}

// ---- Водители ----
interface DriverListProps { canEdit: boolean; }

export function DriverList({ canEdit }: DriverListProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all"|"official"|"unofficial">("all");
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
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer">
            <Icon name="UserPlus" size={14} /> Добавить
          </button>
        )}
        <div className="flex gap-1 ml-auto">
          {(["all","official","unofficial"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded cursor-pointer transition-colors ${
                filter === f ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
              }`}>
              {f === "all" ? `Все (${drivers.length})` : f === "official" ? `Официальные (${drivers.filter(d=>d.is_official).length})` : `Неофициальные (${drivers.filter(d=>!d.is_official).length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-6">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-6">Список пуст</div>
      ) : (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-neutral-900">{d.full_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${d.is_official ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                        {d.is_official ? "Официальный" : "Неофициальный"}
                      </span>
                      {d.phone && <span className="text-neutral-500 text-xs">{d.phone}</span>}
                      {d.license_number && <span className="text-neutral-400 text-xs">ВУ: {d.license_number}</span>}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 w-20 text-right whitespace-nowrap">
                      <button onClick={() => { setEditing(d); setShowForm(true); }}
                        className="text-neutral-400 hover:text-neutral-700 mr-2 cursor-pointer"><Icon name="Pencil" size={14}/></button>
                      <button onClick={() => del(d.id)}
                        className="text-neutral-400 hover:text-red-500 cursor-pointer"><Icon name="Trash2" size={14}/></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <DriverForm initial={editing || undefined} onSaved={load} onClose={() => { setShowForm(false); setEditing(null); }} />
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
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-3 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer">
          <Icon name="UserPlus" size={14} /> Добавить
        </button>
      )}
      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-6">Загрузка...</div>
      ) : conductors.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-6">Список пуст</div>
      ) : (
        <div className="border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {conductors.map(c => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900">{c.full_name}</span>
                      {c.phone && <span className="text-neutral-500 text-xs">{c.phone}</span>}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 w-20 text-right whitespace-nowrap">
                      <button onClick={() => { setEditing(c); setShowForm(true); }}
                        className="text-neutral-400 hover:text-neutral-700 mr-2 cursor-pointer"><Icon name="Pencil" size={14}/></button>
                      <button onClick={() => del(c.id)}
                        className="text-neutral-400 hover:text-red-500 cursor-pointer"><Icon name="Trash2" size={14}/></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <ConductorForm initial={editing || undefined} onSaved={load} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}
