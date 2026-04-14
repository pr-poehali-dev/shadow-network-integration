import { useState } from "react";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import HRReports from "./HRReports";
import SmsPanel from "./SmsPanel";
import HRImportPage from "./HRImportPage";
import { Position, STAFF_POSITIONS } from "./hrTypes";
import { DriverList, ConductorList, StaffList } from "./HRLists";

export default function HRPage() {
  const { user, hasAccess } = useAuth();

  const isDispatcher = user?.role === "dispatcher";
  const canEdit = hasAccess("hr") && !isDispatcher;

  type HRTab = Position | "driver" | "conductor" | "reports";
  type PageSection = "staff" | "reports" | "sms" | "import1c";

  const [section, setSection] = useState<PageSection>("staff");

  const allTabs: { id: HRTab; label: string; icon: string }[] = [
    { id: "driver",           label: "Водители",    icon: "Truck" },
    { id: "conductor",        label: "Кондукторы",  icon: "Users" },
    { id: "locksmith",        label: "Слесари",     icon: "Wrench" },
    { id: "accountant_staff", label: "Бухгалтерия", icon: "Calculator" },
    { id: "cashier_staff",    label: "Кассиры",     icon: "Landmark" },
    { id: "guard",            label: "Сторожа",     icon: "Shield" },
    { id: "mechanic_staff",   label: "Механики",    icon: "Settings2" },
    { id: "cleaning",         label: "Клининг",     icon: "Sparkles" },
    { id: "medical",          label: "Медики",      icon: "Stethoscope" },
    { id: "other",            label: "Прочие",      icon: "UserRound" },
  ];

  const visibleTabs = isDispatcher ? allTabs.filter(t => t.id === "driver") : allTabs;
  const [activeTab, setActiveTab] = useState<HRTab>(visibleTabs[0]?.id ?? "driver");

  return (
    <div className="space-y-5">
      {/* Шапка с переключением секций */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Кадры</h1>
        {!isDispatcher && (
          <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
            <button onClick={() => setSection("staff")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${section === "staff" ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Icon name="Users" size={13} /> Сотрудники
            </button>
            <button onClick={() => setSection("reports")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${section === "reports" ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Icon name="FileText" size={13} /> Кадровые отчёты
            </button>
            <button onClick={() => setSection("sms")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${section === "sms" ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Icon name="MessageSquare" size={13} /> SMS
            </button>
            <button onClick={() => setSection("import1c")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${section === "import1c" ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
              <Icon name="FileUp" size={13} /> Импорт 1С
            </button>
          </div>
        )}
      </div>

      {/* Секция: Отчёты */}
      {section === "reports" && !isDispatcher && (
        <HRReports organization="" />
      )}

      {/* Секция: SMS уведомления */}
      {section === "sms" && !isDispatcher && (
        <div className="border border-neutral-200 rounded-xl p-5">
          <SmsPanel />
        </div>
      )}

      {/* Секция: Импорт из 1С */}
      {section === "import1c" && !isDispatcher && (
        <div className="border border-neutral-200 rounded-xl p-5">
          <HRImportPage />
        </div>
      )}

      {/* Секция: Сотрудники */}
      {section === "staff" && (
        <div className="flex gap-6">
          <nav className="w-44 shrink-0 space-y-0.5">
            {visibleTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left rounded-lg transition-colors cursor-pointer ${
                  activeTab === t.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}>
                <Icon name={t.icon} size={15} />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">
              {visibleTabs.find(t => t.id === activeTab)?.label}
            </h2>
            {activeTab === "driver" && <DriverList canEdit={canEdit} />}
            {activeTab === "conductor" && <ConductorList canEdit={canEdit} />}
            {STAFF_POSITIONS.includes(activeTab as Position) && (
              <StaffList position={activeTab as Position} canEdit={canEdit} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
