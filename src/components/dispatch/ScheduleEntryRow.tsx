import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Entry, Bus, Conductor, Terminal, fmtMoney } from "./scheduleTypes";
import { printWaybill } from "./scheduleWaybill";
import { api } from "@/lib/api";

const ABSENCE_OPTIONS: { value: string; label: string; fine?: number }[] = [
  { value: "", label: "— работал —" },
  { value: "alcohol", label: "Алкотестер", fine: 5000 },
  { value: "asleep", label: "Проспал" },
  { value: "medical_pressure", label: "Медик: давление" },
  { value: "medical_temp", label: "Медик: температура" },
  { value: "sick_leave", label: "Больничный" },
  { value: "other", label: "Прочее" },
];

const ABSENCE_COLORS: Record<string, string> = {
  alcohol: "bg-red-100 text-red-700 border-red-200",
  asleep: "bg-orange-100 text-orange-700 border-orange-200",
  medical_pressure: "bg-yellow-100 text-yellow-700 border-yellow-200",
  medical_temp: "bg-yellow-100 text-yellow-700 border-yellow-200",
  sick_leave: "bg-blue-100 text-blue-700 border-blue-200",
  other: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

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

interface Props {
  entry: Entry;
  date: string;
  buses: Bus[];
  drivers: { id: number; full_name: string }[];
  conductors: Conductor[];
  orgTerminals: Terminal[];
  ticketPrice: number;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  onUpdate: (entry: Entry, fields: Record<string, unknown>) => void;
  onSelectUpdate: (entry: Entry, field: string, value: string) => void;
  onDelete: (id: number) => void;
  onAccident?: (entry: Entry) => void;
  canEdit?: boolean;
}

export default function ScheduleEntryRow({
  entry, date, buses, drivers, conductors, orgTerminals,
  ticketPrice, expandedId, setExpandedId,
  onUpdate, onSelectUpdate, onDelete, onAccident, canEdit = true,
}: Props) {
  const isExpanded = expandedId === entry.id;
  const isAbsent = !!entry.absence_reason;
  const absenceOpt = ABSENCE_OPTIONS.find(o => o.value === entry.absence_reason);
  const cashless = entry.revenue_cashless;
  const [smsSent, setSmsSent] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  const sendDriverSms = async () => {
    const driver = drivers.find(d => d.id === entry.driver_id);
    const phone = (driver as Record<string, unknown>)?.phone as string | undefined;
    if (!phone) return alert("У водителя не указан номер телефона");
    setSmsSending(true);
    const [y, m, d] = (entry.work_date || "").split("-");
    await api.sendScheduleSms({
      phone,
      full_name: entry.driver_name || "",
      work_date: entry.work_date,
      route_number: entry.route_number,
      graph_number: entry.graph_number,
      person_type: "водитель",
      organization: entry.route_organization || "",
    });
    setSmsSent(true);
    setSmsSending(false);
    setTimeout(() => setSmsSent(false), 4000);
  };

  return (
    <tr className={`border-t border-neutral-100 hover:bg-neutral-50 transition-colors align-top ${isAbsent ? "bg-red-50/40" : ""}`}>
      {/* График */}
      <td className="px-4 py-2">
        {entry.graph_number
          ? <span className="inline-block bg-neutral-900 text-white text-xs font-semibold px-2 py-0.5 rounded">гр. {entry.graph_number}</span>
          : <span className="text-neutral-300 text-xs">—</span>
        }
      </td>

      {/* Бортовой */}
      <td className="px-4 py-2">
        <select value={entry.bus_id ?? ""} onChange={e => onSelectUpdate(entry, "bus_id", e.target.value)}
          disabled={!canEdit}
          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-400">
          <option value="">— не назначен —</option>
          {buses.map(b => (
            <option key={b.id} value={b.id}>№ {b.board_number}{b.model ? ` (${b.model})` : ""}</option>
          ))}
        </select>
      </td>

      {/* Водитель */}
      <td className="px-4 py-2">
        <select value={entry.driver_id ?? ""} onChange={e => onSelectUpdate(entry, "driver_id", e.target.value)}
          disabled={!canEdit}
          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-400">
          <option value="">— не назначен —</option>
          {drivers.map(d => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
      </td>

      {/* Кондуктор */}
      <td className="px-4 py-2">
        <select value={entry.conductor_id ?? ""} onChange={e => onSelectUpdate(entry, "conductor_id", e.target.value)}
          disabled={!canEdit}
          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-400">
          <option value="">— не назначен —</option>
          {conductors.map(c => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </td>

      {/* Терминал */}
      <td className="px-4 py-2">
        <select value={entry.terminal_id ?? ""} onChange={e => onSelectUpdate(entry, "terminal_id", e.target.value)}
          disabled={!canEdit}
          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500 disabled:bg-neutral-50 disabled:text-neutral-400">
          <option value="">— не выбран —</option>
          {orgTerminals.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </td>

      {/* ДТ */}
      <td className="px-4 py-2">
        <NumInput value={entry.fuel_spent} placeholder="л"
          onSave={v => onUpdate(entry, { fuel_spent: v ? Number(v) : null })} />
      </td>

      {/* Подработка */}
      <td className="px-4 py-2 text-center">
        <button
          onClick={() => onUpdate(entry, { is_overtime: !entry.is_overtime })}
          title="Подработка"
          className={`w-8 h-8 rounded cursor-pointer transition-colors mx-auto flex items-center justify-center ${
            entry.is_overtime
              ? "bg-amber-400 text-white hover:bg-amber-500"
              : "border border-neutral-200 text-neutral-300 hover:border-amber-300 hover:text-amber-400"
          }`}>
          <Icon name="DollarSign" size={14} />
        </button>
      </td>

      {/* Неявка */}
      <td className="px-4 py-2">
        <select
          value={entry.absence_reason ?? ""}
          onChange={e => {
            const reason = e.target.value || null;
            const fine = reason === "alcohol" ? 5000 : null;
            onUpdate(entry, { absence_reason: reason, absence_fine: fine });
          }}
          className={`border rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-neutral-500 ${
            entry.absence_reason
              ? ABSENCE_COLORS[entry.absence_reason] || ABSENCE_COLORS.other
              : "border-neutral-200 bg-white text-neutral-500"
          }`}>
          {ABSENCE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {entry.absence_reason === "alcohol" && (
          <div className="text-xs text-red-600 font-semibold mt-1 text-right">
            Штраф: 5 000 ₽
          </div>
        )}
      </td>

      {/* Билеты (заполняет кассир) */}
      <td className="px-4 py-2 text-center">
        {entry.tickets_sold != null ? (
          <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-2 py-0.5 text-xs font-semibold font-mono">
            {entry.tickets_sold}
          </span>
        ) : (
          <span className="text-neutral-300 text-xs">—</span>
        )}
      </td>

      {/* Безналичные */}
      <td className="px-4 py-2">
        <button
          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
          className={`flex items-center gap-1.5 w-full justify-end text-sm cursor-pointer rounded px-2 py-1.5 transition-colors ${
            isExpanded ? "bg-neutral-200 text-neutral-900" : "hover:bg-neutral-100 text-neutral-600"
          }`}
        >
          {cashless != null ? (
            <span className="font-semibold">{fmtMoney(cashless)}</span>
          ) : (
            <span className="text-neutral-400">Ввести</span>
          )}
          <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={13} />
        </button>

        {isExpanded && (
          <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded space-y-2">
            <div>
              <label className="text-xs text-neutral-500 block mb-0.5">Безналичные (терминал), ₽</label>
              <NumInput value={entry.revenue_cashless} placeholder="0.00"
                onSave={v => {
                  const cashlessVal = v ? Number(v) : null;
                  onUpdate(entry, {
                    revenue_cashless: cashlessVal,
                    // revenue_total = cashless, т.к. в системе выручка вносится только через терминал
                    revenue_total: cashlessVal,
                  });
                }} />
            </div>
            <div className="pt-1 border-t border-neutral-200">
              <label className="text-xs text-neutral-500 block mb-0.5">
                Цена топлива, ₽/л
                {entry.fuel_price_override != null
                  ? <span className="ml-1 text-amber-600">(индивидуальная)</span>
                  : <span className="ml-1 text-neutral-400">(из настроек)</span>}
              </label>
              <NumInput value={entry.fuel_price_override} placeholder="по умолчанию"
                onSave={v => onUpdate(entry, { fuel_price_override: v ? Number(v) : null })} />
            </div>
          </div>
        )}
      </td>

      {/* Действия */}
      <td className="px-4 py-2 text-center">
        <div className="flex flex-col items-center gap-1">
          {entry.driver_id && canEdit && (
            <button
              onClick={sendDriverSms}
              disabled={smsSending}
              title={smsSent ? "SMS отправлено!" : "Отправить SMS водителю"}
              className={`transition-colors cursor-pointer ${smsSent ? "text-green-500" : "text-neutral-400 hover:text-blue-500"}`}>
              <Icon name={smsSent ? "CheckCheck" : "MessageSquare"} size={15} />
            </button>
          )}
          <button
            onClick={() => printWaybill(entry, date, entry.route_organization || "")}
            title="Печать путевого листа"
            className="text-neutral-400 hover:text-blue-600 transition-colors cursor-pointer">
            <Icon name="FileText" size={15} />
          </button>
          {onAccident && (
            <button
              onClick={() => onAccident(entry)}
              title="Зарегистрировать ДТП"
              className="text-neutral-400 hover:text-orange-500 transition-colors cursor-pointer">
              <Icon name="AlertTriangle" size={15} />
            </button>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            title="Удалить"
            className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer">
            <Icon name="Trash2" size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}