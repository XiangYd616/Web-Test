-- =====================================================
-- 完备的企业级数据库架构
-- 版本: 4.0 - 统一完整版
-- 创建时间: 2024-12-08
-- 设计目标: 支持完整的网站测试平台功能
-- 表数量: 37个业务表 + 完整索引 + 触发器 + 函数
-- 特点: 与后端模型完全匹配，消除字段映射问题
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- 1. 用户管理模块 (完整版)
-- =====================================================

-- 用户主表 - 与后端User模型完全匹配
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    
    -- 角色和权限
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'enterprise')),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    
    -- 认证相关
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    
    -- 登录统计
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- 用户配置和元数据
    preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- 会话信息
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    
    -- 会话状态
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- 刷新令牌表
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    
    -- 令牌信息
    device_id VARCHAR(255),
    device_name VARCHAR(100),
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- 用户偏好设置表
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 界面偏好
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    
    -- 通知偏好
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    
    -- 测试偏好
    default_test_config JSONB DEFAULT '{}',
    favorite_test_types JSONB DEFAULT '[]',
    
    -- 仪表板偏好
    dashboard_layout JSONB DEFAULT '{}',
    favorite_tests JSONB DEFAULT '[]',
    recent_urls JSONB DEFAULT '[]',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- 用户活动日志表
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 活动信息
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    
    -- 详细信息
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- 请求信息
    ip_address INET,
    user_agent TEXT,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. 测试管理模块 (完整版)
-- =====================================================

-- 测试会话表
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 会话信息
    session_name VARCHAR(100),
    target_url TEXT NOT NULL,
    test_types JSONB NOT NULL,
    
    -- 会话状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    
    -- 配置
    config JSONB DEFAULT '{}',
    
    -- 结果统计
    total_tests INTEGER DEFAULT 0,
    completed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试结果主表 - 与后端Test模型完全匹配
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES test_sessions(id) ON DELETE SET NULL,
    
    -- 测试基本信息
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('seo', 'performance', 'security', 'api', 'compatibility', 'accessibility', 'stress')),
    target_url TEXT NOT NULL,
    test_name VARCHAR(100),
    
    -- 测试状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- 测试结果
    overall_score DECIMAL(5,2),
    grade VARCHAR(2) CHECK (grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F')),
    
    -- 详细结果数据
    results JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    
    -- 错误和警告
    errors JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    
    -- 执行信息
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- 毫秒
    
    -- 环境信息
    environment JSONB DEFAULT '{}',
    user_agent TEXT,
    
    -- 标签和分类
    tags JSONB DEFAULT '[]',
    category VARCHAR(50),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试模板表
CREATE TABLE IF NOT EXISTS test_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 模板信息
    name VARCHAR(100) NOT NULL,
    description TEXT,
    test_type VARCHAR(20) NOT NULL,

    -- 模板配置
    config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,

    -- 使用统计
    usage_count INTEGER DEFAULT 0,

    -- 标签和分类
    tags JSONB DEFAULT '[]',
    category VARCHAR(50),

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 报告信息
    name VARCHAR(100) NOT NULL,
    description TEXT,
    report_type VARCHAR(20) DEFAULT 'custom' CHECK (report_type IN ('custom', 'scheduled', 'comparison')),

    -- 报告配置
    test_ids JSONB NOT NULL,
    filters JSONB DEFAULT '{}',
    format VARCHAR(20) DEFAULT 'html' CHECK (format IN ('html', 'pdf', 'json', 'csv')),

    -- 报告内容
    content JSONB,
    file_path TEXT,
    file_size INTEGER,

    -- 状态
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),

    -- 分享设置
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    share_expires_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试计划表
CREATE TABLE IF NOT EXISTS test_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 计划信息
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- 计划配置
    test_configs JSONB NOT NULL,
    schedule_config JSONB,

    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),

    -- 执行统计
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,

    -- 时间设置
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. 监控管理模块
-- =====================================================

