export interface Driver {
  id: number; full_name: string; phone?: string; birth_date?: string;
  snils?: string; inn?: string; license_number?: string; license_date?: string;
  is_official: boolean;
}
export interface Conductor {
  id: number; full_name: string; phone?: string; birth_date?: string; snils?: string; inn?: string;
}
export interface StaffMember {
  id: number; position: string; full_name: string; phone?: string; birth_date?: string;
  snils?: string; inn?: string; passport_series?: string; passport_number?: string;
  passport_issued_by?: string; passport_issued_date?: string; address?: string;
  hire_date?: string; fire_date?: string; organization?: string; is_official: boolean; is_active: boolean; notes?: string;
}

export const POSITION_LABELS: Record<string, string> = {
  driver: "Водитель", conductor: "Кондуктор", locksmith: "Слесарь",
  accountant_staff: "Бухгалтер", cashier_staff: "Кассир", guard: "Сторож",
  mechanic_staff: "Механик", cleaning: "Клинер", medical: "Медик", other: "Прочее",
};

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

export function age(birth?: string | null): string {
  if (!birth) return "—";
  const b = new Date(birth);
  const diff = Date.now() - b.getTime();
  return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

export function pop(html: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  w.focus();
  setTimeout(() => w.print(), 400);
}
