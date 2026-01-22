-- Deprecated / Merged into data/schema.sql as baseline
-- Do NOT execute in production after 2026-01
-- Last reviewed: 2026-01

-- Migration: Report instances table
-- Created: 2026-01-21

/*
  已合并到 data/schema.sql，迁移中保留作为历史记录。

CREATE TABLE IF NOT EXISTS report_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES test_reports(id) ON DELETE SET NULL,
  config_id UUID REFERENCES report_configs(id) ON DELETE SET NULL,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','generating','completed','failed','cancelled')),
  format VARCHAR(20) NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration INTEGER,
  path TEXT,
  url TEXT,
  size INTEGER,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_instances_report_id ON report_instances(report_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_config_id ON report_instances(config_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_status ON report_instances(status);
CREATE INDEX IF NOT EXISTS idx_report_instances_generated_at ON report_instances(generated_at);

DROP TRIGGER IF EXISTS update_report_instances_updated_at ON report_instances;
CREATE TRIGGER update_report_instances_updated_at
BEFORE UPDATE ON report_instances
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
*/