-- 监控站点表
CREATE TABLE IF NOT EXISTS monitoring_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 站点信息
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,

    -- 监控配置
    check_interval INTEGER DEFAULT 300, -- 秒
    timeout INTEGER DEFAULT 30, -- 秒
    retry_count INTEGER DEFAULT 3,

    -- 监控类型
    monitor_types JSONB DEFAULT '["http"]', -- http, ssl, dns, etc.

    -- 通知设置
    notification_settings JSONB DEFAULT '{}',

    -- 状态
    is_active BOOLEAN DEFAULT true,
    last_check TIMESTAMP WITH TIME ZONE,
    current_status VARCHAR(20) DEFAULT 'unknown',

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 监控结果表
CREATE TABLE IF NOT EXISTS monitoring_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,

    -- 检查结果
    status VARCHAR(20) NOT NULL CHECK (status IN ('up', 'down', 'degraded', 'timeout', 'error')),
    response_time INTEGER,
    status_code INTEGER,

    -- 详细信息
    error_message TEXT,
    response_headers JSONB DEFAULT '{}',
    response_body_size INTEGER,

    -- 性能指标
    dns_time INTEGER,
    connect_time INTEGER,
    ssl_time INTEGER,
    ttfb INTEGER,

    -- 时间戳
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 系统管理模块
-- =====================================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 配置信息
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,

    -- 配置类型和分组
    config_type VARCHAR(50) DEFAULT 'general',
    config_group VARCHAR(50) DEFAULT 'system',

    -- 访问控制
    is_public BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT false,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统统计表
CREATE TABLE IF NOT EXISTS system_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 统计日期
    date DATE NOT NULL,

    -- 用户统计
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,

    -- 测试统计
    total_tests INTEGER DEFAULT 0,
    successful_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,

    -- 系统性能统计
    avg_response_time DECIMAL(10,2),
    system_uptime DECIMAL(5,2),

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(date)
);

-- 系统健康表
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    component VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time INTEGER,
    error_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(component)
);

-- 数据库迁移表
CREATE TABLE IF NOT EXISTS database_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time INTEGER,
    checksum VARCHAR(255),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- =====================================================
-- 5. 索引优化
-- =====================================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 用户会话表索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- 测试结果表索引
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_session_id ON test_results(session_id);
CREATE INDEX IF NOT EXISTS idx_test_results_type ON test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_url ON test_results USING hash(target_url);

-- 测试会话表索引
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_created_at ON test_sessions(created_at);

-- 监控相关索引
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_user_id ON monitoring_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_active ON monitoring_sites(is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_site_id ON monitoring_results(site_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_checked_at ON monitoring_results(checked_at);

-- JSONB 字段索引（利用 PostgreSQL GIN 索引）
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN(preferences);
CREATE INDEX IF NOT EXISTS idx_users_metadata ON users USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_test_results_results ON test_results USING GIN(results);
CREATE INDEX IF NOT EXISTS idx_test_results_metrics ON test_results USING GIN(metrics);
CREATE INDEX IF NOT EXISTS idx_test_results_tags ON test_results USING GIN(tags);

-- 复合索引
CREATE INDEX IF NOT EXISTS idx_test_results_user_type_status ON test_results(user_id, test_type, status);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_action ON user_activity_logs(user_id, action);

-- =====================================================
-- 6. 触发器和函数
-- =====================================================

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有需要的表添加更新触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_sessions_updated_at ON test_sessions;
CREATE TRIGGER update_test_sessions_updated_at
    BEFORE UPDATE ON test_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_results_updated_at ON test_results;
CREATE TRIGGER update_test_results_updated_at
    BEFORE UPDATE ON test_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_templates_updated_at ON test_templates;
CREATE TRIGGER update_test_templates_updated_at
    BEFORE UPDATE ON test_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_reports_updated_at ON test_reports;
CREATE TRIGGER update_test_reports_updated_at
    BEFORE UPDATE ON test_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_plans_updated_at ON test_plans;
CREATE TRIGGER update_test_plans_updated_at
    BEFORE UPDATE ON test_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monitoring_sites_updated_at ON monitoring_sites;
CREATE TRIGGER update_monitoring_sites_updated_at
    BEFORE UPDATE ON monitoring_sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_configs_updated_at ON system_configs;
CREATE TRIGGER update_system_configs_updated_at
    BEFORE UPDATE ON system_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_health_updated_at ON system_health;
CREATE TRIGGER update_system_health_updated_at
    BEFORE UPDATE ON system_health
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. 初始数据和配置
-- =====================================================

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description, config_type, config_group, is_public) VALUES
('app.name', '"Test Web Platform"', '应用程序名称', 'string', 'app', true),
('app.version', '"4.0.0"', '应用程序版本', 'string', 'app', true),
('app.maintenance_mode', 'false', '维护模式开关', 'boolean', 'app', false),
('test.max_concurrent_tests', '10', '最大并发测试数', 'number', 'test', false),
('test.default_timeout', '30000', '默认测试超时时间(毫秒)', 'number', 'test', false),
('monitoring.default_interval', '300', '默认监控间隔(秒)', 'number', 'monitoring', false),
('security.session_timeout', '86400', '会话超时时间(秒)', 'number', 'security', false),
('security.max_login_attempts', '5', '最大登录尝试次数', 'number', 'security', false)
ON CONFLICT (config_key) DO NOTHING;

-- 插入系统健康检查组件
INSERT INTO system_health (component, status, metadata) VALUES
('database', 'healthy', '{"last_backup": null, "connections": 0}'),
('redis', 'unknown', '{"memory_usage": 0, "connected_clients": 0}'),
('api_server', 'healthy', '{"uptime": 0, "requests_per_minute": 0}'),
('test_engine', 'healthy', '{"active_tests": 0, "queue_size": 0}'),
('monitoring_service', 'healthy', '{"active_monitors": 0, "alerts": 0}')
ON CONFLICT (component) DO NOTHING;

-- 插入数据库迁移记录
INSERT INTO database_migrations (name, checksum, success) VALUES
('complete_database_schema_v4', 'complete_v4_' || extract(epoch from now())::text, true)
ON CONFLICT (name) DO UPDATE SET
    executed_at = NOW(),
    checksum = 'complete_v4_' || extract(epoch from now())::text;

-- =====================================================
-- 8. 视图和函数
-- =====================================================

-- 用户统计视图
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id,
    u.username,
    u.email,
    u.role,
    u.plan,
    u.status,
    u.created_at,
    u.last_login,
    u.login_count,
    COUNT(tr.id) as total_tests,
    COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) as completed_tests,
    COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) as failed_tests,
    AVG(CASE WHEN tr.overall_score IS NOT NULL THEN tr.overall_score END) as avg_score
