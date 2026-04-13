import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Bus { id: number; board_number: string; model: string; }
interface BusDoc {
  id: number;
  bus_id: number;
  doc_type: string;
  doc_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
}

const DOC_TYPES = ["ОСАГО", "ОСГОП", "СТС", "ТО"];

const DOC_COLORS: Record<string, string> = {
  "ОСАГО":  "bg-blue-50 border-blue-200 text-blue-700",
  "ОСГОП":  "bg-purple-50 border-purple-200 text-purple-700",
  "СТС":    "bg-green-50 border-green-200 text-green-700",
  "ТО":     "bg-orange-50 border-orange-200 text-orange-700",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-neutral-400 text-xs">срок не указан</span>;
  if (days < 0) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">просрочен {Math.abs(days)} д.</span>;
  if (days <= 14) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><Icon name="AlertTriangle" size={11}/>истекает через {days} д.</span>;
  if (days <= 30) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"><Icon name="Clock" size={11}/>через {days} д.</span>;
  if (days <= 60) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">через {days} д.</span>;
  return <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">до {fmtDate(null)}</span>;
}

interface DocFormProps {
  busId: number;
  initial?: Partial<BusDoc>;
  onSave: () => void;
  onCancel: () => void;
}

function DocForm({ busId, initial, onSave, onCancel }: DocFormProps) {
  const [form, setForm] = useState({
    doc_type: initial?.doc_type ?? DOC_TYPES[0],
    doc_number: initial?.doc_number ?? "",
    issued_at: initial?.issued_at?.slice(0, 10) ?? "",
    expires_at: initial?.expires_at?.slice(0, 10) ?? "",
    notes: initial?.notes ?? "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    let fileData: string | undefined;
    let fileName: string | undefined;
    if (file) {
      const buf = await file.arrayBuffer();
      fileData = btoa(String.fromCharCode(...new Uint8Array(buf)));
      fileName = file.name;
    }
    const payload = { ...form, bus_id: busId, file_data: fileData, file_name: fileName };
    if (initial?.id) {
      await api.updateBusDoc(initial.id, { ...payload, file_url: initial.file_url, file_name: fileName ?? initial.file_name });
    } else {
      await api.createBusDoc(payload);
    }
    onSave();
    setSaving(false);
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Тип документа</label>
          <select value={form.doc_type} onChange={e => set("doc_type", e.target.value)}
            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full bg-white focus:outline-none focus:border-neutral-600">
            {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Номер документа</label>
          <input value={form.doc_number} onChange={e => set("doc_number", e.target.value)}
            placeholder="Серия и номер" className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Дата выдачи</label>
          <input type="date" value={form.issued_at} onChange={e => set("issued_at", e.target.value)}
            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Действует до</label>
          <input type="date" value={form.expires_at} onChange={e => set("expires_at", e.target.value)}
            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs text-neutral-500 mb-1 block">Примечания</label>
        <input value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Страховая компания, примечания..." className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
      </div>
      <div className="mb-4">
        <label className="text-xs text-neutral-500 mb-1 block">Файл (PDF или фото)</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="border border-dashed border-neutral-300 rounded px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 cursor-pointer transition-colors flex items-center gap-2">
            <Icon name="Paperclip" size={14} />
            {file ? file.name : initial?.file_name ? initial.file_name : "Прикрепить файл"}
          </button>
          {initial?.file_url && !file && (
            <a href={initial.file_url} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Icon name="ExternalLink" size={12} /> Открыть текущий
            </a>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
          {saving ? "Сохраняю..." : "Сохранить"}
        </button>
        <button onClick={onCancel}
          className="border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer">
          Отмена
        </button>
      </div>
    </div>
  );
}

export default function BusDocsPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [docs, setDocs] = useState<BusDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editDoc, setEditDoc] = useState<BusDoc | null>(null);
  const [alerts, setAlerts] = useState<{ id: number; doc_type: string; expires_at: string; board_number: string; model: string; bus_id: number }[]>([]);

  useEffect(() => {
    api.getBuses().then(r => {
      const list = Array.isArray(r) ? r : [];
      setBuses(list);
      if (list.length > 0) setSelectedBus(list[0]);
    });
    api.getAlerts(60).then(r => setAlerts(Array.isArray(r) ? r : []));
  }, []);

  const loadDocs = async (bus: Bus) => {
    setLoading(true);
    const r = await api.getBusDocs(bus.id);
    setDocs(Array.isArray(r) ? r : []);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedBus) loadDocs(selectedBus);
  }, [selectedBus]);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить документ?")) return;
    await api.deleteBusDoc(id);
    if (selectedBus) loadDocs(selectedBus);
    api.getAlerts(60).then(r => setAlerts(Array.isArray(r) ? r : []));
  };

  const afterSave = () => {
    setShowForm(false);
    setEditDoc(null);
    if (selectedBus) loadDocs(selectedBus);
    api.getAlerts(60).then(r => setAlerts(Array.isArray(r) ? r : []));
  };

  // Группируем по типу
  const docsByType = DOC_TYPES.reduce<Record<string, BusDoc[]>>((acc, t) => {
    acc[t] = docs.filter(d => d.doc_type === t);
    return acc;
  }, {});

  const urgentAlerts = alerts.filter(a => {
    const d = daysUntil(a.expires_at);
    return d !== null && d <= 30;
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Документы ТС</h2>

      {/* Уведомления */}
      {urgentAlerts.length > 0 && (
        <div className="mb-6 border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-3">
            <Icon name="AlertTriangle" size={16} />
            Требуют внимания ({urgentAlerts.length})
          </div>
          <div className="flex flex-col gap-2">
            {urgentAlerts.map(a => {
              const d = daysUntil(a.expires_at);
              return (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span className={`font-semibold px-2 py-0.5 rounded text-xs border ${DOC_COLORS[a.doc_type] ?? "bg-neutral-100 border-neutral-200 text-neutral-700"}`}>{a.doc_type}</span>
                  <span className="text-neutral-700">Борт № <b>{a.board_number}</b>{a.model ? ` (${a.model})` : ""}</span>
                  <span className="ml-auto">
                    {d !== null && d < 0
                      ? <span className="text-red-700 font-semibold">просрочен {Math.abs(d)} дн.</span>
                      : <span className="text-orange-700 font-semibold">через {d} дн. — до {fmtDate(a.expires_at)}</span>
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Список автобусов */}
        <div className="w-48 shrink-0">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2 px-1">Автобусы</div>
          <div className="flex flex-col gap-1">
            {buses.length === 0 && <div className="text-neutral-400 text-xs px-1">Нет автобусов</div>}
            {buses.map(bus => {
              const busAlerts = alerts.filter(a => a.bus_id === bus.id && (daysUntil(a.expires_at) ?? 999) <= 30);
              return (
                <button
                  key={bus.id}
                  onClick={() => { setSelectedBus(bus); setShowForm(false); setEditDoc(null); }}
                  className={`text-left px-3 py-2 rounded text-sm transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    selectedBus?.id === bus.id ? "bg-neutral-900 text-white" : "hover:bg-neutral-100 text-neutral-700"
                  }`}
                >
                  <span>№ {bus.board_number}</span>
                  {busAlerts.length > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${selectedBus?.id === bus.id ? "bg-red-500 text-white" : "bg-red-100 text-red-600"}`}>
                      {busAlerts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Документы выбранного автобуса */}
        <div className="flex-1 min-w-0">
          {!selectedBus ? (
            <div className="text-neutral-400 text-sm py-8 text-center">Выберите автобус</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-semibold text-neutral-900">Борт № {selectedBus.board_number}</span>
                  {selectedBus.model && <span className="text-neutral-500 text-sm ml-2">{selectedBus.model}</span>}
                </div>
                {!showForm && !editDoc && (
                  <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors cursor-pointer">
                    <Icon name="Plus" size={14} />
                    Добавить документ
                  </button>
                )}
              </div>

              {(showForm) && (
                <DocForm busId={selectedBus.id} onSave={afterSave} onCancel={() => setShowForm(false)} />
              )}
              {editDoc && (
                <DocForm busId={selectedBus.id} initial={editDoc} onSave={afterSave} onCancel={() => setEditDoc(null)} />
              )}

              {loading ? (
                <div className="text-neutral-400 text-sm py-8 text-center">Загрузка...</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {DOC_TYPES.map(type => {
                    const typeDocs = docsByType[type];
                    return (
                      <div key={type} className="border border-neutral-200 rounded-lg overflow-hidden">
                        <div className={`px-4 py-2 flex items-center gap-2 border-b border-neutral-200 ${DOC_COLORS[type] ?? ""}`}>
                          <span className="font-semibold text-sm">{type}</span>
                          {typeDocs.length === 0 && <span className="text-xs opacity-70 ml-1">— не добавлен</span>}
                        </div>
                        {typeDocs.length === 0 ? (
                          <div className="px-4 py-3 text-neutral-400 text-xs italic">Нет документов этого типа</div>
                        ) : (
                          typeDocs.map(doc => {
                            const d = daysUntil(doc.expires_at);
                            return (
                              <div key={doc.id} className="px-4 py-3 border-b border-neutral-100 last:border-b-0 flex flex-wrap items-center gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {doc.doc_number && <span className="font-mono text-sm text-neutral-800">{doc.doc_number}</span>}
                                    {doc.issued_at && <span className="text-xs text-neutral-500">выдан {fmtDate(doc.issued_at)}</span>}
                                    {doc.expires_at && (
                                      <span className="text-xs text-neutral-500">до {fmtDate(doc.expires_at)}</span>
                                    )}
                                    <ExpiryBadge days={d} />
                                  </div>
                                  {doc.notes && <div className="text-xs text-neutral-500 mt-1">{doc.notes}</div>}
                                  {doc.file_url && (
                                    <a href={doc.file_url} target="_blank" rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                                      <Icon name="Paperclip" size={11} />
                                      {doc.file_name ?? "Файл"}
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <button onClick={() => { setEditDoc(doc); setShowForm(false); }}
                                    className="text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors">
                                    <Icon name="Pencil" size={14} />
                                  </button>
                                  <button onClick={() => handleDelete(doc.id)}
                                    className="text-neutral-400 hover:text-red-500 cursor-pointer transition-colors">
                                    <Icon name="Trash2" size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
