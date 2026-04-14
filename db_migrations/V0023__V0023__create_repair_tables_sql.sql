CREATE TABLE IF NOT EXISTS repair_journal (
    id SERIAL PRIMARY KEY,
    bus_id INTEGER,
    board_number VARCHAR(50),
    gov_number VARCHAR(50),
    bus_model VARCHAR(255),
    organization VARCHAR(255),
    fault_date DATE NOT NULL DEFAULT CURRENT_DATE,
    fault_type VARCHAR(100),
    fault_description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    repair_start DATE,
    repair_end DATE,
    status VARCHAR(30) DEFAULT 'open',
    executor_id INTEGER,
    executor_name VARCHAR(255),
    controller_id INTEGER,
    controller_name VARCHAR(255),
    total_cost NUMERIC(12,2),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repair_works (
    id SERIAL PRIMARY KEY,
    repair_id INTEGER NOT NULL,
    work_type VARCHAR(255) NOT NULL,
    work_description TEXT,
    executor_name VARCHAR(255),
    hours_spent NUMERIC(6,2),
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS repair_parts (
    id SERIAL PRIMARY KEY,
    repair_id INTEGER NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    part_number VARCHAR(100),
    quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
    unit VARCHAR(30) DEFAULT 'шт',
    price_per_unit NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS repair_work_templates (
    id SERIAL PRIMARY KEY,
    work_type VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS maintenance_journal (
    id SERIAL PRIMARY KEY,
    bus_id INTEGER,
    board_number VARCHAR(50),
    gov_number VARCHAR(50),
    bus_model VARCHAR(255),
    organization VARCHAR(255),
    maintenance_type VARCHAR(50) NOT NULL,
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    mileage_at_service INTEGER,
    next_service_mileage INTEGER,
    next_service_date DATE,
    status VARCHAR(20) DEFAULT 'scheduled',
    executor_name VARCHAR(255),
    controller_name VARCHAR(255),
    works_performed TEXT,
    notes TEXT,
    total_cost NUMERIC(12,2),
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repair_mechanics (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'executor',
    organization VARCHAR(255),
    specialization VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
