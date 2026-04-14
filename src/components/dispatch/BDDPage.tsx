import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

// ---- Типы ----
interface Accident {
  id: number;
  accident_date: string;
  accident_time?: string;
  organization?: string;
  location?: string;
  bus_board_number?: string;
  bus_gov_number?: string;
  bus_model?: string;
  driver_name?: string;
  driver_license?: string;
  route_number?: string;
  graph_number?: number;
  description?: string;
  weather_conditions?: string;
  road_conditions?: string;
  visibility?: string;
  victims_count?: number;
  victims_info?: string;
  other_vehicles?: string;
  fault_side?: string;
  damage_description?: string;
  damage_amount?: number;
  status: string;
  investigator_name?: string;
  investigation_result?: string;
  documents?: { url: string; name: string; content_type: string }[];
  schedule_entry_id?: number;
  created_at?: string;
}

type AccidentForm = Omit<Accident, "id" | "created_at" | "documents">;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Новое", color: "bg-red-100 text-red-700" },
  investigation: { label: "Расследование", color: "bg-amber-100 text-amber-700" },
  closed: { label: "Закрыто", color: "bg-green-100 text-green-700" },
  archived: { label: "Архив", color: "bg-neutral-100 text-neutral-500" },
};

const WEATHER = ["Ясно", "Облачно", "Дождь", "Снег", "Туман", "Гололёд", "Метель"];
const ROAD_COND = ["Сухое", "Мокрое", "Заснеженное", "Обледенелое", "Грязь"];
const VISIBILITY_OPT = ["Хорошая", "Ограниченная", "Плохая"];
const FAULT_SIDE = ["Наш водитель", "Второй участник", "Обоюдная вина", "Без вины", "Устанавливается"];

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

function emptyForm(): AccidentForm {
  return {
    accident_date: new Date().toISOString().slice(0, 10),
    accident_time: "",
    organization: "",
    location: "",
    bus_board_number: "",
    bus_gov_number: "",
    bus_model: "",
    driver_name: "",
    driver_license: "",
    route_number: "",
    graph_number: undefined,
    description: "",
    weather_conditions: "Ясно",
    road_conditions: "Сухое",
    visibility: "Хорошая",
    victims_count: 0,
    victims_info: "",
    other_vehicles: "",
    fault_side: "Устанавливается",
    damage_description: "",
    damage_amount: undefined,
    status: "new",
    investigator_name: "",
    investigation_result: "",
    schedule_entry_id: undefined,
  };
}

