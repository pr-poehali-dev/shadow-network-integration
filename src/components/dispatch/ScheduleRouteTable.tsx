import { Entry, Bus, Conductor, Terminal } from "./scheduleTypes";
import ScheduleEntryRow from "./ScheduleEntryRow";

interface Props {
  routeNumber: string;
  routeName: string;
  maxGraphs: number;
  minVehicles?: number | null;
  requiredTrips?: number | null;
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
  onAccident?: (entry: Entry) => void;
  calcEntryTotal: (e: Entry) => number;
  calcEntryTickets: (e: Entry) => number;
}

export default function ScheduleRouteTable({
  routeNumber, routeName, maxGraphs, minVehicles, requiredTrips, items, date,
  buses, drivers, conductors, orgTerminals,
  ticketPrice, expandedId, setExpandedId,
  onUpdate, onSelectUpdate, onDelete, onAccident,
  calcEntryTotal, calcEntryTickets,
}: Props) {
  const activeVehicles = items.filter(e => !e.absence_reason).length;
  const belowMin = minVehicles != null && activeVehicles < minVehicles;

  return (
    <div className={`border rounded overflow-hidden ${belowMin ? "border-orange-400" : "border-neutral-200"}`}>
      <div className={`px-4 py-2 flex items-center gap-2 flex-wrap ${belowMin ? "bg-orange-50" : "bg-neutral-100"}`}>
        <span className="font-bold text-sm text-neutral-800 bg-white px-2 py-0.5 rounded border border-neutral-200">
          № {routeNumber}
        </span>
        {routeName && <span className="text-neutral-500 text-xs">{routeName}</span>}
        <span className="text-neutral-400 text-xs">{items.length} из {maxGraphs} гр.</span>
        {minVehicles != null && (
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${belowMin ? "bg-orange-100 text-orange-700" : "bg-white text-neutral-600 border border-neutral-200"}`}>
            {belowMin && "⚠ "}ТС на линии: {activeVehicles} / {minVehicles} мин.
          </span>
        )}
        {requiredTrips != null && (
          <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
            {requiredTrips} рейсов/день
          </span>
        )}
        {belowMin && (
          <span className="text-xs text-orange-700 font-semibold ml-auto">
            Не хватает {minVehicles! - activeVehicles} ТС
          </span>
        )}
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
            <th className="px-4 py-2 text-center w-20">Подработка</th>
            <th className="px-4 py-2 text-left w-36">Неявка</th>
            <th className="px-4 py-2 text-right w-28">Безнал, ₽</th>
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
              onAccident={onAccident}
            />
          ))}
          {items.length > 1 && (() => {
            const rCashless = items.reduce((s, e) => s + Number(e.revenue_cashless ?? 0), 0);
            const rFuel = items.reduce((s, e) => s + Number(e.fuel_spent ?? 0), 0);
            const absences = items.filter(e => e.absence_reason).length;
            return (
              <tr className="bg-neutral-100 border-t border-neutral-200 font-semibold text-xs text-neutral-700">
                <td className="px-4 py-2" colSpan={10}>
                  <span className="inline-flex flex-wrap items-center gap-3">
                    <span>Итого м. {routeNumber}:</span>
                    {rCashless > 0 && <span>безнал. {Math.round(rCashless)} ₽</span>}
                    {rFuel > 0 && <span className="font-normal text-neutral-500">{rFuel.toFixed(1)} л</span>}
                    {absences > 0 && <span className="text-red-600">неявок: {absences}</span>}
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
