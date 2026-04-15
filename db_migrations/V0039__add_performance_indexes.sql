CREATE INDEX IF NOT EXISTS idx_vr_schedule_entry ON vehicle_release_journal (schedule_entry_id);
CREATE INDEX IF NOT EXISTS idx_mj_driver_date ON medical_journal (driver_id, work_date);
