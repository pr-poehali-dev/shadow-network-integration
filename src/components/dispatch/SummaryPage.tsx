import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface PersonSummary {
  id: number;
  full_name: string;
  shifts: number;
  dates: string[] | null;
  route_numbers: string[] | null;
}

interface BusSummary {
  id: number;
  board_number: string;
  model: string;
  shifts: number;
  dates: string[] | null;
  route_numbers: string[] | null;
}

interface Summary {
  drivers: PersonSummary[];
  conductors: PersonSummary[];
  buses: BusSummary[];
}

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

function formatDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function printSummary(year: number, month: number, data: Summary) {
  const renderPersonTable = (rows: PersonSummary[], role: string) => `
    <h3>${role}</h3>
    <table>
      <thead><tr><th>ФИО</th><th>Выходов</th><th>Даты и маршруты</th></tr></thead>
      <tbody>
        ${rows.map(p => `
          <tr>
            <td>${p.full_name}</td>
            <td style="text-align:center">${p.shifts}</td>
            <td class="details">${
              p.dates && p.dates[0]
                ? p.dates.map((d, i) => `${formatDate(d)}${p.route_numbers?.[i] ? ` (м.${p.route_numbers[i]})` : ""}`).join(", ")
                : "—"
            }</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const renderBusTable = (rows: BusSummary[]) => `
    <h3>Транспортные средства</h3>
    <table>
      <thead><tr><th>Борт №</th><th>Модель</th><th>Выходов</th><th>Даты и маршруты</th></tr></thead>
      <tbody>
        ${rows.map(b => `
          <tr>
            <td>${b.board_number}</td>
            <td>${b.model || "—"}</td>
            <td style="text-align:center">${b.shifts}</td>
            <td class="details">${
              b.dates && b.dates[0]
                ? b.dates.map((d, i) => `${formatDate(d)}${b.route_numbers?.[i] ? ` (м.${b.route_numbers[i]})` : ""}`).join(", ")
                : "—"
            }</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Сводка ${MONTHS[month - 1]} ${year}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
    h2 { font-size: 15px; margin-bottom: 4px; }
    h3 { font-size: 13px; margin: 20px 0 6px; color: #333; }
    p.sub { color: #777; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #f0f0f0; text-align: left; padding: 6px 10px; font-size: 10px; text-transform: uppercase; border: 1px solid #ddd; }
    td { padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }
    td.details { color: #555; font-size: 11px; }
    tr:nth-child(even) td { background: #fafafa; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h2>Сводка выходов — ${MONTHS[month - 1]} ${year}</h2>
  <p class="sub">RoutePayroll — сформировано ${new Date().toLocaleString("ru")}</p>
  ${renderPersonTable(data.drivers, "Водители")}
  ${renderPersonTable(data.conductors, "Кондукторы")}
  ${renderBusTable(data.buses)}
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export default function SummaryPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"drivers" | "conductors" | "buses">("drivers");

  const load = async () => {
    setLoading(true);
    const res = await api.getSummary(year, month);
    setData(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, [year, month]);

  const personRows: PersonSummary[] = data
    ? (activeTab === "drivers" ? data.drivers : activeTab === "conductors" ? data.conductors : [])
    : [];
  const busRows: BusSummary[] = data && activeTab === "buses" ? data.buses : [];
  const totalShifts = activeTab === "buses"
    ? busRows.reduce((s, r) => s + Number(r.shifts), 0)
    : personRows.reduce((s, r) => s + Number(r.shifts), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">Сводка по сменам</h2>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="border border-neutral-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-neutral-600"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-neutral-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-neutral-600"
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {data && (
          <button
            onClick={() => printSummary(year, month, data)}
            className="ml-auto flex items-center gap-2 border border-neutral-300 px-4 py-2 text-sm rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-700"
          >
            <Icon name="Printer" size={15} />
            Распечатать
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b border-neutral-200">
        {([
          { id: "drivers", label: "Водители" },
          { id: "conductors", label: "Кондукторы" },
          { id: "buses", label: "ТС" },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? "border-neutral-900 text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>
      ) : activeTab === "buses" ? (
        busRows.length === 0 ? (
          <div className="text-neutral-400 text-sm py-8 text-center">Нет данных за выбранный период</div>
        ) : (
          <>
            <div className="border border-neutral-200 rounded overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 text-neutral-600 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Борт №</th>
                    <th className="px-4 py-3 text-left">Модель</th>
                    <th className="px-4 py-3 text-center w-20">Выходов</th>
                    <th className="px-4 py-3 text-left">Даты и маршруты</th>
                  </tr>
                </thead>
                <tbody>
                  {busRows.map(bus => (
                    <tr key={bus.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-neutral-900 whitespace-nowrap">№ {bus.board_number}</td>
                      <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">{bus.model || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          bus.shifts > 0 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                        }`}>
                          {bus.shifts}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs">
                        {bus.dates && bus.dates[0]
                          ? bus.dates.map((d, i) => (
                              <span key={i} className="inline-block mr-2 whitespace-nowrap">
                                {formatDate(d)}
                                {bus.route_numbers?.[i] && (
                                  <span className="ml-0.5 text-neutral-400">(м.{bus.route_numbers[i]})</span>
                                )}
                              </span>
                            ))
                          : <span className="text-neutral-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-sm text-neutral-500 text-right">
              Итого выходов: <span className="font-semibold text-neutral-900">{totalShifts}</span>
            </div>
          </>
        )
      ) : personRows.length === 0 ? (
        <div className="text-neutral-400 text-sm py-8 text-center">Нет данных за выбранный период</div>
      ) : (
        <>
          <div className="border border-neutral-200 rounded overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-neutral-600 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">ФИО</th>
                  <th className="px-4 py-3 text-center w-20">Выходов</th>
                  <th className="px-4 py-3 text-left">Даты и маршруты</th>
                </tr>
              </thead>
              <tbody>
                {personRows.map(person => (
                  <tr key={person.id} className="border-t border-neutral-100 hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-900 whitespace-nowrap">{person.full_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        person.shifts > 0 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400"
                      }`}>
                        {person.shifts}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {person.dates && person.dates[0]
                        ? person.dates.map((d, i) => (
                            <span key={i} className="inline-block mr-2 whitespace-nowrap">
                              {formatDate(d)}
                              {person.route_numbers?.[i] && (
                                <span className="ml-0.5 text-neutral-400">(м.{person.route_numbers[i]})</span>
                              )}
                            </span>
                          ))
                        : <span className="text-neutral-300">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-sm text-neutral-500 text-right">
            Итого выходов: <span className="font-semibold text-neutral-900">{totalShifts}</span>
          </div>
        </>
      )}
    </div>
  );
}