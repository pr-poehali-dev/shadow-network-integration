import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

// ---- Типы ----
interface Driver {
  id: number; full_name: string; phone?: string; birth_date?: string;
  snils?: string; inn?: string; license_number?: string; license_date?: string;
  is_official: boolean;
}
interface Conductor {
  id: number; full_name: string; phone?: string; birth_date?: string; snils?: string; inn?: string;
}
interface StaffMember {
  id: number; position: string; full_name: string; phone?: string; birth_date?: string;
  snils?: string; inn?: string; passport_series?: string; passport_number?: string;
  passport_issued_by?: string; passport_issued_date?: string; address?: string;
  hire_date?: string; fire_date?: string; organization?: string; is_official: boolean; is_active: boolean; notes?: string;
}

const POSITION_LABELS: Record<string, string> = {
  driver: "Водитель", conductor: "Кондуктор", locksmith: "Слесарь",
  accountant_staff: "Бухгалтер", cashier_staff: "Кассир", guard: "Сторож",
  mechanic_staff: "Механик", cleaning: "Клинер", medical: "Медик", other: "Прочее",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
function age(birth?: string | null): string {
  if (!birth) return "—";
  const b = new Date(birth);
  const diff = Date.now() - b.getTime();
  return String(Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

// ---------- ОТЧЁТ 1: Штатное расписание ----------
function printStaffingReport(
  allStaff: StaffMember[],
  drivers: Driver[],
  conductors: Conductor[],
  org: string
) {
  const groups: Record<string, { position: string; count: number; official: number }> = {};

  const addGroup = (position: string, isOfficial: boolean) => {
    if (!groups[position]) groups[position] = { position, count: 0, official: 0 };
    groups[position].count++;
    if (isOfficial) groups[position].official++;
  };

  drivers.forEach(d => addGroup("driver", d.is_official));
  conductors.forEach(c => addGroup("conductor", true));
  allStaff.forEach(s => addGroup(s.position, s.is_official));

  const rows = Object.values(groups).map((g, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${POSITION_LABELS[g.position] || g.position}</td>
      <td class="c">${g.count}</td>
      <td class="c">${g.official}</td>
      <td class="c">${g.count - g.official}</td>
    </tr>`).join("");

  const total = Object.values(groups).reduce((s, g) => s + g.count, 0);
  const totalOfficial = Object.values(groups).reduce((s, g) => s + g.official, 0);

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Штатное расписание</title>
<style>body{font-family:Arial,sans-serif;font-size:11pt;padding:15mm}h2{text-align:center;font-size:14pt;margin-bottom:2mm}.org{text-align:center;margin-bottom:6mm;font-size:10pt}table{width:100%;border-collapse:collapse;margin-top:4mm}th,td{border:1px solid #000;padding:3mm 4mm;font-size:10pt}.c{text-align:center}th{background:#f0f0f0}.footer{margin-top:8mm;font-size:10pt}.sign-row{margin-top:6mm;display:flex;gap:20mm}.sign-line{border-bottom:1px solid #000;min-width:60mm;display:inline-block}</style>
</head><body>
<h2>ШТАТНОЕ РАСПИСАНИЕ</h2>
<div class="org">${org || "________________________________"} &nbsp; Дата: ${fmtDate(new Date().toISOString().slice(0, 10))}</div>
<table>
<thead><tr><th class="c">№</th><th>Должность</th><th class="c">Всего</th><th class="c">Официальных</th><th class="c">Неофициальных</th></tr></thead>
<tbody>${rows}
<tr style="font-weight:bold"><td class="c" colspan="2">ИТОГО</td><td class="c">${total}</td><td class="c">${totalOfficial}</td><td class="c">${total - totalOfficial}</td></tr>
</tbody></table>
<div class="footer"><div class="sign-row"><span>Руководитель: <span class="sign-line"></span></span><span>Начальник ОК: <span class="sign-line"></span></span></div></div>
</body></html>`;
  pop(html, "Штатное расписание");
}

// ---------- ОТЧЁТ 2: Список сотрудников (унифицированная форма) ----------
function printEmployeeList(
  allStaff: StaffMember[],
  drivers: Driver[],
  conductors: Conductor[],
  org: string
) {
  type Row = { num: number; fio: string; position: string; birth?: string; snils?: string; inn?: string; phone?: string; hire?: string; official: boolean };
  const rows: Row[] = [];
  let num = 1;
  drivers.forEach(d => rows.push({ num: num++, fio: d.full_name, position: "Водитель", birth: d.birth_date, snils: d.snils, inn: d.inn, phone: d.phone, hire: undefined, official: d.is_official }));
  conductors.forEach(c => rows.push({ num: num++, fio: c.full_name, position: "Кондуктор", birth: c.birth_date, snils: c.snils, inn: c.inn, phone: c.phone, hire: undefined, official: true }));
  allStaff.filter(s => s.is_active).forEach(s => rows.push({ num: num++, fio: s.full_name, position: POSITION_LABELS[s.position] || s.position, birth: s.birth_date, snils: s.snils, inn: s.inn, phone: s.phone, hire: s.hire_date, official: s.is_official }));

  const trs = rows.map(r => `<tr>
    <td class="c">${r.num}</td>
    <td>${r.fio}</td>
    <td>${r.position}</td>
    <td class="c">${fmtDate(r.birth)}</td>
    <td class="c">${r.snils || "—"}</td>
    <td class="c">${r.inn || "—"}</td>
    <td>${r.phone || "—"}</td>
    <td class="c">${fmtDate(r.hire)}</td>
    <td class="c">${r.official ? "Офиц." : "Неофиц."}</td>
  </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Список сотрудников</title>
<style>body{font-family:Arial,sans-serif;font-size:9pt;padding:10mm 12mm}h2{text-align:center;font-size:12pt;margin-bottom:2mm}.org{text-align:center;margin-bottom:5mm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:2mm 3mm;font-size:8.5pt}.c{text-align:center}th{background:#f0f0f0}@media print{@page{size:A4 landscape;margin:8mm}}</style>
</head><body>
<h2>СПИСОК СОТРУДНИКОВ</h2>
<div class="org">${org || "________________________________"} &nbsp; по состоянию на ${fmtDate(new Date().toISOString().slice(0, 10))}</div>
<table>
<thead><tr><th class="c">№</th><th>ФИО</th><th>Должность</th><th class="c">Дата рожд.</th><th class="c">СНИЛС</th><th class="c">ИНН</th><th>Телефон</th><th class="c">Принят</th><th class="c">Оформление</th></tr></thead>
<tbody>${trs}</tbody></table>
<div style="margin-top:6mm;font-size:9pt">Всего сотрудников: <b>${rows.length}</b></div>
</body></html>`;
  pop(html, "Список сотрудников");
}

// ---------- ОТЧЁТ 3: Личная карточка сотрудника (Т-2) ----------
function printPersonalCard(person: StaffMember | Driver | Conductor, position: string) {
  const s = person as Record<string, unknown>;
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Личная карточка</title>
<style>
body{font-family:"Times New Roman",serif;font-size:10pt;padding:15mm}
h2{text-align:center;font-size:13pt;margin-bottom:1mm}
.sub{text-align:center;font-size:9pt;margin-bottom:6mm;color:#555}
.section{margin-top:5mm;border-left:3px solid #333;padding-left:3mm;font-weight:bold;font-size:10pt}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin-top:3mm}
.field{border-bottom:1px solid #aaa;padding-bottom:1mm}
.label{font-size:8pt;color:#666;margin-bottom:0.5mm}
.val{font-size:10pt;min-height:5mm}
.full{grid-column:1/-1}
.signature{margin-top:10mm;display:flex;justify-content:space-between;font-size:9pt}
.sign-line{display:inline-block;border-bottom:1px solid #000;min-width:50mm}
</style></head><body>
<h2>ЛИЧНАЯ КАРТОЧКА РАБОТНИКА</h2>
<div class="sub">Унифицированная форма № Т-2</div>

<div class="section">I. ОБЩИЕ СВЕДЕНИЯ</div>
<div class="grid">
  <div class="field full"><div class="label">Фамилия, имя, отчество</div><div class="val">${s.full_name || "—"}</div></div>
  <div class="field"><div class="label">Должность</div><div class="val">${POSITION_LABELS[position] || position}</div></div>
  <div class="field"><div class="label">Дата рождения</div><div class="val">${fmtDate(s.birth_date as string)}</div></div>
  <div class="field"><div class="label">Телефон</div><div class="val">${s.phone || "—"}</div></div>
  <div class="field"><div class="label">ИНН</div><div class="val">${s.inn || "—"}</div></div>
  <div class="field"><div class="label">СНИЛС</div><div class="val">${s.snils || "—"}</div></div>
  <div class="field full"><div class="label">Адрес места жительства</div><div class="val">${(s as StaffMember).address || "—"}</div></div>
</div>

<div class="section" style="margin-top:6mm">II. ДОКУМЕНТ, УДОСТОВЕРЯЮЩИЙ ЛИЧНОСТЬ</div>
<div class="grid">
  <div class="field"><div class="label">Серия паспорта</div><div class="val">${(s as StaffMember).passport_series || "—"}</div></div>
  <div class="field"><div class="label">Номер паспорта</div><div class="val">${(s as StaffMember).passport_number || "—"}</div></div>
  <div class="field full"><div class="label">Кем выдан</div><div class="val">${(s as StaffMember).passport_issued_by || "—"}</div></div>
  <div class="field"><div class="label">Дата выдачи</div><div class="val">${fmtDate((s as StaffMember).passport_issued_date)}</div></div>
</div>

<div class="section" style="margin-top:6mm">III. ПРИЁМ НА РАБОТУ</div>
<div class="grid">
  <div class="field"><div class="label">Дата приёма</div><div class="val">${fmtDate((s as StaffMember).hire_date)}</div></div>
  <div class="field"><div class="label">Дата увольнения</div><div class="val">${fmtDate((s as StaffMember).fire_date)}</div></div>
  <div class="field"><div class="label">Организация</div><div class="val">${(s as StaffMember).organization || "—"}</div></div>
  <div class="field"><div class="label">Оформление</div><div class="val">${(s as StaffMember).is_official ? "Официальное" : "Неофициальное"}</div></div>
</div>

${(s as Driver).license_number ? `
<div class="section" style="margin-top:6mm">IV. ВОДИТЕЛЬСКОЕ УДОСТОВЕРЕНИЕ</div>
<div class="grid">
  <div class="field"><div class="label">Серия и номер ВУ</div><div class="val">${(s as Driver).license_number}</div></div>
  <div class="field"><div class="label">Дата выдачи ВУ</div><div class="val">${fmtDate((s as Driver).license_date)}</div></div>
</div>` : ""}

<div class="signature">
  <div>Работник: <span class="sign-line"></span> / ${s.full_name} /</div>
  <div>Специалист ОК: <span class="sign-line"></span></div>
</div>
</body></html>`;
  pop(html, `Личная карточка — ${s.full_name}`);
}

// ---------- ОТЧЁТ 4: Приказ о приёме на работу ----------
function printHireOrder(person: StaffMember | Driver, position: string, org: string) {
  const s = person as Record<string, unknown>;
  const num = `${new Date().getFullYear()}-П-${(person.id || 1).toString().padStart(3, "0")}`;
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Приказ о приёме</title>
<style>body{font-family:"Times New Roman",serif;font-size:12pt;padding:20mm}h2{text-align:center;font-size:14pt}h3{text-align:center;font-size:12pt;font-weight:normal;margin-bottom:8mm}.body{line-height:1.8}.right{text-align:right}.underline{border-bottom:1px solid #000;display:inline-block;min-width:80mm}.signature{margin-top:15mm;display:flex;justify-content:space-between}</style>
</head><body>
<div class="right">${org || "________________________________"}</div>
<h2>ПРИКАЗ № ${num}</h2>
<h3>о приёме работника на работу</h3>
<div class="body">
<p>г. ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
<p style="margin-top:5mm">ПРИНЯТЬ на работу:</p>
<table style="width:100%;margin-top:3mm;border-collapse:collapse">
  <tr><td style="width:40%;color:#555;padding:2mm 0">ФИО работника:</td><td style="border-bottom:1px solid #aaa;padding:2mm 4mm"><b>${s.full_name || "—"}</b></td></tr>
  <tr><td style="color:#555;padding:2mm 0">Должность:</td><td style="border-bottom:1px solid #aaa;padding:2mm 4mm">${POSITION_LABELS[position] || position}</td></tr>
  <tr><td style="color:#555;padding:2mm 0">Дата приёма:</td><td style="border-bottom:1px solid #aaa;padding:2mm 4mm">${fmtDate((s as StaffMember).hire_date) || fmtDate(new Date().toISOString().slice(0, 10))}</td></tr>
  <tr><td style="color:#555;padding:2mm 0">Характер работы:</td><td style="border-bottom:1px solid #aaa;padding:2mm 4mm">${(s as StaffMember).is_official ? "Трудовой договор" : "Договор ГПХ"}</td></tr>
</table>
</div>
<div class="signature">
  <div>Руководитель: <span class="underline"></span></div>
  <div>Работник ознакомлен: <span class="underline"></span></div>
</div>
</body></html>`;
  pop(html, `Приказ о приёме — ${s.full_name}`);
}

// ---------- ОТЧЁТ 5: Приказ об увольнении ----------
function printFireOrder(person: StaffMember | Driver, position: string, org: string) {
  const s = person as Record<string, unknown>;
  const num = `${new Date().getFullYear()}-У-${(person.id || 1).toString().padStart(3, "0")}`;
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Приказ об увольнении</title>
<style>body{font-family:"Times New Roman",serif;font-size:12pt;padding:20mm}h2{text-align:center;font-size:14pt}h3{text-align:center;font-size:12pt;font-weight:normal;margin-bottom:8mm}.right{text-align:right}.underline{border-bottom:1px solid #000;display:inline-block;min-width:80mm}.signature{margin-top:15mm;display:flex;justify-content:space-between}</style>
</head><body>
<div class="right">${org || "________________________________"}</div>
<h2>ПРИКАЗ № ${num}</h2>
<h3>о прекращении (расторжении) трудового договора с работником (увольнении)</h3>
<div>
<p>г. ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
<table style="width:100%;margin-top:5mm;border-collapse:collapse">
  <tr><td style="width:40%;color:#555;padding:2mm 0">ФИО работника:</td><td style="border-bottom:1px solid #aaa;padding:2mm 4mm"><b>${s.full_name || "—"}</b></td></tr>
  <tr><td style="color:#555;padding:2mm 0">Должность:</td><td style="border-bottom:1px solid #aaa;padding:2mm 4mm">${POSITION_LABELS[position] || position}</td></tr>
  <tr><td style="color:#555;padding:2mm 0">Дата увольнения:</td><td style="border-bottom:1px solid #aaa;padding:2mm 4mm">${fmtDate((s as StaffMember).fire_date) || fmtDate(new Date().toISOString().slice(0, 10))}</td></tr>
  <tr><td style="color:#555;padding:2mm 0">Основание:</td><td style="border-bottom:1px solid #aaa;padding:2mm 4mm">Пункт 3 части 1 статьи 77 ТК РФ (по собственному желанию)</td></tr>
</table>
</div>
<div class="signature">
  <div>Руководитель: <span class="underline"></span></div>
  <div>Работник ознакомлен: <span class="underline"></span></div>
</div>
</body></html>`;
  pop(html, `Приказ об увольнении — ${s.full_name}`);
}

// ---------- ОТЧЁТ 6: Справка о численности ----------
function printHeadcountReport(
  allStaff: StaffMember[],
  drivers: Driver[],
  conductors: Conductor[],
  org: string
) {
  const active = allStaff.filter(s => s.is_active);
  const total = drivers.length + conductors.length + active.length;
  const official = drivers.filter(d => d.is_official).length + active.filter(s => s.is_official).length + conductors.length;
  const unofficial = total - official;

  const byPos: Record<string, number> = {};
  drivers.forEach(() => { byPos["driver"] = (byPos["driver"] || 0) + 1; });
  conductors.forEach(() => { byPos["conductor"] = (byPos["conductor"] || 0) + 1; });
  active.forEach(s => { byPos[s.position] = (byPos[s.position] || 0) + 1; });

  const rows = Object.entries(byPos).map(([pos, cnt], i) => `
    <tr><td class="c">${i + 1}</td><td>${POSITION_LABELS[pos] || pos}</td><td class="c">${cnt}</td></tr>`).join("");

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Справка о численности</title>
<style>body{font-family:"Times New Roman",serif;font-size:11pt;padding:20mm}h2{text-align:center;font-size:14pt}h3{text-align:center;font-size:11pt;font-weight:normal;margin-bottom:6mm}table{width:60%;border-collapse:collapse;margin:4mm auto}th,td{border:1px solid #000;padding:2mm 4mm}.c{text-align:center}th{background:#f0f0f0}.total{font-weight:bold}.info{margin:5mm 0;line-height:1.8}.signature{margin-top:10mm;display:flex;justify-content:space-between;font-size:10pt}</style>
</head><body>
<h2>СПРАВКА О ЧИСЛЕННОСТИ РАБОТНИКОВ</h2>
<h3>${org || "________________________________"} по состоянию на ${fmtDate(new Date().toISOString().slice(0, 10))}</h3>
<table>
<thead><tr><th class="c">№</th><th>Должность</th><th class="c">Кол-во</th></tr></thead>
<tbody>${rows}
<tr class="total"><td class="c" colspan="2">ИТОГО</td><td class="c">${total}</td></tr></tbody></table>
<div class="info">
  <p>Из них официально оформленных: <b>${official}</b> чел.</p>
  <p>Не официально оформленных: <b>${unofficial}</b> чел.</p>
</div>
<div class="signature">
  <div>Руководитель: ____________________</div>
  <div>Начальник ОК: ____________________</div>
  <div>Дата: ____________________</div>
</div>
</body></html>`;
  pop(html, "Справка о численности");
}

// ---------- ОТЧЁТ 7: Список на выдачу медкнижек / документов ----------
function printDocumentList(
  allStaff: StaffMember[],
  drivers: Driver[],
  conductors: Conductor[],
  org: string
) {
  type Row = { num: number; fio: string; position: string; birth?: string; hire?: string };
  const rows: Row[] = [];
  let n = 1;
  drivers.forEach(d => rows.push({ num: n++, fio: d.full_name, position: "Водитель", birth: d.birth_date }));
  conductors.forEach(c => rows.push({ num: n++, fio: c.full_name, position: "Кондуктор", birth: c.birth_date }));
  allStaff.filter(s => s.is_active).forEach(s => rows.push({ num: n++, fio: s.full_name, position: POSITION_LABELS[s.position] || s.position, birth: s.birth_date, hire: s.hire_date }));

  const trs = rows.map(r => `<tr>
    <td class="c">${r.num}</td><td>${r.fio}</td><td>${r.position}</td>
    <td class="c">${fmtDate(r.birth)}</td>
    <td class="c">${fmtDate(r.hire)}</td>
    <td></td><td></td>
  </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"/>
<title>Список документов</title>
<style>body{font-family:Arial,sans-serif;font-size:9pt;padding:10mm}h2{text-align:center;font-size:12pt;margin-bottom:1mm}.org{text-align:center;margin-bottom:4mm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:1.5mm 2.5mm}.c{text-align:center}th{background:#f0f0f0;font-size:8pt}</style>
</head><body>
<h2>СПИСОК СОТРУДНИКОВ ДЛЯ КАДРОВОГО УЧЁТА</h2>
<div class="org">${org || "________________________________"} — ${fmtDate(new Date().toISOString().slice(0, 10))}</div>
<table>
<thead><tr>
  <th class="c">№</th><th>ФИО</th><th>Должность</th>
  <th class="c">Дата рожд.</th><th class="c">Дата приёма</th>
  <th>Медкнижка №</th><th>Примечание</th>
</tr></thead>
<tbody>${trs}</tbody></table>
<div style="margin-top:5mm;font-size:9pt">Всего: <b>${rows.length}</b> чел.</div>
</body></html>`;
  pop(html, "Список документов");
}

// ---------- Вспомогательная функция печати ----------
function pop(html: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ---------- Главный компонент ----------
interface HRReportsProps {
  organization: string;
}

export default function HRReports({ organization }: HRReportsProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<string>("");
  const [selectedReport, setSelectedReport] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDrivers(),
      api.getConductors(),
      api.getStaff(organization ? { show_inactive: "1", organization } : { show_inactive: "1" }),
    ]).then(([d, c, s]) => {
      setDrivers(Array.isArray(d) ? d : []);
      setConductors(Array.isArray(c) ? c : []);
      setStaff(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, [organization]);

  // Все люди для личной карточки
  const allPeople = [
    ...drivers.map(d => ({ id: `driver-${d.id}`, label: `${d.full_name} (Водитель)`, person: d, position: "driver" })),
    ...conductors.map(c => ({ id: `conductor-${c.id}`, label: `${c.full_name} (Кондуктор)`, person: c, position: "conductor" })),
    ...staff.map(s => ({ id: `staff-${s.id}`, label: `${s.full_name} (${POSITION_LABELS[s.position] || s.position})`, person: s, position: s.position })),
  ];

  const activePeople = allPeople.filter(p => {
    const s = p.person as StaffMember;
    if (p.position === "driver" || p.position === "conductor") return true;
    return s.is_active !== false;
  });

  const selectedPersonData = allPeople.find(p => p.id === selectedPerson);

  const REPORTS = [
    { id: "staffing", label: "Штатное расписание", icon: "LayoutList", desc: "Список должностей с количеством сотрудников по каждой" },
    { id: "employee_list", label: "Список сотрудников", icon: "Users", desc: "Унифицированный список всех работников с личными данными" },
    { id: "headcount", label: "Справка о численности", icon: "BarChart2", desc: "Сводная справка с разбивкой по официальным/неофициальным" },
    { id: "document_list", label: "Список для кадрового учёта", icon: "ClipboardList", desc: "Форма со столбцами для медкнижек и примечаний" },
    { id: "personal_card", label: "Личная карточка (Т-2)", icon: "User", desc: "Карточка конкретного сотрудника — выберите человека ниже", needPerson: true },
    { id: "hire_order", label: "Приказ о приёме", icon: "FilePlus", desc: "Приказ о приёме на работу для выбранного сотрудника", needPerson: true },
    { id: "fire_order", label: "Приказ об увольнении", icon: "FileX", desc: "Приказ о прекращении трудового договора", needPerson: true },
  ];

  function runReport(reportId: string) {
    const orgName = organization || "";
    switch (reportId) {
      case "staffing":
        printStaffingReport(staff, drivers, conductors, orgName);
        break;
      case "employee_list":
        printEmployeeList(staff, drivers, conductors, orgName);
        break;
      case "headcount":
        printHeadcountReport(staff, drivers, conductors, orgName);
        break;
      case "document_list":
        printDocumentList(staff, drivers, conductors, orgName);
        break;
      case "personal_card":
        if (selectedPersonData) printPersonalCard(selectedPersonData.person, selectedPersonData.position);
        break;
      case "hire_order":
        if (selectedPersonData) printHireOrder(selectedPersonData.person as StaffMember, selectedPersonData.position, orgName);
        break;
      case "fire_order":
        if (selectedPersonData) printFireOrder(selectedPersonData.person as StaffMember, selectedPersonData.position, orgName);
        break;
    }
  }

  if (loading) return <div className="text-sm text-neutral-400 text-center py-10">Загрузка данных...</div>;

  const total = drivers.length + conductors.length + staff.filter(s => s.is_active).length;
  const official = drivers.filter(d => d.is_official).length + staff.filter(s => s.is_active && s.is_official).length + conductors.length;

  return (
    <div className="space-y-6">
      {/* Сводка */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-1">Всего сотрудников</div>
          <div className="text-3xl font-bold text-neutral-900">{total}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Официальных</div>
          <div className="text-3xl font-bold text-blue-700">{official}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">Неофициальных</div>
          <div className="text-3xl font-bold text-amber-700">{total - official}</div>
        </div>
      </div>

      <div className="text-sm font-semibold text-neutral-700">Кадровые документы и отчёты</div>

      {/* Список отчётов */}
      <div className="grid grid-cols-1 gap-3">
        {REPORTS.map(r => {
          const needsPerson = r.needPerson;
          const canRun = !needsPerson || !!selectedPerson;
          return (
            <div key={r.id}
              className={`border rounded-xl px-5 py-4 flex items-center gap-4 transition-all ${
                selectedReport === r.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"
              }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                selectedReport === r.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
              }`}>
                <Icon name={r.icon} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-neutral-900">{r.label}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{r.desc}</div>
                {needsPerson && (
                  <div className="mt-2">
                    <select
                      value={selectedPerson}
                      onChange={e => { setSelectedPerson(e.target.value); setSelectedReport(r.id); }}
                      className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white w-full max-w-xs"
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="">— Выберите сотрудника —</option>
                      {activePeople.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setSelectedReport(r.id); runReport(r.id); }}
                disabled={!canRun}
                className="flex items-center gap-2 bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0"
              >
                <Icon name="Printer" size={15} />
                Сформировать
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <Icon name="Info" size={14} className="shrink-0 mt-0.5" />
        <div>
          Все отчёты формируются автоматически из данных, внесённых в разделе «Кадры».
          Для корректного заполнения форм убедитесь, что у сотрудников заполнены: ФИО, дата рождения, паспортные данные, СНИЛС, ИНН, дата приёма.
        </div>
      </div>
    </div>
  );
}
