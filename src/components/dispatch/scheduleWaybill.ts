import { Entry, formatDate } from "./scheduleTypes";

export function printWaybill(entry: Entry, date: string, orgName: string) {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8"/>
<title>Путевой лист № ${entry.id} от ${formatDate(date)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Times New Roman", serif; font-size: 11pt; color: #000; padding: 12mm 15mm; }
  .center { text-align: center; }
  .right { text-align: right; }
  h1 { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 2mm; }
  .subtitle { font-size: 10pt; text-align: center; margin-bottom: 4mm; }
  .form-num { font-size: 9pt; text-align: right; margin-bottom: 4mm; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  td, th { border: 1px solid #000; padding: 1.5mm 2mm; vertical-align: top; font-size: 10pt; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 9pt; }
  .no-border td { border: none; padding: 1mm 0; }
  .field-label { font-size: 8pt; color: #444; display: block; }
  .field-value { font-size: 11pt; font-weight: bold; border-bottom: 1px solid #000; min-height: 6mm; display: block; padding-bottom: 0.5mm; }
  .section-title { font-size: 10pt; font-weight: bold; background: #e8e8e8; padding: 1.5mm 2mm; margin: 3mm 0 1mm; border: 1px solid #aaa; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 3mm; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; margin-bottom: 3mm; }
  .field { margin-bottom: 3mm; }
  .sign-row { display: flex; align-items: flex-end; gap: 4mm; margin-top: 2mm; }
  .sign-line { border-bottom: 1px solid #000; flex: 1; min-height: 8mm; }
  .sign-label { font-size: 8pt; white-space: nowrap; }
  .stamp-box { border: 2px solid #aaa; width: 35mm; height: 20mm; display: inline-flex; align-items: center; justify-content: center; font-size: 8pt; color: #aaa; }
  .org-block { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4mm; }
  .org-info { max-width: 60%; }
  .okud { text-align: right; font-size: 8pt; }
  hr { border: none; border-top: 1px solid #000; margin: 2mm 0; }
  .small { font-size: 8pt; }
  @media print { body { padding: 8mm 10mm; } @page { margin: 0; size: A4; } }
</style>
</head>
<body>

<div class="org-block">
  <div class="org-info">
    <div class="field-label">Организация</div>
    <div class="field-value" style="font-size:12pt">${orgName || "___________________________"}</div>
    <div class="small" style="margin-top:1mm">ИНН _________________ ОГРН _________________</div>
  </div>
  <div class="okud">
    <div>Форма № 6 (автобус)</div>
    <div>ОКУД 0345008</div>
    <div style="margin-top:2mm">
      <table style="width:auto; font-size:8pt;">
        <tr><th>Серия</th><th>№</th></tr>
        <tr><td style="padding:1mm 3mm">ПЛ</td><td style="padding:1mm 3mm">${String(entry.id).padStart(7, "0")}</td></tr>
      </table>
    </div>
  </div>
</div>

<h1>ПУТЕВОЙ ЛИСТ АВТОБУСА</h1>
<div class="subtitle">для маршрутных регулярных перевозок пассажиров</div>

<div class="grid3" style="margin-top:4mm">
  <div class="field">
    <span class="field-label">Дата выдачи</span>
    <span class="field-value">${formatDate(date)}</span>
  </div>
  <div class="field">
    <span class="field-label">Маршрут №</span>
    <span class="field-value">${entry.route_number || "—"}</span>
  </div>
  <div class="field">
    <span class="field-label">График (смена) №</span>
    <span class="field-value">${entry.graph_number ?? "—"}</span>
  </div>
</div>

<div class="section-title">1. Транспортное средство</div>
<div class="grid3">
  <div class="field">
    <span class="field-label">Марка, модель</span>
    <span class="field-value">${entry.bus_model || "_______________"}</span>
  </div>
  <div class="field">
    <span class="field-label">Гос. регистрационный знак</span>
    <span class="field-value">${entry.board_number ? `борт ${entry.board_number}` : "_______________"}</span>
  </div>
  <div class="field">
    <span class="field-label">Бортовой номер</span>
    <span class="field-value">${entry.board_number || "_______________"}</span>
  </div>
</div>
<div class="grid2">
  <div class="field">
    <span class="field-label">Показания одометра — выезд (км)</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
  <div class="field">
    <span class="field-label">Показания одометра — заезд (км)</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
</div>

<div class="section-title">2. Водитель</div>
<div class="grid2">
  <div class="field">
    <span class="field-label">Фамилия, имя, отчество</span>
    <span class="field-value">${entry.driver_name || "___________________________________"}</span>
  </div>
  <div class="field">
    <span class="field-label">Табельный номер</span>
    <span class="field-value">&nbsp;</span>
  </div>
</div>
<div class="grid3">
  <div class="field">
    <span class="field-label">Номер водительского удостоверения</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
  <div class="field">
    <span class="field-label">Категория</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
  <div class="field">
    <span class="field-label">Класс</span>
    <span class="field-value" style="min-height:7mm">&nbsp;</span>
  </div>
</div>

<div class="section-title">3. Работа водителя и автобуса</div>
<table>
  <thead>
    <tr>
      <th rowspan="2">Выезд из гаража</th>
      <th rowspan="2">Заезд в гараж</th>
      <th colspan="2">Нулевой пробег (км)</th>
      <th rowspan="2">Пробег<br/>с пасс. (км)</th>
      <th rowspan="2">Всего<br/>пробег (км)</th>
      <th colspan="2">Время работы</th>
    </tr>
    <tr>
      <th>из гаража</th>
      <th>до гаража</th>
      <th>факт</th>
      <th>нормируемое</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="min-height:10mm; height:10mm">&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </tbody>
</table>

<div class="section-title">4. Задание водителю</div>
<table>
  <thead>
    <tr>
      <th>Маршрут</th>
      <th>Время выхода</th>
      <th>Время захода</th>
      <th>Количество рейсов по план.</th>
      <th>Количество рейсов факт.</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="height:10mm">Маршрут № ${entry.route_number || "—"} ${entry.route_name || ""}</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </tbody>
</table>

<div class="section-title">5. Топливо</div>
<table>
  <thead>
    <tr>
      <th>Марка топлива</th>
      <th>Выдано по норме (л)</th>
      <th>Выдано фактически (л)</th>
      <th>Остаток при выезде (л)</th>
      <th>Остаток при заезде (л)</th>
      <th>Расход по норме (л)</th>
      <th>Расход фактический (л)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="height:10mm">ДТ</td>
      <td>&nbsp;</td>
      <td>${entry.fuel_spent ?? "&nbsp;"}</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>${entry.fuel_spent ?? "&nbsp;"}</td>
    </tr>
  </tbody>
</table>

<div class="section-title">6. Медицинский осмотр водителя</div>
<div class="grid2" style="margin-top:2mm">
  <div>
    <div class="small" style="margin-bottom:2mm">Предсменный осмотр</div>
    <div style="display:flex; gap:4mm; align-items:center;">
      <div>
        <span class="field-label">Время</span>
        <span class="field-value" style="width:20mm; display:inline-block">&nbsp;</span>
      </div>
      <div>
        <span class="field-label">Допущен / Не допущен</span>
        <span class="field-value" style="width:30mm; display:inline-block">&nbsp;</span>
      </div>
    </div>
    <div class="sign-row" style="margin-top:3mm">
      <span class="sign-label">Медицинский работник</span>
      <div class="sign-line"></div>
      <span class="sign-label">(подпись)</span>
    </div>
  </div>
  <div>
    <div class="small" style="margin-bottom:2mm">Послесменный осмотр</div>
    <div style="display:flex; gap:4mm; align-items:center;">
      <div>
        <span class="field-label">Время</span>
        <span class="field-value" style="width:20mm; display:inline-block">&nbsp;</span>
      </div>
      <div>
        <span class="field-label">Допущен / Не допущен</span>
        <span class="field-value" style="width:30mm; display:inline-block">&nbsp;</span>
      </div>
    </div>
    <div class="sign-row" style="margin-top:3mm">
      <span class="sign-label">Медицинский работник</span>
      <div class="sign-line"></div>
      <span class="sign-label">(подпись)</span>
    </div>
  </div>
</div>

<div class="section-title">7. Технический осмотр и выпуск на линию</div>
<div class="grid2" style="margin-top:2mm">
  <div>
    <div class="sign-row">
      <span class="sign-label">Автомобиль технически исправен. Механик</span>
      <div class="sign-line"></div>
    </div>
    <div class="sign-row" style="margin-top:2mm">
      <span class="sign-label">Подпись</span>
      <div class="sign-line"></div>
      <span class="sign-label">Дата и время выпуска</span>
      <div class="sign-line"></div>
    </div>
  </div>
  <div>
    <div class="sign-row">
      <span class="sign-label">Сдал смену. Механик</span>
      <div class="sign-line"></div>
    </div>
    <div class="sign-row" style="margin-top:2mm">
      <span class="sign-label">Подпись</span>
      <div class="sign-line"></div>
      <span class="sign-label">Дата и время заезда</span>
      <div class="sign-line"></div>
    </div>
  </div>
</div>

<div style="margin-top:4mm">
  <div class="sign-row">
    <span class="sign-label">Водитель (подпись)</span>
    <div class="sign-line"></div>
    <span class="sign-label">Диспетчер (подпись)</span>
    <div class="sign-line"></div>
    <span class="sign-label">Выдан «___» _________ ${new Date(date).getFullYear()} г.</span>
  </div>
</div>

<div style="margin-top:4mm; text-align:right; font-size:8pt; color:#666">
  Сформировано: ${new Date().toLocaleString("ru")}
</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

export function handlePrint(date: string, entries: Entry[]) {
  const rows = entries.map(e => {
    const total = e.revenue_total ?? (((e.revenue_cash ?? 0) + (e.revenue_cashless ?? 0)) || null);
    return `
    <tr>
      <td>${e.route_number}${e.graph_number ? ` <small>(гр.${e.graph_number})</small>` : ""}${e.route_name ? `<br/><small>${e.route_name}</small>` : ""}</td>
      <td>${e.board_number ?? "—"}${e.bus_model ? `<br/><small>${e.bus_model}</small>` : ""}</td>
      <td>${e.driver_name ?? "—"}</td>
      <td>${e.conductor_name ?? "—"}</td>
      <td>${e.terminal_name ?? "—"}</td>
      <td style="text-align:right">${e.fuel_spent != null ? e.fuel_spent + " л" : "—"}</td>
      <td style="text-align:right">${e.revenue_cash != null ? e.revenue_cash.toFixed(2) : "—"}</td>
      <td style="text-align:right">${e.revenue_cashless != null ? e.revenue_cashless.toFixed(2) : "—"}</td>
      <td style="text-align:right; font-weight:600">${total != null ? total.toFixed(2) : "—"}</td>
      <td style="text-align:center">${e.tickets_sold ?? "—"}</td>
    </tr>
  `;}).join("");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Расписание ${formatDate(date)}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
    h2 { font-size: 16px; margin-bottom: 4px; }
    p.sub { color: #555; font-size: 11px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; border: 1px solid #ddd; }
    td { padding: 6px 8px; border: 1px solid #ddd; vertical-align: top; }
    td small { color: #777; font-size: 10px; }
    tr:nth-child(even) td { background: #fafafa; }
    .footer { margin-top: 24px; font-size: 11px; color: #aaa; text-align: right; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>
  <h2>Расписание на ${formatDate(date)}</h2>
  <p class="sub">RoutePayroll — сформировано ${new Date().toLocaleString("ru")}</p>
  <table>
    <thead>
      <tr><th>Маршрут</th><th>Борт №</th><th>Водитель</th><th>Кондуктор</th><th>Терминал</th><th style="text-align:right">ДТ, л</th><th style="text-align:right">Нал.</th><th style="text-align:right">Безнал.</th><th style="text-align:right">Итого</th><th style="text-align:center">Билеты</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Всего записей: ${entries.length}</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}
