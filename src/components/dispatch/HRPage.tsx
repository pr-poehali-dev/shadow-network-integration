import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";
import HRReports from "./HRReports";
import SmsPanel from "./SmsPanel";
import HRImportPage from "./HRImportPage";

// ---- Типы ----
type Position =
  | "driver" | "conductor"
  | "locksmith" | "accountant_staff" | "cashier_staff"
  | "guard" | "mechanic_staff" | "cleaning" | "medical" | "other";

interface Driver {
  id: number; full_name: string; phone?: string; birth_date?: string;
  snils?: string; inn?: string; license_number?: string; license_date?: string;
  is_official: boolean;
}
interface Conductor {
  id: number; full_name: string; phone?: string; birth_date?: string; snils?: string; inn?: string;
}
interface StaffMember {
  id: number; position: Position; full_name: string; phone?: string; birth_date?: string;
  snils?: string; inn?: string; passport_series?: string; passport_number?: string;
  passport_issued_by?: string; passport_issued_date?: string; address?: string;
  hire_date?: string; fire_date?: string; organization?: string;
  is_official: boolean; is_active: boolean; notes?: string;
}

// ---- Константы ----
const POSITION_LABELS: Record<Position | string, string> = {
  driver: "Водители",
  conductor: "Кондукторы",
  locksmith: "Слесари",
  accountant_staff: "Бухгалтерия",
  cashier_staff: "Кассиры",
  guard: "Сторожа",
  mechanic_staff: "Механики",
  cleaning: "Клининг",
  medical: "Медики",
  other: "Прочие",
};
const POSITION_ICONS: Record<string, string> = {
  driver: "Truck", conductor: "Users", locksmith: "Wrench",
  accountant_staff: "Calculator", cashier_staff: "Landmark",
  guard: "Shield", mechanic_staff: "Settings2", cleaning: "Sparkles",
  medical: "Stethoscope", other: "UserRound",
};

const STAFF_POSITIONS: Position[] = [
  "locksmith","accountant_staff","cashier_staff","guard","mechanic_staff","cleaning","medical","other"
];

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

// ---- Форма сотрудника (staff таблица) ----
interface StaffFormProps {
  position: Position;
  initial?: Partial<StaffMember>;
  onSaved: () => void;
  onClose: () => void;
}

