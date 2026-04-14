import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import { Entry, Route, Bus, Driver, Conductor, Terminal, today, fmtMoney } from "./scheduleTypes";
import { handlePrint } from "./scheduleWaybill";
import ScheduleRouteTable from "./ScheduleRouteTable";
import ScheduleSuggest from "./ScheduleSuggest";

// Мини-форма быстрой регистрации ДТП из наряда
function QuickAccidentModal({ entry, date, onClose, onCreated }: {
  entry: Entry; date: string; onClose: () => void; onCreated?: () => void;
}) {
  const bus = (entry as Record<string, unknown>);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    accident_date: date,
    accident_time: "",
    location: "",
    description: "",
    driver_name: (bus.driver_name as string) || "",
    bus_board_number: (bus.board_number as string) || "",
    bus_gov_number: (bus.gov_number as string) || "",
    route_number: (bus.route_number as string) || "",
    graph_number: entry.graph_number ? String(entry.graph_number) : "",
    status: "new",
    organization: (bus.route_organization as string) || "",
    schedule_entry_id: entry.id,
  });

  async function save() {
    setSaving(true);
    await api.createAccident({ ...form, graph_number: form.graph_number ? parseInt(form.graph_number) : undefined });
    setSaving(false);
    onCreated?.();
    onClose();
  }

  const inp = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-4 border-b bg-red-50 rounded-t-2xl">
          <Icon name="AlertTriangle" size={18} className="text-red-600" />
          <span className="font-bold text-neutral-900">Зарегистрировать ДТП</span>
          <button onClick={onClose} className="ml-auto text-neutral-400 cursor-pointer"><Icon name="X" size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-neutral-600 mb-1">Дата</label><input type="date" value={form.accident_date} onChange={e => setForm(f => ({ ...f, accident_date: e.target.value }))} className={inp} /></div>
            <div><label className="block text-xs font-medium text-neutral-600 mb-1">Время</label><input type="time" value={form.accident_time} onChange={e => setForm(f => ({ ...f, accident_time: e.target.value }))} className={inp} /></div>
          </div>
          <div className="bg-neutral-50 rounded-lg px-3 py-2 text-xs text-neutral-600 space-y-0.5">
            <div>ТС: <b>{form.bus_board_number || "—"}</b> {form.bus_gov_number}</div>
            <div>Водитель: <b>{form.driver_name || "—"}</b></div>
            <div>Маршрут: <b>м.{form.route_number} / гр.{form.graph_number || "—"}</b></div>
          </div>
          <div><label className="block text-xs font-medium text-neutral-600 mb-1">Место ДТП</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Адрес, перекрёсток..." className={inp} /></div>
          <div><label className="block text-xs font-medium text-neutral-600 mb-1">Краткое описание</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Что произошло..." className={`${inp} resize-none`} /></div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 cursor-pointer">Отмена</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer">
            {saving ? "Сохраняю..." : "Зарегистрировать"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage({ onAccidentCreated }: { onAccidentCreated?: () => void } = {}) {
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "dispatcher";
  const [date, setDate] = useState(today());
  const [accidentEntry, setAccidentEntry] = useState<Entry | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [addRouteId, setAddRouteId] = useState<string>("");
  const [addGraphNum, setAddGraphNum] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [ticketPrice, setTicketPrice] = useState(33);

  useEffect(() => {
    catalogCache.getSettings().then(s => {
      if (s?.ticket_price) setTicketPrice(Number(s.ticket_price));
    }).catch(() => {});
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
    }).catch(() => setLoadError(true));
  }, []);

  const loadSchedule = useCallback(async (d: string) => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api.getSchedule(d);
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
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
      revenue_cashless: merged.revenue_cashless,
      revenue_total: merged.revenue_total ?? merged.revenue_cashless,
      ticket_price: merged.ticket_price,
      tickets_sold: merged.tickets_sold,
      is_overtime: merged.is_overtime,
      absence_reason: merged.absence_reason,
      absence_fine: merged.absence_fine,
    });
    // Для selects (водитель/автобус/кондуктор/терминал) нужно подтянуть имена — рефрешим
    if ("bus_id" in fields || "driver_id" in fields || "conductor_id" in fields || "terminal_id" in fields) {
      loadSchedule(date);
    }
  }, [date, loadSchedule]);

  // Проверяет является ли дата рабочим днём по графику водителя
  const isDriverWorkDay = useCallback((driver: Driver, checkDate: string): boolean | null => {
    const ws = driver.work_schedule;
    const ssd = driver.schedule_start_date;
    if (!ws || !ssd || ws === "individual") return null;
    const parts = ws.split("/");
    if (parts.length !== 2) return null;
    const workDays = parseInt(parts[0]);
    const restDays = parseInt(parts[1]);
    const cycle = workDays + restDays;
    const start = new Date(ssd);
    const check = new Date(checkDate);
    const delta = Math.floor((check.getTime() - start.getTime()) / 86400000);
    const pos = ((delta % cycle) + cycle) % cycle;
    return pos < workDays;
  }, []);

  const handleSelectUpdate = useCallback((entry: Entry, field: string, value: string) => {
    const v = value ? Number(value) : null;
    if (field === "driver_id" && v) {
      const driver = drivers.find(d => d.id === v);
      if (driver) {
        const isWorkDay = isDriverWorkDay(driver, entry.work_date || date);
        // Если isWorkDay === false — водитель выходит НЕ в свой день → подработка
        const autoOvertime = isWorkDay === false ? true : entry.is_overtime;
        handleUpdate(entry, { driver_id: v, is_overtime: autoOvertime });
        return;
      }
    }
    handleUpdate(entry, { [field]: v });
  }, [handleUpdate, drivers, date, isDriverWorkDay]);

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

  // Полная выручка: revenue_total если заполнен, иначе cashless (безналичные через терминал)
  const calcEntryTotal = useCallback((e: Entry) => Number(e.revenue_total ?? e.revenue_cashless ?? 0), []);
  const calcEntryTickets = useCallback((e: Entry) => {
    const t = calcEntryTotal(e);
    return t ? Math.floor(t / ticketPrice) : 0;
  }, [calcEntryTotal, ticketPrice]);

  const { dayTotalCashless, dayTotalFuel, dayAbsences } = useMemo(() => ({
    dayTotalCashless: entries.reduce((s, e) => s + Number(e.revenue_cashless ?? 0), 0),
    dayTotalFuel: entries.reduce((s, e) => s + Number(e.fuel_spent ?? 0), 0),
    dayAbsences: entries.filter(e => e.absence_reason).length,
  }), [entries]);

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
        <h2 className="text-2xl font-bold text-neutral-900">Наряд</h2>
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
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowSuggest(true)}
            className="flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2 text-sm rounded hover:bg-blue-100 transition-colors cursor-pointer">
            <Icon name="CalendarCheck2" size={15} />
            Предложения на неделю
          </button>
          {entries.length > 0 && (
            <button onClick={() => handlePrint(date, entries)}
              className="flex items-center gap-2 border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-700">
              <Icon name="Printer" size={15} />
              Распечатать
            </button>
          )}
        </div>
      </div>

      {showSuggest && <ScheduleSuggest onClose={() => setShowSuggest(false)} currentDate={date} />}
      {accidentEntry && (
        <QuickAccidentModal
          entry={accidentEntry}
          date={date}
          onClose={() => setAccidentEntry(null)}
          onCreated={() => { setAccidentEntry(null); onAccidentCreated?.(); }}
        />
      )}

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

      {!canEdit && (
        <div className="mb-4 px-4 py-2 bg-neutral-100 border border-neutral-200 rounded text-xs text-neutral-500 flex items-center gap-2">
          <Icon name="Eye" size={13} /> Режим просмотра — редактирование доступно администратору и диспетчеру
        </div>
      )}
      <div className={`bg-neutral-50 border border-neutral-200 rounded p-4 mb-6 flex flex-wrap gap-3 items-end ${!canEdit ? "opacity-50 pointer-events-none" : ""}`}>
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

      {loadError && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-700">
          <Icon name="WifiOff" size={16} />
          <span>Сервер недоступен. Данные не загружены.</span>
          <button onClick={() => loadSchedule(date)}
            className="ml-auto flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700 cursor-pointer transition-colors">
            <Icon name="RefreshCw" size={12} />
            Повторить
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : entries.length === 0 && !loadError ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Нет маршрутов на этот день — добавьте выше</div>
      ) : (
        <div className="flex flex-col gap-3">
          {groupedEntries.map(({ route, items }) => {
            const orgTerminals = terminalsByOrg[route.route_organization ?? ""] ?? terminals;
            const routeMeta = routes.find(r => r.id === route.route_id);
            return (
              <ScheduleRouteTable
                key={route.route_id}
                routeNumber={route.route_number}
                routeName={route.route_name}
                maxGraphs={route.max_graphs}
                minVehicles={routeMeta?.min_vehicles}
                requiredTrips={routeMeta?.required_trips}
                items={items}
                date={date}
                buses={buses}
                drivers={drivers}
                conductors={conductors}
                orgTerminals={orgTerminals}
                ticketPrice={ticketPrice}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                onUpdate={handleUpdate}
                onSelectUpdate={handleSelectUpdate}
                onDelete={handleDelete}
                onAccident={entry => setAccidentEntry(entry)}
                canEdit={canEdit}
                calcEntryTotal={calcEntryTotal}
                calcEntryTickets={calcEntryTickets}
              />
            );
          })}

          {entries.length > 0 && (
            <div className="border border-neutral-300 rounded bg-neutral-900 text-white px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
              <span className="font-bold uppercase tracking-wide">Итого за день:</span>
              {dayTotalCashless > 0 && <span className="text-lg font-bold">безнал. {Math.round(dayTotalCashless)} ₽</span>}
              {dayTotalFuel > 0 && <span>{dayTotalFuel.toFixed(1)} л</span>}
              {dayAbsences > 0 && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                  неявок: {dayAbsences}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}