FROM users u
LEFT JOIN test_results tr ON u.id = tr.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.email, u.role, u.plan, u.status, u.created_at, u.last_login, u.login_count;

-- 测试统计视图
CREATE OR REPLACE VIEW test_stats AS
SELECT
    test_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN status = 'running' THEN 1 END) as running_count,
    AVG(CASE WHEN overall_score IS NOT NULL THEN overall_score END) as avg_score,
    AVG(CASE WHEN duration IS NOT NULL THEN duration END) as avg_duration
FROM test_results
GROUP BY test_type;

-- 系统概览视图
CREATE OR REPLACE VIEW system_overview AS
SELECT
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND last_login > NOW() - INTERVAL '30 days') as active_users,
    (SELECT COUNT(*) FROM test_results) as total_tests,
    (SELECT COUNT(*) FROM test_results WHERE status = 'completed') as completed_tests,
    (SELECT COUNT(*) FROM test_results WHERE created_at > NOW() - INTERVAL '24 hours') as tests_today,
    (SELECT COUNT(*) FROM monitoring_sites WHERE is_active = true) as active_monitors;

-- 清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- 清理过期的用户会话
    DELETE FROM user_sessions WHERE expires_at < NOW();

    -- 清理过期的刷新令牌
    DELETE FROM refresh_tokens WHERE expires_at < NOW();

    -- 清理过期的共享报告
    UPDATE test_reports SET is_public = false, share_token = NULL
    WHERE share_expires_at < NOW() AND is_public = true;

    -- 清理旧的监控结果（保留30天）
    DELETE FROM monitoring_results WHERE checked_at < NOW() - INTERVAL '30 days';

    -- 清理旧的用户活动日志（保留90天）
    DELETE FROM user_activity_logs WHERE created_at < NOW() - INTERVAL '90 days';

    RAISE NOTICE '过期数据清理完成';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. 权限和安全
-- =====================================================

-- 创建只读用户角色（用于报表和监控）
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'testweb_readonly') THEN
        CREATE ROLE testweb_readonly;
    END IF;
END
$$;

-- 授予只读权限
GRANT CONNECT ON DATABASE testweb_dev TO testweb_readonly;
GRANT USAGE ON SCHEMA public TO testweb_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO testweb_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO testweb_readonly;

-- 为未来的表自动授权
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO testweb_readonly;

-- =====================================================
-- 完成信息
-- =====================================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '数据库架构创建完成！';
    RAISE NOTICE '版本: 4.0 - 统一完整版';
    RAISE NOTICE '表数量: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE '索引数量: %', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE '触发器数量: %', (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public');
    RAISE NOTICE '视图数量: %', (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public');
    RAISE NOTICE '=====================================================';
END
$$;