// --------- Печать: Справка об обстоятельствах ДТП ---------
function printAccidentReport(a: Accident) {
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Справка ДТП</title>
<style>
body{font-family:"Times New Roman",serif;font-size:11pt;padding:20mm}
h2{text-align:center;font-size:14pt;margin-bottom:2mm}
h3{text-align:center;font-size:11pt;font-weight:normal;margin-bottom:6mm}
.section{margin-top:5mm;border-bottom:1px solid #333;font-weight:bold;font-size:11pt;padding-bottom:1mm}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin-top:3mm}
.field{border-bottom:1px solid #aaa;padding-bottom:1mm;margin-bottom:1mm}
.label{font-size:8.5pt;color:#555}
.val{font-size:11pt;min-height:5mm}
.full{grid-column:1/-1}
.signature{margin-top:12mm;display:flex;justify-content:space-between;font-size:10pt}
.sign-line{display:inline-block;border-bottom:1px solid #000;min-width:55mm}
</style></head><body>
<h2>СПРАВКА ОБ ОБСТОЯТЕЛЬСТВАХ ДТП</h2>
<h3>${a.organization || "________________________________"}</h3>

<div class="section">I. ОБЩИЕ СВЕДЕНИЯ</div>
<div class="grid">
  <div class="field"><div class="label">Дата ДТП</div><div class="val">${fmtDate(a.accident_date)}</div></div>
  <div class="field"><div class="label">Время ДТП</div><div class="val">${a.accident_time || "—"}</div></div>
  <div class="field full"><div class="label">Место ДТП</div><div class="val">${a.location || "—"}</div></div>
  <div class="field"><div class="label">Статус расследования</div><div class="val">${STATUS_LABELS[a.status]?.label || a.status}</div></div>
  <div class="field"><div class="label">Вина</div><div class="val">${a.fault_side || "—"}</div></div>
</div>

<div class="section" style="margin-top:6mm">II. ТРАНСПОРТНОЕ СРЕДСТВО</div>
<div class="grid">
  <div class="field"><div class="label">Бортовой №</div><div class="val">${a.bus_board_number || "—"}</div></div>
  <div class="field"><div class="label">Гос. номер</div><div class="val">${a.bus_gov_number || "—"}</div></div>
  <div class="field"><div class="label">Модель ТС</div><div class="val">${a.bus_model || "—"}</div></div>
  <div class="field"><div class="label">Маршрут / График</div><div class="val">м.${a.route_number || "—"} / гр.${a.graph_number ?? "—"}</div></div>
</div>

<div class="section" style="margin-top:6mm">III. ВОДИТЕЛЬ</div>
<div class="grid">
  <div class="field"><div class="label">ФИО водителя</div><div class="val">${a.driver_name || "—"}</div></div>
  <div class="field"><div class="label">Номер ВУ</div><div class="val">${a.driver_license || "—"}</div></div>
</div>

<div class="section" style="margin-top:6mm">IV. УСЛОВИЯ ДТП</div>
<div class="grid">
  <div class="field"><div class="label">Погода</div><div class="val">${a.weather_conditions || "—"}</div></div>
  <div class="field"><div class="label">Состояние дороги</div><div class="val">${a.road_conditions || "—"}</div></div>
  <div class="field"><div class="label">Видимость</div><div class="val">${a.visibility || "—"}</div></div>
  <div class="field"><div class="label">Пострадавших</div><div class="val">${a.victims_count ?? 0} чел.</div></div>
  ${a.victims_info ? `<div class="field full"><div class="label">Сведения о пострадавших</div><div class="val">${a.victims_info}</div></div>` : ""}
</div>

<div class="section" style="margin-top:6mm">V. ОБСТОЯТЕЛЬСТВА И УЩЕРБ</div>
<div class="grid">
  <div class="field full"><div class="label">Описание обстоятельств</div><div class="val">${a.description || "—"}</div></div>
  ${a.other_vehicles ? `<div class="field full"><div class="label">Другие участники ДТП</div><div class="val">${a.other_vehicles}</div></div>` : ""}
  <div class="field full"><div class="label">Описание повреждений</div><div class="val">${a.damage_description || "—"}</div></div>
  <div class="field"><div class="label">Сумма ущерба</div><div class="val">${a.damage_amount ? a.damage_amount.toLocaleString("ru-RU") + " ₽" : "—"}</div></div>
</div>

${a.investigation_result ? `
<div class="section" style="margin-top:6mm">VI. РЕЗУЛЬТАТ РАССЛЕДОВАНИЯ</div>
<div class="grid">
  <div class="field"><div class="label">Ответственный</div><div class="val">${a.investigator_name || "—"}</div></div>
  <div class="field full"><div class="label">Вывод</div><div class="val">${a.investigation_result}</div></div>
</div>` : ""}

<div class="signature">
  <div>Составил: <span class="sign-line"></span></div>
  <div>Дата: <span class="sign-line" style="min-width:30mm"></span></div>
  <div>Подпись: <span class="sign-line" style="min-width:30mm"></span></div>
</div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// --------- Печать: Акт о ДТП ---------
function printAccidentAct(a: Accident) {
  const num = `БДД-${a.id || "___"}-${new Date().getFullYear()}`;
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Акт о ДТП</title>
<style>
body{font-family:"Times New Roman",serif;font-size:12pt;padding:20mm}
h2{text-align:center;font-size:14pt}
h3{text-align:center;font-size:11pt;font-weight:normal;margin-bottom:8mm}
.right{text-align:right;font-size:10pt}
p{margin:4mm 0;line-height:1.7}
table{width:100%;border-collapse:collapse;margin:4mm 0}
td{padding:1.5mm 3mm;vertical-align:top}
.label{width:45%;color:#555;font-size:10pt}
.val{border-bottom:1px solid #aaa;font-size:11pt}
.sign-row{margin-top:12mm;display:flex;justify-content:space-between;font-size:10pt}
.sign-line{display:inline-block;border-bottom:1px solid #000;min-width:55mm}
</style></head><body>
<div class="right">${a.organization || "________________________________"}</div>
<h2>АКТ № ${num}</h2>
<h3>о дорожно-транспортном происшествии</h3>
<p>Дата составления: ${fmtDate(new Date().toISOString().slice(0, 10))}</p>
<table>
  <tr><td class="label">Дата и время ДТП:</td><td class="val">${fmtDate(a.accident_date)} ${a.accident_time || ""}</td></tr>
  <tr><td class="label">Место ДТП:</td><td class="val">${a.location || "—"}</td></tr>
  <tr><td class="label">Транспортное средство (борт / гос. №):</td><td class="val">№${a.bus_board_number || "—"} / ${a.bus_gov_number || "—"}</td></tr>
  <tr><td class="label">Модель ТС:</td><td class="val">${a.bus_model || "—"}</td></tr>
  <tr><td class="label">Маршрут / График:</td><td class="val">м.${a.route_number || "—"} / гр.${a.graph_number ?? "—"}</td></tr>
  <tr><td class="label">Водитель (ФИО, ВУ):</td><td class="val">${a.driver_name || "—"} / ${a.driver_license || "—"}</td></tr>
  <tr><td class="label">Условия: погода / дорога / видимость:</td><td class="val">${a.weather_conditions || "—"} / ${a.road_conditions || "—"} / ${a.visibility || "—"}</td></tr>
  <tr><td class="label">Пострадавших:</td><td class="val">${a.victims_count ?? 0} чел. ${a.victims_info ? "(" + a.victims_info + ")" : ""}</td></tr>
  <tr><td class="label">Другие участники:</td><td class="val">${a.other_vehicles || "—"}</td></tr>
  <tr><td class="label">Обстоятельства:</td><td class="val">${a.description || "—"}</td></tr>
  <tr><td class="label">Описание повреждений:</td><td class="val">${a.damage_description || "—"}</td></tr>
  <tr><td class="label">Предварительная сумма ущерба:</td><td class="val">${a.damage_amount ? a.damage_amount.toLocaleString("ru-RU") + " ₽" : "—"}</td></tr>
  <tr><td class="label">Вина:</td><td class="val">${a.fault_side || "—"}</td></tr>
  <tr><td class="label">Ответственный за расследование:</td><td class="val">${a.investigator_name || "—"}</td></tr>
</table>
<div class="sign-row">
  <div>Составил: <span class="sign-line"></span></div>
  <div>Руководитель: <span class="sign-line"></span></div>
</div>
<div class="sign-row" style="margin-top:6mm">
  <div>Водитель ознакомлен: <span class="sign-line"></span></div>
  <div>Дата: <span class="sign-line" style="min-width:30mm"></span></div>
</div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// --------- Печать: Объяснительная водителя ---------
function printDriverExplanation(a: Accident) {
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Объяснительная</title>
<style>
body{font-family:"Times New Roman",serif;font-size:12pt;padding:20mm}
.right{text-align:right;margin-bottom:8mm;font-size:11pt}
h2{text-align:center;font-size:14pt;margin-bottom:6mm}
p{margin:5mm 0;line-height:1.8}
.sign-row{margin-top:15mm;display:flex;justify-content:space-between}
.sign-line{display:inline-block;border-bottom:1px solid #000;min-width:55mm}
</style></head><body>
<div class="right">
  Руководителю<br/>
  ${a.organization || "________________________________"}<br/>
  от водителя: ${a.driver_name || "____________________________"}
</div>
<h2>ОБЪЯСНИТЕЛЬНАЯ ЗАПИСКА</h2>
<p>${fmtDate(a.accident_date)} в ${a.accident_time || "___:___"} я, ${a.driver_name || "____________________________"}, управляя транспортным средством ${a.bus_model || "____"}, государственный регистрационный знак ${a.bus_gov_number || "________"} (бортовой № ${a.bus_board_number || "____"}), следуя по маршруту № ${a.route_number || "____"} по графику № ${a.graph_number ?? "____"}, в районе <b>${a.location || "____________________________"}</b> допустил дорожно-транспортное происшествие.</p>
<p>Обстоятельства происшествия: <u>${a.description || "_____________________________________________________________________________________________________________________________"}</u></p>
<p>Другие участники ДТП: ${a.other_vehicles || "________________________________________________________"}</p>
<p>Пострадавших: ${a.victims_count ?? 0} чел. ${a.victims_info ? a.victims_info : ""}</p>
<p>Видимость: ${a.visibility || "____"}, погода: ${a.weather_conditions || "____"}, состояние дороги: ${a.road_conditions || "____"}.</p>
<p>Повреждения транспортного средства: ${a.damage_description || "_________________________________________________"}</p>
<div class="sign-row">
  <div>Дата: ${fmtDate(a.accident_date)}</div>
  <div>Подпись: <span class="sign-line"></span></div>
</div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// --------- Форма ДТП ---------
interface AccidentFormProps {
  initial?: Partial<Accident>;
  onSaved: (a: Accident) => void;
  onClose: () => void;
}

function AccidentFormModal({ initial, onSaved, onClose }: AccidentFormProps) {
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

// --------- Главный компонент BDDPage ---------
export default function BDDPage() {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Accident | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOrg, setFilterOrg] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterOrg) params.organization = filterOrg;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const data = await api.getAccidents(Object.keys(params).length ? params : undefined);
    setAccidents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filterStatus, filterOrg, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  function onSaved(a: Accident) {
    setAccidents(prev => {
      const idx = prev.findIndex(x => x.id === a.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = a; return next; }
      return [a, ...prev];
    });
  }

  async function del(id: number) {
    if (!confirm("Удалить запись о ДТП?")) return;
    await api.deleteAccident(id);
    setAccidents(prev => prev.filter(a => a.id !== id));
  }

  const stats = {
    total: accidents.length,
    new: accidents.filter(a => a.status === "new").length,
    investigation: accidents.filter(a => a.status === "investigation").length,
    victims: accidents.reduce((s, a) => s + (a.victims_count || 0), 0),
    damage: accidents.reduce((s, a) => s + (a.damage_amount || 0), 0),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Безопасность дорожного движения</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 cursor-pointer transition-colors">
          <Icon name="Plus" size={14} /> Зарегистрировать ДТП
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Всего ДТП", value: stats.total, color: "bg-neutral-50 border-neutral-200" },
          { label: "Новые", value: stats.new, color: "bg-red-50 border-red-200 text-red-700" },
          { label: "Расследование", value: stats.investigation, color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Пострадавших", value: stats.victims + " чел.", color: "bg-orange-50 border-orange-200 text-orange-700" },
          { label: "Общий ущерб", value: stats.damage.toLocaleString("ru-RU") + " ₽", color: "bg-blue-50 border-blue-200 text-blue-700" },
        ].map((s, i) => (
          <div key={i} className={`border rounded-xl p-3 ${s.color}`}>
            <div className="text-xs font-medium opacity-70 mb-1">{s.label}</div>
            <div className="text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
        </select>
        <input value={filterOrg} onChange={e => setFilterOrg(e.target.value)}
          placeholder="Организация" className="border border-neutral-200 rounded-lg px-3 py-2 text-sm w-44" />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
        <button onClick={load} className="flex items-center gap-1 px-3 py-2 bg-neutral-100 text-neutral-700 text-sm rounded-lg hover:bg-neutral-200 cursor-pointer">
          <Icon name="Search" size={13} /> Найти
        </button>
      </div>

      {/* Список ДТП */}
      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-10">Загрузка...</div>
      ) : accidents.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-10">
          <Icon name="ShieldCheck" size={32} className="mx-auto mb-2 opacity-30" />
          ДТП не зарегистрировано
        </div>
      ) : (
        <div className="space-y-2">
          {accidents.map(a => {
            const isOpen = expanded === a.id;
            const statusInfo = STATUS_LABELS[a.status] || { label: a.status, color: "bg-neutral-100 text-neutral-600" };
            return (
              <div key={a.id} className="border border-neutral-200 rounded-xl overflow-hidden">
                {/* Заголовок карточки */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                >
                  <div className="shrink-0">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <Icon name="AlertTriangle" size={18} className="text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-900">{fmtDate(a.accident_date)} {a.accident_time ? a.accident_time.slice(0, 5) : ""}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                      {a.victims_count ? <span className="text-xs text-red-600 font-medium">{a.victims_count} пострадавших</span> : null}
                    </div>
                    <div className="text-sm text-neutral-600 mt-0.5 flex flex-wrap gap-x-3">
                      {a.location && <span><Icon name="MapPin" size={11} className="inline mr-0.5" />{a.location}</span>}
                      {a.bus_board_number && <span>Борт {a.bus_board_number}</span>}
                      {a.bus_gov_number && <span>{a.bus_gov_number}</span>}
                      {a.driver_name && <span>{a.driver_name}</span>}
                      {a.route_number && <span>Маршрут {a.route_number}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.damage_amount && (
                      <span className="text-sm font-semibold text-neutral-700">{a.damage_amount.toLocaleString("ru-RU")} ₽</span>
                    )}
                    <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={16} className="text-neutral-400" />
                  </div>
                </div>

                {/* Раскрытый блок */}
                {isOpen && (
                  <div className="border-t border-neutral-100 px-5 py-4 bg-neutral-50">
                    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <div className="text-xs text-neutral-500 mb-0.5">Погода</div>
                        <div>{a.weather_conditions || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-0.5">Дорога</div>
                        <div>{a.road_conditions || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-0.5">Видимость</div>
                        <div>{a.visibility || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-0.5">Вина</div>
                        <div>{a.fault_side || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-0.5">Ответственный</div>
                        <div>{a.investigator_name || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 mb-0.5">Ущерб</div>
                        <div>{a.damage_amount ? a.damage_amount.toLocaleString("ru-RU") + " ₽" : "—"}</div>
                      </div>
                    </div>
                    {a.description && (
                      <div className="text-sm mb-3">
                        <span className="text-xs text-neutral-500">Обстоятельства: </span>
                        {a.description}
                      </div>
                    )}
                    {a.investigation_result && (
                      <div className="text-sm mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-xs text-green-600 font-medium">Заключение: </span>
                        {a.investigation_result}
                      </div>
                    )}

                    {/* Документы */}
                    <DocUploader accident={a} onUpdated={updated => onSaved(updated)} />

                    {/* Кнопки печати и действий */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-neutral-200">
                      <button onClick={() => printAccidentReport(a)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer">
                        <Icon name="Printer" size={12} /> Справка об обстоятельствах
                      </button>
                      <button onClick={() => printAccidentAct(a)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer">
                        <Icon name="FileSignature" size={12} /> Акт о ДТП
                      </button>
                      <button onClick={() => printDriverExplanation(a)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer">
                        <Icon name="PenLine" size={12} /> Объяснительная водителя
                      </button>
                      <div className="ml-auto flex gap-2">
                        <button onClick={() => { setEditing(a); setShowForm(true); }}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 text-neutral-600 hover:text-neutral-900 cursor-pointer">
                          <Icon name="Pencil" size={12} /> Редактировать
                        </button>
                        <button onClick={() => del(a.id)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 text-red-500 hover:text-red-700 cursor-pointer">
                          <Icon name="Trash2" size={12} /> Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <AccidentFormModal
          initial={editing || undefined}
          onSaved={onSaved}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
