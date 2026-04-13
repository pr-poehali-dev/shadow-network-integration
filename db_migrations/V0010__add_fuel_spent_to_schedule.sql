ALTER TABLE schedule_entries
  ADD COLUMN IF NOT EXISTS fuel_spent NUMERIC(8,2);
