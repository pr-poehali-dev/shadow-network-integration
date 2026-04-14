import { Accident, STATUS_LABELS, fmtDate } from "./bddTypes";

export function printAccidentReport(a: Accident) {
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Справка ДТП</title>
<style>
body{font-family:"Times New Roman",serif;font-size:11pt;padding:20mm}
h2{text-align:center;font-size:14pt;margin-bottom:2mm}
h3{text-align:center;font-size:11pt;font-weight:normal;margin-bottom:6mm}
.section{margin-top:5mm;border-bottom:1px solid #333;font-weight:bold;font-size:11pt;padding-bottom:1mm}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin-top:3mm}
.field{border-bottom:1px solid #aaa;padding-bottom:1mm;margin-bottom:1mm}
.label{font-size:8.5pt;color:#555}
.val{font-size:11pt;min-height:5mm}
.full{grid-column:1/-1}
.signature{margin-top:12mm;display:flex;justify-content:space-between;font-size:10pt}
.sign-line{display:inline-block;border-bottom:1px solid #000;min-width:55mm}
</style></head><body>
<h2>СПРАВКА ОБ ОБСТОЯТЕЛЬСТВАХ ДТП</h2>
<h3>${a.organization || "________________________________"}</h3>

<div class="section">I. ОБЩИЕ СВЕДЕНИЯ</div>
<div class="grid">
  <div class="field"><div class="label">Дата ДТП</div><div class="val">${fmtDate(a.accident_date)}</div></div>
  <div class="field"><div class="label">Время ДТП</div><div class="val">${a.accident_time || "—"}</div></div>
  <div class="field full"><div class="label">Место ДТП</div><div class="val">${a.location || "—"}</div></div>
  <div class="field"><div class="label">Статус расследования</div><div class="val">${STATUS_LABELS[a.status]?.label || a.status}</div></div>
  <div class="field"><div class="label">Вина</div><div class="val">${a.fault_side || "—"}</div></div>
</div>

<div class="section" style="margin-top:6mm">II. ТРАНСПОРТНОЕ СРЕДСТВО</div>
<div class="grid">
  <div class="field"><div class="label">Бортовой №</div><div class="val">${a.bus_board_number || "—"}</div></div>
  <div class="field"><div class="label">Гос. номер</div><div class="val">${a.bus_gov_number || "—"}</div></div>
  <div class="field"><div class="label">Модель ТС</div><div class="val">${a.bus_model || "—"}</div></div>
  <div class="field"><div class="label">Маршрут / График</div><div class="val">м.${a.route_number || "—"} / гр.${a.graph_number ?? "—"}</div></div>
</div>

<div class="section" style="margin-top:6mm">III. ВОДИТЕЛЬ</div>
<div class="grid">
  <div class="field"><div class="label">ФИО водителя</div><div class="val">${a.driver_name || "—"}</div></div>
  <div class="field"><div class="label">Номер ВУ</div><div class="val">${a.driver_license || "—"}</div></div>
</div>

<div class="section" style="margin-top:6mm">IV. УСЛОВИЯ ДТП</div>
<div class="grid">
  <div class="field"><div class="label">Погода</div><div class="val">${a.weather_conditions || "—"}</div></div>
  <div class="field"><div class="label">Состояние дороги</div><div class="val">${a.road_conditions || "—"}</div></div>
  <div class="field"><div class="label">Видимость</div><div class="val">${a.visibility || "—"}</div></div>
  <div class="field"><div class="label">Пострадавших</div><div class="val">${a.victims_count ?? 0} чел.</div></div>
  ${a.victims_info ? `<div class="field full"><div class="label">Сведения о пострадавших</div><div class="val">${a.victims_info}</div></div>` : ""}
</div>

<div class="section" style="margin-top:6mm">V. ОБСТОЯТЕЛЬСТВА И УЩЕРБ</div>
<div class="grid">
  <div class="field full"><div class="label">Описание обстоятельств</div><div class="val">${a.description || "—"}</div></div>
  ${a.other_vehicles ? `<div class="field full"><div class="label">Другие участники ДТП</div><div class="val">${a.other_vehicles}</div></div>` : ""}
  <div class="field full"><div class="label">Описание повреждений</div><div class="val">${a.damage_description || "—"}</div></div>
  <div class="field"><div class="label">Сумма ущерба</div><div class="val">${a.damage_amount ? a.damage_amount.toLocaleString("ru-RU") + " ₽" : "—"}</div></div>
</div>

${a.investigation_result ? `
<div class="section" style="margin-top:6mm">VI. РЕЗУЛЬТАТ РАССЛЕДОВАНИЯ</div>
<div class="grid">
  <div class="field"><div class="label">Ответственный</div><div class="val">${a.investigator_name || "—"}</div></div>
  <div class="field full"><div class="label">Вывод</div><div class="val">${a.investigation_result}</div></div>
</div>` : ""}

<div class="signature">
  <div>Составил: <span class="sign-line"></span></div>
  <div>Дата: <span class="sign-line" style="min-width:30mm"></span></div>
  <div>Подпись: <span class="sign-line" style="min-width:30mm"></span></div>
</div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export function printAccidentAct(a: Accident) {
  const num = `БДД-${a.id || "___"}-${new Date().getFullYear()}`;
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Акт о ДТП</title>
<style>
body{font-family:"Times New Roman",serif;font-size:12pt;padding:20mm}
h2{text-align:center;font-size:14pt}
h3{text-align:center;font-size:11pt;font-weight:normal;margin-bottom:8mm}
.right{text-align:right;font-size:10pt}
p{margin:4mm 0;line-height:1.7}
table{width:100%;border-collapse:collapse;margin:4mm 0}
td{padding:1.5mm 3mm;vertical-align:top}
.label{width:45%;color:#555;font-size:10pt}
.val{border-bottom:1px solid #aaa;font-size:11pt}
.sign-row{margin-top:12mm;display:flex;justify-content:space-between;font-size:10pt}
.sign-line{display:inline-block;border-bottom:1px solid #000;min-width:55mm}
</style></head><body>
<div class="right">${a.organization || "________________________________"}</div>
<h2>АКТ № ${num}</h2>
<h3>о дорожно-транспортном происшествии</h3>
<p>Дата составления: ${fmtDate(new Date().toISOString().slice(0, 10))}</p>
<table>
  <tr><td class="label">Дата и время ДТП:</td><td class="val">${fmtDate(a.accident_date)} ${a.accident_time || ""}</td></tr>
  <tr><td class="label">Место ДТП:</td><td class="val">${a.location || "—"}</td></tr>
  <tr><td class="label">Бортовой № / Гос. номер:</td><td class="val">${a.bus_board_number || "—"} / ${a.bus_gov_number || "—"}</td></tr>
  <tr><td class="label">Модель ТС:</td><td class="val">${a.bus_model || "—"}</td></tr>
  <tr><td class="label">Маршрут / График:</td><td class="val">№${a.route_number || "—"} / гр.${a.graph_number ?? "—"}</td></tr>
  <tr><td class="label">Водитель:</td><td class="val">${a.driver_name || "—"}</td></tr>
  <tr><td class="label">Номер ВУ:</td><td class="val">${a.driver_license || "—"}</td></tr>
  <tr><td class="label">Пострадавших:</td><td class="val">${a.victims_count ?? 0} чел.</td></tr>
  <tr><td class="label">Обстоятельства:</td><td class="val">${a.description || "—"}</td></tr>
  <tr><td class="label">Описание повреждений:</td><td class="val">${a.damage_description || "—"}</td></tr>
  <tr><td class="label">Предварительная сумма ущерба:</td><td class="val">${a.damage_amount ? a.damage_amount.toLocaleString("ru-RU") + " ₽" : "—"}</td></tr>
  <tr><td class="label">Вина:</td><td class="val">${a.fault_side || "—"}</td></tr>
  <tr><td class="label">Ответственный за расследование:</td><td class="val">${a.investigator_name || "—"}</td></tr>
</table>
<div class="sign-row">
  <div>Составил: <span class="sign-line"></span></div>
  <div>Руководитель: <span class="sign-line"></span></div>
</div>
<div class="sign-row" style="margin-top:6mm">
  <div>Водитель ознакомлен: <span class="sign-line"></span></div>
  <div>Дата: <span class="sign-line" style="min-width:30mm"></span></div>
</div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export function printDriverExplanation(a: Accident) {
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Объяснительная</title>
<style>
body{font-family:"Times New Roman",serif;font-size:12pt;padding:20mm}
.right{text-align:right;margin-bottom:8mm;font-size:11pt}
h2{text-align:center;font-size:14pt;margin-bottom:6mm}
p{margin:5mm 0;line-height:1.8}
.sign-row{margin-top:15mm;display:flex;justify-content:space-between}
.sign-line{display:inline-block;border-bottom:1px solid #000;min-width:55mm}
</style></head><body>
<div class="right">
  Руководителю<br/>
  ${a.organization || "________________________________"}<br/>
  от водителя: ${a.driver_name || "____________________________"}
</div>
<h2>ОБЪЯСНИТЕЛЬНАЯ ЗАПИСКА</h2>
<p>${fmtDate(a.accident_date)} в ${a.accident_time || "___:___"} я, ${a.driver_name || "____________________________"}, управляя транспортным средством ${a.bus_model || "____"}, государственный регистрационный знак ${a.bus_gov_number || "________"} (бортовой № ${a.bus_board_number || "____"}), следуя по маршруту № ${a.route_number || "____"} по графику № ${a.graph_number ?? "____"}, в районе <b>${a.location || "____________________________"}</b> допустил дорожно-транспортное происшествие.</p>
<p>Обстоятельства происшествия: <u>${a.description || "_____________________________________________________________________________________________________________________________"}</u></p>
<p>Другие участники ДТП: ${a.other_vehicles || "________________________________________________________"}</p>
<p>Пострадавших: ${a.victims_count ?? 0} чел. ${a.victims_info ? a.victims_info : ""}</p>
<p>Видимость: ${a.visibility || "____"}, погода: ${a.weather_conditions || "____"}, состояние дороги: ${a.road_conditions || "____"}.</p>
<p>Повреждения транспортного средства: ${a.damage_description || "_________________________________________________"}</p>
<div class="sign-row">
  <div>Дата: ${fmtDate(a.accident_date)}</div>
  <div>Подпись: <span class="sign-line"></span></div>
</div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
