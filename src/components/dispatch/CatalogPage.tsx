import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface Item {
  id: number;
  [key: string]: unknown;
}

interface Field {
  key: string;
  label: string;
  placeholder: string;
}

interface Props {
  title: string;
  fields: Field[];
  fetchFn: () => Promise<Item[]>;
  createFn: (data: Record<string, string>) => Promise<Item>;
  updateFn: (id: number, data: Record<string, string>) => Promise<Item>;
  deleteFn: (id: number) => Promise<unknown>;
  renderRow: (item: Item) => React.ReactNode;
}

export default function CatalogPage({ title, fields, fetchFn, createFn, updateFn, deleteFn, renderRow }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetchFn();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({});
    setEditId(null);
  };

  const startEdit = (item: Item) => {
    setEditId(item.id);
    const f: Record<string, string> = {};
    fields.forEach(({ key }) => { f[key] = String(item[key] ?? ""); });
    setForm(f);
  };

  const handleSave = async () => {
    if (fields.some(f => !form[f.key]?.trim())) return;
    setSaving(true);
    if (editId !== null) {
      await updateFn(editId, form);
    } else {
      await createFn(form);
    }
    await load();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить запись?")) return;
    await deleteFn(id);
    await load();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">{title}</h2>

      <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          {fields.map(f => (
            <input
              key={f.key}
              value={form[f.key] ?? ""}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="border border-neutral-300 rounded px-3 py-2 text-sm flex-1 min-w-[150px] focus:outline-none focus:border-neutral-600"
            />
          ))}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Сохраняю..." : editId !== null ? "Сохранить" : "Добавить"}
          </button>
          {editId !== null && (
            <button
              onClick={resetForm}
              className="border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Отмена
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Список пуст — добавьте первую запись</div>
      ) : (
        <div className="border border-neutral-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 flex-1">{renderRow(item)}</td>
                  <td className="px-4 py-3 w-20 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(item)} className="text-neutral-400 hover:text-neutral-700 mr-3 cursor-pointer transition-colors">
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-neutral-400 hover:text-red-500 cursor-pointer transition-colors">
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
