import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface ImportLog {
  id: number;
  import_date: string;
  source: string;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  errors: number;
  status: string;
  log: string | null;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HRImportPage() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number; errors: number; error_details: string[] } | null>(null);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const loadLogs = async () => {
    const data = await api.getHrImports();
    setLogs(Array.isArray(data) ? data : []);
  };

  useEffect(() => { loadLogs(); }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(",")[1];
      const data = await api.importHrFromCsv({
        file_data: b64,
        file_name: file.name,
      });
      setResult(data);
      setImporting(false);
      loadLogs();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-bold text-neutral-900 text-base mb-1">Импорт сотрудников из 1С</h3>
        <p className="text-sm text-neutral-500">
          Поддерживаются файлы CSV/TXT из выгрузки 1С:Зарплата и управление персоналом.
          Система автоматически определит должность и распределит сотрудников по спискам.
        </p>
      </div>

      {/* Инструкция */}
      <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
        <div className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-1.5">
          <Icon name="Info" size={14} /> Как выгрузить из 1С
        </div>
        <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
          <li>Открыть 1С → Кадры → Сотрудники</li>
          <li>Нажать «Вывести список» → выбрать нужные колонки: ФИО, Должность, Телефон, Дата рождения, СНИЛС, ИНН, Организация</li>
          <li>Сохранить как CSV (разделитель «;» или «,»)</li>
          <li>Загрузить файл ниже</li>
        </ol>
        <div className="mt-3 text-xs text-blue-600">
          <strong>Поддерживаемые колонки:</strong> ФИО / Наименование, Должность, Телефон, ДатаРождения, СНИЛС, ИНН, Организация, ДатаПриема, ДатаУвольнения
        </div>
        <div className="mt-2 text-xs text-blue-600">
          <strong>Водители</strong> (должность = «Водитель», «Водитель автобуса») → раздел Водители<br/>
          <strong>Кондукторы</strong> → раздел Кондукторы<br/>
          <strong>Остальные</strong> → раздел Кадры по должности
        </div>
      </div>

      {/* Кнопка загрузки */}
      <div>
        <label className={`flex items-center gap-3 cursor-pointer border-2 border-dashed rounded-xl px-6 py-5 transition-colors ${importing ? "border-neutral-200 opacity-50 pointer-events-none" : "border-neutral-300 hover:border-blue-400 hover:bg-blue-50"}`}>
          <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center shrink-0">
            <Icon name="Upload" size={22} className="text-neutral-500" />
          </div>
          <div>
            <div className="font-semibold text-neutral-900">{importing ? "Импортирую..." : "Загрузить файл из 1С"}</div>
            <div className="text-xs text-neutral-500 mt-0.5">CSV или TXT, разделители: ; , | Tab</div>
          </div>
          <input type="file" className="hidden" accept=".csv,.txt,.tsv" onChange={handleFile} disabled={importing} />
        </label>
      </div>

      {/* Результат */}
      {result && (
        <div className={`border rounded-xl p-4 ${result.errors === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Icon name={result.errors === 0 ? "CheckCircle" : "AlertTriangle"} size={16}
              className={result.errors === 0 ? "text-green-600" : "text-amber-600"} />
            Импорт завершён
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-900">{result.total}</div>
              <div className="text-xs text-neutral-500">Всего строк</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{result.imported}</div>
              <div className="text-xs text-neutral-500">Импортировано</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${result.errors > 0 ? "text-amber-600" : "text-neutral-400"}`}>{result.errors}</div>
              <div className="text-xs text-neutral-500">Ошибок</div>
            </div>
          </div>
          {result.error_details.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-amber-700 mb-1">Детали ошибок:</div>
              <div className="text-xs text-amber-800 space-y-0.5 max-h-32 overflow-y-auto">
                {result.error_details.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* История импортов */}
      {logs.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">История импортов</div>
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            {logs.map((log, i) => (
              <div key={log.id} className={`${i > 0 ? "border-t border-neutral-100" : ""}`}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${log.errors === 0 ? "bg-green-500" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-900 truncate">{log.file_name}</div>
                    <div className="text-xs text-neutral-500">{fmtDate(log.import_date)}</div>
                  </div>
                  <div className="text-xs text-neutral-500 shrink-0">
                    {log.imported_rows}/{log.total_rows} строк
                    {log.errors > 0 && <span className="text-amber-600 ml-1">· {log.errors} ошибок</span>}
                  </div>
                  <Icon name={expandedLog === log.id ? "ChevronUp" : "ChevronDown"} size={14} className="text-neutral-400 shrink-0" />
                </div>
                {expandedLog === log.id && log.log && (
                  <div className="px-4 pb-3 bg-neutral-50 border-t border-neutral-100">
                    <pre className="text-xs text-neutral-600 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">{log.log}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
