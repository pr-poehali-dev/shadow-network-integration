import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

export default function SettingsPage() {
  const [ticketPrice, setTicketPrice] = useState("");
  const [fuelPrice, setFuelPrice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSettings().then(s => {
      setTicketPrice(s.ticket_price ?? "33");
      setFuelPrice(s.fuel_price ?? "");
      setLoading(false);
    });
  }, []);

  const handleSave = async (key: string, value: string) => {
    if (!value || Number(value) <= 0) return;
    setSaving(key);
    await api.updateSetting(key, value);
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  if (loading) return <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Настройки</h2>

      <div className="max-w-lg flex flex-col gap-4">
        <div className="border border-neutral-200 rounded p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="Ticket" size={18} className="text-neutral-600" />
            <h3 className="font-semibold text-neutral-900">Стоимость билета</h3>
          </div>
          <p className="text-sm text-neutral-500 mb-4">
            Единая цена билета для всех маршрутов. Используется для расчёта количества проданных билетов.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-neutral-500 block mb-1">Цена билета, ₽</label>
              <input
                type="number" step="0.01" min="0.01"
                value={ticketPrice}
                onChange={e => setTicketPrice(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave("ticket_price", ticketPrice); }}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
              />
            </div>
            <button onClick={() => handleSave("ticket_price", ticketPrice)}
              disabled={saving === "ticket_price" || !ticketPrice || Number(ticketPrice) <= 0}
              className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
              {saving === "ticket_price" ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>
          {saved === "ticket_price" && (
            <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5">
              <Icon name="Check" size={14} /> Сохранено
            </div>
          )}
        </div>

        <div className="border border-neutral-200 rounded p-5">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="Fuel" size={18} className="text-neutral-600" />
            <h3 className="font-semibold text-neutral-900">Стоимость топлива</h3>
          </div>
          <p className="text-sm text-neutral-500 mb-4">
            Базовая цена дизельного топлива за 1 литр. Используется при расчёте зарплаты водителей.
            Бухгалтер может указать другую цену для конкретного водителя прямо в расписании.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-neutral-500 block mb-1">Цена топлива, ₽/л</label>
              <input
                type="number" step="0.01" min="0"
                value={fuelPrice}
                onChange={e => setFuelPrice(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave("fuel_price", fuelPrice); }}
                placeholder="Например: 65.50"
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
              />
            </div>
            <button onClick={() => handleSave("fuel_price", fuelPrice)}
              disabled={saving === "fuel_price" || !fuelPrice || Number(fuelPrice) <= 0}
              className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
              {saving === "fuel_price" ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>
          {saved === "fuel_price" && (
            <div className="mt-2 text-sm text-green-600 flex items-center gap-1.5">
              <Icon name="Check" size={14} /> Сохранено
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
