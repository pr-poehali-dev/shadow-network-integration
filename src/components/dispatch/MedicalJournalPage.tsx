import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";

interface MedicalRecord {
  id: number;
  work_date: string;
  organization: string | null;
  driver_id: number | null;
  driver_name: string | null;
  route_id: number | null;
  route_number: string | null;
  graph_number: number | null;
  pre_shift_time: string | null;
  post_shift_time: string | null;
  pre_shift_admitted: boolean;
  post_shift_admitted: boolean;
  pre_shift_note: string | null;
  post_shift_note: string | null;
  medic_name: string | null;
  // Расширенные поля (по приказу Минтранса № 7 от 15.01.2021)
  blood_pressure_pre?: string | null;
  pulse_pre?: number | null;
  alcohol_pre?: number | null;
  temperature_pre?: number | null;
  complaints_pre?: string | null;
  blood_pressure_post?: string | null;
  pulse_post?: number | null;
  alcohol_post?: number | null;
  temperature_post?: number | null;
  complaints_post?: string | null;
}

function today() { return new Date().toISOString().slice(0, 10); }
function formatDate(iso: string) { const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; }

function printMedicalJournal(date: string, records: MedicalRecord[], org: string, medicName: string) {
  const rows = records.map((r, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td>${r.driver_name || "—"}</td>
      <td class="center">м. ${r.route_number || "—"} / гр. ${r.graph_number ?? "—"}</td>
      <td class="center time">${r.pre_shift_time ? r.pre_shift_time.slice(0, 5) : "&nbsp;&nbsp;&nbsp;&nbsp;"}</td>
      <td class="center admitted ${r.pre_shift_admitted ? "ok" : "fail"}">${r.pre_shift_admitted ? "Допущен" : "Не доп."}</td>
      <td>${r.pre_shift_note || ""}</td>
      <td class="center sign">&nbsp;</td>
      <td class="center time">${r.post_shift_time ? r.post_shift_time.slice(0, 5) : "&nbsp;&nbsp;&nbsp;&nbsp;"}</td>
      <td class="center admitted ${r.post_shift_admitted ? "ok" : "fail"}">${r.post_shift_admitted ? "Допущен" : "Не доп."}</td>
      <td>${r.post_shift_note || ""}</td>
      <td class="center sign">&nbsp;</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<title>Журнал медосмотра ${formatDate(date)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", serif; font-size: 10pt; padding: 10mm 12mm; }
  h2 { font-size: 13pt; text-align: center; margin-bottom: 1mm; }
  .org { text-align: center; font-size: 10pt; margin-bottom: 4mm; }
  table { width: 100%; border-collapse: collapse; margin-top: 3mm; }
  th, td { border: 1px solid #000; padding: 1.5mm 2mm; font-size: 9pt; vertical-align: middle; }
  th { background: #f0f0f0; text-align: center; font-size: 8pt; }
  .center { text-align: center; }
  .time { font-weight: bold; font-size: 11pt; min-width: 14mm; }
  .sign { min-width: 20mm; }
  .ok { color: #155724; }
  .fail { color: #721c24; font-weight: bold; }
  .footer { margin-top: 6mm; font-size: 9pt; }
  .sign-row { display: flex; gap: 6mm; align-items: flex-end; margin-top: 4mm; }
  .sign-line { border-bottom: 1px solid #000; flex: 1; min-height: 7mm; }
  @media print { @page { size: A4 landscape; margin: 8mm; } }
</style>
</head>
<body>
<h2>Журнал предсменных и послесменных медицинских осмотров водителей</h2>
<div class="org">${org || "___________________________________"} &nbsp;&nbsp; Дата: <b>${formatDate(date)}</b></div>
<table>
  <thead>
    <tr>
      <th rowspan="2">№</th>
      <th rowspan="2">ФИО водителя</th>
      <th rowspan="2">Маршрут / График</th>
      <th colspan="4">Предсменный осмотр</th>
      <th colspan="4">Послесменный осмотр</th>
    </tr>
    <tr>
      <th>Время</th>
      <th>Результат</th>
      <th>Примечание</th>
      <th>Подпись медика</th>
      <th>Время</th>
      <th>Результат</th>
      <th>Примечание</th>
      <th>Подпись медика</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <div class="sign-row">
    <span>Медицинский работник:</span>
    <span>${medicName || "___________________________________"}</span>
    <span>Подпись:</span>
    <div class="sign-line"></div>
  </div>
</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

export default function MedicalJournalPage() {
  const [date, setDate] = useState(today());
  const [org, setOrg] = useState("");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [initing, setIniting] = useState(false);
  const [medicName, setMedicName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<MedicalRecord>>({});
  const [organizations, setOrganizations] = useState<string[]>([]);

  useEffect(() => {
    catalogCache.getOrganizations().then(data => {
      if (Array.isArray(data)) setOrganizations(data);
    });
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const data = await api.getMedicalJournal(date, org || undefined);
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [date, org]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleInit = async () => {
    if (!confirm(`Создать записи для всех водителей из расписания на ${formatDate(date)}?`)) return;
    setIniting(true);
    await api.initMedicalJournal(date, org || undefined);
    await loadRecords();
    setIniting(false);
  };

  const startEdit = (r: MedicalRecord) => {
    setEditingId(r.id);
    setEditForm({
      pre_shift_time: r.pre_shift_time?.slice(0, 5) ?? "",
      post_shift_time: r.post_shift_time?.slice(0, 5) ?? "",
      pre_shift_admitted: r.pre_shift_admitted,
      post_shift_admitted: r.post_shift_admitted,
      pre_shift_note: r.pre_shift_note ?? "",
      post_shift_note: r.post_shift_note ?? "",
      medic_name: r.medic_name ?? medicName,
      blood_pressure_pre: r.blood_pressure_pre ?? "",
      pulse_pre: r.pulse_pre ?? undefined,
      alcohol_pre: r.alcohol_pre ?? undefined,
      temperature_pre: r.temperature_pre ?? undefined,
      complaints_pre: r.complaints_pre ?? "",
      blood_pressure_post: r.blood_pressure_post ?? "",
      pulse_post: r.pulse_post ?? undefined,
      alcohol_post: r.alcohol_post ?? undefined,
      temperature_post: r.temperature_post ?? undefined,
      complaints_post: r.complaints_post ?? "",
    });
  };

  const saveEdit = async (id: number) => {
    await api.updateMedicalRecord(id, editForm);
    setEditingId(null);
    loadRecords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить запись?")) return;
    await api.deleteMedicalRecord(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const setF = (k: keyof MedicalRecord, v: unknown) => setEditForm(f => ({ ...f, [k]: v }));

  const weekDays = (() => {
    const d = new Date(date);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day.toISOString().slice(0, 10);
    });
  })();
  const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-neutral-900">Журнал медосмотра</h2>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600" />
        <select value={org} onChange={e => setOrg(e.target.value)}
          className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600 bg-white">
          <option value="">Все организации</option>
          {organizations.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input
          value={medicName}
          onChange={e => setMedicName(e.target.value)}
          placeholder="ФИО медицинского работника"
          className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600 w-64"
        />
      </div>

      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {weekDays.map((d, i) => {
          const isActive = d === date;
          const isToday = d === today();
          const [,, dd] = d.split("-");
          return (
            <button key={d} onClick={() => setDate(d)}
              className={`flex flex-col items-center px-3 py-2 rounded cursor-pointer transition-colors min-w-[52px] border ${
                isActive ? "bg-neutral-900 text-white border-neutral-900"
                : isToday ? "border-neutral-400 text-neutral-700 hover:bg-neutral-100"
                : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              }`}>
              <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
              <span className={`text-sm font-bold ${isActive ? "text-white" : "text-neutral-900"}`}>{dd}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleInit} disabled={initing}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer">
          <Icon name="RefreshCw" size={14} />
          {initing ? "Заполняю..." : "Заполнить из расписания"}
        </button>
        {records.length > 0 && (
          <button onClick={() => printMedicalJournal(date, records, org, medicName)}
            className="flex items-center gap-2 border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-700">
            <Icon name="Printer" size={14} />
            Распечатать журнал
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : records.length === 0 ? (
        <div className="text-neutral-400 text-sm py-10 text-center">
          Нет записей на этот день. Нажмите «Заполнить из расписания».
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-neutral-200">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left w-8">№</th>
                <th className="px-3 py-2 text-left">Водитель</th>
                <th className="px-3 py-2 text-center w-28">Маршрут/Гр.</th>
                <th className="px-3 py-2 text-center" colSpan={3}>Предсменный осмотр</th>
                <th className="px-3 py-2 text-center" colSpan={3}>Послесменный осмотр</th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
              <tr className="border-t border-neutral-100">
                <th></th><th></th><th></th>
                <th className="px-3 py-1 text-center text-xs font-medium text-neutral-400 bg-blue-50">Время</th>
                <th className="px-3 py-1 text-center text-xs font-medium text-neutral-400 bg-blue-50">Результат</th>
                <th className="px-3 py-1 text-center text-xs font-medium text-neutral-400 bg-blue-50">Примечание</th>
                <th className="px-3 py-1 text-center text-xs font-medium text-neutral-400 bg-amber-50">Время</th>
                <th className="px-3 py-1 text-center text-xs font-medium text-neutral-400 bg-amber-50">Результат</th>
                <th className="px-3 py-1 text-center text-xs font-medium text-neutral-400 bg-amber-50">Примечание</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const isEditing = editingId === r.id;
                if (isEditing) {
                  const inp = "border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none";
                  return (
                    <tr key={r.id} className="border-t border-blue-100 bg-blue-50">
                      <td className="px-3 py-2 text-center text-neutral-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-sm">
                        <div>{r.driver_name || "—"}</div>
                        <input value={editForm.medic_name as string ?? ""}
                          onChange={e => setF("medic_name", e.target.value)}
                          placeholder="ФИО медика"
                          className={`mt-1 ${inp}`} />
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-neutral-500">м.{r.route_number || "?"} гр.{r.graph_number ?? "?"}</td>
                      {/* Предсменный */}
                      <td className="px-3 py-2 bg-blue-50">
                        <input type="time" value={editForm.pre_shift_time as string ?? ""}
                          onChange={e => setF("pre_shift_time", e.target.value)}
                          className={`${inp} mb-1`} />
                        <input value={editForm.blood_pressure_pre as string ?? ""}
                          onChange={e => setF("blood_pressure_pre", e.target.value)}
                          placeholder="АД (120/80)" className={`${inp} mb-1`} />
                        <input type="number" value={(editForm.pulse_pre as number) ?? ""}
                          onChange={e => setF("pulse_pre", e.target.value ? Number(e.target.value) : null)}
                          placeholder="Пульс" className={`${inp} mb-1`} />
                        <input type="number" step="0.1" value={(editForm.temperature_pre as number) ?? ""}
                          onChange={e => setF("temperature_pre", e.target.value ? Number(e.target.value) : null)}
                          placeholder="Т°" className={`${inp} mb-1`} />
                        <input type="number" step="0.01" value={(editForm.alcohol_pre as number) ?? ""}
                          onChange={e => setF("alcohol_pre", e.target.value ? Number(e.target.value) : null)}
                          placeholder="Алк. (0.00)" className={inp} />
                      </td>
                      <td className="px-3 py-2 text-center bg-blue-50">
                        <button
                          onClick={() => setF("pre_shift_admitted", !editForm.pre_shift_admitted)}
                          className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer border transition-colors ${
                            editForm.pre_shift_admitted ? "bg-green-100 border-green-400 text-green-800" : "bg-red-100 border-red-400 text-red-800"
                          }`}>
                          {editForm.pre_shift_admitted ? "Допущен" : "Не допущен"}
                        </button>
                      </td>
                      <td className="px-3 py-2 bg-blue-50">
                        <input value={editForm.pre_shift_note as string ?? ""}
                          onChange={e => setF("pre_shift_note", e.target.value)}
                          placeholder="Примечание"
                          className={`${inp} mb-1`} />
                        <input value={editForm.complaints_pre as string ?? ""}
                          onChange={e => setF("complaints_pre", e.target.value)}
                          placeholder="Жалобы"
                          className={inp} />
                      </td>
                      {/* Послесменный */}
                      <td className="px-3 py-2 bg-amber-50">
                        <input type="time" value={editForm.post_shift_time as string ?? ""}
                          onChange={e => setF("post_shift_time", e.target.value)}
                          className={`${inp} mb-1`} />
                        <input value={editForm.blood_pressure_post as string ?? ""}
                          onChange={e => setF("blood_pressure_post", e.target.value)}
                          placeholder="АД (120/80)" className={`${inp} mb-1`} />
                        <input type="number" value={(editForm.pulse_post as number) ?? ""}
                          onChange={e => setF("pulse_post", e.target.value ? Number(e.target.value) : null)}
                          placeholder="Пульс" className={`${inp} mb-1`} />
                        <input type="number" step="0.1" value={(editForm.temperature_post as number) ?? ""}
                          onChange={e => setF("temperature_post", e.target.value ? Number(e.target.value) : null)}
                          placeholder="Т°" className={`${inp} mb-1`} />
                        <input type="number" step="0.01" value={(editForm.alcohol_post as number) ?? ""}
                          onChange={e => setF("alcohol_post", e.target.value ? Number(e.target.value) : null)}
                          placeholder="Алк. (0.00)" className={inp} />
                      </td>
                      <td className="px-3 py-2 text-center bg-amber-50">
                        <button
                          onClick={() => setF("post_shift_admitted", !editForm.post_shift_admitted)}
                          className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer border transition-colors ${
                            editForm.post_shift_admitted ? "bg-green-100 border-green-400 text-green-800" : "bg-red-100 border-red-400 text-red-800"
                          }`}>
                          {editForm.post_shift_admitted ? "Допущен" : "Не допущен"}
                        </button>
                      </td>
                      <td className="px-3 py-2 bg-amber-50">
                        <input value={editForm.post_shift_note as string ?? ""}
                          onChange={e => setF("post_shift_note", e.target.value)}
                          placeholder="Примечание"
                          className={`${inp} mb-1`} />
                        <input value={editForm.complaints_post as string ?? ""}
                          onChange={e => setF("complaints_post", e.target.value)}
                          placeholder="Жалобы"
                          className={inp} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <button onClick={() => saveEdit(r.id)}
                            className="text-green-600 hover:text-green-800 transition-colors cursor-pointer">
                            <Icon name="Check" size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer">
                            <Icon name="X" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors group">
                    <td className="px-3 py-2 text-center text-neutral-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-sm">{r.driver_name || "—"}</td>
                    <td className="px-3 py-2 text-center text-xs text-neutral-500">
                      {r.route_number ? `м.${r.route_number}` : "—"} {r.graph_number ? `гр.${r.graph_number}` : ""}
                    </td>
                    <td className="px-3 py-2 text-center bg-blue-50/30">
                      {r.pre_shift_time
                        ? <span className="font-bold text-neutral-800">{r.pre_shift_time.slice(0, 5)}</span>
                        : <span className="text-neutral-300">—:——</span>}
                    </td>
                    <td className="px-3 py-2 text-center bg-blue-50/30">
                      {r.pre_shift_admitted
                        ? <span className="text-green-700 text-xs font-semibold">Допущен</span>
                        : <span className="text-red-600 text-xs font-bold">Не допущен</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-500 bg-blue-50/30">{r.pre_shift_note || ""}</td>
                    <td className="px-3 py-2 text-center bg-amber-50/30">
                      {r.post_shift_time
                        ? <span className="font-bold text-neutral-800">{r.post_shift_time.slice(0, 5)}</span>
                        : <span className="text-neutral-300">—:——</span>}
                    </td>
                    <td className="px-3 py-2 text-center bg-amber-50/30">
                      {r.post_shift_admitted
                        ? <span className="text-green-700 text-xs font-semibold">Допущен</span>
                        : <span className="text-red-600 text-xs font-bold">Не допущен</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-500 bg-amber-50/30">{r.post_shift_note || ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(r)}
                          className="text-neutral-400 hover:text-blue-600 transition-colors cursor-pointer">
                          <Icon name="Pencil" size={13} />
                        </button>
                        <button onClick={() => handleDelete(r.id)}
                          className="text-neutral-300 hover:text-red-500 transition-colors cursor-pointer">
                          <Icon name="Trash2" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}