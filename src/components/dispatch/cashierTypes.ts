export interface Restriction {
  reason: string;
  restriction_type: "block" | "limit";
  limit_amount: number | null;
}

export interface ScheduleRow {
  schedule_entry_id: number;
  report_id: number | null;
  report_date: string;
  route_number: string;
  graph_number: number | null;
  organization: string | null;
  board_number: string | null;
  gov_number: string | null;
  driver_id: number | null;
  driver_name: string | null;
  conductor_name: string | null;
  is_overtime: boolean;
  cash_total: number;
  cashless_amount: number;
  tickets_sold: number | null;
  fuel_spent: number | null;
  fuel_liters_total: number;
  fuel_cost: number;
  fuel_cash_amount: number;
  fuel_price_per_liter: number | null;
  lunch_amount: number;
  notes: string | null;
  restriction: Restriction | null;
  bills_5000: number; bills_2000: number; bills_1000: number; bills_500: number;
  bills_200: number; bills_100: number; bills_50: number; bills_10: number;
  coins_10: number; coins_5: number; coins_2: number; coins_1: number;
}

export interface CashierSummary {
  total_cash: number;
  total_cashless: number;
  total_lunch: number;
  total_fuel_cost: number;
  garage_daily_expenses: number;
  duty_car_shift_pay: number;
  duty_car_fuel_liters: number;
  duty_car_fuel_cost: number;
  fuel_price: number;
  ticket_price: number;
}

export interface CashRestriction {
  id: number;
  driver_id: number | null;
  driver_name: string | null;
  driver_full_name: string | null;
  reason: string;
  restriction_type: "block" | "limit";
  limit_amount: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export const BILLS: { key: string; label: string; value: number; isCoin?: boolean }[] = [
  { key: "bills_5000", label: "5 000 ₽", value: 5000 },
  { key: "bills_2000", label: "2 000 ₽", value: 2000 },
  { key: "bills_1000", label: "1 000 ₽", value: 1000 },
  { key: "bills_500",  label: "500 ₽",   value: 500 },
  { key: "bills_200",  label: "200 ₽",   value: 200 },
  { key: "bills_100",  label: "100 ₽",   value: 100 },
  { key: "bills_50",   label: "50 ₽",    value: 50 },
  { key: "bills_10",   label: "10 ₽",    value: 10 },
  { key: "coins_10",   label: "10 ₽ (м)",  value: 10, isCoin: true },
  { key: "coins_5",    label: "5 ₽",     value: 5,  isCoin: true },
  { key: "coins_2",    label: "2 ₽",     value: 2,  isCoin: true },
  { key: "coins_1",    label: "1 ₽",     value: 1,  isCoin: true },
];

export function fmt(n: number) {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export type TabMode = "cashier" | "restrictions";