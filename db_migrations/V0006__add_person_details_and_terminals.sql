-- Доп. поля водителей
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS snils VARCHAR(14),
  ADD COLUMN IF NOT EXISTS inn VARCHAR(12),
  ADD COLUMN IF NOT EXISTS license_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS license_date DATE;

-- Доп. поля кондукторов
ALTER TABLE conductors
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS snils VARCHAR(14),
  ADD COLUMN IF NOT EXISTS inn VARCHAR(12);

-- Таблица терминалов
CREATE TABLE IF NOT EXISTS terminals (
  id SERIAL PRIMARY KEY,
  number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  organization VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO terminals (number, name, organization) VALUES
  ('1', 'Терминал №1', 'ООО "Дальавтотранс"'),
  ('2', 'Терминал №2', 'ООО "Техника и Технологии"')
ON CONFLICT DO NOTHING;

-- Поле terminal_id в расписании
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS terminal_id INTEGER REFERENCES terminals(id);
