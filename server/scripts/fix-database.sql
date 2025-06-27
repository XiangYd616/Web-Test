-- ===========================================
-- Test Web App - 数据库初始化脚本
-- ===========================================
-- 版本: 2.0
-- 更新日期: 2025-06-25
-- 描述: 完整的数据库表结构初始化

-- 确保uuid-ossp扩展存在
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 安全地删除有问题的表（如果存在）
-- 注意：这会删除所有数据，仅在开发环境使用
DO $$
BEGIN
    -- 检查是否为开发环境
    IF current_setting('server_version_num')::int >= 90600 THEN
        -- 删除表的顺序很重要，先删除依赖表
        DROP TABLE IF EXISTS data_tasks CASCADE;
        DROP TABLE IF EXISTS monitoring_results CASCADE;
        DROP TABLE IF EXISTS monitoring_sites CASCADE;
        DROP TABLE IF EXISTS activity_logs CASCADE;
        DROP TABLE IF EXISTS user_preferences CASCADE;
        DROP TABLE IF EXISTS test_results CASCADE;

        RAISE NOTICE '已删除现有表结构';
    END IF;
END $$;

-- ===========================================
-- 用户表 (Users)
-- ===========================================
-- 检查users表是否存在，如果不存在则创建
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'tester')),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            -- 个人信息字段
            first_name VARCHAR(50),
            last_name VARCHAR(50),
            avatar_url VARCHAR(500),
            bio TEXT,
            location VARCHAR(100),
            website VARCHAR(500),

            -- 认证相关字段
            last_login TIMESTAMP,
            email_verified BOOLEAN DEFAULT false,
            email_verification_token VARCHAR(255),
            password_reset_token VARCHAR(255),
            password_reset_expires TIMESTAMP,

            -- 安全字段
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMP,
            two_factor_enabled BOOLEAN DEFAULT false,
            two_factor_secret VARCHAR(255)
        );

        RAISE NOTICE '创建用户表完成';
    ELSE
        -- 如果表存在，检查并添加缺失的字段
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS location VARCHAR(100),
        ADD COLUMN IF NOT EXISTS website VARCHAR(500);

        RAISE NOTICE '用户表已存在，已添加缺失字段';
    END IF;
END $$;

-- ===========================================
-- 用户偏好设置表 (User Preferences)
-- ===========================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 界面设置
    theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',

    -- 通知设置
    notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    browser_notifications BOOLEAN DEFAULT false,
    slack_notifications BOOLEAN DEFAULT false,

    -- 功能设置
    auto_save BOOLEAN DEFAULT true,
    auto_refresh BOOLEAN DEFAULT true,
    show_advanced_options BOOLEAN DEFAULT false,
    default_test_timeout INTEGER DEFAULT 30000,
    max_concurrent_tests INTEGER DEFAULT 5,

    -- 仪表板设置
    dashboard_layout JSONB DEFAULT '{"widgets": []}',
    favorite_tools TEXT[] DEFAULT '{}',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    UNIQUE(user_id)
);

-- ===========================================
-- 测试结果表 (Test Results)
-- ===========================================
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 测试基本信息
    url VARCHAR(2048) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('website', 'stress', 'security', 'seo', 'compatibility', 'api', 'database', 'ux')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'cancelled', 'timeout')),

    -- 时间信息
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- 毫秒

    -- 配置和结果
    config JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    summary TEXT,
    error_message TEXT,

    -- 分类和标记
    tags TEXT[] DEFAULT '{}',
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50),

    -- 性能指标
    score DECIMAL(5,2), -- 0-100分
    metrics JSONB DEFAULT '{}',

    -- 报告相关
    report_url VARCHAR(500),
    report_format VARCHAR(20) DEFAULT 'json',

    -- 调度信息
    scheduled BOOLEAN DEFAULT false,
    schedule_id UUID,
    parent_test_id UUID REFERENCES test_results(id) ON DELETE SET NULL,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 活动日志表 (Activity Logs)
-- ===========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 活动信息
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50), -- 'test', 'user', 'monitoring', 'data'
    resource_id UUID,
    description TEXT,

    -- 详细信息
    metadata JSONB DEFAULT '{}',
    old_values JSONB,
    new_values JSONB,

    -- 请求信息
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    session_id VARCHAR(255),

    -- 结果信息
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    duration INTEGER, -- 毫秒

    -- 安全相关
    risk_level VARCHAR(10) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    requires_review BOOLEAN DEFAULT false,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 监控站点表 (Monitoring Sites)