function StaffForm({ position, initial, onSaved, onClose }: StaffFormProps) {
  const [form, setForm] = useState({
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    birth_date: initial?.birth_date?.slice(0, 10) ?? "",
    snils: initial?.snils ?? "",
    inn: initial?.inn ?? "",
    passport_series: initial?.passport_series ?? "",
    passport_number: initial?.passport_number ?? "",
    passport_issued_by: initial?.passport_issued_by ?? "",
    passport_issued_date: initial?.passport_issued_date?.slice(0, 10) ?? "",
    address: initial?.address ?? "",
    hire_date: initial?.hire_date?.slice(0, 10) ?? "",
    fire_date: initial?.fire_date?.slice(0, 10) ?? "",
    organization: initial?.organization ?? "",
    is_official: initial?.is_official ?? true,
    is_active: initial?.is_active ?? true,
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const payload = { ...form, position };
    if (initial?.id) {
      await api.updateStaff(initial.id, payload);
    } else {
      await api.createStaff(payload);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="font-semibold text-neutral-900">
            {initial?.id ? "Редактировать" : "Добавить"} — {POSITION_LABELS[position]}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-600 mb-1">ФИО *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Фамилия Имя Отчество"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Телефон</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+7 (000) 000-00-00"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Дата рождения</label>
              <input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">СНИЛС</label>
              <input value={form.snils} onChange={e => setForm(f => ({ ...f, snils: e.target.value }))}
                placeholder="000-000-000 00"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">ИНН</label>
              <input value={form.inn} onChange={e => setForm(f => ({ ...f, inn: e.target.value }))}
                placeholder="ИНН физ. лица"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Серия паспорта</label>
              <input value={form.passport_series} onChange={e => setForm(f => ({ ...f, passport_series: e.target.value }))}
                placeholder="00 00"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Номер паспорта</label>
              <input value={form.passport_number} onChange={e => setForm(f => ({ ...f, passport_number: e.target.value }))}
                placeholder="000000"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-600 mb-1">Кем выдан</label>
              <input value={form.passport_issued_by} onChange={e => setForm(f => ({ ...f, passport_issued_by: e.target.value }))}
                placeholder="Наименование органа"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Дата выдачи паспорта</label>
              <input type="date" value={form.passport_issued_date} onChange={e => setForm(f => ({ ...f, passport_issued_date: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Организация</label>
              <input value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                placeholder="Название организации"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-600 mb-1">Адрес проживания</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Город, улица, дом, квартира"
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Дата приёма</label>
              <input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">Дата увольнения</label>
              <input type="date" value={form.fire_date} onChange={e => setForm(f => ({ ...f, fire_date: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-600">Оформление:</span>
              {[{v:true,l:"Официальный"},{v:false,l:"Неофициальный"}].map(o => (
                <button key={String(o.v)} onClick={() => setForm(f => ({...f, is_official: o.v}))}
                  className={`text-xs px-3 py-1.5 rounded border cursor-pointer transition-colors ${
                    form.is_official === o.v ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}>{o.l}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-600">Статус:</span>
              {[{v:true,l:"Работает"},{v:false,l:"Уволен"}].map(o => (
                <button key={String(o.v)} onClick={() => setForm(f => ({...f, is_active: o.v}))}
                  className={`text-xs px-3 py-1.5 rounded border cursor-pointer transition-colors ${
                    form.is_active === o.v
                      ? o.v ? "bg-green-600 text-white border-green-600" : "bg-neutral-500 text-white border-neutral-500"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}>{o.l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Примечание</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Дополнительная информация"
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-neutral-200">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer transition-colors">
            Отмена
          </button>
          <button onClick={save} disabled={saving || !form.full_name.trim()}
            className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
            {saving ? "Сохранение..." : initial?.id ? "Сохранить" : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Форма водителя ----
interface DriverFormProps {
  initial?: Partial<Driver>;
  onSaved: () => void;
  onClose: () => void;
}

const WORK_SCHEDULES = [
  { value: "", label: "Не задан" },
  { value: "3/3", label: "3 через 3" },
  { value: "5/2", label: "5 через 2 (пн-пт)" },
  { value: "2/2", label: "2 через 2" },
  { value: "6/1", label: "6 через 1" },
  { value: "4/3", label: "4 через 3" },
  { value: "individual", label: "Индивидуальный" },
];

function DriverForm({ initial, onSaved, onClose }: DriverFormProps) {
  const [form, setForm] = useState({
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    birth_date: initial?.birth_date ?? "",
    snils: initial?.snils ?? "",
    inn: initial?.inn ?? "",
    license_number: initial?.license_number ?? "",
    license_date: initial?.license_date ?? "",
    is_official: initial?.is_official ?? true,
    work_schedule: (initial as Record<string,unknown>)?.work_schedule as string ?? "",
    schedule_start_date: (initial as Record<string,unknown>)?.schedule_start_date as string ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const data = {
      ...form,
      birth_date: form.birth_date || null,
      license_date: form.license_date || null,
      work_schedule: form.work_schedule || null,
      schedule_start_date: form.schedule_start_date || null,
    };
    if (initial?.id) { await api.updateDriver(initial.id, data); }
    else { await api.createDriver(data as Parameters<typeof api.createDriver>[0]); }
    catalogCache.invalidateDrivers();
    setSaving(false);
    onSaved();
    onClose();
  }

  const fields = [
    { key:"full_name", label:"ФИО", placeholder:"Фамилия Имя Отчество", colSpan: true },
    { key:"phone", label:"Телефон", placeholder:"+7 (000) 000-00-00" },
    { key:"birth_date", label:"Дата рождения", placeholder:"ГГГГ-ММ-ДД" },
    { key:"snils", label:"СНИЛС", placeholder:"000-000-000 00" },
    { key:"inn", label:"ИНН", placeholder:"ИНН" },
    { key:"license_number", label:"Вод. удостоверение №", placeholder:"Серия и номер" },
    { key:"license_date", label:"Дата выдачи ВУ", placeholder:"ГГГГ-ММ-ДД" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="font-semibold text-neutral-900">{initial?.id ? "Редактировать водителя" : "Добавить водителя"}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18}/></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={(f as {colSpan?:boolean}).colSpan ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-neutral-600 mb-1">{f.label}</label>
                <input value={(form as Record<string,unknown>)[f.key] as string ?? ""}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  placeholder={f.placeholder}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            <div className="col-span-2 flex items-center gap-3 pt-1">
              <span className="text-xs font-medium text-neutral-600">Тип:</span>
              {[{v:true,l:"Официальный"},{v:false,l:"Неофициальный"}].map(o => (
                <button key={String(o.v)} onClick={() => setForm(p => ({...p, is_official: o.v}))}
                  className={`text-xs px-3 py-1.5 rounded border cursor-pointer transition-colors ${
                    form.is_official === o.v ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}>{o.l}</button>
              ))}
            </div>
            {/* График работы */}
            <div className="col-span-2 border-t border-neutral-100 pt-3 mt-1">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">График работы (для планирования)</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Предпочтительный график</label>
                  <select value={form.work_schedule} onChange={e => setForm(p => ({...p, work_schedule: e.target.value}))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                    {WORK_SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Дата начала цикла</label>
                  <input type="date" value={form.schedule_start_date} onChange={e => setForm(p => ({...p, schedule_start_date: e.target.value}))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-neutral-200">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer">Отмена</button>
          <button onClick={save} disabled={saving || !form.full_name.trim()}
            className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">
            {saving ? "Сохранение..." : initial?.id ? "Сохранить" : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Форма кондуктора ----
interface ConductorFormProps {
  initial?: Partial<Conductor>;
  onSaved: () => void;
  onClose: () => void;
}

function ConductorForm({ initial, onSaved, onClose }: ConductorFormProps) {
  const [form, setForm] = useState({
    full_name: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    birth_date: initial?.birth_date ?? "",
    snils: initial?.snils ?? "",
    inn: initial?.inn ?? "",
    work_schedule: (initial as Record<string,unknown>)?.work_schedule as string ?? "",
    schedule_start_date: (initial as Record<string,unknown>)?.schedule_start_date as string ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.full_name.trim()) return;
    setSaving(true);
    const data = { ...form, work_schedule: form.work_schedule || null, schedule_start_date: form.schedule_start_date || null };
    if (initial?.id) { await api.updateConductor(initial.id, data); }
    else { await api.createConductor(data as Parameters<typeof api.createConductor>[0]); }
    catalogCache.invalidateConductors();
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="font-semibold text-neutral-900">{initial?.id ? "Редактировать кондуктора" : "Добавить кондуктора"}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer"><Icon name="X" size={18}/></button>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key:"full_name", label:"ФИО", placeholder:"Фамилия Имя Отчество", colSpan:true },
              { key:"phone", label:"Телефон", placeholder:"+7 (000) 000-00-00" },
              { key:"birth_date", label:"Дата рождения", placeholder:"ГГГГ-ММ-ДД" },
              { key:"snils", label:"СНИЛС", placeholder:"000-000-000 00" },
              { key:"inn", label:"ИНН", placeholder:"ИНН" },
            ].map(f => (
              <div key={f.key} className={(f as {colSpan?:boolean}).colSpan ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-neutral-600 mb-1">{f.label}</label>
                <input value={(form as Record<string,unknown>)[f.key] as string ?? ""}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  placeholder={f.placeholder}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
            <div className="col-span-2 border-t border-neutral-100 pt-3 mt-1">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">График работы</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">График</label>
                  <select value={form.work_schedule} onChange={e => setForm(p => ({...p, work_schedule: e.target.value}))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                    {WORK_SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">Начало цикла</label>
                  <input type="date" value={form.schedule_start_date} onChange={e => setForm(p => ({...p, schedule_start_date: e.target.value}))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-neutral-200">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 cursor-pointer">Отмена</button>
          <button onClick={save} disabled={saving || !form.full_name.trim()}
            className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">
            {saving ? "Сохранение..." : initial?.id ? "Сохранить" : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Список сотрудников по должности (staff таблица) ----
interface StaffListProps {
  position: Position;
  canEdit: boolean;
}

function StaffList({ position, canEdit }: StaffListProps) {
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

// ---- Водители (встроен в HR) ----
interface DriverListProps { canEdit: boolean; }

function DriverList({ canEdit }: DriverListProps) {
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

// ---- Кондукторы (встроен в HR) ----
interface ConductorListProps { canEdit: boolean; }

function ConductorList({ canEdit }: ConductorListProps) {
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

// ---- Главная страница Кадры ----
export default function HRPage() {
  const { user, hasAccess } = useAuth();

  const isDispatcher = user?.role === "dispatcher";
  const canEdit = hasAccess("hr") && !isDispatcher;

  type HRTab = Position | "driver" | "conductor" | "reports";
  type PageSection = "staff" | "reports" | "sms" | "import1c";

  const [section, setSection] = useState<PageSection>("staff");

  const allTabs: { id: HRTab; label: string; icon: string }[] = [
    { id: "driver",           label: "Водители",    icon: "Truck" },
    { id: "conductor",        label: "Кондукторы",  icon: "Users" },
    { id: "locksmith",        label: "Слесари",     icon: "Wrench" },
    { id: "accountant_staff", label: "Бухгалтерия", icon: "Calculator" },
    { id: "cashier_staff",    label: "Кассиры",     icon: "Landmark" },
    { id: "guard",            label: "Сторожа",     icon: "Shield" },
    { id: "mechanic_staff",   label: "Механики",    icon: "Settings2" },
    { id: "cleaning",         label: "Клининг",     icon: "Sparkles" },
    { id: "medical",          label: "Медики",      icon: "Stethoscope" },
    { id: "other",            label: "Прочие",      icon: "UserRound" },
  ];

  const visibleTabs = isDispatcher ? allTabs.filter(t => t.id === "driver") : allTabs;
  const [activeTab, setActiveTab] = useState<HRTab>(visibleTabs[0]?.id ?? "driver");

  return (
    <div className="space-y-5">
      {/* Шапка с переключением секций */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Кадры</h1>
        {!isDispatcher && (
          <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
            <button onClick={() => setSection("staff")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${section === "staff" ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Icon name="Users" size={13} /> Сотрудники
            </button>
            <button onClick={() => setSection("reports")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${section === "reports" ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Icon name="FileText" size={13} /> Кадровые отчёты
            </button>
            <button onClick={() => setSection("sms")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${section === "sms" ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Icon name="MessageSquare" size={13} /> SMS
            </button>
            <button onClick={() => setSection("import1c")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${section === "import1c" ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Icon name="FileUp" size={13} /> Импорт 1С
            </button>
          </div>
        )}
      </div>

      {/* Секция: Отчёты */}
      {section === "reports" && !isDispatcher && (
        <HRReports organization="" />
      )}

      {/* Секция: SMS уведомления */}
      {section === "sms" && !isDispatcher && (
        <div className="border border-neutral-200 rounded-xl p-5">
          <SmsPanel />
        </div>
      )}

      {/* Секция: Импорт из 1С */}
      {section === "import1c" && !isDispatcher && (
        <div className="border border-neutral-200 rounded-xl p-5">
          <HRImportPage />
        </div>
      )}

      {/* Секция: Сотрудники */}
      {section === "staff" && (
        <div className="flex gap-6">
          <nav className="w-44 shrink-0 space-y-0.5">
            {visibleTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-lg transition-colors cursor-pointer ${
                  activeTab === t.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}>
                <Icon name={t.icon} size={15} />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">
              {visibleTabs.find(t => t.id === activeTab)?.label}
            </h2>
            {activeTab === "driver" && <DriverList canEdit={canEdit} />}
            {activeTab === "conductor" && <ConductorList canEdit={canEdit} />}
            {STAFF_POSITIONS.includes(activeTab as Position) && (
              <StaffList position={activeTab as Position} canEdit={canEdit} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}