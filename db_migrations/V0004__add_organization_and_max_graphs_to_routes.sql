ALTER TABLE routes ADD COLUMN IF NOT EXISTS organization VARCHAR(255);
ALTER TABLE routes ADD COLUMN IF NOT EXISTS max_graphs INTEGER NOT NULL DEFAULT 10;

INSERT INTO routes (number, name, organization, max_graphs)
VALUES
  ('24', '', 'ООО "Дальавтотранс"', 6),
  ('15', '', 'ООО "Дальавтотранс"', 4),
  ('3',  '', 'ООО "Техника и Технологии"', 10),
  ('6',  '', 'ООО "Техника и Технологии"', 3)
ON CONFLICT (number) DO UPDATE SET
  organization = EXCLUDED.organization,
  max_graphs   = EXCLUDED.max_graphs;

UPDATE routes SET organization = 'ООО "Дальавтотранс"', max_graphs = 10
WHERE number = '1' AND (organization IS NULL OR organization = '');
