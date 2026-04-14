export interface Route { id: number; number: string; name: string; organization?: string; max_graphs: number; }
export interface Bus { id: number; board_number: string; model: string; }
export interface Driver { id: number; full_name: string; }
export interface Conductor { id: number; full_name: string; }
export interface Terminal { id: number; number: string; name: string; organization: string; }

export interface Entry {
  id: number;
  work_date: string;
  graph_number: number | null;
  route_id: number;
  route_number: string;
  route_name: string;
  route_organization?: string;
  max_graphs: number;
  bus_id: number | null;
  board_number: string | null;
  bus_model: string | null;
  driver_id: number | null;
  driver_name: string | null;
  conductor_id: number | null;
  conductor_name: string | null;
  terminal_id: number | null;
  terminal_name: string | null;
  terminal_number: string | null;
  terminal_org: string | null;
  fuel_spent: number | null;
  fuel_price_override: number | null;
  revenue_cash: number | null;
  revenue_cashless: number | null;
  revenue_total: number | null;
  ticket_price: number | null;
  tickets_sold: number | null;
  is_overtime: boolean;
  driver_is_official: boolean | null;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function fmtMoney(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}
