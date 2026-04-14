import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";

// ---- Типы ----
interface Bus { id: number; board_number: string; model: string; gov_number?: string; }
interface RepairMechanic { id: number; full_name: string; role: string; specialization?: string; }
interface WorkTemplate { id: number; work_type: string; }

interface RepairWork {
  id: number; repair_id: number; work_type: string;
  work_description?: string; executor_name?: string;
  hours_spent?: number; is_done: boolean; sort_order: number;
}
interface RepairPart {
  id: number; repair_id: number; part_name: string;
  part_number?: string; quantity: number; unit: string; price_per_unit?: number;
}
interface RepairRecord {
  id: number; bus_id?: number; board_number?: string; gov_number?: string;
  bus_model?: string; organization?: string;
  fault_date: string; fault_type?: string; fault_description: string;
  severity: "low"|"medium"|"high"|"critical";
  repair_start?: string; repair_end?: string;
  status: "open"|"in_progress"|"done"|"cancelled";
  executor_name?: string; controller_name?: string;
  total_cost?: number; notes?: string;
  works: RepairWork[]; parts: RepairPart[];
}
interface MaintenanceRecord {
  id: number; bus_id?: number; board_number?: string; gov_number?: string;
  bus_model?: string; organization?: string;
  maintenance_type: string; scheduled_date: string; completed_date?: string;
  mileage_at_service?: number; next_service_mileage?: number; next_service_date?: string;
  status: "scheduled"|"in_progress"|"done"|"overdue";
  executor_name?: string; controller_name?: string;
  works_performed?: string; notes?: string; total_cost?: number;
}

// ---- Константы ----
const SEVERITY_LABELS: Record<string, string> = { low:"Низкая", medium:"Средняя", high:"Высокая", critical:"Критическая" };
const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_LABELS: Record<string, string> = { open:"Открыт", in_progress:"В работе", done:"Выполнен", cancelled:"Отменён" };
const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-orange-50 text-orange-700",
  done: "bg-green-50 text-green-700",
  cancelled: "bg-neutral-100 text-neutral-500",
};
const MO_TYPES = ["TO-1","TO-2","TO-3","seasonal","diagnostics","other"];
const MO_LABELS: Record<string,string> = { "TO-1":"ТО-1","TO-2":"ТО-2","TO-3":"ТО-3","seasonal":"Сезонное","diagnostics":"Диагностика","other":"Прочее" };
const MO_STATUS_LABELS: Record<string,string> = { scheduled:"Запланировано", in_progress:"В работе", done:"Выполнено", overdue:"Просрочено" };
const MO_STATUS_COLORS: Record<string,string> = {
  scheduled: "bg-blue-50 text-blue-700",
  in_progress: "bg-orange-50 text-orange-700",
  done: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
};
const FAULT_TYPES = ["Двигатель","КПП","Тормозная система","Подвеска","Рулевое управление","Электрооборудование","Система охлаждения","Кузов","Шины","Топливная система","Другое"];

