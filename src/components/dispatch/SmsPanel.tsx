import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

const HOLIDAYS = [
  { name: "Новым годом", date: "01-01" },
  { name: "Рождеством Христовым", date: "01-07" },
  { name: "Днём защитника Отечества", date: "02-23" },
  { name: "Международным женским днём", date: "03-08" },
  { name: "Праздником Весны и Труда", date: "05-01" },
  { name: "Днём Победы", date: "05-09" },
  { name: "Днём России", date: "06-12" },
  { name: "Днём народного единства", date: "11-04" },
];

interface BirthdayPerson {
  id: number;
  full_name: string;
  phone?: string | null;
  person_type: string;
  organization?: string | null;
}

export default function SmsPanel() {
  const [tab, setTab] = useState<"schedule" | "birthday" | "holiday">("birthday");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Именинники
  const [birthdays, setBirthdays] = useState<BirthdayPerson[]>([]);
  const [bdLoading, setBdLoading] = useState(false);
  const [bdSending, setBdSending] = useState(false);
  const [organization, setOrganization] = useState("");

  // Праздники
  const [holiday, setHoliday] = useState(HOLIDAYS[0].name);
  const [customHoliday, setCustomHoliday] = useState("");
  const [holidayCustomText, setHolidayCustomText] = useState("");
  const [holidayPhone, setHolidayPhone] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidaySending, setHolidaySending] = useState(false);

  // Ручная отправка
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualSending, setManualSending] = useState(false);

  const loadBirthdays = async () => {
    setBdLoading(true);
    setBirthdays([]);
    const data = await api.getBirthdayToday(0);
    setBirthdays(data?.people ?? []);
    setBdLoading(false);
  };

  useEffect(() => {
    if (tab === "birthday") loadBirthdays();
  }, [tab]);

  const sendBulkBirthdays = async () => {
    if (!confirm(`Отправить SMS ${birthdays.filter(p => p.phone).length} именинникам?`)) return;
    setBdSending(true);
    setResult(null);
    const data = await api.sendBulkBirthday({ organization });
    setResult(`Отправлено: ${data.sent?.length ?? 0}, ошибок: ${data.errors?.length ?? 0}`);
    setBdSending(false);
  };

  const sendSingleBirthday = async (p: BirthdayPerson) => {
    if (!p.phone) return alert("У сотрудника нет телефона");
    const org = p.organization || organization || "Наша организация";
    const data = await api.sendBirthdaySms({ phone: p.phone, full_name: p.full_name, organization: org });
    if (data.sent) {
      setResult(`SMS отправлено ${p.full_name}`);
    } else {
      setError(data.error || "Ошибка отправки");
    }
  };

  const sendHoliday = async () => {
    if (!holidayPhone) return setError("Введите номер телефона");
    setHolidaySending(true);
    setResult(null); setError(null);
    const holidayNameFinal = customHoliday || holiday;
    const data = await api.sendHolidaySms({
      phone: holidayPhone,
      full_name: holidayName || "Уважаемый сотрудник",
      organization,
      holiday_name: holidayNameFinal,
      custom_text: holidayCustomText,
    });
    setHolidaySending(false);
    if (data.sent) {
      setResult(`SMS отправлено на ${holidayPhone}`);
      setHolidayPhone(""); setHolidayName("");
    } else {
      setError(data.error || "Ошибка отправки");
    }
  };

  const sendManual = async () => {
    if (!manualPhone || !manualText) return setError("Заполните телефон и текст");
    setManualSending(true);
    setResult(null); setError(null);
    const data = await api.sendHolidaySms({
      phone: manualPhone,
      full_name: manualName || "",
      organization,
      holiday_name: "",
      custom_text: manualText,
    });
    setManualSending(false);
    if (data.sent) {
      setResult(`SMS отправлено`);
      setManualPhone(""); setManualText(""); setManualName("");
    } else {
      setError(data.error || "Ошибка отправки");
    }
  };

  const inp = "border border-neutral-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
          <Icon name="MessageSquare" size={18} className="text-blue-600" />
          SMS-уведомления
        </h3>
        <div>
          <label className="text-xs text-neutral-500 mr-2">Организация:</label>
          <input value={organization} onChange={e => setOrganization(e.target.value)}
            placeholder='ООО "..."'
            className="border border-neutral-200 rounded px-2 py-1 text-sm w-48 focus:outline-none" />
        </div>
      </div>

      {(result || error) && (
        <div className={`px-4 py-2 rounded-lg text-sm ${result ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {result || error}
          <button onClick={() => { setResult(null); setError(null); }} className="ml-2 opacity-50 hover:opacity-100 cursor-pointer">×</button>
        </div>
      )}

      {/* Табы */}
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
        {[
          { id: "birthday", label: "Дни рождения", icon: "Cake" },
          { id: "holiday", label: "Праздники", icon: "PartyPopper" },
          { id: "schedule", label: "Произвольное", icon: "Send" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer flex-1 justify-center ${tab === t.id ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"}`}>
            <Icon name={t.icon} size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Дни рождения */}
      {tab === "birthday" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600">
              Сегодня {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — именинники:
            </div>
            <div className="flex gap-2">
              <button onClick={loadBirthdays} disabled={bdLoading}
                className="text-xs px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer flex items-center gap-1">
                <Icon name="RefreshCw" size={12} /> Обновить
              </button>
              {birthdays.filter(p => p.phone).length > 0 && (
                <button onClick={sendBulkBirthdays} disabled={bdSending}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-1 disabled:opacity-50">
                  <Icon name="Send" size={12} /> Отправить всем ({birthdays.filter(p => p.phone).length})
                </button>
              )}
            </div>
          </div>

          {bdLoading ? (
            <div className="text-sm text-neutral-400 text-center py-4">Загрузка...</div>
          ) : birthdays.length === 0 ? (
            <div className="text-sm text-neutral-400 text-center py-6">
              <Icon name="CalendarCheck" size={24} className="mx-auto mb-2 opacity-30" />
              Сегодня именинников нет
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              {birthdays.map((p, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-neutral-100" : ""}`}>
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center shrink-0">
                    <Icon name="Cake" size={14} className="text-pink-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-neutral-900">{p.full_name}</div>
                    <div className="text-xs text-neutral-500 flex gap-3">
                      <span>{p.person_type}</span>
                      {p.organization && <span>{p.organization}</span>}
                      {p.phone ? <span className="text-blue-600">{p.phone}</span> : <span className="text-red-400">нет телефона</span>}
                    </div>
                  </div>
                  <button onClick={() => sendSingleBirthday(p)} disabled={!p.phone}
                    className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-30 cursor-pointer">
                    <Icon name="Send" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Праздники */}
      {tab === "holiday" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Телефон *</label>
              <input value={holidayPhone} onChange={e => setHolidayPhone(e.target.value)}
                placeholder="+79001234567" className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">ФИО получателя</label>
              <input value={holidayName} onChange={e => setHolidayName(e.target.value)}
                placeholder="Иванов Иван Иванович" className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Праздник</label>
              <select value={holiday} onChange={e => setHoliday(e.target.value)} className={`${inp} bg-white`}>
                {HOLIDAYS.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
                <option value="custom">Другой...</option>
              </select>
            </div>
            {holiday === "custom" && (
              <div>
                <label className="text-xs font-medium text-neutral-600 block mb-1">Название праздника</label>
                <input value={customHoliday} onChange={e => setCustomHoliday(e.target.value)}
                  placeholder="Днём строителя" className={inp} />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Свой текст (необязательно — заменит шаблон)</label>
            <textarea value={holidayCustomText} onChange={e => setHolidayCustomText(e.target.value)}
              rows={2} placeholder="Оставьте пустым для использования шаблона"
              className={`${inp} resize-none`} />
          </div>
          <button onClick={sendHoliday} disabled={holidaySending || !holidayPhone}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
            <Icon name="Send" size={14} />
            {holidaySending ? "Отправляю..." : "Отправить поздравление"}
          </button>
        </div>
      )}

      {/* Произвольное */}
      {tab === "schedule" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">Телефон *</label>
              <input value={manualPhone} onChange={e => setManualPhone(e.target.value)}
                placeholder="+79001234567" className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-600 block mb-1">ФИО (для персонализации)</label>
              <input value={manualName} onChange={e => setManualName(e.target.value)}
                placeholder="Иванов Иван Иванович" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Текст сообщения *</label>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)}
              rows={3} placeholder="Введите текст SMS..."
              className={`${inp} resize-none`} />
            <div className="text-xs text-neutral-400 mt-1">{manualText.length} символов</div>
          </div>
          <button onClick={sendManual} disabled={manualSending || !manualPhone || !manualText}
            className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-5 py-2 rounded-lg hover:bg-neutral-700 disabled:opacity-50 cursor-pointer">
            <Icon name="Send" size={14} />
            {manualSending ? "Отправляю..." : "Отправить SMS"}
          </button>
        </div>
      )}
    </div>
  );
}
