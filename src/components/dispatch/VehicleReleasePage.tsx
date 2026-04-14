import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface VehicleRecord {
  id: number;
  work_date: string;
  organization: string | null;
  schedule_entry_id: number | null;
  route_id: number | null;
  route_number: string | null;
  graph_number: number | null;
  board_number: string | null;
  gov_number: string | null;
  driver_name: string | null;
  mechanic_id: number | null;
  mechanic_name: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  odometer_departure: number | null;
  odometer_arrival: number | null;
  notes: string | null;
}

interface Mechanic {
  id: number;
  full_name: string;
  organization: string | null;
}

function today() { return new Date().toISOString().slice(0, 10); }
function formatDate(iso: string) { const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; }

function printVehicleJournal(date: string, records: VehicleRecord[], org: string, mechanic: string) {
  const rows = records.map((r, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td class="center">${r.board_number || "—"}</td>
      <td class="center">${r.gov_number || "—"}</td>
      <td class="center">м.${r.route_number || "—"} / гр.${r.graph_number ?? "—"}</td>
      <td>${r.driver_name || "—"}</td>
      <td class="center time">${r.departure_time ? r.departure_time.slice(0, 5) : "&nbsp;&nbsp;&nbsp;&nbsp;"}</td>
      <td class="center sign">&nbsp;</td>
      <td class="center">${r.odometer_departure ?? "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</td>
      <td class="center time">${r.arrival_time ? r.arrival_time.slice(0, 5) : "&nbsp;&nbsp;&nbsp;&nbsp;"}</td>
      <td class="center sign">&nbsp;</td>
      <td class="center">${r.odometer_arrival ?? "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"}</td>
      <td>${r.mechanic_name || mechanic || "&nbsp;"}</td>
      <td>${r.notes || ""}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<title>Журнал выпуска ТС ${formatDate(date)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", serif; font-size: 10pt; padding: 10mm 12mm; }
  h2 { font-size: 12pt; text-align: center; margin-bottom: 1mm; }
  .org { text-align: center; font-size: 10pt; margin-bottom: 4mm; }
  table { width: 100%; border-collapse: collapse; margin-top: 3mm; }
  th, td { border: 1px solid #000; padding: 1.5mm 2mm; font-size: 9pt; vertical-align: middle; }
  th { background: #f0f0f0; text-align: center; font-size: 8pt; }
  .center { text-align: center; }
  .time { font-weight: bold; font-size: 11pt; min-width: 12mm; }
  .sign { min-width: 18mm; }
  .footer { margin-top: 6mm; font-size: 9pt; }
  .sign-row { display: flex; gap: 6mm; align-items: flex-end; margin-top: 4mm; }
  .sign-line { border-bottom: 1px solid #000; flex: 1; min-height: 7mm; }
  @media print { @page { size: A4 landscape; margin: 8mm; } }
</style>
</head>
<body>
<h2>Журнал выпуска транспортных средств на линию</h2>
<div class="org">${org || "___________________________________"} &nbsp;&nbsp; Дата: <b>${formatDate(date)}</b></div>
<table>
  <thead>
    <tr>
      <th rowspan="2">№</th>
      <th rowspan="2">Борт №</th>
      <th rowspan="2">Гос. номер</th>
      <th rowspan="2">Маршрут / График</th>
      <th rowspan="2">Водитель</th>
      <th colspan="3">Выпуск на линию</th>
      <th colspan="3">Заход с линии</th>
      <th rowspan="2">Механик</th>
      <th rowspan="2">Примечание</th>
    </tr>
    <tr>
      <th>Время выхода</th>
      <th>Подпись</th>
      <th>Одометр</th>
      <th>Время захода</th>
      <th>Подпись</th>
      <th>Одометр</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <div class="sign-row">
    <span>Ответственный механик по выпуску:</span>
    <span>${mechanic || "___________________________________"}</span>
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

export default function VehicleReleasePage() {
  const [date, setDate] = useState(today());
  const [org, setOrg] = useState("");
  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [initing, setIniting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<VehicleRecord>>({});
  const [defaultMechanic, setDefaultMechanic] = useState("");

  const organizations = ["ООО «Автобус»", "МУП «Транспорт»"];

  useEffect(() => {
    api.getMechanics().then(data => {
      if (Array.isArray(data)) setMechanics(data);
    });
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    const data = await api.getVehicleRelease(date, org || undefined);
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [date, org]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleInit = async () => {
    if (!confirm(`Заполнить журнал из расписания на ${formatDate(date)}?`)) return;
    setIniting(true);
    await api.initVehicleRelease(date, org || undefined);
    await loadRecords();
    setIniting(false);
  };

  const startEdit = (r: VehicleRecord) => {
    setEditingId(r.id);
    setEditForm({
      mechanic_id: r.mechanic_id ?? null,
      mechanic_name: r.mechanic_name ?? "",
      departure_time: r.departure_time?.slice(0, 5) ?? "",
      arrival_time: r.arrival_time?.slice(0, 5) ?? "",
      odometer_departure: r.odometer_departure ?? null,
      odometer_arrival: r.odometer_arrival ?? null,
      notes: r.notes ?? "",
    });
  };

  const saveEdit = async (id: number) => {
    await api.updateVehicleRelease(id, editForm);
    setEditingId(null);
    loadRecords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить запись?")) return;
    await api.deleteVehicleRelease(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const setF = (k: keyof VehicleRecord, v: unknown) => setEditForm(f => ({ ...f, [k]: v }));

  const filteredMechanics = org ? mechanics.filter(m => !m.organization || m.organization === org) : mechanics;

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
        <h2 className="text-2xl font-bold text-neutral-900">Журнал выпуска ТС</h2>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600" />
        <select value={org} onChange={e => setOrg(e.target.value)}
          className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600 bg-white">
          <option value="">Все организации</option>
          {organizations.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input
          value={defaultMechanic}
          onChange={e => setDefaultMechanic(e.target.value)}
          placeholder="Механик по умолчанию (для печати)"
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
          <button onClick={() => printVehicleJournal(date, records, org, defaultMechanic)}
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
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left w-8">№</th>
                <th className="px-3 py-2 text-center w-20">Борт №</th>
                <th className="px-3 py-2 text-center w-24">Гос. номер</th>
                <th className="px-3 py-2 text-center w-28">Маршрут/Гр.</th>
                <th className="px-3 py-2 text-left">Водитель</th>
                <th className="px-3 py-2 text-center bg-green-50/50" colSpan={2}>Выпуск на линию</th>
                <th className="px-3 py-2 text-center bg-orange-50/50" colSpan={2}>Заход с линии</th>
                <th className="px-3 py-2 text-left">Механик</th>
                <th className="px-3 py-2 text-left">Примечание</th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
              <tr className="border-t border-neutral-100">
                <th></th><th></th><th></th><th></th><th></th>
                <th className="px-3 py-1 text-xs font-medium text-neutral-400 bg-green-50/40 text-center">Время</th>
                <th className="px-3 py-1 text-xs font-medium text-neutral-400 bg-green-50/40 text-center">Одометр</th>
                <th className="px-3 py-1 text-xs font-medium text-neutral-400 bg-orange-50/40 text-center">Время</th>
                <th className="px-3 py-1 text-xs font-medium text-neutral-400 bg-orange-50/40 text-center">Одометр</th>
                <th></th><th></th><th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const isEditing = editingId === r.id;
                if (isEditing) {
                  return (
                    <tr key={r.id} className="border-t border-blue-100 bg-blue-50">
                      <td className="px-3 py-2 text-center text-neutral-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-sm">{r.board_number || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs text-neutral-600">{r.gov_number || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs">м.{r.route_number || "?"} гр.{r.graph_number ?? "?"}</td>
                      <td className="px-3 py-2 text-sm">{r.driver_name || "—"}</td>
                      <td className="px-3 py-2 bg-green-50/40">
                        <input type="time" value={editForm.departure_time as string ?? ""}
                          onChange={e => setF("departure_time", e.target.value)}
                          className="border border-neutral-300 rounded px-2 py-1 text-sm w-full focus:outline-none" />
                      </td>
                      <td className="px-3 py-2 bg-green-50/40">
                        <input type="number" value={editForm.odometer_departure as number ?? ""}
                          onChange={e => setF("odometer_departure", e.target.value ? Number(e.target.value) : null)}
                          placeholder="км"
                          className="border border-neutral-300 rounded px-2 py-1 text-sm w-full focus:outline-none" />
                      </td>
                      <td className="px-3 py-2 bg-orange-50/40">
                        <input type="time" value={editForm.arrival_time as string ?? ""}
                          onChange={e => setF("arrival_time", e.target.value)}
                          className="border border-neutral-300 rounded px-2 py-1 text-sm w-full focus:outline-none" />
                      </td>
                      <td className="px-3 py-2 bg-orange-50/40">
                        <input type="number" value={editForm.odometer_arrival as number ?? ""}
                          onChange={e => setF("odometer_arrival", e.target.value ? Number(e.target.value) : null)}
                          placeholder="км"
                          className="border border-neutral-300 rounded px-2 py-1 text-sm w-full focus:outline-none" />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editForm.mechanic_id as number ?? ""}
                          onChange={e => {
                            const mechId = e.target.value ? Number(e.target.value) : null;
                            const mech = mechanics.find(m => m.id === mechId);
                            setF("mechanic_id", mechId);
                            setF("mechanic_name", mech?.full_name ?? "");
                          }}
                          className="border border-neutral-300 rounded px-2 py-1 text-sm w-full focus:outline-none bg-white"
                        >
                          <option value="">— выбрать —</option>
                          {filteredMechanics.map(m => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input value={editForm.notes as string ?? ""}
                          onChange={e => setF("notes", e.target.value)}
                          placeholder="Примечание"
                          className="border border-neutral-300 rounded px-2 py-1 text-xs w-full focus:outline-none" />
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
                    <td className="px-3 py-2 text-center font-mono font-bold text-sm">{r.board_number || "—"}</td>
                    <td className="px-3 py-2 text-center text-xs text-neutral-600">{r.gov_number || "—"}</td>
                    <td className="px-3 py-2 text-center text-xs text-neutral-500">
                      {r.route_number ? `м.${r.route_number}` : "—"} {r.graph_number ? `гр.${r.graph_number}` : ""}
                    </td>
                    <td className="px-3 py-2 text-sm">{r.driver_name || "—"}</td>
                    <td className="px-3 py-2 text-center bg-green-50/30">
                      {r.departure_time
                        ? <span className="font-bold text-green-800">{r.departure_time.slice(0, 5)}</span>
                        : <span className="text-neutral-300">—:——</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-neutral-600 bg-green-50/30">
                      {r.odometer_departure ? `${r.odometer_departure} км` : "—"}
                    </td>
                    <td className="px-3 py-2 text-center bg-orange-50/30">
                      {r.arrival_time
                        ? <span className="font-bold text-orange-800">{r.arrival_time.slice(0, 5)}</span>
                        : <span className="text-neutral-300">—:——</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-neutral-600 bg-orange-50/30">
                      {r.odometer_arrival ? `${r.odometer_arrival} км` : "—"}
                    </td>
                    <td className="px-3 py-2 text-sm text-neutral-700">{r.mechanic_name || <span className="text-neutral-300">—</span>}</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">{r.notes || ""}</td>
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
