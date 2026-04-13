import { useState } from "react";
import { api } from "@/lib/api";
import CatalogPage from "@/components/dispatch/CatalogPage";
import SchedulePage from "@/components/dispatch/SchedulePage";
import SummaryPage from "@/components/dispatch/SummaryPage";
import BusDocsPage from "@/components/dispatch/BusDocsPage";
import RoutesPage from "@/components/dispatch/RoutesPage";
import Icon from "@/components/ui/icon";

type Tab = "schedule" | "summary" | "busdocs" | "routes" | "buses" | "drivers" | "conductors";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "schedule", label: "Расписание", icon: "CalendarDays" },
  { id: "summary", label: "Сводка смен", icon: "BarChart2" },
  { id: "busdocs", label: "Документы ТС", icon: "FileText" },
  { id: "routes", label: "Маршруты", icon: "Map" },
  { id: "buses", label: "Автобусы", icon: "Bus" },
  { id: "drivers", label: "Водители", icon: "User" },
  { id: "conductors", label: "Кондукторы", icon: "Users" },
];

export default function Dispatch() {
  const [tab, setTab] = useState<Tab>("schedule");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-neutral-200 px-6 py-4 flex items-center gap-3">
        <Icon name="Bus" size={20} className="text-neutral-700" />
        <span className="font-bold text-neutral-900 uppercase tracking-wide text-sm">RoutePayroll — Диспетчер</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 border-r border-neutral-200 flex flex-col py-4 gap-1 shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors cursor-pointer ${
                tab === t.id
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-8 overflow-y-auto">
          {tab === "schedule" && <SchedulePage />}
          {tab === "summary" && <SummaryPage />}
          {tab === "busdocs" && <BusDocsPage />}

          {tab === "routes" && <RoutesPage />}

          {tab === "buses" && (
            <CatalogPage
              title="Автобусы"
              fields={[
                { key: "board_number", label: "Бортовой №", placeholder: "Бортовой номер" },
                { key: "model", label: "Модель", placeholder: "Модель (необязательно)" },
              ]}
              fetchFn={api.getBuses}
              createFn={data => api.createBus(data as { board_number: string; model: string })}
              updateFn={(id, data) => api.updateBus(id, data as { board_number: string; model: string })}
              deleteFn={api.deleteBus}
              renderRow={item => (
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900">№ {String(item.board_number)}</span>
                  <span className="text-neutral-500 text-xs">{String(item.model || "")}</span>
                </div>
              )}
            />
          )}

          {tab === "drivers" && (
            <CatalogPage
              title="Водители"
              fields={[{ key: "full_name", label: "ФИО", placeholder: "Фамилия Имя Отчество" }]}
              fetchFn={api.getDrivers}
              createFn={data => api.createDriver(data as { full_name: string })}
              updateFn={(id, data) => api.updateDriver(id, data as { full_name: string })}
              deleteFn={api.deleteDriver}
              renderRow={item => <span className="text-neutral-900">{String(item.full_name)}</span>}
            />
          )}

          {tab === "conductors" && (
            <CatalogPage
              title="Кондукторы"
              fields={[{ key: "full_name", label: "ФИО", placeholder: "Фамилия Имя Отчество" }]}
              fetchFn={api.getConductors}
              createFn={data => api.createConductor(data as { full_name: string })}
              updateFn={(id, data) => api.updateConductor(id, data as { full_name: string })}
              deleteFn={api.deleteConductor}
              renderRow={item => <span className="text-neutral-900">{String(item.full_name)}</span>}
            />
          )}
        </main>
      </div>
    </div>
  );
}