-- Единая таблица сотрудников всех должностей (кроме водителей и кондукторов, у них свои таблицы)
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    position VARCHAR(50) NOT NULL,
    -- позиции: locksmith, accountant, cashier, guard, mechanic, cleaning, medical, other
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    birth_date DATE,
    snils VARCHAR(20),
    inn VARCHAR(15),
    passport_series VARCHAR(10),
    passport_number VARCHAR(10),
    passport_issued_by TEXT,
    passport_issued_date DATE,
    address TEXT,
    hire_date DATE,
    fire_date DATE,
    organization VARCHAR(255),
    is_official BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_position ON staff(position);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_org ON staff(organization);
