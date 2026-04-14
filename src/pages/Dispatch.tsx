import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import { useAuth, AuthProvider, ROLE_LABELS, Role, TabId } from "@/lib/auth";
import CatalogPage from "@/components/dispatch/CatalogPage";
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
import RepairPage from "@/components/dispatch/RepairPage";
import HRPage from "@/components/dispatch/HRPage";
import AccountingPage from "@/components/dispatch/AccountingPage";
import BDDPage from "@/components/dispatch/BDDPage";
import Icon from "@/components/ui/icon";

const allTabs: { id: TabId; label: string; icon: string; group?: string }[] = [
  { id: "schedule",         label: "Наряд",                icon: "CalendarDays" },
  { id: "summary",          label: "Сводка смен",          icon: "BarChart2" },
  { id: "busdocs",          label: "Документы ТС",         icon: "FileText" },
  { id: "routes",           label: "Маршруты",             icon: "Map" },
  { id: "buses",            label: "Автобусы",             icon: "Bus" },
  { id: "terminals",        label: "Терминалы",            icon: "MonitorSmartphone" },
  { id: "salary",           label: "Зарплата",             icon: "Banknote" },
  { id: "journal_medical",  label: "Журнал медика",        icon: "Stethoscope",   group: "Журналы" },
  { id: "journal_release",  label: "Журнал выпуска ТС",   icon: "ClipboardList", group: "Журналы" },
  { id: "cash",             label: "Наличные",             icon: "Wallet",        group: "Финансы" },
  { id: "cashier",          label: "Касса",                icon: "Landmark",      group: "Финансы" },
  { id: "hr",               label: "Кадры",                icon: "UsersRound" },
  { id: "repair",           label: "Служба ремонта",       icon: "Wrench" },
  { id: "bdd",              label: "БДД",                  icon: "ShieldAlert" },
  { id: "accounting",       label: "Бухгалтерия",          icon: "Calculator" },
  { id: "company_card",     label: "Карточка предприятия", icon: "Building2",     group: "Администрирование" },
  { id: "users",            label: "Пользователи",         icon: "Shield",        group: "Администрирование" },
  { id: "settings",         label: "Настройки",            icon: "Settings",      group: "Администрирование" },
];

// Разделы, которые не нужно держать alive (редко посещаемые / admin-only)
const NO_KEEP_ALIVE = new Set<TabId>(["users", "company_card", "settings"]);

function DispatchApp() {
  const { user, loading, logout, hasAccess } = useAuth();
  const [tab, setTab] = useState<TabId>("schedule");
  // Множество вкладок, которые уже были открыты хотя бы раз
  const mounted = useRef<Set<TabId>>(new Set());

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500 text-sm">Загрузка...</div>;
  }

  if (!user) return <LoginPage />;

  const visibleTabs = allTabs.filter(t => hasAccess(t.id));
  const currentTab = visibleTabs.find(t => t.id === tab) ? tab : visibleTabs[0]?.id ?? "schedule";

  // Помечаем текущую вкладку как смонтированную
  mounted.current.add(currentTab);

  // Показывать раздел если он текущий; рендерить если уже был открыт и не в NO_KEEP_ALIVE
  const shouldRender = (id: TabId) =>
    id === currentTab || (mounted.current.has(id) && !NO_KEEP_ALIVE.has(id));

  const busesFetchFn = () => catalogCache.getBuses() as Promise<{ id: number; [key: string]: unknown }[]>;
  const terminalsFetchFn = () => catalogCache.getTerminals() as Promise<{ id: number; [key: string]: unknown }[]>;

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

        <main className="flex-1 overflow-y-auto">
          <div className={`p-8 h-full ${currentTab === "schedule" ? "" : "hidden"}`}>
            {shouldRender("schedule") && <SchedulePage onAccidentCreated={() => setTab("bdd")} />}
          </div>
          <div className={`p-8 h-full ${currentTab === "summary" ? "" : "hidden"}`}>
            {shouldRender("summary") && <SummaryPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "busdocs" ? "" : "hidden"}`}>
            {shouldRender("busdocs") && <BusDocsPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "routes" ? "" : "hidden"}`}>
            {shouldRender("routes") && <RoutesPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "buses" ? "" : "hidden"}`}>
            {shouldRender("buses") && (
              <CatalogPage
                title="Автобусы"
                fields={[
                  { key: "board_number", label: "Бортовой №", placeholder: "Бортовой номер" },
                  { key: "gov_number", label: "Гос. номер", placeholder: "А123БВ 27" },
                  { key: "model", label: "Модель", placeholder: "Модель" },
                  { key: "vin", label: "VIN", placeholder: "17 символов" },
                  { key: "rosavtodor_number", label: "Реестр Росавтодора", placeholder: "Реестровый номер" },
                ]}
                fetchFn={busesFetchFn}
                createFn={data => api.createBus(data as { board_number: string; model: string })}
                updateFn={(id, data) => { catalogCache.invalidateBuses(); return api.updateBus(id, data as { board_number: string; model: string }); }}
                deleteFn={id => { catalogCache.invalidateBuses(); return api.deleteBus(id); }}
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
          </div>
          <div className={`p-8 h-full ${currentTab === "terminals" ? "" : "hidden"}`}>
            {shouldRender("terminals") && (
              <CatalogPage
                title="Терминалы"
                fields={[
                  { key: "number", label: "Номер", placeholder: "1" },
                  { key: "name", label: "Название", placeholder: "Терминал №1" },
                  { key: "organization", label: "Организация", placeholder: 'ООО "Дальавтотранс"' },
                ]}
                fetchFn={terminalsFetchFn}
                createFn={data => api.createTerminal(data as { number: string; name: string; organization: string })}
                updateFn={(id, data) => { catalogCache.invalidateTerminals(); return api.updateTerminal(id, data as { number: string; name: string; organization: string }); }}
                deleteFn={id => { catalogCache.invalidateTerminals(); return api.deleteTerminal(id); }}
                renderRow={item => (
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-neutral-900">{String(item.name)}</span>
                    {item.organization && <span className="text-neutral-400 text-xs">{String(item.organization)}</span>}
                  </div>
                )}
              />
            )}
          </div>
          <div className={`p-8 h-full ${currentTab === "salary" ? "" : "hidden"}`}>
            {shouldRender("salary") && <SalaryPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "journal_medical" ? "" : "hidden"}`}>
            {shouldRender("journal_medical") && <MedicalJournalPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "journal_release" ? "" : "hidden"}`}>
            {shouldRender("journal_release") && <VehicleReleasePage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "cash" ? "" : "hidden"}`}>
            {shouldRender("cash") && <CashPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "cashier" ? "" : "hidden"}`}>
            {shouldRender("cashier") && <CashierPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "hr" ? "" : "hidden"}`}>
            {shouldRender("hr") && <HRPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "repair" ? "" : "hidden"}`}>
            {shouldRender("repair") && <RepairPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "bdd" ? "" : "hidden"}`}>
            {shouldRender("bdd") && <BDDPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "accounting" ? "" : "hidden"}`}>
            {shouldRender("accounting") && <AccountingPage showCashRestrictions />}
          </div>
          <div className={`p-8 h-full ${currentTab === "company_card" ? "" : "hidden"}`}>
            {currentTab === "company_card" && <CompanyCardPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "users" ? "" : "hidden"}`}>
            {currentTab === "users" && <UsersPage />}
          </div>
          <div className={`p-8 h-full ${currentTab === "settings" ? "" : "hidden"}`}>
            {currentTab === "settings" && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DispatchApp />
    </AuthProvider>
  );
}
