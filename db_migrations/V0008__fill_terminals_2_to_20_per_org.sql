-- Добавляем терминалы 2-20 для Дальавтотранс
INSERT INTO t_p75004909_shadow_network_integ.terminals (number, name, organization)
SELECT
  g::text,
  'Терминал №' || g,
  'ООО "Дальавтотранс"'
FROM generate_series(2, 20) AS g;

-- Добавляем терминалы 1, 3-20 для Техника и Технологии (1 уже есть как id=2 с number=2, исправим)
-- Сначала обновим существующий терминал id=2 на корректную организацию
UPDATE t_p75004909_shadow_network_integ.terminals
SET number = '1', name = 'Терминал №1'
WHERE id = 2;

-- Добавляем терминалы 2-20 для Техника и Технологии
INSERT INTO t_p75004909_shadow_network_integ.terminals (number, name, organization)
SELECT
  g::text,
  'Терминал №' || g,
  'ООО "Техника и Технологии"'
FROM generate_series(2, 20) AS g;
