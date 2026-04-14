import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Driver {
  id: number;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  snils: string | null;
  inn: string | null;
  license_number: string | null;
  license_date: string | null;
  is_official: boolean;
}

const EMPTY: Omit<Driver, "id"> = {
  full_name: "", phone: "", birth_date: "", snils: "", inn: "",
  license_number: "", license_date: "", is_official: true,
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Omit<Driver, "id">>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "official" | "unofficial">("all");
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.getDrivers();
    setDrivers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(EMPTY);
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (d: Driver) => {
    setEditId(d.id);
    setForm({
      full_name: d.full_name ?? "",
      phone: d.phone ?? "",
      birth_date: d.birth_date ?? "",
      snils: d.snils ?? "",
      inn: d.inn ?? "",
      license_number: d.license_number ?? "",
      license_date: d.license_date ?? "",
      is_official: d.is_official,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const data = { ...form, birth_date: form.birth_date || null, license_date: form.license_date || null };
    if (editId !== null) await api.updateDriver(editId, data);
    else await api.createDriver(data);
    await load();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить водителя?")) return;
    await api.deleteDriver(id);
    await load();
  };

  const filtered = drivers.filter(d => {
    if (filter === "official") return d.is_official;
    if (filter === "unofficial") return !d.is_official;
    return true;
  });

  const officialCount = drivers.filter(d => d.is_official).length;
  const unofficialCount = drivers.filter(d => !d.is_official).length;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <h2 className="text-2xl font-bold text-neutral-900">Водители</h2>
        <div className="flex gap-1 ml-auto">
          {(["all", "official", "unofficial"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded cursor-pointer transition-colors ${
                filter === f ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
              }`}>
              {f === "all" ? `Все (${drivers.length})` : f === "official" ? `Официальные (${officialCount})` : `Неофициальные (${unofficialCount})`}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditId(null); setForm(EMPTY); setShowForm(true); }}
          className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors cursor-pointer flex items-center gap-2">
          <Icon name="UserPlus" size={15} />
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-6">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { key: "full_name", label: "ФИО", placeholder: "Фамилия Имя Отчество" },
              { key: "phone", label: "Телефон", placeholder: "+7 (000) 000-00-00" },
              { key: "birth_date", label: "Дата рождения", placeholder: "ГГГГ-ММ-ДД" },
              { key: "snils", label: "СНИЛС", placeholder: "000-000-000 00" },
              { key: "inn", label: "ИНН", placeholder: "ИНН" },
              { key: "license_number", label: "Вод. удостоверение №", placeholder: "Серия и номер" },
              { key: "license_date", label: "Дата выдачи ВУ", placeholder: "ГГГГ-ММ-ДД" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-neutral-500 block mb-1">{f.label}</label>
                <input
                  value={(form as Record<string, unknown>)[f.key] as string ?? ""}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                />
              </div>
            ))}
            <div className="flex items-center gap-3 pt-5">
              <label className="text-xs text-neutral-500">Тип:</label>
              {[
                { value: true, label: "Официальный" },
                { value: false, label: "Неофициальный" },
              ].map(opt => (
                <button key={String(opt.value)} onClick={() => setForm(p => ({ ...p, is_official: opt.value }))}
                  className={`text-xs px-3 py-1.5 rounded cursor-pointer border transition-colors ${
                    form.is_official === opt.value
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-500"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
              {saving ? "Сохраняю..." : editId !== null ? "Сохранить" : "Добавить"}
            </button>
            <button onClick={resetForm}
              className="border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer">
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Список пуст</div>
      ) : (
        <div className="border border-neutral-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-neutral-900">{d.full_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        d.is_official ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {d.is_official ? "Официальный" : "Неофициальный"}
                      </span>
                      {d.phone && <span className="text-neutral-500 text-xs">{d.phone}</span>}
                      {d.license_number && <span className="text-neutral-400 text-xs">ВУ: {d.license_number}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 w-20 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(d)} className="text-neutral-400 hover:text-neutral-700 mr-3 cursor-pointer transition-colors">
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="text-neutral-400 hover:text-red-500 cursor-pointer transition-colors">
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
