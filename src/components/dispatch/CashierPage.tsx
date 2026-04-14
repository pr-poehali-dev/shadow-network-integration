import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Icon from "@/components/ui/icon";
import { ScheduleRow, BILLS, fmt, today, TabMode } from "./cashierTypes";
import CashierBillsForm from "./CashierBillsForm";
import CashierRestrictionsTab from "./CashierRestrictionsTab";

export default function CashierPage() {
  const { user, hasAccess } = useAuth();
  const [tab, setTab] = useState<TabMode>("cashier");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [totalCash, setTotalCash] = useState(0);
  const [totalCashless, setTotalCashless] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeForm, setActiveForm] = useState<ScheduleRow | null>(null);
  const [expandedSummary, setExpandedSummary] = useState(false);

  const canManageRestrictions = hasAccess("cash_restrictions");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getCashierReport(date);
    setRows(data.rows || []);
    setTotalCash(Number(data.total_cash) || 0);
    setTotalCashless(Number(data.total_cashless) || 0);
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const filledCount = rows.filter(r => r.report_id != null).length;
  const totalGrand = totalCash + totalCashless;

  // Сводная покупюрная таблица
  const billTotals = BILLS.map(b => {
    const qty = rows.reduce((s, r) => s + (Number((r as Record<string,unknown>)[b.key]) || 0), 0);
    return { ...b, qty, sum: qty * b.value };
  });

  function handlePrint() {
    const [y, m, d] = date.split("-");
    const dateLabel = `${d}.${m}.${y}`;
    const filledRows = rows.filter(r => r.report_id != null);

    const billRows = billTotals
      .map(b => `
        <tr>
          <td style="padding:4px 10px;border:1px solid #e5e7eb;">${b.label}</td>
          <td style="padding:4px 10px;border:1px solid #e5e7eb;text-align:center;">× ${b.qty}</td>
          <td style="padding:4px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:${b.sum > 0 ? "600" : "400"};color:${b.sum > 0 ? "#111" : "#aaa"};">
            ${b.sum > 0 ? "= " + b.sum.toLocaleString("ru-RU", {minimumFractionDigits:2}) : "—"}
          </td>
        </tr>`)
      .join("");

    const vehicleRows = filledRows.map(r => {
      const cash = Number(r.cash_total) || 0;
      const cashless = Number(r.cashless_amount) || 0;
      return `
        <tr>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">Борт ${r.board_number || "—"}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${r.route_number}${r.graph_number != null ? ` / г.${r.graph_number}` : ""}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;">${r.driver_name || "—"}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">${cash.toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">${cashless > 0 ? cashless.toLocaleString("ru-RU",{minimumFractionDigits:2}) : "—"}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${(cash+cashless).toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
          <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:11px;color:#555;">${r.is_overtime ? "Подработка" : ""}${r.notes ? (r.is_overtime ? ", " : "") + r.notes : ""}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Кассовый отчёт ${dateLabel}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin: 20px 0 8px; color: #444; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th { background: #f3f4f6; padding: 5px 10px; border: 1px solid #e5e7eb; text-align: left; font-size: 12px; }
    .totals { display: flex; gap: 32px; margin: 12px 0 20px; }
    .total-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 20px; min-width: 160px; }
    .total-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .05em; }
    .total-box .value { font-size: 20px; font-weight: 700; margin-top: 2px; }
    .footer { margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { margin: 12px; } button { display: none; } }
  </style>
</head>
<body>
  <h1>Кассовый отчёт за ${dateLabel}</h1>
  <p style="color:#666;font-size:12px;">Составил: ${user?.full_name || "—"} · Сформировано: ${new Date().toLocaleString("ru-RU")}</p>

  <div class="totals">
    <div class="total-box">
      <div class="label">Наличные</div>
      <div class="value" style="color:#16a34a;">${totalCash.toLocaleString("ru-RU",{minimumFractionDigits:2})} ₽</div>
    </div>
    <div class="total-box">
      <div class="label">Безналичные</div>
      <div class="value" style="color:#2563eb;">${totalCashless.toLocaleString("ru-RU",{minimumFractionDigits:2})} ₽</div>
    </div>
    <div class="total-box">
      <div class="label">Итого</div>
      <div class="value">${(totalCash+totalCashless).toLocaleString("ru-RU",{minimumFractionDigits:2})} ₽</div>
    </div>
  </div>

  <h2>Покупюрная ведомость</h2>
  <table style="max-width:420px;">
    <thead>
      <tr>
        <th>Номинал</th>
        <th style="text-align:center;">Количество</th>
        <th style="text-align:right;">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${billRows}
      <tr style="background:#f3f4f6;font-weight:700;">
        <td colspan="2" style="padding:5px 10px;border:1px solid #e5e7eb;">Итого наличных</td>
        <td style="padding:5px 10px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;">${totalCash.toLocaleString("ru-RU",{minimumFractionDigits:2})} ₽</td>
      </tr>
    </tbody>
  </table>

  <h2>Детализация по транспортным средствам (${filledRows.length} ТС)</h2>
  <table>
    <thead>
      <tr>
        <th>Борт</th>
        <th>Маршрут / График</th>
        <th>Водитель</th>
        <th style="text-align:right;">Наличные</th>
        <th style="text-align:right;">Безнал</th>
        <th style="text-align:right;">Итого</th>
        <th>Примечание</th>
      </tr>
    </thead>
    <tbody>
      ${vehicleRows}
      <tr style="background:#f3f4f6;font-weight:700;">
        <td colspan="3" style="padding:5px 8px;border:1px solid #e5e7eb;">ИТОГО</td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#16a34a;">${totalCash.toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;color:#2563eb;">${totalCashless.toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
        <td style="padding:5px 8px;border:1px solid #e5e7eb;text-align:right;">${(totalCash+totalCashless).toLocaleString("ru-RU",{minimumFractionDigits:2})}</td>
        <td style="border:1px solid #e5e7eb;"></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Кассир: _________________________ / ${user?.full_name || "___________________"} /
    &nbsp;&nbsp;&nbsp;&nbsp; Подпись: _________________________
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-neutral-900">Касса</h1>
        <div className="flex items-center gap-2">
          {tab === "cashier" && filledCount > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 border border-neutral-300 text-neutral-700 text-sm px-3 py-2 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Icon name="Printer" size={15} />
              Распечатать отчёт
            </button>
          )}
          {canManageRestrictions && (
            <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
              {(["cashier", "restrictions"] as TabMode[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                    tab === t ? "bg-white text-neutral-900 shadow-sm font-medium" : "text-neutral-500 hover:text-neutral-700"
                  }`}>
                  {t === "cashier" ? "Отчёт кассира" : "Ограничения"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === "restrictions" ? (
        <CashierRestrictionsTab />
      ) : (
        <>
          {/* Дата */}
          <div className="flex items-center gap-3">
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d.toISOString().slice(0,10)); }}
              className="border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors">
              <Icon name="ChevronLeft" size={16} />
            </button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-neutral-500" />
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d.toISOString().slice(0,10)); }}
              className="border border-neutral-200 p-2 rounded hover:bg-neutral-100 cursor-pointer transition-colors">
              <Icon name="ChevronRight" size={16} />
            </button>
            <span className="text-xs text-neutral-400">{filledCount} из {rows.length} внесено</span>
          </div>

          {/* Итоговые карточки */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Наличные</div>
              <div className="text-2xl font-bold text-green-700">{fmt(totalCash)} ₽</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Безналичные</div>
              <div className="text-2xl font-bold text-blue-700">{fmt(totalCashless)} ₽</div>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <div className="text-xs text-neutral-600 font-medium uppercase tracking-wide mb-1">Итого</div>
              <div className="text-2xl font-bold text-neutral-900">{fmt(totalGrand)} ₽</div>
            </div>
          </div>

          {/* Сводная покупюрная таблица */}
          {filledCount > 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSummary(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer text-sm font-medium text-neutral-700"
              >
                <span>Сводная покупюрная таблица за день</span>
                <Icon name={expandedSummary ? "ChevronUp" : "ChevronDown"} size={16} />
              </button>
              {expandedSummary && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 text-xs text-neutral-500 border-t border-neutral-200">
                      <th className="px-4 py-2 text-left font-medium">Номинал</th>
                      <th className="px-4 py-2 text-center font-medium">× Кол-во</th>
                      <th className="px-4 py-2 text-right font-medium">= Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billTotals.map((b, i) => {
                      const showDivider = i === 8;
                      return (
                        <>
                          {showDivider && (
                            <tr key="div2">
                              <td colSpan={3} className="bg-neutral-100 px-4 py-1 text-xs text-neutral-400 font-medium border-t border-neutral-200">Монеты</td>
                            </tr>
                          )}
                          <tr key={b.key} className="border-t border-neutral-100">
                            <td className="px-4 py-1.5 font-medium text-neutral-800">{b.label}</td>
                            <td className="px-4 py-1.5 text-center font-mono text-neutral-600">
                              {b.qty > 0 ? `× ${b.qty}` : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className={`px-4 py-1.5 text-right font-mono ${b.sum > 0 ? "text-neutral-900 font-semibold" : "text-neutral-300"}`}>
                              {b.sum > 0 ? `= ${fmt(b.sum)}` : "—"}
                            </td>
                          </tr>
                        </>
                      );
                    })}
                    <tr className="border-t-2 border-neutral-300 bg-neutral-50">
                      <td colSpan={2} className="px-4 py-2 font-bold text-neutral-900">Итого наличных</td>
                      <td className="px-4 py-2 text-right font-bold text-green-700 font-mono">{fmt(totalCash)} ₽</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Список ТС */}
          {loading ? (
            <div className="text-sm text-neutral-400 text-center py-10">Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-neutral-400 text-center py-10">
              В расписании на эту дату нет записей
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map(row => {
                const hasFilled = row.report_id != null;
                const hasRestriction = !!row.restriction;
                return (
                  <div
                    key={row.schedule_entry_id}
                    onClick={() => setActiveForm(row)}
                    className={`border rounded-lg px-4 py-3 cursor-pointer hover:shadow-sm transition-all flex items-center gap-4 ${
                      hasRestriction
                        ? row.restriction!.restriction_type === "block"
                          ? "border-red-200 bg-red-50/50"
                          : "border-orange-200 bg-orange-50/50"
                        : hasFilled
                        ? "border-green-200 bg-green-50/30"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      hasFilled ? "bg-green-500" : "bg-neutral-300"
                    }`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-neutral-900 text-sm">
                          Борт {row.board_number || "—"}
                        </span>
                        {row.gov_number && (
                          <span className="text-xs border border-neutral-300 px-1.5 py-0.5 rounded text-neutral-600">{row.gov_number}</span>
                        )}
                        <span className="text-xs text-neutral-500">Маршрут {row.route_number}</span>
                        {row.graph_number != null && (
                          <span className="text-xs text-neutral-400">граф. {row.graph_number}</span>
                        )}
                        {row.is_overtime && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Icon name="Clock" size={10} /> Подработка
                          </span>
                        )}
                        {hasRestriction && (
                          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                            row.restriction!.restriction_type === "block"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            <Icon name="AlertTriangle" size={10} />
                            {row.restriction!.restriction_type === "block" ? "Запрет выдачи" : "Лимит"}
                          </span>
                        )}
                      </div>
                      {row.driver_name && (
                        <div className="text-xs text-neutral-400 mt-0.5">{row.driver_name}</div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {hasFilled ? (
                        <>
                          <div className="text-sm font-bold text-green-700">{fmt(row.cash_total)} ₽</div>
                          {Number(row.cashless_amount) > 0 && (
                            <div className="text-xs text-blue-600">+ {fmt(Number(row.cashless_amount))} безнал</div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-neutral-400">Не внесено</span>
                      )}
                    </div>

                    <Icon name="ChevronRight" size={14} className="text-neutral-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeForm && (
        <CashierBillsForm
          row={activeForm}
          date={date}
          onSaved={load}
          onClose={() => setActiveForm(null)}
        />
      )}
    </div>
  );
}
