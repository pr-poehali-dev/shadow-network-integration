ALTER TABLE crew_salary_records ADD COLUMN IF NOT EXISTS cashless_payment NUMERIC(10,2) DEFAULT 0;