-- ===========================================
CREATE TABLE IF NOT EXISTS monitoring_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 基本信息
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    description TEXT,

    -- 监控配置
    enabled BOOLEAN DEFAULT true,
    interval_seconds INTEGER DEFAULT 300 CHECK (interval_seconds >= 60),
    timeout_seconds INTEGER DEFAULT 30 CHECK (timeout_seconds >= 5),

    -- 检查条件
    expected_status INTEGER DEFAULT 200,
    expected_content TEXT,
    keywords TEXT[] DEFAULT '{}',
    avoid_keywords TEXT[] DEFAULT '{}',

    -- 请求配置
    method VARCHAR(10) DEFAULT 'GET' CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'HEAD')),
    headers JSONB DEFAULT '{}',
    body TEXT,
    follow_redirects BOOLEAN DEFAULT true,
    verify_ssl BOOLEAN DEFAULT true,

    -- 通知设置
    notify_on_failure BOOLEAN DEFAULT true,
    notify_on_recovery BOOLEAN DEFAULT true,
    notification_channels TEXT[] DEFAULT '{"email"}',

    -- 统计信息
    total_checks INTEGER DEFAULT 0,
    successful_checks INTEGER DEFAULT 0,
    last_check_at TIMESTAMP,
    last_success_at TIMESTAMP,
    last_failure_at TIMESTAMP,
    current_status VARCHAR(20) DEFAULT 'unknown',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 监控结果表 (Monitoring Results)
-- ===========================================
CREATE TABLE IF NOT EXISTS monitoring_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES monitoring_sites(id) ON DELETE CASCADE,

    -- 响应信息
    status_code INTEGER,
    response_time INTEGER, -- 毫秒
    response_size INTEGER, -- 字节

    -- 检查结果
    success BOOLEAN NOT NULL,
    error_message TEXT,
    error_type VARCHAR(50), -- 'timeout', 'dns', 'connection', 'ssl', 'content'

    -- 内容检查
    content_matched BOOLEAN,
    keywords_found TEXT[],
    keywords_missing TEXT[],

    -- SSL信息
    ssl_info JSONB DEFAULT '{}',
    ssl_valid BOOLEAN,
    ssl_expires_at TIMESTAMP,

    -- 性能指标
    performance JSONB DEFAULT '{}',
    dns_time INTEGER,
    connect_time INTEGER,
    ssl_time INTEGER,
    first_byte_time INTEGER,

    -- 地理位置信息
    check_location VARCHAR(100),
    server_location VARCHAR(100),

    -- 通知状态
    notification_sent BOOLEAN DEFAULT false,
    notification_channels TEXT[],

    -- 时间戳
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 数据任务表 (Data Tasks)
-- ===========================================
CREATE TABLE IF NOT EXISTS data_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 任务基本信息
    name VARCHAR(255),
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('import', 'export', 'backup', 'restore', 'migration')),
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('test_results', 'monitoring_data', 'user_data', 'activity_logs', 'all')),

    -- 文件信息
    format VARCHAR(20) NOT NULL CHECK (format IN ('json', 'csv', 'xlsx', 'xml', 'sql')),
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    file_hash VARCHAR(64),

    -- 任务状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

    -- 配置信息
    config JSONB DEFAULT '{}',
    filters JSONB DEFAULT '{}',
    mapping JSONB DEFAULT '{}',

    -- 进度信息
    records_processed INTEGER DEFAULT 0,
    total_records INTEGER,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- 错误处理
    error_message TEXT,
    errors JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',

    -- 结果信息
    result_summary JSONB DEFAULT '{}',
    output_file_path VARCHAR(500),

    -- 时间信息
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 新增表结构
-- ===========================================

-- 测试模板表
CREATE TABLE IF NOT EXISTS test_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    config JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- 性能优化索引
-- ===========================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 测试结果表索引
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_type ON test_results(type);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_test_results_url ON test_results(url);
CREATE INDEX IF NOT EXISTS idx_test_results_score ON test_results(score);

