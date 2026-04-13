import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [ticketPrice, setTicketPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSettings().then(s => {
      setSettings(s);
      setTicketPrice(s.ticket_price ?? "33");
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!ticketPrice || Number(ticketPrice) <= 0) return;
    setSaving(true);
    await api.updateSetting("ticket_price", ticketPrice);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="text-neutral-500 text-sm py-8 text-center">Загрузка...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Настройки</h2>

      <div className="max-w-lg">
        <div className="border border-neutral-200 rounded p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Ticket" size={18} className="text-neutral-600" />
            <h3 className="font-semibold text-neutral-900">Стоимость билета</h3>
          </div>
          <p className="text-sm text-neutral-500 mb-4">
            Единая цена билета для всех маршрутов. Используется для автоматического расчёта количества проданных билетов по сумме привезённой выручки.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-neutral-500 block mb-1">Цена билета, ₽</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={ticketPrice}
                onChange={e => setTicketPrice(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !ticketPrice || Number(ticketPrice) <= 0}
              className="bg-neutral-900 text-white px-5 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Сохраняю..." : "Сохранить"}
            </button>
          </div>
          {saved && (
            <div className="mt-3 text-sm text-green-600 flex items-center gap-1.5">
              <Icon name="Check" size={14} />
              Цена сохранена
            </div>
          )}
        </div>

        <p className="text-xs text-neutral-400">
          Текущая цена: {settings.ticket_price ?? "33"} ₽ за билет
        </p>
      </div>
    </div>
  );
}
