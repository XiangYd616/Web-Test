-- Migration: Report configs table
-- Created: 2026-01-21

/*
  已合并到 data/schema.sql，迁移中保留作为历史记录。

CREATE TABLE IF NOT EXISTS report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  schedule JSONB DEFAULT '{}',
  recipients JSONB DEFAULT '[]',
  filters JSONB DEFAULT '[]',
  format JSONB DEFAULT '{}',
  delivery JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_configs_template_id ON report_configs(template_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_user_id ON report_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_enabled ON report_configs(enabled);

DROP TRIGGER IF EXISTS update_report_configs_updated_at ON report_configs;
CREATE TRIGGER update_report_configs_updated_at
BEFORE UPDATE ON report_configs
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
*/
