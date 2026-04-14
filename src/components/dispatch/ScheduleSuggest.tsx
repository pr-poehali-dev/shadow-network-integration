import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface PersonDay {
  id: number;
  full_name: string;
  work_schedule: string | null;
  status: "work" | "rest" | "unknown";
  shifts_this_month: number;
  is_overtime: boolean;
  overtime_pay: number;
}

interface DayData {
  drivers: PersonDay[];
  conductors: PersonDay[];
  available_drivers: PersonDay[];
  available_conductors: PersonDay[];
}

interface SuggestData {
  dates: string[];
  suggestion: Record<string, DayData>;
  overtime_threshold: number;
  driver_overtime_pay: number;
  conductor_overtime_pay: number;
}

interface OvertimeRow {
  id: number;
  full_name: string;
  person_type: "driver" | "conductor";
  total_shifts: number;
  overtime_shifts: number;
  overtime_pay: number;
}

interface OvertimeData {
  year: number;
  month: number;
  drivers: OvertimeRow[];
  conductors: OvertimeRow[];
  total_overtime_pay: number;
  overtime_threshold: number;
  driver_overtime_pay: number;
  conductor_overtime_pay: number;
}

const DAY_NAMES = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function getDayOfWeek(iso: string) {
  const d = new Date(iso);
  const dow = d.getDay();
  return DAY_NAMES[dow === 0 ? 6 : dow - 1];
}

function getNextMonday(): string {
  const d = new Date();
  const dow = d.getDay();
  const daysToMonday = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + daysToMonday);
  return d.toISOString().slice(0, 10);
}

interface Props {
  onClose: () => void;
  currentDate: string;
}

