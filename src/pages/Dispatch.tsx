import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth, AuthProvider, ROLE_LABELS, Role, TabId } from "@/lib/auth";
import CatalogPage from "@/components/dispatch/CatalogPage";
import DriversPage from "@/components/dispatch/DriversPage";
import SchedulePage from "@/components/dispatch/SchedulePage";
import SummaryPage from "@/components/dispatch/SummaryPage";
import BusDocsPage from "@/components/dispatch/BusDocsPage";
import RoutesPage from "@/components/dispatch/RoutesPage";
import SettingsPage from "@/components/dispatch/SettingsPage";
import UsersPage from "@/components/dispatch/UsersPage";
import SalaryPage from "@/components/dispatch/SalaryPage";
import LoginPage from "@/components/dispatch/LoginPage";
import MedicalJournalPage from "@/components/dispatch/MedicalJournalPage";
import VehicleReleasePage from "@/components/dispatch/VehicleReleasePage";
import CompanyCardPage from "@/components/dispatch/CompanyCardPage";
import CashPage from "@/components/dispatch/CashPage";
import CashierPage from "@/components/dispatch/CashierPage";
import Icon from "@/components/ui/icon";

const allTabs: { id: TabId; label: string; icon: string; group?: string }[] = [
  { id: "schedule",        label: "Расписание",        icon: "CalendarDays" },
  { id: "summary",         label: "Сводка смен",       icon: "BarChart2" },
  { id: "busdocs",         label: "Документы ТС",      icon: "FileText" },
  { id: "routes",          label: "Маршруты",          icon: "Map" },
  { id: "buses",           label: "Автобусы",          icon: "Bus" },
  { id: "drivers",         label: "Водители",          icon: "User" },
  { id: "conductors",      label: "Кондукторы",        icon: "Users" },
  { id: "terminals",       label: "Терминалы",         icon: "MonitorSmartphone" },
  { id: "salary",          label: "Зарплата",          icon: "Banknote" },
  { id: "mechanics",       label: "Механики",          icon: "Wrench" },
  { id: "journal_medical", label: "Журнал медика",        icon: "Stethoscope",  group: "Журналы" },
  { id: "journal_release", label: "Журнал выпуска ТС",   icon: "ClipboardList", group: "Журналы" },
  { id: "cash",            label: "Наличные",             icon: "Wallet" },
  { id: "cashier",         label: "Касса",                icon: "Landmark" },
  { id: "company_card",    label: "Карточка предприятия", icon: "Building2",     group: "Администрирование" },
  { id: "users",           label: "Пользователи",         icon: "Shield",        group: "Администрирование" },
  { id: "settings",        label: "Настройки",            icon: "Settings",      group: "Администрирование" },
];

function DispatchApp() {
  const { user, loading, logout, hasAccess } = useAuth();
  const [tab, setTab] = useState<TabId>("schedule");

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500 text-sm">Загрузка...</div>;
  }

  if (!user) return <LoginPage />;

  const visibleTabs = allTabs.filter(t => hasAccess(t.id));
  const currentTab = visibleTabs.find(t => t.id === tab) ? tab : visibleTabs[0]?.id ?? "schedule";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-neutral-200 px-6 py-3 flex items-center gap-3">
        <Icon name="Bus" size={20} className="text-neutral-700" />
        <span className="font-bold text-neutral-900 uppercase tracking-wide text-sm">RoutePayroll</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-neutral-500">
            {user.full_name}
            <span className="ml-1.5 px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-600">{ROLE_LABELS[user.role as Role]}</span>
          </span>
          <button onClick={logout}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer flex items-center gap-1">
            <Icon name="LogOut" size={13} />
            Выйти
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 border-r border-neutral-200 flex flex-col py-4 gap-1 shrink-0 overflow-y-auto">
          {(() => {
            let lastGroup: string | undefined = undefined;
            return visibleTabs.map(t => {
              const showHeader = t.group && t.group !== lastGroup;
              lastGroup = t.group;
              return (
                <div key={t.id}>
                  {showHeader && (
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      {t.group}
                    </div>
                  )}
                  <button
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors cursor-pointer ${
                      currentTab === t.id
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <Icon name={t.icon} size={16} />
                    {t.label}
                  </button>
                </div>
              );
            });
          })()}
        </nav>

        <main className="flex-1 p-8 overflow-y-auto">
          {currentTab === "schedule" && <SchedulePage />}
          {currentTab === "summary" && <SummaryPage />}
          {currentTab === "busdocs" && <BusDocsPage />}
          {currentTab === "routes" && <RoutesPage />}

          {currentTab === "buses" && (
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

          {currentTab === "drivers" && <DriversPage />}

          {currentTab === "conductors" && (
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

          {currentTab === "terminals" && (
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

          {currentTab === "salary" && <SalaryPage />}

          {currentTab === "mechanics" && (
            <CatalogPage
              title="Механики по выпуску"
              fields={[
                { key: "full_name", label: "ФИО", placeholder: "Фамилия Имя Отчество" },
                { key: "organization", label: "Организация", placeholder: "Название организации" },
              ]}
              fetchFn={api.getMechanics}
              createFn={data => api.createMechanic(data as { full_name: string; organization?: string })}
              updateFn={(id, data) => api.updateMechanic(id, data)}
              deleteFn={api.deleteMechanic}
              renderRow={item => (
                <div className="flex items-center gap-3">
                  <span className="font-medium text-neutral-900">{String(item.full_name)}</span>
                  {item.organization && <span className="text-neutral-400 text-xs">{String(item.organization)}</span>}
                </div>
              )}
            />
          )}

          {currentTab === "journal_medical" && <MedicalJournalPage />}
          {currentTab === "journal_release" && <VehicleReleasePage />}
          {currentTab === "cash" && <CashPage />}
          {currentTab === "cashier" && <CashierPage />}
          {currentTab === "company_card" && <CompanyCardPage />}
          {currentTab === "users" && <UsersPage />}
          {currentTab === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function Dispatch() {
  return (
    <AuthProvider>
      <DispatchApp />
    </AuthProvider>
  );
}