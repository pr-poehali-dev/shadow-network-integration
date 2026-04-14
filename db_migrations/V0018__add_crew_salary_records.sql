CREATE TABLE IF NOT EXISTS t_p75004909_shadow_network_integ.crew_salary_records (
    id SERIAL PRIMARY KEY,
    person_type VARCHAR(10) NOT NULL CHECK (person_type IN ('driver', 'conductor')),
    person_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    sick_leave NUMERIC(10,2) NOT NULL DEFAULT 0,
    advance_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
    advance_card NUMERIC(10,2) NOT NULL DEFAULT 0,
    salary_card NUMERIC(10,2) NOT NULL DEFAULT 0,
    overtime_sum NUMERIC(10,2) NOT NULL DEFAULT 0,
    fines NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(person_type, person_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_crew_salary_lookup ON t_p75004909_shadow_network_integ.crew_salary_records(person_type, year, month);
