-- 2026-01-24: align data_records.workspace_id to VARCHAR for system workspace
-- Safe cast from UUID to text when needed

ALTER TABLE IF EXISTS data_records
  ALTER COLUMN workspace_id TYPE VARCHAR(80)
  USING workspace_id::text;
