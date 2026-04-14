export interface Accident {
  id: number;
  accident_date: string;
  accident_time?: string;
  organization?: string;
  location?: string;
  bus_board_number?: string;
  bus_gov_number?: string;
  bus_model?: string;
  driver_name?: string;
  driver_license?: string;
  route_number?: string;
  graph_number?: number;
  description?: string;
  weather_conditions?: string;
  road_conditions?: string;
  visibility?: string;
  victims_count?: number;
  victims_info?: string;
  other_vehicles?: string;
  fault_side?: string;
  damage_description?: string;
  damage_amount?: number;
  status: string;
  investigator_name?: string;
  investigation_result?: string;
  documents?: { url: string; name: string; content_type: string }[];
  schedule_entry_id?: number;
  created_at?: string;
}

export type AccidentForm = Omit<Accident, "id" | "created_at" | "documents">;

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Новое", color: "bg-red-100 text-red-700" },
  investigation: { label: "Расследование", color: "bg-amber-100 text-amber-700" },
  closed: { label: "Закрыто", color: "bg-green-100 text-green-700" },
  archived: { label: "Архив", color: "bg-neutral-100 text-neutral-500" },
};

export const WEATHER = ["Ясно", "Облачно", "Дождь", "Снег", "Туман", "Гололёд", "Метель"];
export const ROAD_COND = ["Сухое", "Мокрое", "Заснеженное", "Обледенелое", "Грязь"];
export const VISIBILITY_OPT = ["Хорошая", "Ограниченная", "Плохая"];
export const FAULT_SIDE = ["Наш водитель", "Второй участник", "Обоюдная вина", "Без вины", "Устанавливается"];

export function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

export function emptyForm(): AccidentForm {
  return {
    accident_date: new Date().toISOString().slice(0, 10),
    accident_time: "",
    organization: "",
    location: "",
    bus_board_number: "",
    bus_gov_number: "",
    bus_model: "",
    driver_name: "",
    driver_license: "",
    route_number: "",
    graph_number: undefined,
    description: "",
    weather_conditions: "Ясно",
    road_conditions: "Сухое",
    visibility: "Хорошая",
    victims_count: 0,
    victims_info: "",
    other_vehicles: "",
    fault_side: "Устанавливается",
    damage_description: "",
    damage_amount: undefined,
    status: "new",
    investigator_name: "",
    investigation_result: "",
    schedule_entry_id: undefined,
  };
}
