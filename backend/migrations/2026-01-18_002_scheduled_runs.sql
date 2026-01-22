-- Deprecated / Merged into data/schema.sql as baseline
-- Do NOT execute in production after 2026-01
-- Last reviewed: 2026-01

-- Migration: Scheduled Runs
-- Created: 2026-01-18
-- Description: 定时运行任务

/* 已合并到 data/schema.sql，迁移保留作为历史记录。

CREATE TABLE IF NOT EXISTS scheduled_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  environment_id UUID REFERENCES environments(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  cron VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduled_runs_workspace_id ON scheduled_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_collection_id ON scheduled_runs(collection_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_status ON scheduled_runs(status);

CREATE TRIGGER update_scheduled_runs_updated_at
BEFORE UPDATE ON scheduled_runs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/
