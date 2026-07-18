-- OPQRST fields for portal symptom log entries

ALTER TABLE symptom_log_entries
  ADD COLUMN IF NOT EXISTS symptom_quality varchar(120),
  ADD COLUMN IF NOT EXISTS provocation text,
  ADD COLUMN IF NOT EXISTS palliation text,
  ADD COLUMN IF NOT EXISTS radiation varchar(120);
