-- Deprecated / Merged into data/schema.sql as baseline
-- Do NOT execute in production after 2026-01
-- Last reviewed: 2026-01

-- Migration: add triggered_by to scheduled_run_results
-- Created: 2026-01-21
-- Description: 为定时运行结果添加 triggered_by 字段并补充索引

/* 已合并到 data/schema.sql，迁移保留作为历史记录。

ALTER TABLE IF EXISTS scheduled_run_results
  ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(20);

-- 从 metadata 回填 triggeredBy（如有）
UPDATE scheduled_run_results
SET triggered_by = metadata->>'triggeredBy'
WHERE triggered_by IS NULL AND metadata ? 'triggeredBy';

UPDATE scheduled_run_results
SET triggered_by = 'schedule'
WHERE triggered_by IS NULL;

ALTER TABLE scheduled_run_results
  ALTER COLUMN triggered_by SET DEFAULT 'schedule';

ALTER TABLE scheduled_run_results
  ALTER COLUMN triggered_by SET NOT NULL;

-- 常规过滤索引（triggered_by + status + scheduled_run_id）
CREATE INDEX IF NOT EXISTS idx_scheduled_run_results_triggered_status
  ON scheduled_run_results (triggered_by, status, scheduled_run_id);

-- JSONB GIN 索引（用于 metadata contains 过滤）
CREATE INDEX IF NOT EXISTS idx_scheduled_run_results_metadata_gin
  ON scheduled_run_results USING GIN (metadata jsonb_path_ops);
*/
