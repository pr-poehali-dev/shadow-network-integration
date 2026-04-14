import Icon from "@/components/ui/icon";
import { Entry, Bus, Conductor, Terminal } from "./scheduleTypes";
import ScheduleEntryRow from "./ScheduleEntryRow";

interface Props {
  routeNumber: string;
  routeName: string;
  maxGraphs: number;
  items: Entry[];
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
  calcEntryTotal: (e: Entry) => number;
  calcEntryTickets: (e: Entry) => number;
}

export default function ScheduleRouteTable({
  routeNumber, routeName, maxGraphs, items, date,
  buses, drivers, conductors, orgTerminals,
  ticketPrice, expandedId, setExpandedId,
  onUpdate, onSelectUpdate, onDelete,
  calcEntryTotal, calcEntryTickets,
}: Props) {
  return (
    <div className="border border-neutral-200 rounded overflow-hidden">
      <div className="bg-neutral-100 px-4 py-2 flex items-center gap-2">
        <span className="font-bold text-sm text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">
          № {routeNumber}
        </span>
        {routeName && <span className="text-neutral-500 text-xs">{routeName}</span>}
        <span className="text-neutral-400 text-xs ml-1">{items.length} из {maxGraphs} гр.</span>
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
          {items.map(entry => (
            <ScheduleEntryRow
              key={entry.id}
              entry={entry}
              date={date}
              buses={buses}
              drivers={drivers}
              conductors={conductors}
              orgTerminals={orgTerminals}
              ticketPrice={ticketPrice}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              onUpdate={onUpdate}
              onSelectUpdate={onSelectUpdate}
              onDelete={onDelete}
            />
          ))}
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
                    <span>Итого м. {routeNumber}:</span>
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
}
