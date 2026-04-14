import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";

interface SettingField {
  key: string;
  label: string;
  hint: string;
  placeholder?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: string;
}

const SALARY_FIELDS: SettingField[] = [
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

function SettingCard({
  field,
  value,
  onChange,
  onSave,
  saving,
  saved,
}: {
  field: SettingField;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="border border-neutral-200 rounded p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-neutral-900">{field.label}</h3>
      </div>
      <p className="text-sm text-neutral-500 mb-4">{field.hint}</p>
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <label className="text-xs text-neutral-500 block mb-1">
            Значение{field.suffix ? `, ${field.suffix}` : ""}
          </label>
          <div className="relative">
            <input
              type="number"
              step={field.step ?? "0.01"}
              min={field.min ?? 0}
              max={field.max}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onSave(); }}
              placeholder={field.placeholder}
              className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600 pr-8"
            />
            {field.suffix && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 pointer-events-none">
                {field.suffix}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={saving || !value || Number(value) <= 0}
          className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
      {saved && (
        <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5">
          <Icon name="Check" size={14} /> Сохранено
        </div>
      )}
    </div>
  );
}

interface RouteRow {
  id: number;
  number: string;
  name: string;
  organization: string | null;
  max_graphs: number;
  min_vehicles: number | null;
  required_trips: number | null;
}

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({
    ticket_price: "",
    fuel_price: "",
    driver_pct_no_conductor: "37",
    driver_pct_with_conductor: "22",
    conductor_pct: "15",
    route6_fixed_salary: "7000",
    lunch_no_conductor: "150",
    lunch_with_conductor: "300",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Маршруты
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [routeEdits, setRouteEdits] = useState<Record<number, { min_vehicles: string; required_trips: string }>>({});
  const [routeSaving, setRouteSaving] = useState<number | null>(null);
  const [routeSaved, setRouteSaved] = useState<number | null>(null);

  const loadRoutes = useCallback(async () => {
    const r = await catalogCache.getRoutes();
    const arr: RouteRow[] = Array.isArray(r) ? r : [];
    setRoutes(arr);
    const edits: typeof routeEdits = {};
    arr.forEach(rt => {
      edits[rt.id] = {
        min_vehicles: rt.min_vehicles != null ? String(rt.min_vehicles) : "",
        required_trips: rt.required_trips != null ? String(rt.required_trips) : "",
      };
    });
    setRouteEdits(edits);
  }, []);

  useEffect(() => {
    catalogCache.getSettings().then(s => {
      setValues({
        ticket_price: s.ticket_price ?? "70",
        fuel_price: s.fuel_price ?? "",
        driver_pct_no_conductor: s.driver_pct_no_conductor ?? "37",
        driver_pct_with_conductor: s.driver_pct_with_conductor ?? "22",
        conductor_pct: s.conductor_pct ?? "15",
        route6_fixed_salary: s.route6_fixed_salary ?? "7000",
        lunch_no_conductor: s.lunch_no_conductor ?? "150",
        lunch_with_conductor: s.lunch_with_conductor ?? "300",
      });
      setLoading(false);
    });
    loadRoutes();
  }, [loadRoutes]);

  const saveRoute = async (rt: RouteRow) => {
    const ed = routeEdits[rt.id];
    if (!ed) return;
    setRouteSaving(rt.id);
    await api.updateRoute(rt.id, {
      number: rt.number,
      name: rt.name,
      organization: rt.organization || undefined,
      max_graphs: rt.max_graphs,
      min_vehicles: ed.min_vehicles ? Number(ed.min_vehicles) : undefined,
      required_trips: ed.required_trips ? Number(ed.required_trips) : undefined,
    });
    catalogCache.invalidateRoutes();
    await loadRoutes();
    setRouteSaving(null);
    setRouteSaved(rt.id);
    setTimeout(() => setRouteSaved(null), 2000);
  };

  const handleSave = async (key: string) => {
    const value = values[key];
    if (!value || Number(value) <= 0) return;
    setSaving(key);
    await api.updateSetting(key, value);
    catalogCache.invalidateSettings();
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const setVal = (key: string, v: string) => setValues(prev => ({ ...prev, [key]: v }));

  if (loading) return <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Настройки</h2>

      <div className="max-w-lg flex flex-col gap-6">

        {/* Тарифы */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Icon name="Settings2" size={16} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Тарифы</span>
          </div>
          <div className="flex flex-col gap-4">
            <div className="border border-neutral-200 rounded p-5">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Ticket" size={18} className="text-neutral-600" />
                <h3 className="font-semibold text-neutral-900">Стоимость билета</h3>
              </div>
              <p className="text-sm text-neutral-500 mb-4">
                Базовая цена билета для маршрутов №1, 3, 6, 15, 24. Используется для расчёта зарплаты по количеству привезённых билетов.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <label className="text-xs text-neutral-500 block mb-1">Цена билета, ₽</label>
                  <input
                    type="number" step="0.01" min="0.01"
                    value={values.ticket_price}
                    onChange={e => setVal("ticket_price", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave("ticket_price"); }}
                    className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <button onClick={() => handleSave("ticket_price")}
                  disabled={saving === "ticket_price" || !values.ticket_price || Number(values.ticket_price) <= 0}
                  className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                  {saving === "ticket_price" ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
              {saved === "ticket_price" && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5"><Icon name="Check" size={14} /> Сохранено</div>
              )}
            </div>

            <div className="border border-neutral-200 rounded p-5">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="Fuel" size={18} className="text-neutral-600" />
                <h3 className="font-semibold text-neutral-900">Стоимость топлива</h3>
              </div>
              <p className="text-sm text-neutral-500 mb-4">
                Базовая цена ДТ за 1 литр. Бухгалтер может указать индивидуальную цену прямо в наряде для конкретного водителя.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 block mb-1">Цена топлива, ₽/л</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={values.fuel_price}
                    onChange={e => setVal("fuel_price", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave("fuel_price"); }}
                    placeholder="Например: 72.00"
                    className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <button onClick={() => handleSave("fuel_price")}
                  disabled={saving === "fuel_price" || !values.fuel_price || Number(values.fuel_price) <= 0}
                  className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                  {saving === "fuel_price" ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
              {saved === "fuel_price" && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5"><Icon name="Check" size={14} /> Сохранено</div>
              )}
            </div>
          </div>
        </div>

        {/* Проценты ЗП */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Percent" size={16} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Проценты начисления зарплаты</span>
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            Применяются для расчёта ЗП на маршрутах №1, 3, 15, 24.<br/>
            Формула: <span className="font-mono bg-neutral-100 px-1 rounded">кол-во билетов × цена билета − стоимость топлива</span> × процент
          </p>
          <div className="flex flex-col gap-4">
            {SALARY_FIELDS.map(f => (
              <SettingCard
                key={f.key}
                field={f}
                value={values[f.key] ?? ""}
                onChange={v => setVal(f.key, v)}
                onSave={() => handleSave(f.key)}
                saving={saving === f.key}
                saved={saved === f.key}
              />
            ))}

            {/* Маршрут №6 — фиксированная ставка */}
            <div className="border border-neutral-200 rounded p-5 bg-amber-50/40">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs bg-neutral-900 text-white px-2 py-0.5 rounded">№ 6</span>
                <h3 className="font-semibold text-neutral-900">Фиксированная ставка водителя</h3>
              </div>
              <p className="text-sm text-neutral-500 mb-4">
                На маршруте №6 водитель получает фиксированную сумму за смену независимо от выручки и билетов.
                Кондуктору на этом маршруте ЗП не начисляется.
              </p>
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <label className="text-xs text-neutral-500 block mb-1">Ставка за смену, ₽</label>
                  <input
                    type="number" step="100" min="0"
                    value={values.route6_fixed_salary}
                    onChange={e => setVal("route6_fixed_salary", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave("route6_fixed_salary"); }}
                    placeholder="7000"
                    className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <button onClick={() => handleSave("route6_fixed_salary")}
                  disabled={saving === "route6_fixed_salary" || !values.route6_fixed_salary || Number(values.route6_fixed_salary) <= 0}
                  className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                  {saving === "route6_fixed_salary" ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
              {saved === "route6_fixed_salary" && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5"><Icon name="Check" size={14} /> Сохранено</div>
              )}
            </div>
          </div>

          {/* Превью расчёта */}
          <div className="mt-4 border border-blue-200 bg-blue-50 rounded p-4">
            <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
              <Icon name="Calculator" size={13} /> Пример расчёта (маршрут №1, 500 билетов, 0 л топлива)
            </div>
            <div className="text-xs text-blue-800 space-y-1 font-mono">
              {(() => {
                const tp = Number(values.ticket_price) || 70;
                const tickets = 500;
                const fuel = 0;
                const base = tickets * tp - fuel;
                const lNoC = Number(values.lunch_no_conductor) || 150;
                const lWithC = Number(values.lunch_with_conductor) || 300;
                const dNoC = Math.round(base * (Number(values.driver_pct_no_conductor) || 37) / 100 - lNoC);
                const dWithC = Math.round(base * (Number(values.driver_pct_with_conductor) || 22) / 100 - lWithC);
                const cond = Math.round(base * (Number(values.conductor_pct) || 15) / 100 - lWithC);
                return (
                  <>
                    <div>База: {tickets} × {tp} ₽ = {base.toLocaleString("ru-RU")} ₽</div>
                    <div>Водитель без кондуктора: {base.toLocaleString()} × {values.driver_pct_no_conductor || 37}% − обед {lNoC} ₽ = <b>{dNoC.toLocaleString("ru-RU")} ₽</b></div>
                    <div>Водитель с кондуктором: {base.toLocaleString()} × {values.driver_pct_with_conductor || 22}% − обед {lWithC} ₽ = <b>{dWithC.toLocaleString("ru-RU")} ₽</b></div>
                    <div>Кондуктор: {base.toLocaleString()} × {values.conductor_pct || 15}% − обед {lWithC} ₽ = <b>{cond.toLocaleString("ru-RU")} ₽</b></div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Обеды */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="UtensilsCrossed" size={16} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Стоимость обедов</span>
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            Вычитается из начисленной зарплаты каждого члена экипажа за каждую смену.
          </p>
          <div className="flex flex-col gap-4">
            <div className="border border-neutral-200 rounded p-5">
              <h3 className="font-semibold text-neutral-900 mb-1">Водитель без кондуктора</h3>
              <p className="text-sm text-neutral-500 mb-4">Сумма обеда для водителя, работающего в одиночку</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 block mb-1">Стоимость обеда, ₽</label>
                  <input
                    type="number" step="10" min="0"
                    value={values.lunch_no_conductor}
                    onChange={e => setVal("lunch_no_conductor", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave("lunch_no_conductor"); }}
                    placeholder="150"
                    className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <button onClick={() => handleSave("lunch_no_conductor")}
                  disabled={saving === "lunch_no_conductor" || !values.lunch_no_conductor || Number(values.lunch_no_conductor) < 0}
                  className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                  {saving === "lunch_no_conductor" ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
              {saved === "lunch_no_conductor" && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5"><Icon name="Check" size={14} /> Сохранено</div>
              )}
            </div>

            <div className="border border-neutral-200 rounded p-5">
              <h3 className="font-semibold text-neutral-900 mb-1">Экипаж с кондуктором</h3>
              <p className="text-sm text-neutral-500 mb-4">Сумма обеда для водителя и кондуктора (каждый вычитается отдельно)</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 block mb-1">Стоимость обеда на человека, ₽</label>
                  <input
                    type="number" step="10" min="0"
                    value={values.lunch_with_conductor}
                    onChange={e => setVal("lunch_with_conductor", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave("lunch_with_conductor"); }}
                    placeholder="300"
                    className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <button onClick={() => handleSave("lunch_with_conductor")}
                  disabled={saving === "lunch_with_conductor" || !values.lunch_with_conductor || Number(values.lunch_with_conductor) < 0}
                  className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                  {saving === "lunch_with_conductor" ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
              {saved === "lunch_with_conductor" && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5"><Icon name="Check" size={14} /> Сохранено</div>
              )}
            </div>
          </div>
        </div>

        {/* Параметры маршрутов */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Map" size={16} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Параметры маршрутов</span>
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            Минимальное количество ТС на линии и обязательное кол-во рейсов в день для каждого маршрута.
            При нехватке ТС в Наряде будет показано предупреждение.
          </p>
          <div className="border border-neutral-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-2 text-left">Маршрут</th>
                  <th className="px-4 py-2 text-left">Организация</th>
                  <th className="px-4 py-2 text-center w-28">Макс. гр.</th>
                  <th className="px-4 py-2 text-center w-32">Мин. ТС</th>
                  <th className="px-4 py-2 text-center w-36">Рейсов/день</th>
                  <th className="px-4 py-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {routes.map((rt, i) => {
                  const ed = routeEdits[rt.id] ?? { min_vehicles: "", required_trips: "" };
                  const isSaving = routeSaving === rt.id;
                  const isSaved = routeSaved === rt.id;
                  return (
                    <tr key={rt.id} className={`border-b border-neutral-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-neutral-50/50"}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-neutral-900">№ {rt.number}</span>
                        {rt.name && <span className="text-neutral-400 text-xs ml-2">{rt.name}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-neutral-500">{rt.organization ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center text-neutral-600">{rt.max_graphs}</td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number" min={1} max={20}
                          value={ed.min_vehicles}
                          onChange={e => setRouteEdits(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], min_vehicles: e.target.value } }))}
                          placeholder="не задано"
                          className="border border-neutral-300 rounded px-2 py-1 text-sm w-full text-center focus:outline-none focus:border-neutral-600"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number" min={1} max={100}
                          value={ed.required_trips}
                          onChange={e => setRouteEdits(prev => ({ ...prev, [rt.id]: { ...prev[rt.id], required_trips: e.target.value } }))}
                          placeholder="не задано"
                          className="border border-neutral-300 rounded px-2 py-1 text-sm w-full text-center focus:outline-none focus:border-neutral-600"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isSaved ? (
                          <span className="text-green-600 text-xs flex items-center gap-1 justify-end">
                            <Icon name="Check" size={12} /> Сохранено
                          </span>
                        ) : (
                          <button
                            onClick={() => saveRoute(rt)}
                            disabled={isSaving}
                            className="bg-neutral-900 text-white px-3 py-1 text-xs rounded hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors">
                            {isSaving ? "..." : "Сохранить"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}