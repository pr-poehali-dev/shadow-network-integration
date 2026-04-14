-- Таблица ДТП для раздела БДД
CREATE TABLE IF NOT EXISTS accidents (
  id SERIAL PRIMARY KEY,
  accident_date DATE NOT NULL,
  accident_time TIME,
  organization VARCHAR(255),
  location TEXT,
  bus_board_number VARCHAR(50),
  bus_gov_number VARCHAR(50),
  bus_model VARCHAR(100),
  driver_name VARCHAR(255),
  driver_license VARCHAR(50),
  route_number VARCHAR(50),
  graph_number INTEGER,
  -- Обстоятельства
  description TEXT,
  weather_conditions VARCHAR(100),
  road_conditions VARCHAR(100),
  visibility VARCHAR(100),
  -- Пострадавшие
  victims_count INTEGER DEFAULT 0,
  victims_info TEXT,
  -- Участники
  other_vehicles TEXT,
  -- Итог
  fault_side VARCHAR(100),
  damage_description TEXT,
  damage_amount DECIMAL(12,2),
  -- Статус
  status VARCHAR(50) DEFAULT 'new',
  -- Расследование
  investigator_name VARCHAR(255),
  investigation_result TEXT,
  -- Документы (JSON массив URL)
  documents JSONB DEFAULT '[]',
  -- Ссылка на запись в наряде
  schedule_entry_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accidents_date ON accidents(accident_date);
CREATE INDEX IF NOT EXISTS idx_accidents_org ON accidents(organization);
CREATE INDEX IF NOT EXISTS idx_accidents_status ON accidents(status);
