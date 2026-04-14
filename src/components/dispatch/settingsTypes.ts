export interface SettingField {
  key: string;
  label: string;
  hint: string;
  placeholder?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: string;
}

export interface RouteRow {
  id: number;
  number: string;
  name: string;
  organization: string | null;
  max_graphs: number;
  min_vehicles: number | null;
  required_trips: number | null;
}

export const SALARY_FIELDS: SettingField[] = [
  {
    key: "driver_pct_no_conductor",
    label: "Процент водителя (без кондуктора)",
    hint: "Доля выручки/билетов, начисляемая водителю на маршрутах №1, 3, 15, 24 при работе без кондуктора",
    placeholder: "37",
    suffix: "%",
    min: 1,
    max: 99,
    step: "1",
  },
  {
    key: "driver_pct_with_conductor",
    label: "Процент водителя (с кондуктором)",
    hint: "Доля выручки/билетов, начисляемая водителю при наличии кондуктора",
    placeholder: "22",
    suffix: "%",
    min: 1,
    max: 99,
    step: "1",
  },
  {
    key: "conductor_pct",
    label: "Процент кондуктора",
    hint: "Доля выручки/билетов, начисляемая кондуктору",
    placeholder: "15",
    suffix: "%",
    min: 1,
    max: 99,
    step: "1",
  },
];
