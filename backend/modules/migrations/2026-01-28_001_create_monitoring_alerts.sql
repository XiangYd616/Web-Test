-- 创建 monitoring_alerts 表（替代运行时建表逻辑）
CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id VARCHAR(255) PRIMARY KEY,
  site_id UUID NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  source VARCHAR(50) NOT NULL DEFAULT 'monitoring',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  message TEXT,
  details JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_site ON monitoring_alerts(site_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_workspace_id ON monitoring_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_source ON monitoring_alerts(source);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created ON monitoring_alerts(created_at DESC);

DROP TRIGGER IF EXISTS update_monitoring_alerts_updated_at ON monitoring_alerts;
CREATE TRIGGER update_monitoring_alerts_updated_at
  BEFORE UPDATE ON monitoring_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
