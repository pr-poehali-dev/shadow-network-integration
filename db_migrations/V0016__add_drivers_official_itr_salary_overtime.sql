ALTER TABLE t_p75004909_shadow_network_integ.drivers ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS t_p75004909_shadow_network_integ.itr_employees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    position VARCHAR(100) NOT NULL,
    base_salary NUMERIC(10,2) NOT NULL,
    base_days INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p75004909_shadow_network_integ.itr_salary_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES t_p75004909_shadow_network_integ.itr_employees(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    days_worked INTEGER NOT NULL DEFAULT 0,
    bonus NUMERIC(10,2) NOT NULL DEFAULT 0,
    advance_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
    salary_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, year, month)
);

ALTER TABLE t_p75004909_shadow_network_integ.schedule_entries ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE t_p75004909_shadow_network_integ.schedule_entries ADD COLUMN IF NOT EXISTS fuel_price_override NUMERIC(10,2);
