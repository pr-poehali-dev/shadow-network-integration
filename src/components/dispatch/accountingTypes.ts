// ---- Типы ----
export type AccTab = "overview" | "bank" | "taxes" | "creditors" | "upcoming" | "leasing";

export interface BankTransaction {
  id: number; transaction_date: string; direction: "debit" | "credit";
  amount: number; counterparty?: string; counterparty_inn?: string;
  category: string; purpose?: string; account_number?: string;
  bank_name?: string; document_number?: string; organization?: string;
  source: string; notes?: string;
}
export interface BankSummary { items: BankTransaction[]; totals: { total_credit: number; total_debit: number }; by_counterparty: { counterparty: string; category: string; debit_sum: number; debit_count: number }[]; }

export interface TaxPayment {
  id: number; payment_date?: string; due_date: string; tax_type: string;
  period_year?: number; period_month?: number; accrued_amount: number;
  paid_amount: number; status: string; ens_balance?: number; organization?: string; notes?: string;
}
export interface Creditor {
  id: number; counterparty: string; counterparty_inn?: string; debt_type: string;
  contract_number?: string; contract_date?: string; original_amount?: number;
  current_debt: number; overdue_amount: number; last_payment_date?: string;
  next_payment_date?: string; next_payment_amount?: number; organization?: string; notes?: string;
}
export interface UpcomingPayment {
  id: number; due_date: string; payment_type: string; counterparty?: string;
  description: string; planned_amount: number; paid_amount: number;
  status: string; is_recurring: boolean; recur_day?: number; organization?: string; notify_days_before: number;
}
export interface LeasingContract {
  id: number; lessor: string; contract_number?: string; contract_date?: string;
  object_description?: string; bus_id?: number; total_amount?: number;
  monthly_payment?: number; payment_day?: number; start_date?: string; end_date?: string;
  payments_total?: number; payments_made: number; payments_remaining?: number;
  remaining_debt?: number; organization?: string; is_active: boolean; notes?: string;
}

// ---- Константы ----
export const TX_CATEGORY_LABELS: Record<string, string> = {
  supplier: "Поставщик", leasing: "Лизинг", utilities: "Коммунальные",
  tax: "Налоги/ЕНС", salary: "Зарплата", loan: "Кредит/заём", other: "Прочее",
};
export const TX_CATEGORY_COLORS: Record<string, string> = {
  supplier: "bg-blue-50 text-blue-700", leasing: "bg-purple-50 text-purple-700",
  utilities: "bg-cyan-50 text-cyan-700", tax: "bg-red-50 text-red-700",
  salary: "bg-green-50 text-green-700", loan: "bg-orange-50 text-orange-700",
  other: "bg-neutral-100 text-neutral-600",
};
export const TAX_STATUS_LABELS: Record<string, string> = { pending: "К оплате", partial: "Частично", paid: "Оплачен", overdue: "Просрочен" };
export const TAX_STATUS_COLORS: Record<string, string> = { pending: "bg-yellow-50 text-yellow-700", partial: "bg-orange-50 text-orange-700", paid: "bg-green-50 text-green-700", overdue: "bg-red-50 text-red-700" };
export const DEBT_TYPE_LABELS: Record<string, string> = { supplier: "Поставщик", leasing: "Лизинг", loan: "Кредит", other: "Прочее" };
export const PAYMENT_TYPE_LABELS: Record<string, string> = { tax: "Налог", leasing: "Лизинг", supplier: "Поставщик", salary: "Зарплата", utilities: "Коммунальные", loan: "Кредит", other: "Прочее" };
export const UPCOMING_STATUS_COLORS: Record<string, string> = { planned: "bg-blue-50 text-blue-700", paid: "bg-green-50 text-green-700", partial: "bg-orange-50 text-orange-700", cancelled: "bg-neutral-100 text-neutral-500" };
export const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export function fmt(n?: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
export function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
}
