import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { Driver, Conductor, StaffMember } from "./hrReportsTypes";
import HRReportsList from "./HRReportsList";

interface HRReportsProps {
  organization: string;
}

export default function HRReports({ organization }: HRReportsProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDrivers(),
      api.getConductors(),
      api.getStaff(organization ? { show_inactive: "1", organization } : { show_inactive: "1" }),
    ]).then(([d, c, s]) => {
      setDrivers(Array.isArray(d) ? d : []);
      setConductors(Array.isArray(c) ? c : []);
      setStaff(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, [organization]);

  if (loading) return <div className="text-sm text-neutral-400 text-center py-10">Загрузка данных...</div>;

  const total = drivers.length + conductors.length + staff.filter(s => s.is_active).length;
  const official = drivers.filter(d => d.is_official).length + staff.filter(s => s.is_active && s.is_official).length + conductors.length;

  return (
    <div className="space-y-6">
      {/* Сводка */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-1">Всего сотрудников</div>
          <div className="text-3xl font-bold text-neutral-900">{total}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Официальных</div>
          <div className="text-3xl font-bold text-blue-700">{official}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">Неофициальных</div>
          <div className="text-3xl font-bold text-amber-700">{total - official}</div>
        </div>
      </div>

      <div className="text-sm font-semibold text-neutral-700">Кадровые документы и отчёты</div>

      {/* Список отчётов */}
      <HRReportsList
        drivers={drivers}
        conductors={conductors}
        staff={staff}
        organization={organization}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <Icon name="Info" size={14} className="shrink-0 mt-0.5" />
        <div>
          Все отчёты формируются автоматически из данных, внесённых в разделе «Кадры».
          Для корректного заполнения форм убедитесь, что у сотрудников заполнены: ФИО, дата рождения, паспортные данные, СНИЛС, ИНН, дата приёма.
        </div>
      </div>
    </div>
  );
}
