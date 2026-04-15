ALTER TABLE cashier_reports ADD CONSTRAINT uq_cashier_report_date_entry UNIQUE (report_date, schedule_entry_id);