export default function ScheduleSuggest({ onClose, currentDate }: Props) {
  const [tab, setTab] = useState<"suggest" | "overtime">("suggest");
  const [suggestData, setSuggestData] = useState<SuggestData | null>(null);
  const [overtimeData, setOvertimeData] = useState<OvertimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(getNextMonday);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [overtimeYear, setOvertimeYear] = useState(new Date().getFullYear());
  const [overtimeMonth, setOvertimeMonth] = useState(new Date().getMonth() + 1);

  const loadSuggest = useCallback(async () => {
    setLoading(true);
    const r = await api.getScheduleSuggest(fromDate);
    setSuggestData(r);
    setSelectedDay(r?.dates?.[0] ?? null);
    setLoading(false);
  }, [fromDate]);

  const loadOvertime = useCallback(async () => {
    setLoading(true);
    const r = await api.getOvertimeReport(overtimeYear, overtimeMonth);
    setOvertimeData(r);
    setLoading(false);
  }, [overtimeYear, overtimeMonth]);

  useEffect(() => {
    if (tab === "suggest") loadSuggest();
    else loadOvertime();
  }, [tab, loadSuggest, loadOvertime]);

  const selectedData = selectedDay ? suggestData?.suggestion[selectedDay] : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="bg-white h-full w-full max-w-xl shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
          <div className="flex gap-1 bg-neutral-100 rounded-lg p-0.5">
            {(["suggest","overtime"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${tab===t?"bg-white text-neutral-900 shadow-sm font-medium":"text-neutral-500 hover:text-neutral-700"}`}>
                {t === "suggest" ? "Предложения на неделю" : "Переработки"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 cursor-pointer p-1">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* --- ВКЛАДКА ПРЕДЛОЖЕНИЙ --- */}
          {tab === "suggest" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Начало недели</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="border border-neutral-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <button onClick={loadSuggest}
                  className="mt-5 flex items-center gap-1.5 border border-neutral-200 px-3 py-2 text-sm rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors text-neutral-700">
                  <Icon name="RefreshCw" size={13} /> Обновить
                </button>
              </div>

              {loading ? (
                <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div>
              ) : suggestData ? (
                <>
                  {/* Навигация по дням */}
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {suggestData.dates.map(d => {
                      const dayData = suggestData.suggestion[d];
                      const available = dayData?.available_drivers?.length ?? 0;
                      const isSelected = d === selectedDay;
                      return (
                        <button key={d} onClick={() => setSelectedDay(d)}
                          className={`flex flex-col items-center px-3 py-2 rounded-lg cursor-pointer border transition-colors min-w-[60px] ${
                            isSelected ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          }`}>
                          <span className="text-xs font-medium">{getDayOfWeek(d)}</span>
                          <span className="text-xs">{d.slice(8)}.{d.slice(5,7)}</span>
                          <span className={`text-xs mt-0.5 font-semibold ${isSelected?"text-white":available>0?"text-green-600":"text-neutral-400"}`}>
                            {available} вод.
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDay && selectedData && (
                    <div className="space-y-4">
                      <div className="text-sm font-semibold text-neutral-700">
                        {getDayOfWeek(selectedDay)}, {fmtDate(selectedDay)}
                      </div>

                      {/* Водители */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon name="Truck" size={14} className="text-neutral-500" />
                          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                            Водители ({selectedData.available_drivers.length} доступно)
                          </span>
                        </div>
                        <div className="space-y-1">
                          {selectedData.drivers.map(d => (
                            <div key={d.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border ${
                              d.status === "work"
                                ? d.is_overtime
                                  ? "border-orange-200 bg-orange-50"
                                  : "border-green-200 bg-green-50"
                                : d.status === "rest"
                                ? "border-neutral-100 bg-neutral-50 opacity-60"
                                : "border-neutral-200"
                            }`}>
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                d.status === "work" ? "bg-green-500" : d.status === "rest" ? "bg-neutral-300" : "bg-yellow-400"
                              }`} />
                              <span className="flex-1 font-medium text-neutral-900">{d.full_name}</span>
                              {d.work_schedule && (
                                <span className="text-xs text-neutral-400 font-mono">{d.work_schedule}</span>
                              )}
                              <span className="text-xs text-neutral-500">{d.shifts_this_month} см.</span>
                              {d.is_overtime && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                                  +{d.overtime_pay.toLocaleString("ru-RU")} ₽
                                </span>
                              )}
                              <span className={`text-xs font-medium ${
                                d.status === "work" ? "text-green-700" : d.status === "rest" ? "text-neutral-400" : "text-yellow-600"
                              }`}>
                                {d.status === "work" ? "Работает" : d.status === "rest" ? "Отдых" : "Неизвестно"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Кондукторы */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon name="Users" size={14} className="text-neutral-500" />
                          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                            Кондукторы ({selectedData.available_conductors.length} доступно)
                          </span>
                        </div>
                        <div className="space-y-1">
                          {selectedData.conductors.map(c => (
                            <div key={c.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border ${
                              c.status === "work"
                                ? c.is_overtime
                                  ? "border-orange-200 bg-orange-50"
                                  : "border-green-200 bg-green-50"
                                : c.status === "rest"
                                ? "border-neutral-100 bg-neutral-50 opacity-60"
                                : "border-neutral-200"
                            }`}>
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                c.status === "work" ? "bg-green-500" : c.status === "rest" ? "bg-neutral-300" : "bg-yellow-400"
                              }`} />
                              <span className="flex-1 font-medium text-neutral-900">{c.full_name}</span>
                              {c.work_schedule && (
                                <span className="text-xs text-neutral-400 font-mono">{c.work_schedule}</span>
                              )}
                              <span className="text-xs text-neutral-500">{c.shifts_this_month} см.</span>
                              {c.is_overtime && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                                  +{c.overtime_pay.toLocaleString("ru-RU")} ₽
                                </span>
                              )}
                              <span className={`text-xs font-medium ${
                                c.status === "work" ? "text-green-700" : c.status === "rest" ? "text-neutral-400" : "text-yellow-600"
                              }`}>
                                {c.status === "work" ? "Работает" : c.status === "rest" ? "Отдых" : "Неизвестно"}
                              </span>
                            </div>
                          ))}
                          {selectedData.conductors.length === 0 && (
                            <div className="text-xs text-neutral-400 italic px-3 py-2">Кондукторов нет</div>
                          )}
                        </div>
                      </div>

                      {/* Подсказка про переработку */}
                      {(selectedData.drivers.some(d => d.is_overtime) || selectedData.conductors.some(c => c.is_overtime)) && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-xs text-orange-700 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Icon name="AlertTriangle" size={13} />
                            Переработка (&gt;{suggestData.overtime_threshold} смен):
                          </div>
                          <div>Водители: <span className="font-semibold">{suggestData.driver_overtime_pay.toLocaleString("ru-RU")} ₽</span> / смена</div>
                          <div>Кондукторы: <span className="font-semibold">{suggestData.conductor_overtime_pay.toLocaleString("ru-RU")} ₽</span> / смена</div>
                        </div>
                      )}

                      {/* Подсказка если нет графика */}
                      {selectedData.drivers.some(d => d.status === "unknown") && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-xs text-yellow-700">
                          <Icon name="Info" size={13} className="inline mr-1.5" />
                          У некоторых сотрудников не задан график работы. Задайте его в разделе <span className="font-semibold">Кадры → Водители</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* --- ВКЛАДКА ПЕРЕРАБОТОК --- */}
          {tab === "overtime" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Год</label>
                  <select value={overtimeYear} onChange={e => setOvertimeYear(Number(e.target.value))}
                    className="border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                    {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Месяц</label>
                  <select value={overtimeMonth} onChange={e => setOvertimeMonth(Number(e.target.value))}
                    className="border border-neutral-200 rounded-lg px-3 py-2 text-sm">
                    {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-neutral-400 text-center py-8">Загрузка...</div>
              ) : overtimeData ? (
                <div className="space-y-4">
                  {overtimeData.total_overtime_pay > 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <Icon name="TrendingUp" size={18} className="text-orange-500 shrink-0" />
                      <div>
                        <div className="text-xs text-orange-600 font-medium">Итого доплата за переработки</div>
                        <div className="text-xl font-bold text-orange-700">
                          {overtimeData.total_overtime_pay.toLocaleString("ru-RU")} ₽
                        </div>
                        <div className="text-xs text-orange-500 mt-0.5 space-y-0.5">
                          <div>Порог: {overtimeData.overtime_threshold} смен</div>
                          <div>Водители: {(overtimeData.driver_overtime_pay ?? 700).toLocaleString("ru-RU")} ₽/смена · Кондукторы: {(overtimeData.conductor_overtime_pay ?? 350).toLocaleString("ru-RU")} ₽/смена</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                      <Icon name="CheckCircle2" size={15} />
                      Переработок нет — все в норме
                    </div>
                  )}

                  {/* Таблица водителей */}
                  {overtimeData.drivers.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Водители</div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-xs text-neutral-400 border-b border-neutral-200">
                            <th className="text-left py-2 font-medium">ФИО</th>
                            <th className="text-center py-2 font-medium">Смен</th>
                            <th className="text-center py-2 font-medium">Перераб.</th>
                            <th className="text-right py-2 font-medium">Доплата</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overtimeData.drivers.map(r => (
                            <tr key={r.id} className={`border-b border-neutral-100 ${r.overtime_shifts > 0 ? "bg-orange-50/50" : ""}`}>
                              <td className="py-2 font-medium text-neutral-900">{r.full_name}</td>
                              <td className="py-2 text-center text-neutral-600">{r.total_shifts}</td>
                              <td className="py-2 text-center">
                                {r.overtime_shifts > 0
                                  ? <span className="font-semibold text-orange-600">+{r.overtime_shifts}</span>
                                  : <span className="text-neutral-400">—</span>}
                              </td>
                              <td className="py-2 text-right font-semibold">
                                {r.overtime_pay > 0
                                  ? <span className="text-orange-700">{r.overtime_pay.toLocaleString("ru-RU")} ₽</span>
                                  : <span className="text-neutral-400">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Таблица кондукторов */}
                  {overtimeData.conductors.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Кондукторы</div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-xs text-neutral-400 border-b border-neutral-200">
                            <th className="text-left py-2 font-medium">ФИО</th>
                            <th className="text-center py-2 font-medium">Смен</th>
                            <th className="text-center py-2 font-medium">Перераб.</th>
                            <th className="text-right py-2 font-medium">Доплата</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overtimeData.conductors.map(r => (
                            <tr key={r.id} className={`border-b border-neutral-100 ${r.overtime_shifts > 0 ? "bg-orange-50/50" : ""}`}>
                              <td className="py-2 font-medium text-neutral-900">{r.full_name}</td>
                              <td className="py-2 text-center text-neutral-600">{r.total_shifts}</td>
                              <td className="py-2 text-center">
                                {r.overtime_shifts > 0
                                  ? <span className="font-semibold text-orange-600">+{r.overtime_shifts}</span>
                                  : <span className="text-neutral-400">—</span>}
                              </td>
                              <td className="py-2 text-right font-semibold">
                                {r.overtime_pay > 0
                                  ? <span className="text-orange-700">{r.overtime_pay.toLocaleString("ru-RU")} ₽</span>
                                  : <span className="text-neutral-400">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {overtimeData.drivers.length === 0 && overtimeData.conductors.length === 0 && (
                    <div className="text-sm text-neutral-400 text-center py-6">Нет данных за выбранный период</div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}