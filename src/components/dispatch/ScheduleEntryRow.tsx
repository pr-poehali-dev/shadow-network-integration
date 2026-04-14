import Icon from "@/components/ui/icon";
import { Entry, Bus, Conductor, Terminal, fmtMoney } from "./scheduleTypes";
import { printWaybill } from "./scheduleWaybill";

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
}

export default function ScheduleEntryRow({
  entry, date, buses, drivers, conductors, orgTerminals,
  ticketPrice, expandedId, setExpandedId,
  onUpdate, onSelectUpdate, onDelete,
}: Props) {
  const isExpanded = expandedId === entry.id;
  const totalRev = (entry.revenue_cash ?? 0) + (entry.revenue_cashless ?? 0);
  const displayTotal = entry.revenue_total ?? (totalRev || null);
  const calcTickets = displayTotal ? Math.floor(displayTotal / ticketPrice) : null;

  return (
    <tr className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors align-top">
      <td className="px-4 py-2">
        {entry.graph_number
          ? <span className="inline-block bg-neutral-900 text-white text-xs font-semibold px-2 py-0.5 rounded">гр. {entry.graph_number}</span>
          : <span className="text-neutral-300 text-xs">—</span>
        }
      </td>
      <td className="px-4 py-2">
        <select value={entry.bus_id ?? ""} onChange={e => onSelectUpdate(entry, "bus_id", e.target.value)}
          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
          <option value="">— не назначен —</option>
          {buses.map(b => (
            <option key={b.id} value={b.id}>№ {b.board_number}{b.model ? ` (${b.model})` : ""}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select value={entry.driver_id ?? ""} onChange={e => onSelectUpdate(entry, "driver_id", e.target.value)}
          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
          <option value="">— не назначен —</option>
          {drivers.map(d => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select value={entry.conductor_id ?? ""} onChange={e => onSelectUpdate(entry, "conductor_id", e.target.value)}
          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
          <option value="">— не назначен —</option>
          {conductors.map(c => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select value={entry.terminal_id ?? ""} onChange={e => onSelectUpdate(entry, "terminal_id", e.target.value)}
          className="border border-neutral-200 rounded px-2 py-1.5 text-sm w-full bg-white focus:outline-none focus:border-neutral-500">
          <option value="">— не выбран —</option>
          {orgTerminals.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <NumInput value={entry.fuel_spent} placeholder="л"
          onSave={v => onUpdate(entry, { fuel_spent: v ? Number(v) : null })} />
      </td>
      <td className="px-4 py-2 text-center">
        <button
          onClick={() => onUpdate(entry, { is_overtime: !entry.is_overtime })}
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
                  onUpdate(entry, {
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
                  onUpdate(entry, {
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
                onSave={v => onUpdate(entry, { fuel_price_override: v ? Number(v) : null })} />
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
          <button onClick={() => onDelete(entry.id)}
            className="text-neutral-300 hover:text-red-500 transition-colors cursor-pointer">
            <Icon name="Trash2" size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
