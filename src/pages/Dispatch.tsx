import { useState } from "react";
import { api } from "@/lib/api";
import CatalogPage from "@/components/dispatch/CatalogPage";
import SchedulePage from "@/components/dispatch/SchedulePage";
import SummaryPage from "@/components/dispatch/SummaryPage";
import BusDocsPage from "@/components/dispatch/BusDocsPage";
import RoutesPage from "@/components/dispatch/RoutesPage";
import SettingsPage from "@/components/dispatch/SettingsPage";
import Icon from "@/components/ui/icon";

type Tab = "schedule" | "summary" | "busdocs" | "routes" | "buses" | "drivers" | "conductors" | "terminals" | "settings";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "schedule", label: "Расписание", icon: "CalendarDays" },
  { id: "summary", label: "Сводка смен", icon: "BarChart2" },
  { id: "busdocs", label: "Документы ТС", icon: "FileText" },
  { id: "routes", label: "Маршруты", icon: "Map" },
  { id: "buses", label: "Автобусы", icon: "Bus" },
  { id: "drivers", label: "Водители", icon: "User" },
  { id: "conductors", label: "Кондукторы", icon: "Users" },
  { id: "terminals", label: "Терминалы", icon: "MonitorSmartphone" },
  { id: "settings", label: "Настройки", icon: "Settings" },
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
                { key: "gov_number", label: "Гос. номер", placeholder: "А123БВ 27" },
                { key: "model", label: "Модель", placeholder: "Модель" },
                { key: "vin", label: "VIN", placeholder: "17 символов" },
                { key: "rosavtodor_number", label: "Реестр Росавтодора", placeholder: "Реестровый номер" },
              ]}
              fetchFn={api.getBuses}
              createFn={data => api.createBus(data as { board_number: string; model: string })}
              updateFn={(id, data) => api.updateBus(id, data as { board_number: string; model: string })}
              deleteFn={api.deleteBus}
              renderRow={item => (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-neutral-900">Борт № {String(item.board_number)}</span>
                  {item.gov_number && <span className="text-neutral-700 text-xs border border-neutral-300 px-1.5 py-0.5 rounded">{String(item.gov_number)}</span>}
                  {item.model && <span className="text-neutral-500 text-xs">{String(item.model)}</span>}
                  {item.vin && <span className="text-neutral-400 text-xs font-mono">VIN: {String(item.vin)}</span>}
                  {item.rosavtodor_number && <span className="text-neutral-400 text-xs">Реестр: {String(item.rosavtodor_number)}</span>}
                </div>
              )}
            />
          )}

          {tab === "drivers" && (
            <CatalogPage
              title="Водители"
              fields={[
                { key: "full_name", label: "ФИО", placeholder: "Фамилия Имя Отчество" },
                { key: "phone", label: "Телефон", placeholder: "Номер телефона" },
                { key: "birth_date", label: "Дата рождения", placeholder: "ГГГГ-ММ-ДД" },
                { key: "snils", label: "СНИЛС", placeholder: "000-000-000 00" },
                { key: "inn", label: "ИНН", placeholder: "ИНН" },
                { key: "license_number", label: "Вод. удостоверение №", placeholder: "Серия и номер" },
                { key: "license_date", label: "Дата выдачи ВУ", placeholder: "ГГГГ-ММ-ДД" },
              ]}
              fetchFn={api.getDrivers}
              createFn={data => api.createDriver(data as { full_name: string })}
              updateFn={(id, data) => api.updateDriver(id, data as { full_name: string })}
              deleteFn={api.deleteDriver}
              renderRow={item => (
                <div className="flex items-center gap-3">
                  <span className="text-neutral-900 font-medium">{String(item.full_name)}</span>
                  {item.phone && <span className="text-neutral-500 text-xs">{String(item.phone)}</span>}
                </div>
              )}
            />
          )}

          {tab === "conductors" && (
            <CatalogPage
              title="Кондукторы"
              fields={[
                { key: "full_name", label: "ФИО", placeholder: "Фамилия Имя Отчество" },
                { key: "phone", label: "Телефон", placeholder: "Номер телефона" },
                { key: "birth_date", label: "Дата рождения", placeholder: "ГГГГ-ММ-ДД" },
                { key: "snils", label: "СНИЛС", placeholder: "000-000-000 00" },
                { key: "inn", label: "ИНН", placeholder: "ИНН" },
              ]}
              fetchFn={api.getConductors}
              createFn={data => api.createConductor(data as { full_name: string })}
              updateFn={(id, data) => api.updateConductor(id, data as { full_name: string })}
              deleteFn={api.deleteConductor}
              renderRow={item => (
                <div className="flex items-center gap-3">
                  <span className="text-neutral-900 font-medium">{String(item.full_name)}</span>
                  {item.phone && <span className="text-neutral-500 text-xs">{String(item.phone)}</span>}
                </div>
              )}
            />
          )}

          {tab === "terminals" && (
            <CatalogPage
              title="Терминалы"
              fields={[
                { key: "number", label: "Номер", placeholder: "1" },
                { key: "name", label: "Название", placeholder: "Терминал №1" },
                { key: "organization", label: "Организация", placeholder: 'ООО "Дальавтотранс"' },
              ]}
              fetchFn={api.getTerminals}
              createFn={data => api.createTerminal(data as { number: string; name: string; organization: string })}
              updateFn={(id, data) => api.updateTerminal(id, data as { number: string; name: string; organization: string })}
              deleteFn={api.deleteTerminal}
              renderRow={item => (
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900">{String(item.name)}</span>
                  {item.organization && <span className="text-neutral-400 text-xs">{String(item.organization)}</span>}
                </div>
              )}
            />
          )}

          {tab === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}