-- Таблица ответственных механиков по выпуску
CREATE TABLE IF NOT EXISTS mechanics (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    organization TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Журнал медицинского осмотра водителей
CREATE TABLE IF NOT EXISTS medical_journal (
    id SERIAL PRIMARY KEY,
    work_date DATE NOT NULL,
    organization TEXT,
    driver_id INTEGER,
    driver_name TEXT,
    route_id INTEGER,
    route_number TEXT,
    graph_number INTEGER,
    pre_shift_time TIME,
    post_shift_time TIME,
    pre_shift_admitted BOOLEAN DEFAULT TRUE,
    post_shift_admitted BOOLEAN DEFAULT TRUE,
    pre_shift_note TEXT,
    post_shift_note TEXT,
    medic_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_journal_date ON medical_journal(work_date);
CREATE INDEX IF NOT EXISTS idx_medical_journal_org ON medical_journal(organization);

-- Журнал выпуска ТС на линию
CREATE TABLE IF NOT EXISTS vehicle_release_journal (
    id SERIAL PRIMARY KEY,
    work_date DATE NOT NULL,
    organization TEXT,
    schedule_entry_id INTEGER,
    route_id INTEGER,
    route_number TEXT,
    graph_number INTEGER,
    board_number TEXT,
    gov_number TEXT,
    driver_name TEXT,
    mechanic_id INTEGER,
    mechanic_name TEXT,
    departure_time TIME,
    arrival_time TIME,
    odometer_departure INTEGER,
    odometer_arrival INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_release_date ON vehicle_release_journal(work_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_release_org ON vehicle_release_journal(organization);
