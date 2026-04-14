import { useState, useEffect } from "react";
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

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({
    ticket_price: "",
    fuel_price: "",
    driver_pct_no_conductor: "37",
    driver_pct_with_conductor: "22",
    conductor_pct: "15",
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
      });
      setLoading(false);
    });
  }, []);

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
                Базовая цена билета для маршрутов №1, 3, 15, 24. Используется для расчёта зарплаты по количеству привезённых билетов.
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
                const dNoC = Math.round(base * (Number(values.driver_pct_no_conductor) || 37) / 100 - 150);
                const dWithC = Math.round(base * (Number(values.driver_pct_with_conductor) || 22) / 100 - 150);
                const cond = Math.round(base * (Number(values.conductor_pct) || 15) / 100);
                return (
                  <>
                    <div>База: {tickets} × {tp} ₽ = {base.toLocaleString("ru-RU")} ₽</div>
                    <div>Водитель без кондуктора: {base.toLocaleString()} × {values.driver_pct_no_conductor || 37}% − 150 = <b>{dNoC.toLocaleString("ru-RU")} ₽</b></div>
                    <div>Водитель с кондуктором: {base.toLocaleString()} × {values.driver_pct_with_conductor || 22}% − 150 = <b>{dWithC.toLocaleString("ru-RU")} ₽</b></div>
                    <div>Кондуктор: {base.toLocaleString()} × {values.conductor_pct || 15}% = <b>{cond.toLocaleString("ru-RU")} ₽</b></div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
