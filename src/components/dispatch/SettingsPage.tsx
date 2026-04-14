import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { catalogCache } from "@/lib/catalogCache";
import Icon from "@/components/ui/icon";
import { SALARY_FIELDS } from "./settingsTypes";
import SettingCard from "./SettingCard";
import SettingsRoutesTable from "./SettingsRoutesTable";

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
    garage_daily_expenses: "5000",
    duty_car_shift_pay: "0",
    duty_car_fuel_liters: "0",
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        garage_daily_expenses: s.garage_daily_expenses ?? "5000",
        duty_car_shift_pay: s.duty_car_shift_pay ?? "0",
        duty_car_fuel_liters: s.duty_car_fuel_liters ?? "0",
      });
      setLoading(false);
    });
  }, []);

  const ALLOW_ZERO = new Set(["duty_car_shift_pay", "duty_car_fuel_liters"]);

  const handleSave = async (key: string) => {
    const value = values[key];
    if (value === "" || value === undefined) return;
    if (!ALLOW_ZERO.has(key) && Number(value) <= 0) return;
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

        {/* Хознужды гаража */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Warehouse" size={16} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Хознужды гаража</span>
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            Фиксированная сумма, ежедневно вычитаемая из кассовой выручки на хозяйственные нужды гаража.
          </p>
          <div className="border border-neutral-200 rounded p-5">
            <h3 className="font-semibold text-neutral-900 mb-1">Ежедневный расход на хознужды</h3>
            <p className="text-sm text-neutral-500 mb-4">Сумма резервируется каждый день независимо от выручки.</p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-neutral-500 block mb-1">Сумма, ₽/день</label>
                <input
                  type="number" step="100" min="0"
                  value={values.garage_daily_expenses}
                  onChange={e => setVal("garage_daily_expenses", e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSave("garage_daily_expenses"); }}
                  placeholder="5000"
                  className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                />
              </div>
              <button onClick={() => handleSave("garage_daily_expenses")}
                disabled={saving === "garage_daily_expenses" || !values.garage_daily_expenses}
                className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                {saving === "garage_daily_expenses" ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
            {saved === "garage_daily_expenses" && (
              <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5"><Icon name="Check" size={14} /> Сохранено</div>
            )}
          </div>
        </div>

        {/* Дежурный автомобиль */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Icon name="Car" size={16} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Дежурный автомобиль</span>
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            Ежедневные расходы на дежурный автомобиль (оплата водителя + топливо). Вычитаются из кассовой выручки каждый день.
          </p>
          <div className="flex flex-col gap-4">
            <div className="border border-neutral-200 rounded p-5">
              <h3 className="font-semibold text-neutral-900 mb-1">Оплата смены дежурного водителя</h3>
              <p className="text-sm text-neutral-500 mb-4">Фиксированная сумма за смену. Установите 0, если дежурки нет.</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 block mb-1">Оплата за смену, ₽</label>
                  <input
                    type="number" step="50" min="0"
                    value={values.duty_car_shift_pay}
                    onChange={e => setVal("duty_car_shift_pay", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave("duty_car_shift_pay"); }}
                    placeholder="0"
                    className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <button onClick={() => handleSave("duty_car_shift_pay")}
                  disabled={saving === "duty_car_shift_pay" || values.duty_car_shift_pay === ""}
                  className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                  {saving === "duty_car_shift_pay" ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
              {saved === "duty_car_shift_pay" && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5"><Icon name="Check" size={14} /> Сохранено</div>
              )}
            </div>
            <div className="border border-neutral-200 rounded p-5">
              <h3 className="font-semibold text-neutral-900 mb-1">Расход топлива дежурного автомобиля</h3>
              <p className="text-sm text-neutral-500 mb-4">Количество литров ДТ в день. Стоимость рассчитывается по базовой цене топлива из раздела «Тарифы».</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 block mb-1">Литров в день, л</label>
                  <input
                    type="number" step="1" min="0"
                    value={values.duty_car_fuel_liters}
                    onChange={e => setVal("duty_car_fuel_liters", e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSave("duty_car_fuel_liters"); }}
                    placeholder="0"
                    className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <button onClick={() => handleSave("duty_car_fuel_liters")}
                  disabled={saving === "duty_car_fuel_liters" || values.duty_car_fuel_liters === ""}
                  className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                  {saving === "duty_car_fuel_liters" ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
              {saved === "duty_car_fuel_liters" && (
                <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5"><Icon name="Check" size={14} /> Сохранено</div>
              )}
              {Number(values.duty_car_fuel_liters) > 0 && Number(values.fuel_price) > 0 && (
                <div className="mt-2 text-xs text-neutral-500 bg-neutral-50 rounded px-3 py-2">
                  Стоимость: {Number(values.duty_car_fuel_liters)} л × {Number(values.fuel_price)} ₽ = <b>{(Number(values.duty_car_fuel_liters) * Number(values.fuel_price)).toLocaleString("ru-RU")} ₽/день</b>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Параметры маршрутов */}
        <SettingsRoutesTable />

      </div>
    </div>
  );
}