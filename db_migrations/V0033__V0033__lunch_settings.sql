INSERT INTO settings (key, value) VALUES
  ('lunch_no_conductor', '150'),
  ('lunch_with_conductor', '300')
ON CONFLICT (key) DO NOTHING;
