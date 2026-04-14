import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Company {
  id: number;
  name: string;
  short_name: string | null;
  organization_type: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  okpo: string | null;
  okved: string | null;
  legal_address: string | null;
  actual_address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  director_name: string | null;
  director_position: string | null;
  chief_accountant: string | null;
  bank_name: string | null;
  bank_bik: string | null;
  bank_account: string | null;
  bank_corr_account: string | null;
  license_number: string | null;
  license_issued_by: string | null;
  license_issued_at: string | null;
  license_expires_at: string | null;
  notes: string | null;
}

interface CompanyDoc {
  id: number;
  company_id: number;
  doc_type: string;
  doc_name: string;
  doc_number: string | null;
  issued_by: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
}

const EMPTY_COMPANY: Omit<Company, "id"> = {
  name: "", short_name: null, organization_type: null,
  inn: null, kpp: null, ogrn: null, okpo: null, okved: null,
  legal_address: null, actual_address: null,
  phone: null, email: null, website: null,
  director_name: null, director_position: null, chief_accountant: null,
  bank_name: null, bank_bik: null, bank_account: null, bank_corr_account: null,
  license_number: null, license_issued_by: null, license_issued_at: null, license_expires_at: null,
  notes: null,
};

const DOC_TYPES = ["Лицензия", "Устав", "ОГРН", "ИНН", "Договор", "Свидетельство", "Разрешение", "Прочее"];

