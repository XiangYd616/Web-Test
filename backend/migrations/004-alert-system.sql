/**
 * 告警系统数据库迁移
 * 版本: 004
 * 描述: 创建alert_rules和alert_history表
 */

-- 创建告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric_name VARCHAR(100) NOT NULL,
  condition VARCHAR(20) NOT NULL CHECK (condition IN ('gt', '>', 'gte', '>=', 'lt', '<', 'lte', '<=', 'eq', '==', 'ne', '!=')),
  threshold NUMERIC NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  channels JSONB DEFAULT '["email"]',
  cooldown INTEGER DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建告警历史表
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL,
  metric_data JSONB,
  triggered_at TIMESTAMP DEFAULT NOW(),
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  status VARCHAR(20) DEFAULT 'triggered' CHECK (status IN ('triggered', 'acknowledged', 'resolved', 'auto_resolved'))
);

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- 创建通知偏好表
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  categories JSONB DEFAULT '{}',
  quiet_hours JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active, metric_name);
CREATE INDEX IF NOT EXISTS idx_alert_rules_created ON alert_rules(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alert_history(rule_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, user_id);

-- 添加外键约束(如果users表存在)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE alert_rules
        ADD CONSTRAINT fk_alert_rules_creator
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
        
        ALTER TABLE alert_history
        ADD CONSTRAINT fk_alert_history_acknowledger
        FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL;
        
        ALTER TABLE alert_history
        ADD CONSTRAINT fk_alert_history_resolver
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;
        
        ALTER TABLE notifications
        ADD CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        ALTER TABLE notification_preferences
        ADD CONSTRAINT fk_notification_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_rules_updated_at();

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- 添加注释
COMMENT ON TABLE alert_rules IS '告警规则表';
COMMENT ON TABLE alert_history IS '告警历史表';
COMMENT ON TABLE notifications IS '站内通知表';
COMMENT ON TABLE notification_preferences IS '通知偏好设置表';

COMMENT ON COLUMN alert_rules.metric_name IS '监控指标名称';
COMMENT ON COLUMN alert_rules.condition IS '触发条件: gt(>), lt(<), eq(==), ne(!=)等';
COMMENT ON COLUMN alert_rules.threshold IS '告警阈值';
COMMENT ON COLUMN alert_rules.severity IS '严重程度: low, medium, high, critical';
COMMENT ON COLUMN alert_rules.channels IS '告警渠道: email, webhook, in_app';
COMMENT ON COLUMN alert_rules.cooldown IS '冷却期(秒)';

COMMENT ON COLUMN alert_history.status IS '状态: triggered, acknowledged, resolved, auto_resolved';
COMMENT ON COLUMN notifications.is_read IS '是否已读';
COMMENT ON COLUMN notifications.expires_at IS '过期时间';

