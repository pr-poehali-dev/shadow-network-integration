-- Причина неявки на смену
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS absence_reason VARCHAR(60) DEFAULT NULL;
-- Значения: null (работал), 'alcohol' (алкотестер — штраф 5000), 'asleep' (проспал),
--           'medical_pressure' (медик давление), 'medical_temp' (медик температура),
--           'sick_leave' (больничный), 'other' (прочее)

-- Размер штрафа (заполняется автоматически для alcohol=5000, можно изменить вручную)
ALTER TABLE schedule_entries ADD COLUMN IF NOT EXISTS absence_fine NUMERIC(10,2) DEFAULT NULL;
