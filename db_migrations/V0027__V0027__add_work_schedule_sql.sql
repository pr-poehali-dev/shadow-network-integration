-- Предпочтительный график работы водителя/кондуктора
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS work_schedule VARCHAR(30) DEFAULT NULL;
-- Примеры: '3/3', '5/2', '2/2', '6/1', 'individual'

ALTER TABLE conductors ADD COLUMN IF NOT EXISTS work_schedule VARCHAR(30) DEFAULT NULL;

-- Дата начала отсчёта цикла (чтобы знать в какой фазе цикла сотрудник)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS schedule_start_date DATE DEFAULT NULL;
ALTER TABLE conductors ADD COLUMN IF NOT EXISTS schedule_start_date DATE DEFAULT NULL;
