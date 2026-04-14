import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ROLE_LABELS, Role, ALL_TABS, TabId, getUserTabs } from "@/lib/auth";
import Icon from "@/components/ui/icon";

interface UserRow {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  permissions: string | null;
  created_at: string;
}

const ROLES: Role[] = ["admin", "dispatcher", "mechanic", "hr", "accountant", "cashier"];
const EDITABLE_TABS = ALL_TABS.filter(t => t.id !== "users" && t.id !== "settings");

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "dispatcher" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editPermsId, setEditPermsId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await api.getUsers();
    setUsers(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setError("");
    if (!form.username || !form.password || !form.full_name) {
      setError("Заполните все поля");
      return;
    }
    setSaving(true);
    const res = await api.createUser(form as { username: string; password: string; full_name: string; role: string });
    if (res?.error) { setError(res.error); setSaving(false); return; }
    setShowForm(false);
    setForm({ username: "", password: "", full_name: "", role: "dispatcher" });
    await load();
    setSaving(false);
  };

  const toggleActive = async (u: UserRow) => {
    await api.updateUser(u.id, { is_active: !u.is_active });
    await load();
  };

  const changeRole = async (u: UserRow, role: string) => {
    await api.updateUser(u.id, { role, permissions: null });
    await load();
  };

  const getUserPerms = (u: UserRow): TabId[] => {
    return getUserTabs({ id: u.id, username: u.username, full_name: u.full_name, role: u.role as Role, permissions: u.permissions });
  };

  const togglePerm = async (u: UserRow, tabId: TabId) => {
    const current = getUserPerms(u);
    const next = current.includes(tabId)
      ? current.filter(t => t !== tabId)
      : [...current, tabId];
    const permsStr = next.join(",") || null;
    await api.updateUser(u.id, { permissions: permsStr });
    await load();
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Пользователи</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="ml-auto bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors cursor-pointer flex items-center gap-2">
          <Icon name="UserPlus" size={15} />
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-6">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Логин</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Пароль</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">ФИО</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Роль</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full bg-white focus:outline-none focus:border-neutral-600">
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving}
              className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? "Сохраняю..." : "Создать"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer">
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map(u => {
            const perms = getUserPerms(u);
            const isPermsOpen = editPermsId === u.id;
            const isAdmin = u.role === "admin";

            return (
              <div key={u.id} className="border border-neutral-200 rounded overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[150px]">
                    <span className="font-medium text-neutral-900">{u.full_name}</span>
                    <span className="ml-2 text-neutral-400 font-mono text-xs">{u.username}</span>
                  </div>
                  <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                    className="border border-neutral-200 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  {!isAdmin && (
                    <button onClick={() => setEditPermsId(isPermsOpen ? null : u.id)}
                      className={`text-xs px-3 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                        isPermsOpen ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
                      }`}>
                      <Icon name="Shield" size={12} />
                      Доступы
                    </button>
                  )}
                  <button onClick={() => toggleActive(u)}
                    className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                      u.is_active
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                    }`}>
                    {u.is_active ? "Активен" : "Отключён"}
                  </button>
                </div>

                {isPermsOpen && !isAdmin && (
                  <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200">
                    <p className="text-xs text-neutral-500 mb-2">Разделы, доступные пользователю:</p>
                    <div className="flex flex-wrap gap-2">
                      {EDITABLE_TABS.map(t => {
                        const active = perms.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => togglePerm(u, t.id)}
                            className={`text-xs px-3 py-1.5 rounded cursor-pointer transition-colors border ${
                              active
                                ? "bg-neutral-900 text-white border-neutral-900"
                                : "bg-white text-neutral-500 border-neutral-300 hover:border-neutral-500"
                            }`}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}