function Field({ label, value, onChange, textarea = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  textarea?: boolean; placeholder?: string;
}) {
  if (textarea) {
    return (
      <div>
        <label className="text-xs text-neutral-500 block mb-1">{label}</label>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600 resize-none"
        />
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs text-neutral-500 block mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600"
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full pt-2">
      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-200 pb-1 mb-1">
        {children}
      </h3>
    </div>
  );
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const days = daysUntil(date);
  if (days === null) return null;
  const color = days < 0 ? "bg-red-100 text-red-700" : days < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
  const label = days < 0 ? `просрочен ${Math.abs(days)} дн.` : days === 0 ? "истекает сегодня" : `${days} дн.`;
  return <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${color}`}>{label}</span>;
}

export default function CompanyCardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Company, "id">>(EMPTY_COMPANY);
  const [docs, setDocs] = useState<CompanyDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [docTab, setDocTab] = useState<"docs" | "addDoc">("docs");
  const [docForm, setDocForm] = useState({ doc_type: "Лицензия", doc_name: "", doc_number: "", issued_by: "", issued_at: "", expires_at: "", notes: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docSaving, setDocSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getCompanies().then(data => {
      if (Array.isArray(data)) setCompanies(data);
    });
  }, []);

  const loadDocs = async (companyId: number) => {
    const data = await api.getCompanyDocs(companyId);
    setDocs(Array.isArray(data) ? data : []);
  };

  const selectCompany = (c: Company) => {
    setSelectedId(c.id);
    setForm({
      name: c.name, short_name: c.short_name ?? "", organization_type: c.organization_type ?? "",
      inn: c.inn ?? "", kpp: c.kpp ?? "", ogrn: c.ogrn ?? "", okpo: c.okpo ?? "", okved: c.okved ?? "",
      legal_address: c.legal_address ?? "", actual_address: c.actual_address ?? "",
      phone: c.phone ?? "", email: c.email ?? "", website: c.website ?? "",
      director_name: c.director_name ?? "", director_position: c.director_position ?? "", chief_accountant: c.chief_accountant ?? "",
      bank_name: c.bank_name ?? "", bank_bik: c.bank_bik ?? "", bank_account: c.bank_account ?? "", bank_corr_account: c.bank_corr_account ?? "",
      license_number: c.license_number ?? "", license_issued_by: c.license_issued_by ?? "",
      license_issued_at: c.license_issued_at ?? "", license_expires_at: c.license_expires_at ?? "",
      notes: c.notes ?? "",
    });
    setIsNew(false);
    setDocTab("docs");
    loadDocs(c.id);
  };

  const startNew = () => {
    setSelectedId(null);
    setForm(EMPTY_COMPANY);
    setDocs([]);
    setIsNew(true);
    setDocTab("docs");
  };

  const f = (k: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [k]: v || null }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form };
    let saved: Company;
    if (isNew) {
      saved = await api.createCompany(payload);
      setCompanies(prev => [...prev, saved]);
    } else {
      saved = await api.updateCompany(selectedId!, payload);
      setCompanies(prev => prev.map(c => c.id === saved.id ? saved : c));
    }
    setSelectedId(saved.id);
    setIsNew(false);
    loadDocs(saved.id);
    setSaving(false);
  };

  const handleDeleteCompany = async () => {
    if (!selectedId || !confirm("Удалить карточку предприятия и все её документы?")) return;
    await api.deleteCompany(selectedId);
    setCompanies(prev => prev.filter(c => c.id !== selectedId));
    setSelectedId(null);
    setIsNew(false);
    setForm(EMPTY_COMPANY);
    setDocs([]);
  };

  const handleAddDoc = async () => {
    if (!selectedId || !docForm.doc_name.trim()) return;
    setDocSaving(true);
    const payload: Record<string, unknown> = {
      company_id: selectedId,
      doc_type: docForm.doc_type,
      doc_name: docForm.doc_name,
      doc_number: docForm.doc_number || null,
      issued_by: docForm.issued_by || null,
      issued_at: docForm.issued_at || null,
      expires_at: docForm.expires_at || null,
      notes: docForm.notes || null,
    };
    if (docFile) {
      const ab = await docFile.arrayBuffer();
      payload.file_data = btoa(String.fromCharCode(...new Uint8Array(ab)));
      payload.file_name = docFile.name;
    }
    await api.createCompanyDoc(payload);
    await loadDocs(selectedId);
    setDocForm({ doc_type: "Лицензия", doc_name: "", doc_number: "", issued_by: "", issued_at: "", expires_at: "", notes: "" });
    setDocFile(null);
    if (docFileRef.current) docFileRef.current.value = "";
    setDocTab("docs");
    setDocSaving(false);
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("Удалить документ?")) return;
    await api.deleteCompanyDoc(docId);
    setDocs(prev => prev.filter(d => d.id !== docId));
  };

  const selected = companies.find(c => c.id === selectedId);

  return (
    <div className="flex gap-6 h-full">
      {/* Список предприятий */}
      <div className="w-60 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-neutral-900">Предприятия</h2>
          <button onClick={startNew}
            className="flex items-center gap-1 text-xs border border-neutral-300 px-2 py-1.5 rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-700">
            <Icon name="Plus" size={13} />
            Добавить
          </button>
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {companies.map(c => (
            <button key={c.id} onClick={() => selectCompany(c)}
              className={`text-left px-3 py-2.5 rounded border text-sm transition-colors cursor-pointer ${
                selectedId === c.id
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
              }`}>
              <div className="font-medium truncate">{c.short_name || c.name}</div>
              {c.inn && <div className={`text-xs mt-0.5 ${selectedId === c.id ? "text-neutral-300" : "text-neutral-400"}`}>ИНН {c.inn}</div>}
            </button>
          ))}
          {companies.length === 0 && (
            <div className="text-neutral-400 text-xs text-center py-6">Нет предприятий</div>
          )}
        </div>
      </div>

      {/* Карточка */}
      {(isNew || selectedId) ? (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-neutral-900">
              {isNew ? "Новое предприятие" : (selected?.short_name || selected?.name)}
            </h2>
            <div className="flex gap-2">
              {!isNew && (
                <button onClick={handleDeleteCompany}
                  className="flex items-center gap-1.5 text-sm border border-red-200 text-red-500 px-3 py-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer">
                  <Icon name="Trash2" size={14} />
                  Удалить
                </button>
              )}
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex items-center gap-1.5 text-sm bg-neutral-900 text-white px-4 py-1.5 rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                <Icon name="Save" size={14} />
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>

          {/* Форма карточки */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <SectionTitle>Общие сведения</SectionTitle>
            <div className="col-span-2">
              <Field label="Полное наименование *" value={form.name ?? ""} onChange={f("name")} placeholder='ООО "Дальавтотранс"' />
            </div>
            <Field label="Краткое наименование" value={form.short_name ?? ""} onChange={f("short_name")} placeholder='ООО "ДАТ"' />
            <Field label="Организационно-правовая форма" value={form.organization_type ?? ""} onChange={f("organization_type")} placeholder="ООО, МУП, ГУП..." />

            <SectionTitle>Реквизиты</SectionTitle>
            <Field label="ИНН" value={form.inn ?? ""} onChange={f("inn")} placeholder="1234567890" />
            <Field label="КПП" value={form.kpp ?? ""} onChange={f("kpp")} placeholder="123456789" />
            <Field label="ОГРН" value={form.ogrn ?? ""} onChange={f("ogrn")} placeholder="1234567890123" />
            <Field label="ОКПО" value={form.okpo ?? ""} onChange={f("okpo")} placeholder="12345678" />
            <Field label="ОКВЭД" value={form.okved ?? ""} onChange={f("okved")} placeholder="49.31" />
            <div />

            <SectionTitle>Адреса</SectionTitle>
            <div className="col-span-2">
              <Field label="Юридический адрес" value={form.legal_address ?? ""} onChange={f("legal_address")} placeholder="г. Хабаровск, ул. Ленина, д. 1" />
            </div>
            <div className="col-span-2">
              <Field label="Фактический адрес" value={form.actual_address ?? ""} onChange={f("actual_address")} placeholder="г. Хабаровск, ул. Ленина, д. 1" />
            </div>

            <SectionTitle>Контакты</SectionTitle>
            <Field label="Телефон" value={form.phone ?? ""} onChange={f("phone")} placeholder="+7 (4212) 000-000" />
            <Field label="Email" value={form.email ?? ""} onChange={f("email")} placeholder="info@company.ru" />
            <Field label="Сайт" value={form.website ?? ""} onChange={f("website")} placeholder="https://company.ru" />
            <div />

            <SectionTitle>Руководство</SectionTitle>
            <Field label="ФИО руководителя" value={form.director_name ?? ""} onChange={f("director_name")} placeholder="Иванов Иван Иванович" />
            <Field label="Должность руководителя" value={form.director_position ?? ""} onChange={f("director_position")} placeholder="Генеральный директор" />
            <Field label="Главный бухгалтер" value={form.chief_accountant ?? ""} onChange={f("chief_accountant")} placeholder="Петрова Мария Сергеевна" />
            <div />

            <SectionTitle>Банковские реквизиты</SectionTitle>
            <div className="col-span-2">
              <Field label="Наименование банка" value={form.bank_name ?? ""} onChange={f("bank_name")} placeholder='АО "Тинькофф Банк"' />
            </div>
            <Field label="БИК" value={form.bank_bik ?? ""} onChange={f("bank_bik")} placeholder="044525974" />
            <Field label="Расчётный счёт" value={form.bank_account ?? ""} onChange={f("bank_account")} placeholder="40702810000000000000" />
            <div className="col-span-2">
              <Field label="Корреспондентский счёт" value={form.bank_corr_account ?? ""} onChange={f("bank_corr_account")} placeholder="30101810145250000974" />
            </div>

            <SectionTitle>Лицензия на перевозки</SectionTitle>
            <Field label="Номер лицензии" value={form.license_number ?? ""} onChange={f("license_number")} placeholder="АЮ-27-000000" />
            <Field label="Кем выдана" value={form.license_issued_by ?? ""} onChange={f("license_issued_by")} placeholder="Ространснадзор" />
            <div>
              <label className="text-xs text-neutral-500 block mb-1">Дата выдачи</label>
              <input type="date" value={form.license_issued_at ?? ""}
                onChange={e => f("license_issued_at")(e.target.value)}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
            </div>
            <div>
              <label className="text-xs text-neutral-500 block mb-1 flex items-center">
                Срок действия
                <ExpiryBadge date={form.license_expires_at} />
              </label>
              <input type="date" value={form.license_expires_at ?? ""}
                onChange={e => f("license_expires_at")(e.target.value)}
                className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-neutral-600" />
            </div>

            <SectionTitle>Примечания</SectionTitle>
            <div className="col-span-2">
              <Field label="" value={form.notes ?? ""} onChange={f("notes")} textarea placeholder="Дополнительная информация..." />
            </div>
          </div>

          {/* Документы предприятия */}
          {!isNew && (
            <div className="border-t border-neutral-200 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-neutral-800">Документы предприятия</h3>
                <button onClick={() => setDocTab(docTab === "addDoc" ? "docs" : "addDoc")}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border cursor-pointer transition-colors ${
                    docTab === "addDoc"
                      ? "bg-neutral-200 border-neutral-300 text-neutral-800"
                      : "border-neutral-300 hover:bg-neutral-50 text-neutral-700"
                  }`}>
                  <Icon name={docTab === "addDoc" ? "ChevronUp" : "Plus"} size={14} />
                  {docTab === "addDoc" ? "Скрыть форму" : "Добавить документ"}
                </button>
              </div>

              {docTab === "addDoc" && (
                <div className="bg-neutral-50 border border-neutral-200 rounded p-4 mb-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Тип документа</label>
                      <select value={docForm.doc_type} onChange={e => setDocForm(f => ({ ...f, doc_type: e.target.value }))}
                        className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none bg-white">
                        {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Название документа *</label>
                      <input value={docForm.doc_name} onChange={e => setDocForm(f => ({ ...f, doc_name: e.target.value }))}
                        placeholder='Устав ООО "ДАТ"'
                        className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Номер документа</label>
                      <input value={docForm.doc_number} onChange={e => setDocForm(f => ({ ...f, doc_number: e.target.value }))}
                        placeholder="АЮ-27-001234"
                        className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Кем выдан</label>
                      <input value={docForm.issued_by} onChange={e => setDocForm(f => ({ ...f, issued_by: e.target.value }))}
                        placeholder="Ространснадзор"
                        className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Дата выдачи</label>
                      <input type="date" value={docForm.issued_at} onChange={e => setDocForm(f => ({ ...f, issued_at: e.target.value }))}
                        className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Срок действия</label>
                      <input type="date" value={docForm.expires_at} onChange={e => setDocForm(f => ({ ...f, expires_at: e.target.value }))}
                        className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-neutral-500 block mb-1">Файл (PDF, JPG, PNG)</label>
                      <input ref={docFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => setDocFile(e.target.files?.[0] ?? null)}
                        className="text-sm text-neutral-700" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-neutral-500 block mb-1">Примечание</label>
                      <input value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Примечание"
                        className="border border-neutral-300 rounded px-3 py-2 text-sm w-full focus:outline-none" />
                    </div>
                  </div>
                  <button onClick={handleAddDoc} disabled={docSaving || !docForm.doc_name.trim()}
                    className="bg-neutral-900 text-white px-4 py-2 text-sm rounded hover:bg-neutral-700 transition-colors disabled:opacity-50 cursor-pointer">
                    {docSaving ? "Сохраняю..." : "Добавить документ"}
                  </button>
                </div>
              )}

              {docs.length === 0 ? (
                <div className="text-neutral-400 text-sm text-center py-8">Нет документов</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {docs.map(doc => {
                    const days = daysUntil(doc.expires_at);
                    const expColor = days === null ? "" : days < 0 ? "border-red-200 bg-red-50" : days < 30 ? "border-amber-200 bg-amber-50" : "";
                    return (
                      <div key={doc.id} className={`border rounded p-3 flex items-start gap-3 transition-colors ${expColor || "border-neutral-200"}`}>
                        <div className="text-neutral-400 mt-0.5 shrink-0">
                          <Icon name="FileText" size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-neutral-900">{doc.doc_name}</span>
                            <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{doc.doc_type}</span>
                            {doc.doc_number && <span className="text-xs text-neutral-500">№ {doc.doc_number}</span>}
                            {doc.expires_at && <ExpiryBadge date={doc.expires_at} />}
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-neutral-500">
                            {doc.issued_by && <span>Выдан: {doc.issued_by}</span>}
                            {doc.issued_at && <span>от {formatDate(doc.issued_at)}</span>}
                            {doc.expires_at && <span>до {formatDate(doc.expires_at)}</span>}
                          </div>
                          {doc.notes && <div className="text-xs text-neutral-400 mt-0.5 italic">{doc.notes}</div>}
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors">
                              <Icon name="Download" size={12} />
                              {doc.file_name || "Открыть файл"}
                            </a>
                          )}
                        </div>
                        <button onClick={() => handleDeleteDoc(doc.id)}
                          className="text-neutral-300 hover:text-red-500 transition-colors cursor-pointer shrink-0 mt-0.5">
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
          Выберите предприятие или добавьте новое
        </div>
      )}
    </div>
  );
}
