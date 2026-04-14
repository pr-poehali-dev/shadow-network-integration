-- Добавить поля min_vehicles (мин. кол-во машин) и required_trips (обязательных рейсов в день) в таблицу routes
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS min_vehicles INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS required_trips INTEGER DEFAULT NULL;

-- Выставить дефолтные значения по маршрутам согласно ТЗ
UPDATE routes SET min_vehicles = 6 WHERE number IN ('1', '3');
UPDATE routes SET min_vehicles = 2 WHERE number = '24';
UPDATE routes SET min_vehicles = 1 WHERE number IN ('6', '15');

-- Настройки рейсов по маршрутам в таблице settings
-- Формат ключа: route_trips_{number}
INSERT INTO settings (key, value) VALUES
  ('route_trips_1',  '8'),
  ('route_trips_3',  '8'),
  ('route_trips_6',  '8'),
  ('route_trips_15', '8'),
  ('route_trips_24', '8'),
  ('route6_fixed_salary', '7000')
ON CONFLICT (key) DO NOTHING;
