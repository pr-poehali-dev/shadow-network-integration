import { useState } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";
import { Position, Driver, Conductor, StaffMember, POSITION_LABELS, WORK_SCHEDULES } from "./hrTypes";

// ---- Форма сотрудника (staff таблица) ----
interface StaffFormProps {
  position: Position;
  initial?: Partial<StaffMember>;
  onSaved: () => void;
  onClose: () => void;
}

export function StaffForm({ position, initial, onSaved, onClose }: StaffFormProps) {
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

export function DriverForm({ initial, onSaved, onClose }: DriverFormProps) {
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

export function ConductorForm({ initial, onSaved, onClose }: ConductorFormProps) {
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
