-- Добавить поля для учёта наличных расходов на топливо в отчёте кассира
ALTER TABLE cashier_reports
  ADD COLUMN IF NOT EXISTS fuel_cash_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fuel_liters NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fuel_price_per_liter NUMERIC(8,2) DEFAULT NULL;

-- Добавить дополнительные поля в журнал медосмотра (для типовой формы)
ALTER TABLE medical_journal
  ADD COLUMN IF NOT EXISTS blood_pressure_pre VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pulse_pre INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS alcohol_pre NUMERIC(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS temperature_pre NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS complaints_pre TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS blood_pressure_post VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pulse_post INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS alcohol_post NUMERIC(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS temperature_post NUMERIC(4,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS complaints_post TEXT DEFAULT NULL;

-- Добавить дополнительные поля в журнал выпуска ТС (для типовой формы)
ALTER TABLE vehicle_release_journal
  ADD COLUMN IF NOT EXISTS fuel_level VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tire_pressure VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brakes_ok BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS lights_ok BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS body_ok BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tech_condition VARCHAR(100) DEFAULT 'исправен',
  ADD COLUMN IF NOT EXISTS defects_found TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS waybill_number VARCHAR(50) DEFAULT NULL;

-- Таблица для хранения импортированных сотрудников из 1С
CREATE TABLE IF NOT EXISTS hr_imports (
  id SERIAL PRIMARY KEY,
  import_date TIMESTAMPTZ DEFAULT NOW(),
  source VARCHAR(50) DEFAULT '1С',
  file_name VARCHAR(255),
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'done',
  log TEXT,
  created_by VARCHAR(255)
);
