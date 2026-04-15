import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { AccTab, TaxPayment, UpcomingPayment, fmt, fmtDate, daysUntil } from "./accountingTypes";
import BankTab from "./AccountingBankTab";
import { TaxesTab, CreditorsTab, UpcomingTab, LeasingTab, CashRestrictionsTab } from "./AccountingFinanceTabs";

// ---- Обзор (дашборд) ----
function OverviewTab() {
  const [taxData, setTaxData] = useState<{ upcoming: TaxPayment[]; totals: { total_accrued: number; total_paid: number; total_debt: number } } | null>(null);
  const [upcomingData, setUpcomingData] = useState<{ items: UpcomingPayment[]; overdue: UpcomingPayment[]; total_planned: number } | null>(null);
  const [credData, setCredData] = useState<{ totals: { total_debt: number; total_overdue: number } } | null>(null);
  const [leasingData, setLeasingData] = useState<{ totals: { total_remaining: number; total_monthly: number } } | null>(null);

  useEffect(() => {
    api.getTaxPayments({}).then(r => setTaxData(r));
    api.getUpcomingPayments({ days_ahead: "14" }).then(r => setUpcomingData(r));
    api.getCreditors({}).then(r => setCredData(r));
    api.getLeasingContracts({}).then(r => setLeasingData(r));
  }, []);

  const urgentTaxes = taxData?.upcoming?.filter(t => {
    const d = daysUntil(t.due_date);
    return d != null && d <= 7;
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Алерты */}
      {(urgentTaxes.length > 0 || (upcomingData?.overdue?.length ?? 0) > 0) && (
        <div className="space-y-2">
          {urgentTaxes.map(t => (
            <div key={t.id} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <Icon name="AlertTriangle" size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold text-red-800">{t.tax_type}</span>
                <span className="text-red-600"> — срок {fmtDate(t.due_date)}, к оплате {fmt(t.accrued_amount - t.paid_amount)} ₽</span>
              </div>
            </div>
          ))}
          {upcomingData?.overdue?.map(p => (
            <div key={p.id} className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <Icon name="Clock" size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold text-orange-800">Просрочен: {p.description}</span>
                <span className="text-orange-600"> — {fmt(p.planned_amount - p.paid_amount)} ₽ (срок был {fmtDate(p.due_date)})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Сводные карточки */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Icon name="Receipt" size={16} /> Налоги и ЕНС
          </div>
          {taxData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Начислено</span><span className="font-medium">{fmt(taxData.totals.total_accrued)} ₽</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Оплачено</span><span className="font-medium text-green-600">{fmt(taxData.totals.total_paid)} ₽</span></div>
              <div className="flex justify-between text-sm border-t border-neutral-100 pt-1.5"><span className="text-neutral-500">Остаток к оплате</span><span className="font-bold text-red-600">{fmt(taxData.totals.total_debt)} ₽</span></div>
            </div>
          ) : <div className="text-xs text-neutral-400">Загрузка...</div>}
        </div>

        <div className="border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Icon name="AlertCircle" size={16} /> Кредиторская задолженность
          </div>
          {credData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Общий долг</span><span className="font-bold text-neutral-900">{fmt(credData.totals.total_debt)} ₽</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Просрочено</span><span className={`font-bold ${Number(credData.totals.total_overdue) > 0 ? "text-red-600" : "text-neutral-400"}`}>{fmt(credData.totals.total_overdue)} ₽</span></div>
            </div>
          ) : <div className="text-xs text-neutral-400">Загрузка...</div>}
        </div>

        <div className="border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Icon name="CalendarClock" size={16} /> Предстоящие платежи (14 дней)
          </div>
          {upcomingData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Запланировано</span><span className="font-bold text-blue-700">{fmt(upcomingData.total_planned)} ₽</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Позиций</span><span className="font-medium">{upcomingData.items.length} шт.</span></div>
            </div>
          ) : <div className="text-xs text-neutral-400">Загрузка...</div>}
        </div>

        <div className="border border-neutral-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
            <Icon name="Car" size={16} /> Лизинг
          </div>
          {leasingData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Остаток долга</span><span className="font-bold text-neutral-900">{fmt(leasingData.totals.total_remaining)} ₽</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-500">Ежемесячный платёж</span><span className="font-medium text-purple-600">{fmt(leasingData.totals.total_monthly)} ₽</span></div>
            </div>
          ) : <div className="text-xs text-neutral-400">Загрузка...</div>}
        </div>
      </div>

      {/* Ближайшие платежи */}
      {(upcomingData?.items?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">Ближайшие платежи</h3>
          <div className="space-y-1.5">
            {upcomingData!.items.slice(0, 8).map(p => {
              const days = daysUntil(p.due_date);
              return (
                <div key={p.id} className="flex items-center gap-3 border border-neutral-200 rounded-lg px-4 py-2.5">
                  <div className={`text-xs font-medium px-2 py-0.5 rounded ${days != null && days <= 3 ? "bg-red-100 text-red-700" : days != null && days <= 7 ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                    {days != null && days >= 0 ? `${days} дн.` : "сегодня"}
                  </div>
                  <div className="flex-1 text-sm text-neutral-800">{p.description}</div>
                  <div className="text-xs text-neutral-400">{fmtDate(p.due_date)}</div>
                  <div className="text-sm font-semibold text-neutral-900">{fmt(p.planned_amount - p.paid_amount)} ₽</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Главная страница ----
export default function AccountingPage({ showCashRestrictions }: { showCashRestrictions?: boolean }) {
  type FullAccTab = AccTab | "restrictions";
  const [tab, setTab] = useState<FullAccTab>("overview");

  const tabs: { id: FullAccTab; label: string; icon: string }[] = [
    { id: "overview",      label: "Обзор",             icon: "LayoutDashboard" },
    { id: "bank",          label: "Банк / 1С",         icon: "Building2" },
    { id: "taxes",         label: "Налоги и ЕНС",      icon: "Receipt" },
    { id: "creditors",     label: "Кредиторы",         icon: "AlertCircle" },
    { id: "upcoming",      label: "Предстоящие",        icon: "CalendarClock" },
    { id: "leasing",       label: "Лизинг",            icon: "Car" },
    ...(showCashRestrictions ? [{ id: "restrictions" as FullAccTab, label: "Ограничения выдачи", icon: "ShieldAlert" }] : []),
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">Бухгалтерия</h1>

      <div className="flex gap-1 flex-wrap bg-neutral-100 rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${tab===t.id?"bg-white text-neutral-900 shadow-sm font-medium":"text-neutral-500 hover:text-neutral-700"}`}>
            <Icon name={t.icon} size={13}/>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview"      && <OverviewTab />}
      {tab === "bank"          && <BankTab />}
      {tab === "taxes"         && <TaxesTab />}
      {tab === "creditors"     && <CreditorsTab />}
      {tab === "upcoming"      && <UpcomingTab />}
      {tab === "leasing"       && <LeasingTab />}
      {tab === "restrictions"  && <CashRestrictionsTab />}
    </div>
  );
}
