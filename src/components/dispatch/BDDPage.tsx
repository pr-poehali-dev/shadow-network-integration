import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { Accident, STATUS_LABELS, fmtDate } from "./bddTypes";
import { printAccidentReport, printAccidentAct, printDriverExplanation } from "./bddPrint";
import AccidentFormModal from "./BDDAccidentFormModal";

// --------- Главный компонент BDDPage ---------
export default function BDDPage() {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Accident | null>(null);

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
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l.label}</option>
          ))}
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

      {/* Список ДТП — Excel-таблица */}
      {loading ? (
        <div className="text-sm text-neutral-400 text-center py-10">Загрузка...</div>
      ) : accidents.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-10">
          <Icon name="ShieldCheck" size={32} className="mx-auto mb-2 opacity-30" />
          ДТП не зарегистрировано
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          {/* Заголовок таблицы */}
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-800">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
              Реестр ДТП — {accidents.length} {accidents.length === 1 ? "запись" : accidents.length < 5 ? "записи" : "записей"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-800 text-neutral-200">
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap border-r border-neutral-700 w-8">№</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[110px]">Дата / Время</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">Статус</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[60px]">Борт</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Гос. №</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[130px]">Водитель</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[80px]">Маршрут / Гр.</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[160px]">Место ДТП</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[90px]">Погода</th>
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[70px]">Вина вод.</th>
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[70px]">Пострад.</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[100px]">Ущерб ₽</th>
                  <th className="px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-neutral-700 min-w-[140px]">Примечание</th>
                  <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-20">Действия</th>
                </tr>
              </thead>
              <tbody>
                {accidents.map((a, idx) => {
                  const statusInfo = STATUS_LABELS[a.status] || { label: a.status, color: "bg-neutral-100 text-neutral-600" };
                  const isDriverFault = a.fault_side && a.fault_side.toLowerCase().includes("водит");
                  return (
                    <tr
                      key={a.id}
                      className={`group border-b border-neutral-100 cursor-pointer transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"} hover:bg-blue-50/60`}
                      onClick={() => { setEditing(a); setShowForm(true); }}
                    >
                      {/* № */}
                      <td className="px-2 py-2 text-center text-neutral-400 border-r border-neutral-100 font-mono">{idx + 1}</td>

                      {/* Дата / Время */}
                      <td className="px-2 py-2 border-r border-neutral-100 whitespace-nowrap">
                        <div className="font-medium text-neutral-800">{fmtDate(a.accident_date)}</div>
                        {a.accident_time && (
                          <div className="text-neutral-400">{a.accident_time.slice(0, 5)}</div>
                        )}
                      </td>

                      {/* Статус */}
                      <td className="px-2 py-2 border-r border-neutral-100">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Борт */}
                      <td className="px-2 py-2 border-r border-neutral-100 font-mono text-neutral-700">
                        {a.bus_board_number || <span className="text-neutral-300">—</span>}
                      </td>

                      {/* Гос. № */}
                      <td className="px-2 py-2 border-r border-neutral-100 font-mono text-neutral-700 whitespace-nowrap">
                        {a.bus_gov_number || <span className="text-neutral-300">—</span>}
                      </td>

                      {/* Водитель */}
                      <td className="px-2 py-2 border-r border-neutral-100 max-w-[130px] truncate" title={a.driver_name || ""}>
                        {a.driver_name || <span className="text-neutral-300">—</span>}
                      </td>

                      {/* Маршрут / Гр. */}
                      <td className="px-2 py-2 border-r border-neutral-100 text-center text-neutral-700">
                        {a.route_number || <span className="text-neutral-300">—</span>}
                      </td>

                      {/* Место ДТП */}
                      <td className="px-2 py-2 border-r border-neutral-100 max-w-[160px] truncate" title={a.location || ""}>
                        {a.location
                          ? <span className="text-neutral-700">{a.location}</span>
                          : <span className="text-neutral-300">—</span>
                        }
                      </td>

                      {/* Погода */}
                      <td className="px-2 py-2 border-r border-neutral-100 text-neutral-600 truncate max-w-[90px]" title={a.weather_conditions || ""}>
                        {a.weather_conditions || <span className="text-neutral-300">—</span>}
                      </td>

                      {/* Вина водителя */}
                      <td className="px-2 py-2 border-r border-neutral-100 text-center">
                        {a.fault_side
                          ? <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${isDriverFault ? "bg-red-100 text-red-700" : "bg-neutral-100 text-neutral-500"}`}>
                              {isDriverFault ? "Да" : "Нет"}
                            </span>
                          : <span className="text-neutral-300">—</span>
                        }
                      </td>

                      {/* Пострадавших */}
                      <td className="px-2 py-2 border-r border-neutral-100 text-center">
                        {a.victims_count
                          ? <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[11px]">{a.victims_count}</span>
                          : <span className="text-neutral-300">0</span>
                        }
                      </td>

                      {/* Ущерб */}
                      <td className="px-2 py-2 border-r border-neutral-100 text-right font-mono text-neutral-700 whitespace-nowrap">
                        {a.damage_amount
                          ? a.damage_amount.toLocaleString("ru-RU")
                          : <span className="text-neutral-300">—</span>
                        }
                      </td>

                      {/* Примечание */}
                      <td className="px-2 py-2 border-r border-neutral-100 max-w-[140px] truncate text-neutral-500" title={a.notes || ""}>
                        {a.notes || <span className="text-neutral-300">—</span>}
                      </td>

                      {/* Действия */}
                      <td className="px-2 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            title="Справка о ДТП"
                            onClick={() => printAccidentReport(a)}
                            className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer transition-colors"
                          >
                            <Icon name="Printer" size={13} />
                          </button>
                          <button
                            title="Акт о ДТП"
                            onClick={() => printAccidentAct(a)}
                            className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer transition-colors"
                          >
                            <Icon name="FileSignature" size={13} />
                          </button>
                          <button
                            title="Объяснительная"
                            onClick={() => printDriverExplanation(a)}
                            className="p-1 rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer transition-colors"
                          >
                            <Icon name="PenLine" size={13} />
                          </button>
                          <button
                            title="Редактировать"
                            onClick={() => { setEditing(a); setShowForm(true); }}
                            className="p-1 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 cursor-pointer transition-colors"
                          >
                            <Icon name="Pencil" size={13} />
                          </button>
                          <button
                            title="Удалить"
                            onClick={() => del(a.id)}
                            className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                          >
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