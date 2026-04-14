export type Position =
  | "driver" | "conductor"
  | "locksmith" | "accountant_staff" | "cashier_staff"
  | "guard" | "mechanic_staff" | "cleaning" | "medical" | "other";

export interface Driver {
  id: number; full_name: string; phone?: string; birth_date?: string;
  snils?: string; inn?: string; license_number?: string; license_date?: string;
  is_official: boolean;
}

export interface Conductor {
  id: number; full_name: string; phone?: string; birth_date?: string; snils?: string; inn?: string;
}

export interface StaffMember {
  id: number; position: Position; full_name: string; phone?: string; birth_date?: string;
  snils?: string; inn?: string; passport_series?: string; passport_number?: string;
  passport_issued_by?: string; passport_issued_date?: string; address?: string;
  hire_date?: string; fire_date?: string; organization?: string;
  is_official: boolean; is_active: boolean; notes?: string;
}

export const POSITION_LABELS: Record<Position | string, string> = {
  driver: "Водители",
  conductor: "Кондукторы",
  locksmith: "Слесари",
  accountant_staff: "Бухгалтерия",
  cashier_staff: "Кассиры",
  guard: "Сторожа",
  mechanic_staff: "Механики",
  cleaning: "Клининг",
  medical: "Медики",
  other: "Прочие",
};

export const POSITION_ICONS: Record<string, string> = {
  driver: "Truck", conductor: "Users", locksmith: "Wrench",
  accountant_staff: "Calculator", cashier_staff: "Landmark",
  guard: "Shield", mechanic_staff: "Settings2", cleaning: "Sparkles",
  medical: "Stethoscope", other: "UserRound",
};

export const STAFF_POSITIONS: Position[] = [
  "locksmith", "accountant_staff", "cashier_staff", "guard", "mechanic_staff", "cleaning", "medical", "other",
];

export const WORK_SCHEDULES = [
  { value: "", label: "Не задан" },
  { value: "3/3", label: "3 через 3" },
  { value: "5/2", label: "5 через 2 (пн-пт)" },
  { value: "2/2", label: "2 через 2" },
  { value: "6/1", label: "6 через 1" },
  { value: "4/3", label: "4 через 3" },
  { value: "individual", label: "Индивидуальный" },
];

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
