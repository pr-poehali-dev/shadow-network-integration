import Icon from "@/components/ui/icon";
import { SettingField } from "./settingsTypes";

interface SettingCardProps {
  field: SettingField;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

export default function SettingCard({
  field,
  value,
  onChange,
  onSave,
  saving,
  saved,
}: SettingCardProps) {
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
