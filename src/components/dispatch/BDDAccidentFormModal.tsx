import { useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import {
  Accident,
  AccidentForm,
  STATUS_LABELS,
  WEATHER,
  ROAD_COND,
  VISIBILITY_OPT,
  FAULT_SIDE,
  emptyForm,
} from "./bddTypes";

// --------- Компонент загрузки файлов к ДТП ---------
interface DocUploaderProps {
  accident: Accident;
  onUpdated: (a: Accident) => void;
}

function DocUploader({ accident, onUpdated }: DocUploaderProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      await api.uploadAccidentDoc({
        accident_id: accident.id,
        file_data: b64,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
      });
      const updated = await api.getAccident(accident.id);
      onUpdated(updated);
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const docs: { url: string; name: string }[] = accident.documents || [];

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-neutral-600 mb-2 flex items-center gap-1">
        <Icon name="Paperclip" size={12} /> Документы ({docs.length})
      </div>
      {docs.length > 0 && (
        <div className="space-y-1 mb-2">
          {docs.map((d, i) => (
            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800">
              <Icon name="FileText" size={12} />
              {d.name}
            </a>
          ))}
        </div>
      )}
      <label className={`flex items-center gap-2 text-xs px-3 py-1.5 border border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-neutral-500 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
        <Icon name="Upload" size={12} />
        {uploading ? "Загрузка..." : "Прикрепить документ"}
        <input type="file" className="hidden" onChange={handleFile} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      </label>
    </div>
  );
}

export { DocUploader };

// --------- Форма ДТП ---------
interface AccidentFormProps {
  initial?: Partial<Accident>;
  onSaved: (a: Accident) => void;
  onClose: () => void;
}

export default function AccidentFormModal({ initial, onSaved, onClose }: AccidentFormProps) {
  const [form, setForm] = useState<AccidentForm>({
    ...emptyForm(),
    ...initial,
    accident_date: initial?.accident_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"main" | "details" | "investigation">("main");

  const setF = (k: keyof AccidentForm, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    let result;
    if (initial?.id) {
      result = await api.updateAccident(initial.id, form);
    } else {
      result = await api.createAccident(form);
    }
    setSaving(false);
    onSaved(result);
    onClose();
  }

  const inp = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500";
  const sel = `${inp} bg-white`;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="font-bold text-neutral-900 text-base">
            {initial?.id ? "Редактировать ДТП" : "Зарегистрировать ДТП"}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Табы */}
        <div className="flex border-b border-neutral-200 px-6">
          {[
            { id: "main", label: "Основное" },
            { id: "details", label: "Подробности" },
            { id: "investigation", label: "Расследование" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors cursor-pointer ${tab === t.id ? "border-neutral-900 text-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-3">
          {tab === "main" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Дата ДТП *</label>
                  <input type="date" value={form.accident_date} onChange={e => setF("accident_date", e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Время ДТП</label>
                  <input type="time" value={form.accident_time ?? ""} onChange={e => setF("accident_time", e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Организация</label>
                  <input value={form.organization ?? ""} onChange={e => setF("organization", e.target.value)} placeholder="Название организации" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Статус</label>
                  <select value={form.status} onChange={e => setF("status", e.target.value)} className={sel}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Место ДТП</label>
                  <input value={form.location ?? ""} onChange={e => setF("location", e.target.value)} placeholder="Адрес, перекрёсток, км трассы..." className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Бортовой №</label>
                  <input value={form.bus_board_number ?? ""} onChange={e => setF("bus_board_number", e.target.value)} placeholder="001" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Гос. номер</label>
                  <input value={form.bus_gov_number ?? ""} onChange={e => setF("bus_gov_number", e.target.value)} placeholder="А123БВ 27" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Модель ТС</label>
                  <input value={form.bus_model ?? ""} onChange={e => setF("bus_model", e.target.value)} placeholder="ПАЗ 3204" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Маршрут</label>
                  <input value={form.route_number ?? ""} onChange={e => setF("route_number", e.target.value)} placeholder="1" className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">График №</label>
                  <input type="number" value={form.graph_number ?? ""} onChange={e => setF("graph_number", e.target.value ? parseInt(e.target.value) : undefined)} placeholder="1" className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Водитель (ФИО)</label>
                  <input value={form.driver_name ?? ""} onChange={e => setF("driver_name", e.target.value)} placeholder="Фамилия Имя Отчество" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Серия и № ВУ</label>
                  <input value={form.driver_license ?? ""} onChange={e => setF("driver_license", e.target.value)} placeholder="27 00 000000" className={inp} />
                </div>
              </div>
            </>
          )}

          {tab === "details" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Погодные условия</label>
                  <select value={form.weather_conditions ?? ""} onChange={e => setF("weather_conditions", e.target.value)} className={sel}>
                    <option value="">—</option>
                    {WEATHER.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Состояние дороги</label>
                  <select value={form.road_conditions ?? ""} onChange={e => setF("road_conditions", e.target.value)} className={sel}>
                    <option value="">—</option>
                    {ROAD_COND.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Видимость</label>
                  <select value={form.visibility ?? ""} onChange={e => setF("visibility", e.target.value)} className={sel}>
                    <option value="">—</option>
                    {VISIBILITY_OPT.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Кол-во пострадавших</label>
                  <input type="number" min="0" value={form.victims_count ?? 0} onChange={e => setF("victims_count", parseInt(e.target.value) || 0)} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Сведения о пострадавших</label>
                  <textarea value={form.victims_info ?? ""} onChange={e => setF("victims_info", e.target.value)} rows={2} placeholder="ФИО, характер травм..." className={`${inp} resize-none`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Другие участники ДТП</label>
                  <textarea value={form.other_vehicles ?? ""} onChange={e => setF("other_vehicles", e.target.value)} rows={2} placeholder="Марка, гос. номер, водитель..." className={`${inp} resize-none`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Обстоятельства ДТП</label>
                  <textarea value={form.description ?? ""} onChange={e => setF("description", e.target.value)} rows={3} placeholder="Описание произошедшего..." className={`${inp} resize-none`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Описание повреждений</label>
                  <textarea value={form.damage_description ?? ""} onChange={e => setF("damage_description", e.target.value)} rows={2} placeholder="Перечень повреждений ТС..." className={`${inp} resize-none`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Сумма ущерба (₽)</label>
                  <input type="number" value={form.damage_amount ?? ""} onChange={e => setF("damage_amount", e.target.value ? parseFloat(e.target.value) : undefined)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Виновная сторона</label>
                  <select value={form.fault_side ?? ""} onChange={e => setF("fault_side", e.target.value)} className={sel}>
                    <option value="">—</option>
                    {FAULT_SIDE.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {tab === "investigation" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Ответственный за расследование</label>
                  <input value={form.investigator_name ?? ""} onChange={e => setF("investigator_name", e.target.value)} placeholder="ФИО ответственного" className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Результат расследования / Заключение</label>
                  <textarea value={form.investigation_result ?? ""} onChange={e => setF("investigation_result", e.target.value)} rows={5} placeholder="Выводы комиссии, принятые меры, виновные лица..." className={`${inp} resize-none`} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-neutral-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 cursor-pointer">Отмена</button>
          <button onClick={save} disabled={saving || !form.accident_date}
            className="px-5 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-700 disabled:opacity-40 cursor-pointer transition-colors">
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
