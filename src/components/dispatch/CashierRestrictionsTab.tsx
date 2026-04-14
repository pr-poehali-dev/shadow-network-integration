import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import { CashRestriction, fmt } from "./cashierTypes";

export default function CashierRestrictionsTab() {
  const { user } = useAuth();
  const [restrictions, setRestrictions] = useState<CashRestriction[]>([]);
  const [drivers, setDrivers] = useState<{ id: number; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashRestriction | null>(null);
  const [form, setForm] = useState({
    driver_id: "", driver_name: "", reason: "",
    restriction_type: "block" as "block" | "limit",
    limit_amount: "", expires_at: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [res, drv] = await Promise.all([api.getCashRestrictions(), api.getDrivers()]);
    setRestrictions(Array.isArray(res) ? res : []);
    setDrivers(Array.isArray(drv) ? drv : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ driver_id: "", driver_name: "", reason: "", restriction_type: "block", limit_amount: "", expires_at: "" });
    setShowForm(true);
  }

  function openEdit(r: CashRestriction) {
    setEditing(r);
    setForm({
      driver_id: r.driver_id ? String(r.driver_id) : "",
      driver_name: r.driver_name || "",
      reason: r.reason,
      restriction_type: r.restriction_type,
      limit_amount: r.limit_amount ? String(r.limit_amount) : "",
      expires_at: r.expires_at || "",
    });
    setShowForm(true);
  }

  function handleDriverChange(id: string) {
    const drv = drivers.find(d => String(d.id) === id);
    setForm(f => ({ ...f, driver_id: id, driver_name: drv?.full_name || "" }));
  }

  async function save() {
    if (!form.reason) return;
    setSaving(true);
    const payload = {
      driver_id: form.driver_id ? parseInt(form.driver_id) : null,
      driver_name: form.driver_name || null,
      reason: form.reason,
      restriction_type: form.restriction_type,
      limit_amount: form.limit_amount ? parseFloat(form.limit_amount) : null,
      expires_at: form.expires_at || null,
      created_by: user?.full_name || null,
      is_active: true,
    };
    if (editing) {
      await api.updateCashRestriction(editing.id, payload);
    } else {
      await api.createCashRestriction(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function deactivate(id: number) {
    if (!confirm("Снять ограничение?")) return;
    await api.deleteCashRestriction(id);
    load();
  }

  const active = restrictions.filter(r => r.is_active);
  const inactive = restrictions.filter(r => !r.is_active);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Ограничения на выдачу</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Устанавливаются бухгалтером. Видны кассиру при внесении отчёта.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-4 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer">
          <Icon name="Plus" size={15} />
          Добавить
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div>
      ) : active.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-8">Активных ограничений нет</div>
      ) : (
        <div className="space-y-2">
          {active.map(r => (
            <div key={r.id} className={`border rounded-lg px-4 py-3 flex items-start gap-4 ${
              r.restriction_type === "block" ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"
            }`}>
              <Icon name="AlertTriangle" size={16} className={`mt-0.5 shrink-0 ${r.restriction_type === "block" ? "text-red-500" : "text-orange-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    r.restriction_type === "block" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {r.restriction_type === "block" ? "Запрет" : "Лимит"}
                    {r.limit_amount != null && ` до ${fmt(r.limit_amount)} ₽`}
                  </span>
                  <span className="text-sm font-medium text-neutral-900">
                    {r.driver_full_name || r.driver_name || "Все водители"}
                  </span>
                  {r.expires_at && <span className="text-xs text-neutral-500">до {r.expires_at}</span>}
                </div>
                <p className="text-xs text-neutral-600 mt-1">{r.reason}</p>
                {r.created_by && <p className="text-xs text-neutral-400 mt-0.5">Добавил: {r.created_by}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(r)}
                  className="p-1.5 rounded hover:bg-white/70 cursor-pointer text-neutral-500 hover:text-neutral-800 transition-colors">
                  <Icon name="Pencil" size={13} />
                </button>
                <button onClick={() => deactivate(r.id)}
                  className="p-1.5 rounded hover:bg-white/70 cursor-pointer text-neutral-500 hover:text-red-600 transition-colors">
                  <Icon name="X" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600">
            Снятые ограничения ({inactive.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {inactive.map(r => (
              <div key={r.id} className="border border-neutral-100 rounded-lg px-4 py-2 flex items-center gap-3 opacity-60">
                <span className="text-xs text-neutral-500">{r.driver_full_name || r.driver_name || "—"}</span>
                <span className="text-xs text-neutral-400 flex-1">{r.reason}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
              <h2 className="font-semibold text-neutral-900">
                {editing ? "Редактировать ограничение" : "Новое ограничение"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Водитель (необязательно)</label>
                <select
                  value={form.driver_id}
                  onChange={e => handleDriverChange(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Все водители —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Тип ограничения</label>
                <div className="flex gap-2">
                  {(["block", "limit"] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, restriction_type: t }))}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                        form.restriction_type === t
                          ? t === "block" ? "bg-red-600 text-white border-red-600" : "bg-orange-500 text-white border-orange-500"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      }`}>
                      {t === "block" ? "Полный запрет" : "Лимит суммы"}
                    </button>
                  ))}
                </div>
              </div>

              {form.restriction_type === "limit" && (
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">Максимальная сумма, ₽</label>
                  <input type="number" min="0" step="0.01" value={form.limit_amount}
                    onChange={e => setForm(f => ({ ...f, limit_amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Причина *</label>
                <textarea value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Например: задолженность за предыдущий месяц"
                  rows={3}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Действует до (необязательно)</label>
                <input type="date" value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-neutral-200">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-colors">
                Отмена
              </button>
              <button onClick={save} disabled={saving || !form.reason}
                className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
                {saving ? "Сохранение..." : editing ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
