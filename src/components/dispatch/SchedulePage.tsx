import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";

interface Route { id: number; number: string; name: string; organization?: string; max_graphs: number; }
interface Bus { id: number; board_number: string; model: string; }
interface Driver { id: number; full_name: string; }
interface Conductor { id: number; full_name: string; }
interface Terminal { id: number; number: string; name: string; organization: string; }
interface Entry {
  id: number;
  work_date: string;
  graph_number: number | null;
  route_id: number;
  route_number: string;
  route_name: string;
  route_organization?: string;
  max_graphs: number;
  bus_id: number | null;
  board_number: string | null;
  bus_model: string | null;
  driver_id: number | null;
  driver_name: string | null;
  conductor_id: number | null;
  conductor_name: string | null;
  terminal_id: number | null;
  terminal_name: string | null;
  terminal_number: string | null;
  terminal_org: string | null;
  fuel_spent: number | null;
  fuel_price_override: number | null;
  revenue_cash: number | null;
  revenue_cashless: number | null;
  revenue_total: number | null;
  ticket_price: number | null;
  tickets_sold: number | null;
  is_overtime: boolean;
  driver_is_official: boolean | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function fmtMoney(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}

function printWaybill(entry: Entry, date: string, orgName: string) {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<title>Путевой лист № ${entry.id} от ${formatDate(date)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", serif; font-size: 11pt; color: #000; padding: 12mm 15mm; }
  .center { text-align: center; }
  .right { text-align: right; }
  h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 2mm; }
  .subtitle { font-size: 10pt; text-align: center; margin-bottom: 4mm; }
  .form-num { font-size: 9pt; text-align: right; margin-bottom: 4mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  td, th { border: 1px solid #000; padding: 1.5mm 2mm; vertical-align: top; font-size: 10pt; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 9pt; }
  .no-border td { border: none; padding: 1mm 0; }
  .field-label { font-size: 8pt; color: #444; display: block; }
  .field-value { font-size: 11pt; font-weight: bold; border-bottom: 1px solid #000; min-height: 6mm; display: block; padding-bottom: 0.5mm; }
  .section-title { font-size: 10pt; font-weight: bold; background: #e8e8e8; padding: 1.5mm 2mm; margin: 3mm 0 1mm; border: 1px solid #aaa; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 3mm; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; margin-bottom: 3mm; }
  .field { margin-bottom: 3mm; }
  .sign-row { display: flex; align-items: flex-end; gap: 4mm; margin-top: 2mm; }
  .sign-line { border-bottom: 1px solid #000; flex: 1; min-height: 8mm; }
  .sign-label { font-size: 8pt; white-space: nowrap; }
  .stamp-box { border: 2px solid #aaa; width: 35mm; height: 20mm; display: inline-flex; align-items: center; justify-content: center; font-size: 8pt; color: #aaa; }
  .org-block { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4mm; }
  .org-info { max-width: 60%; }
  .okud { text-align: right; font-size: 8pt; }
  hr { border: none; border-top: 1px solid #000; margin: 2mm 0; }
  .small { font-size: 8pt; }
  @media print { body { padding: 8mm 10mm; } @page { margin: 0; size: A4; } }
</style>
</head>
<body>

<div class="org-block">
  <div class="org-info">
    <div class="field-label">Организация</div>
    <div class="field-value" style="font-size:12pt">${orgName || "___________________________"}</div>
    <div class="small" style="margin-top:1mm">ИНН _________________ ОГРН _________________</div>
  </div>
  <div class="okud">
    <div>Форма № 6 (автобус)</div>
    <div>ОКУД 0345008</div>
    <div style="margin-top:2mm">
      <table style="width:auto; font-size:8pt;">
        <tr><th>Серия</th><th>№</th></tr>
        <tr><td style="padding:1mm 3mm">ПЛ</td><td style="padding:1mm 3mm">${String(entry.id).padStart(7, "0")}</td></tr>
      </table>
    </div>
  </div>
</div>

<h1>ПУТЕВОЙ ЛИСТ АВТОБУСА</h1>
<div class="subtitle">для маршрутных регулярных перевозок пассажиров</div>

<div class="grid3" style="margin-top:4mm">
  <div class="field">
    <span class="field-label">Дата выдачи</span>
    <span class="field-value">${formatDate(date)}</span>
  </div>
  <div class="field">
    <span class="field-label">Маршрут №</span>
    <span class="field-value">${entry.route_number || "—"}</span>
  </div>
  <div class="field">
    <span class="field-label">График (смена) №</span>
    <span class="field-value">${entry.graph_number ?? "—"}</span>
  </div>
</div>

<div class="section-title">1. Транспортное средство</div>
<div class="grid3">
  <div class="field">
    <span class="field-label">Марка, модель</span>
    <span class="field-value">${entry.bus_model || "_______________"}</span>
  </div>
  <div class="field">
    <span class="field-label">Гос. регистрационный знак</span>
    <span class="field-value">${entry.board_number ? `борт ${entry.board_number}` : "_______________"}</span>
  </div>
  <div class="field">
    <span class="field-label">Бортовой номер</span>
    <span class="field-value">${entry.board_number || "_______________"}</span>
  </div>
</div>
<div class="grid2">
  <div class="field">
    <span class="field-label">Показания одометра — выезд (км)</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
  <div class="field">
    <span class="field-label">Показания одометра — заезд (км)</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
</div>

<div class="section-title">2. Водитель</div>
<div class="grid2">
  <div class="field">
    <span class="field-label">Фамилия, имя, отчество</span>
    <span class="field-value">${entry.driver_name || "___________________________________"}</span>
  </div>
  <div class="field">
    <span class="field-label">Табельный номер</span>
    <span class="field-value">&nbsp;</span>
  </div>
</div>
<div class="grid3">
  <div class="field">
    <span class="field-label">Номер водительского удостоверения</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
  <div class="field">
    <span class="field-label">Категория</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
  <div class="field">
    <span class="field-label">Класс</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
</div>

<div class="section-title">3. Работа водителя и автобуса</div>
<table>
  <thead>
    <tr>
      <th rowspan="2">Выезд из гаража</th>
      <th rowspan="2">Заезд в гараж</th>
      <th colspan="2">Нулевой пробег (км)</th>
      <th rowspan="2">Пробег<br/>с пасс. (км)</th>
      <th rowspan="2">Всего<br/>пробег (км)</th>
      <th colspan="2">Время работы</th>
    </tr>
    <tr>
      <th>из гаража</th>
      <th>до гаража</th>
      <th>факт</th>
      <th>нормируемое</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="min-height:10mm; height:10mm">&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </tbody>
</table>

<div class="section-title">4. Задание водителю</div>
<table>
  <thead>
    <tr>
      <th>Маршрут</th>
      <th>Время выхода</th>
      <th>Время захода</th>
      <th>Количество рейсов по план.</th>
      <th>Количество рейсов факт.</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="height:10mm">Маршрут № ${entry.route_number || "—"} ${entry.route_name || ""}</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </tbody>
</table>

<div class="section-title">5. Топливо</div>
<table>
  <thead>
    <tr>
      <th>Марка топлива</th>
      <th>Выдано по норме (л)</th>
      <th>Выдано фактически (л)</th>
      <th>Остаток при выезде (л)</th>
      <th>Остаток при заезде (л)</th>
      <th>Расход по норме (л)</th>
      <th>Расход фактический (л)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="height:10mm">ДТ</td>
      <td>&nbsp;</td>
      <td>${entry.fuel_spent ?? "&nbsp;"}</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>${entry.fuel_spent ?? "&nbsp;"}</td>
    </tr>
  </tbody>
</table>

<div class="section-title">6. Медицинский осмотр водителя</div>
<div class="grid2" style="margin-top:2mm">
  <div>
    <div class="small" style="margin-bottom:2mm">Предсменный осмотр</div>
    <div style="display:flex; gap:4mm; align-items:center;">
      <div>
        <span class="field-label">Время</span>
        <span class="field-value" style="width:20mm; display:inline-block">&nbsp;</span>
      </div>
      <div>
        <span class="field-label">Допущен / Не допущен</span>
        <span class="field-value" style="width:30mm; display:inline-block">&nbsp;</span>
      </div>
    </div>
    <div class="sign-row" style="margin-top:3mm">
      <span class="sign-label">Медицинский работник</span>
      <div class="sign-line"></div>
      <span class="sign-label">(подпись)</span>
    </div>
  </div>
  <div>
    <div class="small" style="margin-bottom:2mm">Послесменный осмотр</div>
    <div style="display:flex; gap:4mm; align-items:center;">
      <div>
        <span class="field-label">Время</span>
        <span class="field-value" style="width:20mm; display:inline-block">&nbsp;</span>
      </div>
      <div>
        <span class="field-label">Допущен / Не допущен</span>
        <span class="field-value" style="width:30mm; display:inline-block">&nbsp;</span>
      </div>
    </div>
    <div class="sign-row" style="margin-top:3mm">
      <span class="sign-label">Медицинский работник</span>
      <div class="sign-line"></div>
      <span class="sign-label">(подпись)</span>
    </div>
  </div>
</div>

<div class="section-title">7. Технический осмотр и выпуск на линию</div>
<div class="grid2" style="margin-top:2mm">
  <div>
    <div class="sign-row">
      <span class="sign-label">Автомобиль технически исправен. Механик</span>
      <div class="sign-line"></div>
    </div>
    <div class="sign-row" style="margin-top:2mm">
      <span class="sign-label">Подпись</span>
      <div class="sign-line"></div>
      <span class="sign-label">Дата и время выпуска</span>
      <div class="sign-line"></div>
    </div>
  </div>
  <div>
    <div class="sign-row">
      <span class="sign-label">Сдал смену. Механик</span>
      <div class="sign-line"></div>
    </div>
    <div class="sign-row" style="margin-top:2mm">
      <span class="sign-label">Подпись</span>
      <div class="sign-line"></div>
      <span class="sign-label">Дата и время заезда</span>
      <div class="sign-line"></div>
    </div>
  </div>
</div>

<div style="margin-top:4mm">
  <div class="sign-row">
    <span class="sign-label">Водитель (подпись)</span>
    <div class="sign-line"></div>
    <span class="sign-label">Диспетчер (подпись)</span>
    <div class="sign-line"></div>
    <span class="sign-label">Выдан «___» _________ ${new Date(date).getFullYear()} г.</span>
  </div>
</div>

<div style="margin-top:4mm; text-align:right; font-size:8pt; color:#666">
  Сформировано: ${new Date().toLocaleString("ru")}
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

function handlePrint(date: string, entries: Entry[]) {
  const rows = entries.map(e => {
    const total = e.revenue_total ?? (((e.revenue_cash ?? 0) + (e.revenue_cashless ?? 0)) || null);
    return `
    <tr>
      <td>${e.route_number}${e.graph_number ? ` <small>(гр.${e.graph_number})</small>` : ""}${e.route_name ? `<br/><small>${e.route_name}</small>` : ""}</td>
      <td>${e.board_number ?? "—"}${e.bus_model ? `<br/><small>${e.bus_model}</small>` : ""}</td>
      <td>${e.driver_name ?? "—"}</td>
      <td>${e.conductor_name ?? "—"}</td>
      <td>${e.terminal_name ?? "—"}</td>
      <td style="text-align:right">${e.fuel_spent != null ? e.fuel_spent + " л" : "—"}</td>
      <td style="text-align:right">${e.revenue_cash != null ? e.revenue_cash.toFixed(2) : "—"}</td>
      <td style="text-align:right">${e.revenue_cashless != null ? e.revenue_cashless.toFixed(2) : "—"}</td>
      <td style="text-align:right; font-weight:600">${total != null ? total.toFixed(2) : "—"}</td>
      <td style="text-align:center">${e.tickets_sold ?? "—"}</td>
    </tr>
  `;}).join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Расписание ${formatDate(date)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
    h2 { font-size: 16px; margin-bottom: 4px; }
    p.sub { color: #555; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; border: 1px solid #ddd; }
    td { padding: 6px 8px; border: 1px solid #ddd; vertical-align: top; }
    td small { color: #777; font-size: 10px; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 24px; font-size: 11px; color: #aaa; text-align: right; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h2>Расписание на ${formatDate(date)}</h2>
  <p class="sub">RoutePayroll — сформировано ${new Date().toLocaleString("ru")}</p>
  <table>
    <thead>
      <tr><th>Маршрут</th><th>Борт №</th><th>Водитель</th><th>Кондуктор</th><th>Терминал</th><th style="text-align:right">ДТ, л</th><th style="text-align:right">Нал.</th><th style="text-align:right">Безнал.</th><th style="text-align:right">Итого</th><th style="text-align:center">Билеты</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Всего записей: ${entries.length}</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

function NumInput({ value, placeholder, onSave, className = "" }: {
  value: number | null; placeholder: string; onSave: (v: string) => void; className?: string;
}) {
  return (
    <input
      type="number" step="0.01" min="0"
      defaultValue={value ?? ""}
      placeholder={placeholder}
      onBlur={e => { const v = e.target.value; if ((v ? Number(v) : null) !== value) onSave(v); }}
      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500 text-right ${className}`}
    />
  );
}

export default function SchedulePage() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(false);
  const [addRouteId, setAddRouteId] = useState<string>("");
  const [addGraphNum, setAddGraphNum] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [ticketPrice, setTicketPrice] = useState(33);

  useEffect(() => {
    catalogCache.getSettings().then(s => {
      if (s?.ticket_price) setTicketPrice(Number(s.ticket_price));
    });
  }, []);

  useEffect(() => {
    Promise.all([
      catalogCache.getRoutes(),
      catalogCache.getBuses(),
      catalogCache.getDrivers(),
      catalogCache.getConductors(),
      catalogCache.getTerminals(),
    ]).then(([r, b, d, c, t]) => {
      setRoutes(Array.isArray(r) ? r : []);
      setBuses(Array.isArray(b) ? b : []);
      setDrivers(Array.isArray(d) ? d : []);
      setConductors(Array.isArray(c) ? c : []);
      setTerminals(Array.isArray(t) ? t : []);
    });
  }, []);

  const loadSchedule = useCallback(async (d: string) => {
    setLoading(true);
    const data = await api.getSchedule(d);
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadSchedule(date); }, [date, loadSchedule]);

  const handleRouteChange = useCallback((routeId: string) => {
    setAddRouteId(routeId);
    if (!routeId) { setAddGraphNum(""); return; }
    const route = routes.find(r => String(r.id) === routeId);
    if (!route) { setAddGraphNum(""); return; }
    const usedGraphs = new Set(
      entries.filter(e => e.route_id === Number(routeId)).map(e => e.graph_number)
    );
    for (let g = 1; g <= route.max_graphs; g++) {
      if (!usedGraphs.has(g)) { setAddGraphNum(String(g)); return; }
    }
    setAddGraphNum("");
  }, [routes, entries]);

  const handleAddRoute = async () => {
    if (!addRouteId) return;
    setAdding(true);
    const newEntry = await api.createScheduleEntry({
      work_date: date,
      route_id: Number(addRouteId),
      graph_number: addGraphNum ? Number(addGraphNum) : null,
    });
    setAddRouteId("");
    setAddGraphNum("");
    if (newEntry && !newEntry.error) {
      setEntries(prev => [...prev, newEntry]);
    } else {
      await loadSchedule(date);
    }
    setAdding(false);
  };

  const handleUpdate = useCallback(async (entry: Entry, fields: Record<string, unknown>) => {
    const merged = { ...entry, ...fields };
    // Оптимистичное обновление
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, ...fields } as Entry : e));
    await api.updateScheduleEntry({
      id: entry.id,
      graph_number: merged.graph_number,
      bus_id: merged.bus_id,
      driver_id: merged.driver_id,
      conductor_id: merged.conductor_id,
      terminal_id: merged.terminal_id,
      fuel_spent: merged.fuel_spent,
      fuel_price_override: merged.fuel_price_override,
      revenue_cash: merged.revenue_cash,
      revenue_cashless: merged.revenue_cashless,
      revenue_total: merged.revenue_total,
      ticket_price: merged.ticket_price,
      tickets_sold: merged.tickets_sold,
      is_overtime: merged.is_overtime,
    });
    // Для selects (водитель/автобус/кондуктор/терминал) нужно подтянуть имена — рефрешим
    if ("bus_id" in fields || "driver_id" in fields || "conductor_id" in fields || "terminal_id" in fields) {
      loadSchedule(date);
    }
  }, [date, loadSchedule]);

  const handleSelectUpdate = useCallback((entry: Entry, field: string, value: string) => {
    const v = value ? Number(value) : null;
    handleUpdate(entry, { [field]: v });
  }, [handleUpdate]);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить строку?")) return;
    setEntries(prev => prev.filter(e => e.id !== id));
    await api.deleteScheduleEntry(id);
  };

  const selectedRoute = useMemo(
    () => routes.find(r => String(r.id) === addRouteId),
    [routes, addRouteId]
  );

  const availableGraphs = useMemo(() => {
    if (!selectedRoute) return [];
    const used = new Set(entries.filter(e => e.route_id === Number(addRouteId)).map(e => e.graph_number));
    return Array.from({ length: selectedRoute.max_graphs }, (_, i) => i + 1).filter(g => !used.has(g));
  }, [selectedRoute, entries, addRouteId]);

  const terminalsByOrg = useMemo(() => terminals.reduce<Record<string, Terminal[]>>((acc, t) => {
    if (!acc[t.organization]) acc[t.organization] = [];
    acc[t.organization].push(t);
    return acc;
  }, {}), [terminals]);

  const groupedEntries = useMemo(() => {
    const seen = new Map<number, Entry[]>();
    for (const e of entries) {
      if (!seen.has(e.route_id)) seen.set(e.route_id, []);
      seen.get(e.route_id)!.push(e);
    }
    const result: { route: Entry; items: Entry[] }[] = [];
    seen.forEach(items => result.push({ route: items[0], items }));
    return result;
  }, [entries]);

  const calcEntryTotal = useCallback((e: Entry) =>
    Number(e.revenue_total) || ((Number(e.revenue_cash ?? 0) + Number(e.revenue_cashless ?? 0)) || 0),
  []);

  const calcEntryTickets = useCallback((e: Entry) => {
    const t = calcEntryTotal(e);
    return t ? Math.floor(t / ticketPrice) : 0;
  }, [calcEntryTotal, ticketPrice]);

  const { dayTotalCash, dayTotalCashless, dayTotalRevenue, dayTotalTickets, dayTotalFuel } = useMemo(() => ({
    dayTotalCash: entries.reduce((s, e) => s + Number(e.revenue_cash ?? 0), 0),
    dayTotalCashless: entries.reduce((s, e) => s + Number(e.revenue_cashless ?? 0), 0),
    dayTotalRevenue: entries.reduce((s, e) => s + (Number(e.revenue_total) || Number(e.revenue_cash ?? 0) + Number(e.revenue_cashless ?? 0)), 0),
    dayTotalTickets: entries.reduce((s, e) => s + (Number(e.revenue_total) || Number(e.revenue_cash ?? 0) + Number(e.revenue_cashless ?? 0) ? Math.floor((Number(e.revenue_total) || Number(e.revenue_cash ?? 0) + Number(e.revenue_cashless ?? 0)) / ticketPrice) : 0), 0),
    dayTotalFuel: entries.reduce((s, e) => s + Number(e.fuel_spent ?? 0), 0),
  }), [entries, ticketPrice]);

  // Семь дней недели начиная с понедельника текущей недели (относительно выбранной даты)
  const weekDays = useMemo(() => {
    const d = new Date(date);
    const dow = d.getDay(); // 0=вс
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day.toISOString().slice(0, 10);
    });
  }, [date]);

  const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold text-neutral-900">Расписание</h2>
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          className="border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-600"
        />
        <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 7); setDate(d.toISOString().slice(0, 10)); }}
          className="border border-neutral-300 px-2 py-2 rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-500" title="Предыдущая неделя">
          <Icon name="ChevronLeft" size={16} />
        </button>
        <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 7); setDate(d.toISOString().slice(0, 10)); }}
          className="border border-neutral-300 px-2 py-2 rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-500" title="Следующая неделя">
          <Icon name="ChevronRight" size={16} />
        </button>
        {entries.length > 0 && (
          <button onClick={() => handlePrint(date, entries)}
            className="ml-auto flex items-center gap-2 border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-700">
            <Icon name="Printer" size={15} />
            Распечатать
          </button>
        )}
      </div>

      {/* Навигация по дням недели */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {weekDays.map((d, i) => {
          const isActive = d === date;
          const isToday = d === today();
          const [, , dd] = d.split("-");
          return (
            <button key={d} onClick={() => setDate(d)}
              className={`flex flex-col items-center px-3 py-2 rounded cursor-pointer transition-colors min-w-[52px] border ${
                isActive
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : isToday
                  ? "border-neutral-400 text-neutral-700 hover:bg-neutral-100"
                  : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
              }`}>
              <span className="text-xs font-medium">{DAY_NAMES[i]}</span>
              <span className={`text-sm font-bold ${isActive ? "text-white" : "text-neutral-900"}`}>{dd}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-neutral-500 block mb-1">Маршрут</label>
          <select value={addRouteId} onChange={e => handleRouteChange(e.target.value)}
            className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600 bg-white">
            <option value="">— Выберите маршрут —</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>
                № {r.number}{r.name ? ` — ${r.name}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedRoute && (
          <div className="w-36">
            <label className="text-xs text-neutral-500 block mb-1">
              График
              {availableGraphs.length === 0 && <span className="text-orange-500 ml-1">(все заняты)</span>}
            </label>
            <select value={addGraphNum} onChange={e => setAddGraphNum(e.target.value)}
              className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600 bg-white">
              <option value="">— без графика —</option>
              {availableGraphs.map(g => (
                <option key={g} value={g}>График {g}</option>
              ))}
            </select>
          </div>
        )}

        <button onClick={handleAddRoute} disabled={adding || !addRouteId}
          className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
          {adding ? "Добавляю..." : "Добавить"}
        </button>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : entries.length === 0 ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Нет маршрутов на этот день — добавьте выше</div>
      ) : (
        <div className="flex flex-col gap-3">
          {groupedEntries.map(({ route, items }) => {
            const orgTerminals = terminalsByOrg[route.route_organization ?? ""] ?? terminals;
            return (
              <div key={route.route_id} className="border border-neutral-200 rounded overflow-hidden">
                <div className="bg-neutral-100 px-4 py-2 flex items-center gap-2">
                  <span className="font-bold text-sm text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    № {route.route_number}
                  </span>
                  {route.route_name && <span className="text-neutral-500 text-xs">{route.route_name}</span>}
                  <span className="text-neutral-400 text-xs ml-1">{items.length} из {route.max_graphs} гр.</span>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs tracking-wide border-b border-neutral-100">
                    <tr>
                      <th className="px-4 py-2 text-left w-20">График</th>
                      <th className="px-4 py-2 text-left">Бортовой №</th>
                      <th className="px-4 py-2 text-left">Водитель</th>
                      <th className="px-4 py-2 text-left">Кондуктор</th>
                      <th className="px-4 py-2 text-left">Терминал</th>
                      <th className="px-4 py-2 text-right w-24">ДТ, л</th>
                      <th className="px-4 py-2 text-center w-24">Подработка</th>
                      <th className="px-4 py-2 text-right w-28">Выручка</th>
                      <th className="px-4 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(entry => {
                      const isExpanded = expandedId === entry.id;
                      const totalRev = (entry.revenue_cash ?? 0) + (entry.revenue_cashless ?? 0);
                      const displayTotal = entry.revenue_total ?? (totalRev || null);
                      const calcTickets = displayTotal ? Math.floor(displayTotal / ticketPrice) : null;

                      return (
                        <tr key={entry.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors align-top">
                          <td className="px-4 py-2">
                            {entry.graph_number
                              ? <span className="inline-block bg-neutral-900 text-white text-xs font-semibold px-2 py-0.5 rounded">гр. {entry.graph_number}</span>
                              : <span className="text-neutral-300 text-xs">—</span>
                            }
                          </td>
                          <td className="px-4 py-2">
                            <select value={entry.bus_id ?? ""} onChange={e => handleSelectUpdate(entry, "bus_id", e.target.value)}
                              className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                              <option value="">— не назначен —</option>
                              {buses.map(b => (
                                <option key={b.id} value={b.id}>№ {b.board_number}{b.model ? ` (${b.model})` : ""}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select value={entry.driver_id ?? ""} onChange={e => handleSelectUpdate(entry, "driver_id", e.target.value)}
                              className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                              <option value="">— не назначен —</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.full_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select value={entry.conductor_id ?? ""} onChange={e => handleSelectUpdate(entry, "conductor_id", e.target.value)}
                              className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                              <option value="">— не назначен —</option>
                              {conductors.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select value={entry.terminal_id ?? ""} onChange={e => handleSelectUpdate(entry, "terminal_id", e.target.value)}
                              className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
                              <option value="">— не выбран —</option>
                              {orgTerminals.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <NumInput value={entry.fuel_spent} placeholder="л"
                              onSave={v => handleUpdate(entry, { fuel_spent: v ? Number(v) : null })} />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleUpdate(entry, { is_overtime: !entry.is_overtime })}
                              title="Подработка — водитель и кондуктор могут взять деньги"
                              className={`w-8 h-8 rounded cursor-pointer transition-colors mx-auto flex items-center justify-center ${
                                entry.is_overtime
                                  ? "bg-amber-400 text-white hover:bg-amber-500"
                                  : "border border-neutral-200 text-neutral-300 hover:border-amber-300 hover:text-amber-400"
                              }`}>
                              <Icon name="DollarSign" size={14} />
                            </button>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                              className={`flex items-center gap-1.5 w-full justify-end text-sm cursor-pointer rounded px-2 py-1.5 transition-colors ${
                                isExpanded ? "bg-neutral-200 text-neutral-900" : "hover:bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {displayTotal != null ? (
                                <span className="font-semibold">{fmtMoney(displayTotal)}</span>
                              ) : (
                                <span className="text-neutral-400">Ввести</span>
                              )}
                              <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={13} />
                            </button>
                            {isExpanded && (
                              <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded space-y-2">
                                <div>
                                  <label className="text-xs text-neutral-500 block mb-0.5">Наличные, ₽</label>
                                  <NumInput value={entry.revenue_cash} placeholder="0.00"
                                    onSave={v => {
                                      const cash = v ? Number(v) : null;
                                      const cashless = entry.revenue_cashless ?? 0;
                                      const total = (cash ?? 0) + cashless;
                                      handleUpdate(entry, {
                                        revenue_cash: cash,
                                        revenue_total: total || null,
                                        tickets_sold: total ? Math.floor(total / ticketPrice) : null,
                                      });
                                    }} />
                                </div>
                                <div>
                                  <label className="text-xs text-neutral-500 block mb-0.5">Безналичные, ₽</label>
                                  <NumInput value={entry.revenue_cashless} placeholder="0.00"
                                    onSave={v => {
                                      const cashless = v ? Number(v) : null;
                                      const cash = entry.revenue_cash ?? 0;
                                      const total = cash + (cashless ?? 0);
                                      handleUpdate(entry, {
                                        revenue_cashless: cashless,
                                        revenue_total: total || null,
                                        tickets_sold: total ? Math.floor(total / ticketPrice) : null,
                                      });
                                    }} />
                                </div>
                                <div className="pt-1 border-t border-neutral-200">
                                  <div className="flex justify-between items-center text-xs text-neutral-600 mb-1">
                                    <span>Итого привезено:</span>
                                    <span className="font-bold text-neutral-900 text-sm">{fmtMoney(displayTotal)}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center text-xs text-neutral-600 pt-1 border-t border-neutral-200">
                                  <span>Продано билетов <span className="text-neutral-400">(по {ticketPrice} ₽)</span>:</span>
                                  <span className="font-bold text-neutral-900 text-sm">{calcTickets ?? "—"}</span>
                                </div>
                                <div className="pt-1 border-t border-neutral-200">
                                  <label className="text-xs text-neutral-500 block mb-0.5">
                                    Цена топлива, ₽/л
                                    {entry.fuel_price_override != null
                                      ? <span className="ml-1 text-amber-600">(индивидуальная)</span>
                                      : <span className="ml-1 text-neutral-400">(базовая из настроек)</span>
                                    }
                                  </label>
                                  <NumInput value={entry.fuel_price_override} placeholder="по умолчанию"
                                    onSave={v => handleUpdate(entry, { fuel_price_override: v ? Number(v) : null })} />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => printWaybill(entry, date, entry.route_organization || "")}
                                title="Печать путевого листа"
                                className="text-neutral-400 hover:text-blue-600 transition-colors cursor-pointer"
                              >
                                <Icon name="FileText" size={14} />
                              </button>
                              <button onClick={() => handleDelete(entry.id)}
                                className="text-neutral-300 hover:text-red-500 transition-colors cursor-pointer">
                                <Icon name="Trash2" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length > 1 && (() => {
                      const rCash = items.reduce((s, e) => s + Number(e.revenue_cash ?? 0), 0);
                      const rCashless = items.reduce((s, e) => s + Number(e.revenue_cashless ?? 0), 0);
                      const rTotal = items.reduce((s, e) => s + calcEntryTotal(e), 0);
                      const rTickets = items.reduce((s, e) => s + calcEntryTickets(e), 0);
                      const rFuel = items.reduce((s, e) => s + Number(e.fuel_spent ?? 0), 0);
                      return (
                        <tr className="bg-neutral-100 border-t border-neutral-200 font-semibold text-xs text-neutral-700">
                          <td className="px-4 py-2" colSpan={9}>
                            <span className="inline-flex flex-wrap items-center gap-3">
                              <span>Итого м. {route.route_number}:</span>
                              {rTotal > 0 && <span>{Math.round(rTotal)} ₽</span>}
                              {rCash > 0 && <span className="font-normal text-neutral-500">нал. {Math.round(rCash)} ₽</span>}
                              {rCashless > 0 && <span className="font-normal text-neutral-500">безнал. {Math.round(rCashless)} ₽</span>}
                              {rTickets > 0 && <span>{rTickets} бил.</span>}
                              {rFuel > 0 && <span className="font-normal text-neutral-500">{rFuel.toFixed(1)} л</span>}
                            </span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            );
          })}

          {entries.length > 0 && (
            <div className="border border-neutral-300 rounded bg-neutral-900 text-white px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="font-bold uppercase tracking-wide">Итого за день:</span>
              {dayTotalRevenue > 0 && <span className="text-lg font-bold">{Math.round(dayTotalRevenue)} ₽</span>}
              {dayTotalCash > 0 && <span>нал. {Math.round(dayTotalCash)} ₽</span>}
              {dayTotalCashless > 0 && <span>безнал. {Math.round(dayTotalCashless)} ₽</span>}
              {dayTotalTickets > 0 && <span>{dayTotalTickets} бил.</span>}
              {dayTotalFuel > 0 && <span>{dayTotalFuel.toFixed(1)} л</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}