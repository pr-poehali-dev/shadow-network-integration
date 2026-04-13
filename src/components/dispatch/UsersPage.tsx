import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ROLE_LABELS, Role } from "@/lib/auth";
import Icon from "@/components/ui/icon";

interface UserRow {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLES: Role[] = ["admin", "dispatcher", "mechanic", "hr", "accountant"];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", role: "dispatcher" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    await api.updateUser(u.id, { role });
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
        <div className="border border-neutral-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-neutral-600 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">ФИО</th>
                <th className="px-4 py-3 text-left">Логин</th>
                <th className="px-4 py-3 text-left">Роль</th>
                <th className="px-4 py-3 text-center w-24">Статус</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={e => changeRole(u, e.target.value)}
                      className="border border-neutral-200 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(u)}
                      className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                        u.is_active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                      }`}>
                      {u.is_active ? "Активен" : "Отключён"}
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
