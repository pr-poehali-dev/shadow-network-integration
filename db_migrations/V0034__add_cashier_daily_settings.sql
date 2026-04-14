-- Настройки: хознужды гаража, дежурный автомобиль
INSERT INTO settings (key, value, updated_at) VALUES
  ('garage_daily_expenses', '5000', NOW()),
  ('duty_car_shift_pay', '0', NOW()),
  ('duty_car_fuel_liters', '0', NOW())
ON CONFLICT (key) DO NOTHING;
