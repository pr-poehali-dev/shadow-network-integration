-- Добавить настройки процентов ЗП водителей и кондукторов
INSERT INTO settings (key, value) VALUES
  ('driver_pct_no_conductor', '37'),
  ('driver_pct_with_conductor', '22'),
  ('conductor_pct', '15')
ON CONFLICT (key) DO NOTHING;
