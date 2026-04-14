import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Driver, Conductor, StaffMember, POSITION_LABELS } from "./hrReportsTypes";
import {
  printStaffingReport,
  printEmployeeList,
  printPersonalCard,
  printHireOrder,
  printFireOrder,
  printHeadcountReport,
  printDocumentList,
} from "./hrReportsPrint";

interface HRReportsListProps {
  drivers: Driver[];
  conductors: Conductor[];
  staff: StaffMember[];
  organization: string;
}

const REPORTS = [
  { id: "staffing", label: "Штатное расписание", icon: "LayoutList", desc: "Список должностей с количеством сотрудников по каждой" },
  { id: "employee_list", label: "Список сотрудников", icon: "Users", desc: "Унифицированный список всех работников с личными данными" },
  { id: "headcount", label: "Справка о численности", icon: "BarChart2", desc: "Сводная справка с разбивкой по официальным/неофициальным" },
  { id: "document_list", label: "Список для кадрового учёта", icon: "ClipboardList", desc: "Форма со столбцами для медкнижек и примечаний" },
  { id: "personal_card", label: "Личная карточка (Т-2)", icon: "User", desc: "Карточка конкретного сотрудника — выберите человека ниже", needPerson: true },
  { id: "hire_order", label: "Приказ о приёме", icon: "FilePlus", desc: "Приказ о приёме на работу для выбранного сотрудника", needPerson: true },
  { id: "fire_order", label: "Приказ об увольнении", icon: "FileX", desc: "Приказ о прекращении трудового договора", needPerson: true },
];

export default function HRReportsList({ drivers, conductors, staff, organization }: HRReportsListProps) {
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<string>("");

  const allPeople = [
    ...drivers.map(d => ({ id: `driver-${d.id}`, label: `${d.full_name} (Водитель)`, person: d, position: "driver" })),
    ...conductors.map(c => ({ id: `conductor-${c.id}`, label: `${c.full_name} (Кондуктор)`, person: c, position: "conductor" })),
    ...staff.map(s => ({ id: `staff-${s.id}`, label: `${s.full_name} (${POSITION_LABELS[s.position] || s.position})`, person: s, position: s.position })),
  ];

  const activePeople = allPeople.filter(p => {
    const s = p.person as StaffMember;
    if (p.position === "driver" || p.position === "conductor") return true;
    return s.is_active !== false;
  });

  const selectedPersonData = allPeople.find(p => p.id === selectedPerson);

  function runReport(reportId: string) {
    const orgName = organization || "";
    switch (reportId) {
      case "staffing":
        printStaffingReport(staff, drivers, conductors, orgName);
        break;
      case "employee_list":
        printEmployeeList(staff, drivers, conductors, orgName);
        break;
      case "headcount":
        printHeadcountReport(staff, drivers, conductors, orgName);
        break;
      case "document_list":
        printDocumentList(staff, drivers, conductors, orgName);
        break;
      case "personal_card":
        if (selectedPersonData) printPersonalCard(selectedPersonData.person, selectedPersonData.position);
        break;
      case "hire_order":
        if (selectedPersonData) printHireOrder(selectedPersonData.person as StaffMember, selectedPersonData.position, orgName);
        break;
      case "fire_order":
        if (selectedPersonData) printFireOrder(selectedPersonData.person as StaffMember, selectedPersonData.position, orgName);
        break;
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {REPORTS.map(r => {
        const needsPerson = r.needPerson;
        const canRun = !needsPerson || !!selectedPerson;
        return (
          <div key={r.id}
            className={`border rounded-xl px-5 py-4 flex items-center gap-4 transition-all ${
              selectedReport === r.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"
            }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              selectedReport === r.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
            }`}>
              <Icon name={r.icon} size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-900">{r.label}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{r.desc}</div>
              {needsPerson && (
                <div className="mt-2">
                  <select
                    value={selectedPerson}
                    onChange={e => { setSelectedPerson(e.target.value); setSelectedReport(r.id); }}
                    className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white w-full max-w-xs"
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="">— Выберите сотрудника —</option>
                    {activePeople.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button
              onClick={() => { setSelectedReport(r.id); runReport(r.id); }}
              disabled={!canRun}
              className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0"
            >
              <Icon name="Printer" size={15} />
              Сформировать
            </button>
          </div>
        );
      })}
    </div>
  );
}