function fmt(n?: number|null) {
  if (n == null) return "—";
  return n.toLocaleString("ru-RU", {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtDate(iso?: string|null) {
  if (!iso) return "—";
  const [y,m,d] = iso.slice(0,10).split("-");
  return `${d}.${m}.${y}`;
}

type PageTab = "repair"|"maintenance"|"mechanics";

// ---- Форма ремонта ----
interface RepairFormProps {
  buses: Bus[];
  mechanics: RepairMechanic[];
  templates: WorkTemplate[];
  initial?: Partial<RepairRecord>;
  onSaved: () => void;
  onClose: () => void;
}

function RepairForm({ buses, mechanics, templates, initial, onSaved, onClose }: RepairFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    bus_id: initial?.bus_id ? String(initial.bus_id) : "",
    fault_date: initial?.fault_date ?? new Date().toISOString().slice(0,10),
    fault_type: initial?.fault_type ?? "",
    fault_description: initial?.fault_description ?? "",
    severity: initial?.severity ?? "medium",
    repair_start: initial?.repair_start ?? "",
    repair_end: initial?.repair_end ?? "",
    status: initial?.status ?? "open",
    executor_name: initial?.executor_name ?? "",
    controller_name: initial?.controller_name ?? "",
    total_cost: initial?.total_cost ? String(initial.total_cost) : "",
    notes: initial?.notes ?? "",
  });
  const [works, setWorks] = useState<Omit<RepairWork,"id"|"repair_id">[]>(
    initial?.works?.map(w => ({ work_type:w.work_type, work_description:w.work_description, executor_name:w.executor_name, hours_spent:w.hours_spent, is_done:w.is_done, sort_order:w.sort_order })) ?? []
  );
  const [parts, setParts] = useState<Omit<RepairPart,"id"|"repair_id">[]>(
    initial?.parts?.map(p => ({ part_name:p.part_name, part_number:p.part_number, quantity:p.quantity, unit:p.unit, price_per_unit:p.price_per_unit })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [workTemplateOpen, setWorkTemplateOpen] = useState(false);

  const selectedBus = buses.find(b => String(b.id) === form.bus_id);
  const executors = mechanics.filter(m => m.role === "executor" || m.role === "both");
  const controllers = mechanics.filter(m => m.role === "controller" || m.role === "both");

  async function save() {
    if (!form.fault_description) return;
    setSaving(true);
    const payload = {
      ...form,
      bus_id: form.bus_id ? parseInt(form.bus_id) : null,
      board_number: selectedBus?.board_number || null,
      gov_number: selectedBus?.gov_number || null,
      bus_model: selectedBus?.model || null,
      total_cost: form.total_cost ? parseFloat(form.total_cost) : null,
      created_by: user?.full_name || null,
    };
    let repairId: number;
    if (initial?.id) {
      const r = await api.updateRepairJournal(initial.id, payload);
      repairId = initial.id;
      // обновляем работы и запчасти: удаляем старые, добавляем новые
      if (initial.works) {
        for (const w of initial.works) await api.deleteRepairWork(w.id);
      }
      if (initial.parts) {
        for (const p of initial.parts) await api.deleteRepairPart(p.id);
      }
    } else {
      const r = await api.createRepairJournal(payload);
      repairId = r.id;
    }
    for (let i = 0; i < works.length; i++) {
      await api.createRepairWork({ ...works[i], repair_id: repairId, sort_order: i });
    }
    for (const p of parts) {
      await api.createRepairPart({ ...p, repair_id: repairId });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  function addWork(type?: string) {
    setWorks(w => [...w, { work_type: type ?? "", work_description: "", executor_name: "", hours_spent: undefined, is_done: false, sort_order: w.length }]);
    setWorkTemplateOpen(false);
  }
  function removeWork(i: number) { setWorks(w => w.filter((_,idx) => idx !== i)); }
  function updateWork(i: number, field: string, value: unknown) {
    setWorks(w => w.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }
  function addPart() { setParts(p => [...p, { part_name:"", part_number:"", quantity:1, unit:"шт", price_per_unit:undefined }]); }
  function removePart(i: number) { setParts(p => p.filter((_,idx) => idx !== i)); }
  function updatePart(i: number, field: string, value: unknown) {
    setParts(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  const partsTotal = parts.reduce((s,p) => s + (p.quantity || 0) * (p.price_per_unit || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="font-semibold text-neutral-900">{initial?.id ? "Редактировать запись" : "Новая запись в журнал ремонта"}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Автобус и дата */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Транспортное средство</label>
              <select value={form.bus_id} onChange={e => setForm(f => ({...f, bus_id: e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Выбрать ТС —</option>
                {buses.map(b => <option key={b.id} value={b.id}>Борт {b.board_number}{b.gov_number ? ` (${b.gov_number})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Дата неисправности</label>
              <input type="date" value={form.fault_date} onChange={e => setForm(f => ({...f, fault_date: e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Неисправность */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Вид неисправности</label>
              <select value={form.fault_type} onChange={e => setForm(f => ({...f, fault_type: e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Выбрать —</option>
                {FAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Степень тяжести</label>
              <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value as "low"|"medium"|"high"|"critical"}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                {Object.entries(SEVERITY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Описание неисправности *</label>
            <textarea value={form.fault_description} rows={2}
              onChange={e => setForm(f => ({...f, fault_description: e.target.value}))}
              placeholder="Подробное описание выявленной неисправности"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          {/* Сроки и статус */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Начало ремонта</label>
              <input type="date" value={form.repair_start} onChange={e => setForm(f => ({...f, repair_start: e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Окончание</label>
              <input type="date" value={form.repair_end} onChange={e => setForm(f => ({...f, repair_end: e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Статус</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as RepairRecord["status"]}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                {Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Исполнитель и контролёр */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Исполнитель</label>
              <select value={form.executor_name} onChange={e => setForm(f => ({...f, executor_name: e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Выбрать —</option>
                {executors.map(m => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Контролёр</label>
              <select value={form.controller_name} onChange={e => setForm(f => ({...f, controller_name: e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Выбрать —</option>
                {controllers.map(m => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          {/* Виды работ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Виды работ</label>
              <div className="flex gap-2 relative">
                <button onClick={() => setWorkTemplateOpen(v => !v)}
                  className="text-xs flex items-center gap-1 border border-neutral-200 px-2 py-1 rounded hover:bg-neutral-50 cursor-pointer text-neutral-600">
                  <Icon name="BookOpen" size={12} /> Из справочника
                </button>
                <button onClick={() => addWork()}
                  className="text-xs flex items-center gap-1 border border-neutral-200 px-2 py-1 rounded hover:bg-neutral-50 cursor-pointer text-neutral-600">
                  <Icon name="Plus" size={12} /> Добавить
                </button>
                {workTemplateOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 w-72 max-h-56 overflow-y-auto">
                    {templates.map(t => (
                      <button key={t.id} onClick={() => addWork(t.work_type)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-0">
                        {t.work_type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {works.length === 0 && (
              <p className="text-xs text-neutral-400 italic">Работы не добавлены</p>
            )}
            <div className="space-y-2">
              {works.map((w, i) => (
                <div key={i} className="border border-neutral-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={w.work_type} onChange={e => updateWork(i,"work_type",e.target.value)}
                      placeholder="Вид работы *"
                      className="flex-1 border border-neutral-200 rounded px-2 py-1.5 text-sm" />
                    <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
                      <input type="checkbox" checked={w.is_done} onChange={e => updateWork(i,"is_done",e.target.checked)}
                        className="w-3.5 h-3.5 cursor-pointer" />
                      Выполнено
                    </label>
                    <button onClick={() => removeWork(i)} className="text-neutral-400 hover:text-red-500 cursor-pointer">
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={w.executor_name || ""} onChange={e => updateWork(i,"executor_name",e.target.value)}
                      className="border border-neutral-200 rounded px-2 py-1.5 text-xs">
                      <option value="">— Исполнитель —</option>
                      {executors.map(m => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
                    </select>
                    <input type="number" min="0" step="0.5" value={w.hours_spent ?? ""}
                      onChange={e => updateWork(i,"hours_spent", e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="Часов"
                      className="border border-neutral-200 rounded px-2 py-1.5 text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Запчасти */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Запчасти и материалы</label>
              <button onClick={addPart}
                className="text-xs flex items-center gap-1 border border-neutral-200 px-2 py-1 rounded hover:bg-neutral-50 cursor-pointer text-neutral-600">
                <Icon name="Plus" size={12} /> Добавить
              </button>
            </div>
            {parts.length === 0 && <p className="text-xs text-neutral-400 italic">Запчасти не добавлены</p>}
            <div className="space-y-2">
              {parts.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                  <input value={p.part_name} onChange={e => updatePart(i,"part_name",e.target.value)}
                    placeholder="Наименование *"
                    className="col-span-4 border border-neutral-200 rounded px-2 py-1.5 text-xs" />
                  <input value={p.part_number || ""} onChange={e => updatePart(i,"part_number",e.target.value)}
                    placeholder="Арт./номер"
                    className="col-span-3 border border-neutral-200 rounded px-2 py-1.5 text-xs" />
                  <input type="number" min="0" step="0.001" value={p.quantity}
                    onChange={e => updatePart(i,"quantity",parseFloat(e.target.value)||1)}
                    className="col-span-1 border border-neutral-200 rounded px-1.5 py-1.5 text-xs text-center" />
                  <select value={p.unit} onChange={e => updatePart(i,"unit",e.target.value)}
                    className="col-span-1 border border-neutral-200 rounded px-1 py-1.5 text-xs">
                    {["шт","л","кг","м","компл"].map(u => <option key={u}>{u}</option>)}
                  </select>
                  <input type="number" min="0" step="0.01" value={p.price_per_unit ?? ""}
                    onChange={e => updatePart(i,"price_per_unit", e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Цена"
                    className="col-span-2 border border-neutral-200 rounded px-2 py-1.5 text-xs" />
                  <button onClick={() => removePart(i)} className="col-span-1 text-neutral-400 hover:text-red-500 cursor-pointer flex justify-center">
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ))}
              {parts.length > 0 && (
                <div className="text-right text-xs font-semibold text-neutral-700 pr-6">
                  Стоимость запчастей: {fmt(partsTotal)} ₽
                </div>
              )}
            </div>
          </div>

          {/* Стоимость и примечания */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Общая стоимость ремонта, ₽</label>
              <input type="number" min="0" step="0.01" value={form.total_cost}
                onChange={e => setForm(f => ({...f, total_cost: e.target.value}))}
                placeholder="0.00"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Примечание</label>
              <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                placeholder="Дополнительная информация"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-neutral-200 sticky bottom-0 bg-white rounded-b-xl">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-colors">
            Отмена
          </button>
          <button onClick={save} disabled={saving || !form.fault_description}
            className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
            {saving ? "Сохранение..." : initial?.id ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Форма ТО ----
interface MoFormProps {
  buses: Bus[];
  mechanics: RepairMechanic[];
  initial?: Partial<MaintenanceRecord>;
  onSaved: () => void;
  onClose: () => void;
}

function MoForm({ buses, mechanics, initial, onSaved, onClose }: MoFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    bus_id: initial?.bus_id ? String(initial.bus_id) : "",
    maintenance_type: initial?.maintenance_type ?? "TO-1",
    scheduled_date: initial?.scheduled_date ?? new Date().toISOString().slice(0,10),
    completed_date: initial?.completed_date ?? "",
    mileage_at_service: initial?.mileage_at_service ? String(initial.mileage_at_service) : "",
    next_service_mileage: initial?.next_service_mileage ? String(initial.next_service_mileage) : "",
    next_service_date: initial?.next_service_date ?? "",
    status: initial?.status ?? "scheduled",
    executor_name: initial?.executor_name ?? "",
    controller_name: initial?.controller_name ?? "",
    works_performed: initial?.works_performed ?? "",
    notes: initial?.notes ?? "",
    total_cost: initial?.total_cost ? String(initial.total_cost) : "",
  });
  const [saving, setSaving] = useState(false);
  const selectedBus = buses.find(b => String(b.id) === form.bus_id);
  const executors = mechanics.filter(m => m.role === "executor" || m.role === "both");
  const controllers = mechanics.filter(m => m.role === "controller" || m.role === "both");

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      bus_id: form.bus_id ? parseInt(form.bus_id) : null,
      board_number: selectedBus?.board_number || null,
      gov_number: selectedBus?.gov_number || null,
      bus_model: selectedBus?.model || null,
      mileage_at_service: form.mileage_at_service ? parseInt(form.mileage_at_service) : null,
      next_service_mileage: form.next_service_mileage ? parseInt(form.next_service_mileage) : null,
      total_cost: form.total_cost ? parseFloat(form.total_cost) : null,
      completed_date: form.completed_date || null,
      next_service_date: form.next_service_date || null,
      created_by: user?.full_name || null,
    };
    if (initial?.id) { await api.updateMaintenanceJournal(initial.id, payload); }
    else { await api.createMaintenanceJournal(payload); }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="font-semibold text-neutral-900">{initial?.id ? "Редактировать ТО" : "Новая запись ТО"}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18}/></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">ТС</label>
              <select value={form.bus_id} onChange={e => setForm(f=>({...f,bus_id:e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Выбрать —</option>
                {buses.map(b=><option key={b.id} value={b.id}>Борт {b.board_number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Вид ТО</label>
              <select value={form.maintenance_type} onChange={e => setForm(f=>({...f,maintenance_type:e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                {MO_TYPES.map(t=><option key={t} value={t}>{MO_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Плановая дата</label>
              <input type="date" value={form.scheduled_date} onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Дата выполнения</label>
              <input type="date" value={form.completed_date} onChange={e=>setForm(f=>({...f,completed_date:e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Пробег при ТО, км</label>
              <input type="number" min="0" value={form.mileage_at_service}
                onChange={e=>setForm(f=>({...f,mileage_at_service:e.target.value}))} placeholder="0"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Следующий ТО, км</label>
              <input type="number" min="0" value={form.next_service_mileage}
                onChange={e=>setForm(f=>({...f,next_service_mileage:e.target.value}))} placeholder="0"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Следующий ТО, дата</label>
              <input type="date" value={form.next_service_date} onChange={e=>setForm(f=>({...f,next_service_date:e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Статус</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as MaintenanceRecord["status"]}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                {Object.entries(MO_STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Исполнитель</label>
              <select value={form.executor_name} onChange={e=>setForm(f=>({...f,executor_name:e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Выбрать —</option>
                {executors.map(m=><option key={m.id} value={m.full_name}>{m.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Контролёр</label>
              <select value={form.controller_name} onChange={e=>setForm(f=>({...f,controller_name:e.target.value}))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Выбрать —</option>
                {controllers.map(m=><option key={m.id} value={m.full_name}>{m.full_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">Выполненные работы</label>
            <textarea value={form.works_performed} rows={3}
              onChange={e=>setForm(f=>({...f,works_performed:e.target.value}))}
              placeholder="Перечень выполненных работ"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Стоимость, ₽</label>
              <input type="number" min="0" step="0.01" value={form.total_cost}
                onChange={e=>setForm(f=>({...f,total_cost:e.target.value}))} placeholder="0.00"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Примечание</label>
              <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder=""
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-neutral-200">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer">
            Отмена
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">
            {saving ? "Сохранение..." : initial?.id ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Главная страница ----
export default function RepairPage() {
  const [tab, setTab] = useState<PageTab>("repair");
  const [buses, setBuses] = useState<Bus[]>([]);
  const [mechanics, setMechanics] = useState<RepairMechanic[]>([]);
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [showMoForm, setShowMoForm] = useState(false);
  const [editRepair, setEditRepair] = useState<RepairRecord|null>(null);
  const [editMo, setEditMo] = useState<MaintenanceRecord|null>(null);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterBus, setFilterBus] = useState("");

  // Справочники механиков
  const [mechForm, setMechForm] = useState({full_name:"",role:"executor",organization:"",specialization:""});
  const [savingMech, setSavingMech] = useState(false);

  useEffect(() => {
    api.getBuses().then(r => setBuses(Array.isArray(r) ? r : []));
    api.getRepairMechanics().then(r => setMechanics(Array.isArray(r) ? r : []));
    api.getRepairWorkTemplates().then(r => setTemplates(Array.isArray(r) ? r : []));
  }, []);

  const loadRepairs = useCallback(async () => {
    setLoading(true);
    const params: Record<string,string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterBus) params.bus_id = filterBus;
    const r = await api.getRepairJournal(params);
    setRepairs(Array.isArray(r) ? r : []);
    setLoading(false);
  }, [filterStatus, filterBus]);

  const loadMaintenance = useCallback(async () => {
    setLoading(true);
    const params: Record<string,string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterBus) params.bus_id = filterBus;
    const r = await api.getMaintenanceJournal(params);
    setMaintenance(Array.isArray(r) ? r : []);
    setLoading(false);
  }, [filterStatus, filterBus]);

  useEffect(() => { if (tab === "repair") loadRepairs(); }, [tab, loadRepairs]);
  useEffect(() => { if (tab === "maintenance") loadMaintenance(); }, [tab, loadMaintenance]);

  async function saveMechanic() {
    if (!mechForm.full_name) return;
    setSavingMech(true);
    await api.createRepairMechanic(mechForm);
    setMechForm({full_name:"",role:"executor",organization:"",specialization:""});
    const r = await api.getRepairMechanics();
    setMechanics(Array.isArray(r) ? r : []);
    setSavingMech(false);
  }
  async function deleteMechanic(id: number) {
    if (!confirm("Убрать механика из списка?")) return;
    await api.deleteRepairMechanic(id);
    const r = await api.getRepairMechanics();
    setMechanics(Array.isArray(r) ? r : []);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Служба ремонта</h1>
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          {(["repair","maintenance","mechanics"] as PageTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${tab===t ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              {t==="repair" ? "Журнал ремонта" : t==="maintenance" ? "Журнал ТО" : "Механики"}
            </button>
          ))}
        </div>
      </div>

      {/* --- ЖУРНАЛ РЕМОНТА --- */}
      {tab === "repair" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { setEditRepair(null); setShowRepairForm(true); }}
              className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-4 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer">
              <Icon name="Plus" size={15} /> Новая запись
            </button>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer">
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterBus} onChange={e => setFilterBus(e.target.value)}
              className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer">
              <option value="">Все ТС</option>
              {buses.map(b => <option key={b.id} value={b.id}>Борт {b.board_number}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-sm text-neutral-400 text-center py-10">Загрузка...</div>
          ) : repairs.length === 0 ? (
            <div className="text-sm text-neutral-400 text-center py-10">Записей нет</div>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="flex items-center px-4 py-2 bg-neutral-800">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  Журнал ремонта — {repairs.length} {repairs.length === 1 ? "запись" : repairs.length < 5 ? "записи" : "записей"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-800 text-neutral-200">
                      <th className="px-2 py-2 text-center font-semibold whitespace-nowrap border-r border-neutral-700 w-8">№</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Дата</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[60px]">Борт</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Гос. №</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[180px]">Неисправность</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[110px]">Тип</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Критичность</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[120px]">Исполнитель</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Начало</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Конец</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Статус</th>
                      <th className="px-2 py-2 text-right font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">Стоимость ₽</th>
                      <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-16">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairs.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={`group border-b border-neutral-100 cursor-pointer transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"} hover:bg-blue-50/40`}
                        onClick={() => { setEditRepair(r); setShowRepairForm(true); }}
                      >
                        <td className="px-2 py-2 text-center text-neutral-400 border-r border-neutral-100 font-mono">{idx + 1}</td>
                        <td className="px-2 py-2 border-r border-neutral-100 whitespace-nowrap text-neutral-700 font-mono">{fmtDate(r.fault_date)}</td>
                        <td className="px-2 py-2 border-r border-neutral-100 font-mono text-neutral-700">
                          {r.board_number || <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 font-mono text-neutral-700 whitespace-nowrap">
                          {r.gov_number || <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 max-w-[180px] truncate text-neutral-800" title={r.fault_description}>
                          {r.fault_description}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 truncate max-w-[110px]" title={r.fault_type || ""}>
                          {r.fault_type || <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold leading-tight ${SEVERITY_COLORS[r.severity]}`}>
                            {SEVERITY_LABELS[r.severity]}
                          </span>
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 max-w-[120px] truncate text-neutral-700" title={r.executor_name || ""}>
                          {r.executor_name || <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 whitespace-nowrap text-neutral-600 font-mono">
                          {r.repair_start ? fmtDate(r.repair_start) : <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 whitespace-nowrap text-neutral-600 font-mono">
                          {r.repair_end ? fmtDate(r.repair_end) : <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight ${STATUS_COLORS[r.status]}`}>
                            {STATUS_LABELS[r.status]}
                          </span>
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 text-right font-mono text-neutral-700 whitespace-nowrap">
                          {r.total_cost != null ? fmt(r.total_cost) : <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              title="Редактировать"
                              onClick={() => { setEditRepair(r); setShowRepairForm(true); }}
                              className="p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
                            >
                              <Icon name="Pencil" size={13} />
                            </button>
                            <button
                              title="Удалить"
                              onClick={async () => {
                                if (!confirm("Удалить запись?")) return;
                                await api.deleteRepairJournal(r.id);
                                loadRepairs();
                              }}
                              className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                            >
                              <Icon name="Trash2" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- ЖУРНАЛ ТО --- */}
      {tab === "maintenance" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { setEditMo(null); setShowMoForm(true); }}
              className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-4 py-2 rounded hover:bg-neutral-700 transition-colors cursor-pointer">
              <Icon name="Plus" size={15}/> Новая запись
            </button>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer">
              <option value="">Все статусы</option>
              {Object.entries(MO_STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterBus} onChange={e => setFilterBus(e.target.value)}
              className="text-sm border border-neutral-200 rounded px-2 py-1.5 bg-white cursor-pointer">
              <option value="">Все ТС</option>
              {buses.map(b => <option key={b.id} value={b.id}>Борт {b.board_number}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-sm text-neutral-400 text-center py-10">Загрузка...</div>
          ) : maintenance.length === 0 ? (
            <div className="text-sm text-neutral-400 text-center py-10">Записей нет</div>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="flex items-center px-4 py-2 bg-neutral-800">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  Журнал ТО — {maintenance.length} {maintenance.length === 1 ? "запись" : maintenance.length < 5 ? "записи" : "записей"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-800 text-neutral-200">
                      <th className="px-2 py-2 text-center font-semibold whitespace-nowrap border-r border-neutral-700 w-8">№</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[60px]">Борт</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Гос. №</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">Вид ТО</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Дата план.</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Дата факт.</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">Статус</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[130px]">Исполнитель</th>
                      <th className="px-2 py-2 text-right font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">Стоимость ₽</th>
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[150px]">Примечание</th>
                      <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-16">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenance.map((m, idx) => (
                      <tr
                        key={m.id}
                        className={`group border-b border-neutral-100 cursor-pointer transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"} hover:bg-blue-50/40`}
                        onClick={() => { setEditMo(m); setShowMoForm(true); }}
                      >
                        <td className="px-2 py-2 text-center text-neutral-400 border-r border-neutral-100 font-mono">{idx + 1}</td>
                        <td className="px-2 py-2 border-r border-neutral-100 font-mono text-neutral-700">
                          {m.board_number || <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 font-mono text-neutral-700 whitespace-nowrap">
                          {m.gov_number || <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 whitespace-nowrap">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-semibold">
                            {MO_LABELS[m.maintenance_type] || m.maintenance_type}
                          </span>
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 whitespace-nowrap font-mono text-neutral-700">
                          {fmtDate(m.scheduled_date)}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 whitespace-nowrap font-mono">
                          {m.completed_date
                            ? <span className="text-green-700">{fmtDate(m.completed_date)}</span>
                            : <span className="text-neutral-300">—</span>
                          }
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight ${MO_STATUS_COLORS[m.status]}`}>
                            {MO_STATUS_LABELS[m.status]}
                          </span>
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 max-w-[130px] truncate text-neutral-700" title={m.executor_name || ""}>
                          {m.executor_name || <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 text-right font-mono text-neutral-700 whitespace-nowrap">
                          {m.total_cost != null ? fmt(m.total_cost) : <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 border-r border-neutral-100 max-w-[150px] truncate text-neutral-500" title={m.notes || ""}>
                          {m.notes || <span className="text-neutral-300">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              title="Редактировать"
                              onClick={() => { setEditMo(m); setShowMoForm(true); }}
                              className="p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
                            >
                              <Icon name="Pencil" size={13} />
                            </button>
                            <button
                              title="Удалить"
                              onClick={async () => {
                                if (!confirm("Удалить запись ТО?")) return;
                                await api.deleteMaintenanceJournal(m.id);
                                loadMaintenance();
                              }}
                              className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                            >
                              <Icon name="Trash2" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- МЕХАНИКИ --- */}
      {tab === "mechanics" && (
        <div className="space-y-5">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">Добавить механика</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">ФИО *</label>
                <input value={mechForm.full_name} onChange={e=>setMechForm(f=>({...f,full_name:e.target.value}))}
                  placeholder="Фамилия Имя Отчество"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Роль</label>
                <select value={mechForm.role} onChange={e=>setMechForm(f=>({...f,role:e.target.value}))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                  <option value="executor">Исполнитель</option>
                  <option value="controller">Контролёр</option>
                  <option value="both">Исполнитель и контролёр</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Специализация</label>
                <input value={mechForm.specialization} onChange={e=>setMechForm(f=>({...f,specialization:e.target.value}))}
                  placeholder="Электрик, моторист и т.д."
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Организация</label>
                <input value={mechForm.organization} onChange={e=>setMechForm(f=>({...f,organization:e.target.value}))}
                  placeholder="Название организации"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={saveMechanic} disabled={savingMech || !mechForm.full_name}
              className="bg-neutral-900 text-white text-sm px-4 py-2 rounded hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
              {savingMech ? "Сохранение..." : "Добавить"}
            </button>
          </div>

          <div className="space-y-2">
            {mechanics.length === 0 && <p className="text-sm text-neutral-400 text-center py-6">Механики не добавлены</p>}
            {mechanics.map(m => (
              <div key={m.id} className="border border-neutral-200 rounded-lg px-4 py-3 flex items-center gap-4">
                <Icon name="Wrench" size={16} className="text-neutral-400 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-900">{m.full_name}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {m.role === "executor" ? "Исполнитель" : m.role === "controller" ? "Контролёр" : "Исполнитель и контролёр"}
                    {m.specialization && ` · ${m.specialization}`}
                    {m.organization && ` · ${m.organization}`}
                  </div>
                </div>
                <button onClick={() => deleteMechanic(m.id)}
                  className="text-neutral-400 hover:text-red-500 cursor-pointer p-1.5 rounded hover:bg-red-50 transition-colors">
                  <Icon name="X" size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRepairForm && (
        <RepairForm buses={buses} mechanics={mechanics} templates={templates}
          initial={editRepair || undefined}
          onSaved={loadRepairs} onClose={() => { setShowRepairForm(false); setEditRepair(null); }} />
      )}
      {showMoForm && (
        <MoForm buses={buses} mechanics={mechanics}
          initial={editMo || undefined}
          onSaved={loadMaintenance} onClose={() => { setShowMoForm(false); setEditMo(null); }} />
      )}
    </div>
  );
}