-- 活动日志表索引
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- 监控相关索引
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_user_id ON monitoring_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_enabled ON monitoring_sites(enabled);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_url ON monitoring_sites(url);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_site_id ON monitoring_results(site_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_checked_at ON monitoring_results(checked_at);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_success ON monitoring_results(success);

-- 数据任务表索引
CREATE INDEX IF NOT EXISTS idx_data_tasks_user_id ON data_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_data_tasks_status ON data_tasks(status);
CREATE INDEX IF NOT EXISTS idx_data_tasks_type ON data_tasks(type);
CREATE INDEX IF NOT EXISTS idx_data_tasks_created_at ON data_tasks(created_at);

-- 新表索引
CREATE INDEX IF NOT EXISTS idx_test_templates_user_id ON test_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_test_templates_type ON test_templates(type);
CREATE INDEX IF NOT EXISTS idx_test_templates_public ON test_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ===========================================
-- 触发器函数
-- ===========================================

-- 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表添加更新时间戳触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_results_updated_at ON test_results;
CREATE TRIGGER update_test_results_updated_at
    BEFORE UPDATE ON test_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monitoring_sites_updated_at ON monitoring_sites;
CREATE TRIGGER update_monitoring_sites_updated_at
    BEFORE UPDATE ON monitoring_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_tasks_updated_at ON data_tasks;
CREATE TRIGGER update_data_tasks_updated_at
    BEFORE UPDATE ON data_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_templates_updated_at ON test_templates;
CREATE TRIGGER update_test_templates_updated_at
    BEFORE UPDATE ON test_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 默认数据插入
-- ===========================================

-- 插入默认管理员用户（如果不存在）
INSERT INTO users (username, email, password, role, is_active, email_verified)
VALUES ('admin', 'admin@testweb.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- 为管理员用户创建默认偏好设置
INSERT INTO user_preferences (user_id, theme, language, notifications, email_notifications)
SELECT id, 'dark', 'zh-CN', true, true
FROM users
WHERE email = 'admin@testweb.com'
AND NOT EXISTS (
    SELECT 1 FROM user_preferences WHERE user_id = users.id
);

-- 插入系统默认配置
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('app.name', '"Test Web App"', '应用程序名称', 'general', true),
('app.version', '"1.0.0"', '应用程序版本', 'general', true),
('app.description', '"专业的网站测试平台"', '应用程序描述', 'general', true),
('test.default_timeout', '30000', '默认测试超时时间（毫秒）', 'testing', false),
('test.max_concurrent', '5', '最大并发测试数', 'testing', false),
('monitoring.default_interval', '300', '默认监控间隔（秒）', 'monitoring', false),
('monitoring.max_sites', '100', '最大监控站点数', 'monitoring', false),
('security.password_min_length', '8', '密码最小长度', 'security', false),
('security.session_timeout', '86400', '会话超时时间（秒）', 'security', false),
('notification.email_enabled', 'true', '是否启用邮件通知', 'notification', false)
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- 数据完整性检查
-- ===========================================

-- 检查表是否创建成功
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'users', 'user_preferences', 'test_results', 'activity_logs',
        'monitoring_sites', 'monitoring_results', 'data_tasks',
        'test_templates', 'system_settings', 'notifications'
    ];
    missing_table TEXT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY(expected_tables);

    IF table_count = array_length(expected_tables, 1) THEN
        RAISE NOTICE '✅ 所有数据库表创建成功 (% 个表)', table_count;
    ELSE
        RAISE NOTICE '⚠️ 部分表创建失败，预期 % 个表，实际 % 个表', array_length(expected_tables, 1), table_count;

        -- 列出缺失的表
        FOR missing_table IN
            SELECT unnest(expected_tables)
            EXCEPT
            SELECT t.table_name FROM information_schema.tables t
            WHERE t.table_schema = 'public'
        LOOP
            RAISE NOTICE '❌ 缺失表: %', missing_table;
        END LOOP;
    END IF;
END $$;

-- 最终通知
DO $$
BEGIN
    RAISE NOTICE '🎉 数据库初始化脚本执行完成！';
    RAISE NOTICE '📊 请运行应用程序进行功能测试';
    RAISE NOTICE '🔧 如需重置数据库，请重新运行此脚本';
END $$;
