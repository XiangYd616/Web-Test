-- Migration: Add System Monitoring and Analytics Tables
-- Created: 2025-08-24T00:00:00.000Z
-- Description: 添加系统监控、健康检查和分析功能，支持API规范中的系统管理和分析接口

/*
  已合并到 data/schema.sql 或当前未使用，迁移中保留作为历史记录。

-- 创建系统指标表
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 指标分类和名称
  metric_type VARCHAR(50) NOT NULL, -- 'cpu', 'memory', 'disk', 'network', 'database', 'application'
  metric_name VARCHAR(100) NOT NULL,
  metric_category VARCHAR(50), -- 'performance', 'availability', 'error', 'business'
  
  -- 指标值和单位
  value FLOAT NOT NULL,
  unit VARCHAR(20), -- 'percent', 'bytes', 'ms', 'count', 'rate'
  
  -- 指标标签和元数据
  tags JSONB DEFAULT '{}',
  labels JSONB DEFAULT '{}',
  
  -- 指标来源
  source VARCHAR(100), -- 'system', 'application', 'database', 'external'
  host VARCHAR(100),
  service VARCHAR(100),
  
  -- 时间戳
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建系统指标表索引
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_category ON system_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_source ON system_metrics(source);
CREATE INDEX IF NOT EXISTS idx_system_metrics_host ON system_metrics(host);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service);

-- 复合索引用于时间序列查询
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_time ON system_metrics(metric_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_source_time ON system_metrics(source, timestamp);

-- 为JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_system_metrics_tags_gin ON system_metrics USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_system_metrics_labels_gin ON system_metrics USING GIN (labels);

-- 创建系统健康检查表
CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 服务信息
  service_name VARCHAR(100) NOT NULL,
  service_type VARCHAR(50) NOT NULL, -- 'database', 'redis', 'api', 'queue', 'storage'
  endpoint VARCHAR(255),
  
  -- 健康状态
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'degraded', 'unknown')),
  response_time INTEGER, -- 毫秒
  
  -- 检查结果
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- 详细信息
  details JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  
  -- 检查配置
  check_type VARCHAR(50) DEFAULT 'ping', -- 'ping', 'query', 'api', 'custom'
  timeout_ms INTEGER DEFAULT 5000,
  
  -- 时间戳
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  next_check_at TIMESTAMP
);

-- 创建系统健康检查表索引
CREATE INDEX IF NOT EXISTS idx_system_health_checks_service_name ON system_health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_service_type ON system_health_checks(service_type);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_status ON system_health_checks(status);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_checked_at ON system_health_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_next_check ON system_health_checks(next_check_at);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_service_time ON system_health_checks(service_name, checked_at);

-- 为JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_system_health_checks_details_gin ON system_health_checks USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_metrics_gin ON system_health_checks USING GIN (metrics);

-- 创建系统事件日志表
CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 事件分类
  event_type VARCHAR(50) NOT NULL, -- 'error', 'warning', 'info', 'debug'
  event_category VARCHAR(50) NOT NULL, -- 'system', 'application', 'security', 'performance'
  event_name VARCHAR(100) NOT NULL,
  
  -- 事件内容
  message TEXT NOT NULL,
  description TEXT,
  
  -- 事件来源
  source VARCHAR(100),
  component VARCHAR(100),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 事件数据
  data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  
  -- 事件级别和状态
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('critical', 'error', 'warning', 'info', 'debug')),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'ignored')),
  
  -- 关联信息
  related_id UUID,
  related_type VARCHAR(50),
  
  -- 时间戳
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- 创建系统事件日志表索引
CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_category ON system_events(event_category);
CREATE INDEX IF NOT EXISTS idx_system_events_name ON system_events(event_name);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity);
CREATE INDEX IF NOT EXISTS idx_system_events_status ON system_events(status);
CREATE INDEX IF NOT EXISTS idx_system_events_source ON system_events(source);
CREATE INDEX IF NOT EXISTS idx_system_events_user_id ON system_events(user_id);
CREATE INDEX IF NOT EXISTS idx_system_events_occurred_at ON system_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_system_events_category_time ON system_events(event_category, occurred_at);

-- 为JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_system_events_data_gin ON system_events USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_system_events_context_gin ON system_events USING GIN (context);

-- 创建用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 会话信息
  session_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  
  -- 客户端信息
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet', 'api'
  browser VARCHAR(100),
  os VARCHAR(100),
  
  -- 会话状态
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'invalid')),
  
  -- 时间管理
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 安全信息
  login_method VARCHAR(50) DEFAULT 'password', -- 'password', 'api_key', 'oauth', 'sso'
  is_secure BOOLEAN DEFAULT true,
  
  -- 会话数据
  session_data JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户会话表索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_address ON user_sessions(ip_address);

-- 为JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_data_gin ON user_sessions USING GIN (session_data);

-- 创建API使用统计表
CREATE TABLE IF NOT EXISTS api_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- API信息
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  api_version VARCHAR(20),
  
  -- 用户信息
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  
  -- 请求信息
  ip_address INET,
  user_agent TEXT,
  
  -- 响应信息
  status_code INTEGER NOT NULL,
  response_time INTEGER, -- 毫秒
  response_size INTEGER, -- 字节
  
  -- 错误信息
  error_type VARCHAR(50),
  error_message TEXT,
  
  -- 时间戳
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 分区键（用于时间分区）
  date_partition DATE GENERATED ALWAYS AS (DATE(requested_at)) STORED
);

-- 创建API使用统计表索引
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_endpoint ON api_usage_stats(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_method ON api_usage_stats(method);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_user_id ON api_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_api_key_id ON api_usage_stats(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_status_code ON api_usage_stats(status_code);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_requested_at ON api_usage_stats(requested_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_date_partition ON api_usage_stats(date_partition);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_endpoint_time ON api_usage_stats(endpoint, requested_at);

-- 创建触发器，自动更新updated_at字段
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：记录系统事件
CREATE OR REPLACE FUNCTION log_system_event(
    p_event_type VARCHAR(50),
    p_event_category VARCHAR(50),
    p_event_name VARCHAR(100),
    p_message TEXT,
    p_severity VARCHAR(20) DEFAULT 'info',
    p_source VARCHAR(100) DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO system_events (
        event_type, event_category, event_name, message, severity, source, user_id, data
    ) VALUES (
        p_event_type, p_event_category, p_event_name, p_message, p_severity, p_source, p_user_id, p_data
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：记录系统指标
CREATE OR REPLACE FUNCTION record_system_metric(
    p_metric_type VARCHAR(50),
    p_metric_name VARCHAR(100),
    p_value FLOAT,
    p_unit VARCHAR(20) DEFAULT NULL,
    p_source VARCHAR(100) DEFAULT 'system',
    p_tags JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO system_metrics (
        metric_type, metric_name, value, unit, source, tags
    ) VALUES (
        p_metric_type, p_metric_name, p_value, p_unit, p_source, p_tags
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：清理过期会话
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET status = 'expired'
    WHERE expires_at < CURRENT_TIMESTAMP AND status = 'active';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：获取系统健康状态
CREATE OR REPLACE FUNCTION get_system_health_summary()
RETURNS JSONB AS $$
DECLARE
    health_summary JSONB;
BEGIN
    SELECT jsonb_build_object(
        'overall_status', CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'unhealthy') > 0 THEN 'unhealthy'
            WHEN COUNT(*) FILTER (WHERE status = 'degraded') > 0 THEN 'degraded'
            ELSE 'healthy'
        END,
        'total_services', COUNT(*),
        'healthy_services', COUNT(*) FILTER (WHERE status = 'healthy'),
        'unhealthy_services', COUNT(*) FILTER (WHERE status = 'unhealthy'),
        'degraded_services', COUNT(*) FILTER (WHERE status = 'degraded'),
        'last_check', MAX(checked_at)
    ) INTO health_summary
    FROM (
        SELECT DISTINCT ON (service_name) service_name, status, checked_at
        FROM system_health_checks
        ORDER BY service_name, checked_at DESC
    ) latest_checks;
    
    RETURN health_summary;
END;
$$ LANGUAGE plpgsql;

-- 插入初始系统健康检查配置
INSERT INTO system_health_checks (service_name, service_type, endpoint, status, details)
VALUES 
('database', 'database', 'postgresql://localhost:5432', 'healthy', '{"connection_pool": "active"}'),
('redis', 'cache', 'redis://localhost:6379', 'healthy', '{"memory_usage": "normal"}'),
('api_server', 'api', 'http://localhost:3001/health', 'healthy', '{"uptime": "running"}')
ON CONFLICT DO NOTHING;

-- 添加注释
COMMENT ON TABLE system_metrics IS '系统指标表，存储各种系统性能和业务指标';
COMMENT ON TABLE system_health_checks IS '系统健康检查表，监控各个服务的健康状态';
COMMENT ON TABLE system_events IS '系统事件日志表，记录系统中发生的各种事件';
COMMENT ON TABLE user_sessions IS '用户会话表，管理用户登录会话和安全信息';
COMMENT ON TABLE api_usage_stats IS 'API使用统计表，记录API调用的详细统计信息';

-- 验证迁移结果
DO $$
BEGIN
    -- 检查表是否创建成功
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_metrics') THEN
        RAISE NOTICE '✅ system_metrics表创建成功';
    ELSE
        RAISE EXCEPTION '❌ system_metrics表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_health_checks') THEN
        RAISE NOTICE '✅ system_health_checks表创建成功';
    ELSE
        RAISE EXCEPTION '❌ system_health_checks表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_events') THEN
        RAISE NOTICE '✅ system_events表创建成功';
    ELSE
        RAISE EXCEPTION '❌ system_events表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        RAISE NOTICE '✅ user_sessions表创建成功';
    ELSE
        RAISE EXCEPTION '❌ user_sessions表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_usage_stats') THEN
        RAISE NOTICE '✅ api_usage_stats表创建成功';
    ELSE
        RAISE EXCEPTION '❌ api_usage_stats表创建失败';
    END IF;
    
    RAISE NOTICE '🎉 系统监控功能迁移完成！';
END $$;
*/
