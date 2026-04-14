import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { Accident, STATUS_LABELS, fmtDate } from "./bddTypes";
import { printAccidentReport, printAccidentAct, printDriverExplanation } from "./bddPrint";
import AccidentFormModal, { DocUploader } from "./BDDAccidentFormModal";

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
