-- Test Web App - 完整数据库架构初始化脚本
-- 创建所有必需的表结构、索引、约束和默认数据

-- 开始事务
BEGIN;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    
    -- 用户状态
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- 登录安全
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    
    -- 密码重置
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    
    -- 邮箱验证
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP,
    
    -- 用户信息
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'zh-CN',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    
    -- 项目设置
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测试结果表 (主表)
CREATE TABLE IF NOT EXISTS tests (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 测试基本信息
    type VARCHAR(50) NOT NULL CHECK (type IN ('api', 'performance', 'security', 'seo', 'ux', 'compatibility', 'stress')),
    url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- 测试配置和结果
    config JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    
    -- 测试统计
    duration_ms INTEGER,
    error_message TEXT,
    
    -- 时间戳
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测试历史表
CREATE TABLE IF NOT EXISTS test_history (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- 历史记录信息
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    
    -- 会话信息
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    
    -- 会话状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    
    -- 会话数据
    session_data JSONB DEFAULT '{}',
    
    -- 时间管理
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 报告信息
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) DEFAULT 'html' CHECK (format IN ('html', 'pdf', 'json', 'csv')),
    
    -- 报告内容
    test_ids JSONB DEFAULT '[]',
    data JSONB DEFAULT '{}',
    file_path TEXT,
    file_size INTEGER,
    
    -- 报告状态
    status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    
    -- 时间戳
    generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- 密钥信息
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    
    -- 权限设置
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    
    -- 状态管理
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    
    -- 过期管理
    expires_at TIMESTAMP,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户偏好设置表
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- 界面偏好
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- 通知偏好
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    
    -- 测试偏好
    default_timeout INTEGER DEFAULT 30000,
    auto_retry BOOLEAN DEFAULT false,
    
    -- 其他设置
    settings JSONB DEFAULT '{}',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    
    -- 配置分类
    category VARCHAR(100) DEFAULT 'general',
    
    -- 访问控制
    is_public BOOLEAN DEFAULT false,
    editable BOOLEAN DEFAULT true,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测试队列表
CREATE TABLE IF NOT EXISTS test_queue (
    id SERIAL PRIMARY KEY,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- 队列信息
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- 错误信息
    error_message TEXT,
    
    -- 时间管理
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统统计表
CREATE TABLE IF NOT EXISTS test_statistics (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    
    -- 测试统计
    total_tests INTEGER DEFAULT 0,
    successful_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    
    -- 按类型统计
    api_tests INTEGER DEFAULT 0,
    performance_tests INTEGER DEFAULT 0,
    security_tests INTEGER DEFAULT 0,
    seo_tests INTEGER DEFAULT 0,
    ux_tests INTEGER DEFAULT 0,
    compatibility_tests INTEGER DEFAULT 0,
    stress_tests INTEGER DEFAULT 0,
    
    -- 用户统计
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统监控表
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC,
    unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统健康检查表
CREATE TABLE IF NOT EXISTS system_health_checks (
    id SERIAL PRIMARY KEY,
    component VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
    message TEXT,
    details JSONB DEFAULT '{}',
    response_time_ms INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 网站信息表 (用于记录测试过的网站)
CREATE TABLE IF NOT EXISTS websites (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    domain VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    description TEXT,
    
    -- 网站元数据
    meta_data JSONB DEFAULT '{}',
    
    -- 统计信息
    test_count INTEGER DEFAULT 0,
    last_test_at TIMESTAMP,
    
    -- 时间戳
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 配置模板表
CREATE TABLE IF NOT EXISTS config_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    
    -- 模板属性
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 项目表索引
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_uuid ON projects(uuid);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- 测试表索引
CREATE INDEX IF NOT EXISTS idx_tests_uuid ON tests(uuid);
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_project_id ON tests(project_id);
CREATE INDEX IF NOT EXISTS idx_tests_type ON tests(type);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at);
CREATE INDEX IF NOT EXISTS idx_tests_type_status ON tests(type, status);

-- 测试历史表索引
CREATE INDEX IF NOT EXISTS idx_test_history_test_id ON test_history(test_id);
CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_timestamp ON test_history(timestamp);

-- 用户会话表索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 测试报告表索引
CREATE INDEX IF NOT EXISTS idx_test_reports_user_id ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_project_id ON test_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_uuid ON test_reports(uuid);
CREATE INDEX IF NOT EXISTS idx_test_reports_status ON test_reports(status);

-- API密钥表索引
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- 系统配置表索引
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- 测试队列表索引
CREATE INDEX IF NOT EXISTS idx_test_queue_test_id ON test_queue(test_id);
CREATE INDEX IF NOT EXISTS idx_test_queue_status ON test_queue(status);
CREATE INDEX IF NOT EXISTS idx_test_queue_priority ON test_queue(priority);
CREATE INDEX IF NOT EXISTS idx_test_queue_scheduled_at ON test_queue(scheduled_at);

-- 统计表索引
CREATE INDEX IF NOT EXISTS idx_test_statistics_date ON test_statistics(date);

-- 监控表索引
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_checks_component ON system_health_checks(component);
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON system_health_checks(timestamp);

-- 网站表索引
CREATE INDEX IF NOT EXISTS idx_websites_url ON websites(url);
CREATE INDEX IF NOT EXISTS idx_websites_domain ON websites(domain);

-- 配置模板表索引
CREATE INDEX IF NOT EXISTS idx_config_templates_user_id ON config_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_config_templates_type ON config_templates(type);
CREATE INDEX IF NOT EXISTS idx_config_templates_public ON config_templates(is_public);

-- 插入默认系统配置
INSERT INTO system_config (key, value, data_type, description, category, is_public) VALUES
('app_name', 'Test Web App', 'string', '应用程序名称', 'general', true),
('app_version', '1.0.0', 'string', '应用程序版本', 'general', true),
('maintenance_mode', 'false', 'boolean', '维护模式开关', 'system', false),
('max_concurrent_tests', '10', 'number', '最大并发测试数量', 'testing', false),
('default_test_timeout', '30000', 'number', '默认测试超时时间(毫秒)', 'testing', false),
('enable_user_registration', 'true', 'boolean', '允许用户注册', 'auth', false),
('require_email_verification', 'false', 'boolean', '要求邮箱验证', 'auth', false),
('session_timeout', '86400', 'number', '会话超时时间(秒)', 'auth', false),
('rate_limit_window', '900', 'number', '速率限制窗口时间(秒)', 'security', false),
('rate_limit_max_requests', '100', 'number', '速率限制最大请求数', 'security', false)
ON CONFLICT (key) DO NOTHING;

-- 创建默认管理员用户 (密码: admin123)
INSERT INTO users (username, email, password_hash, role, is_active, email_verified) VALUES
('admin', 'admin@testweb.local', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeifFQ9GRD4rn9/S2', 'super_admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- 创建用户偏好设置触发器函数
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_create_user_preferences ON users;
CREATE TRIGGER trigger_create_user_preferences
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_preferences();

-- 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表创建更新触发器
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_tests_updated_at ON tests;
CREATE TRIGGER trigger_tests_updated_at
    BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_test_reports_updated_at ON test_reports;
CREATE TRIGGER trigger_test_reports_updated_at
    BEFORE UPDATE ON test_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_api_keys_updated_at ON api_keys;
CREATE TRIGGER trigger_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_system_config_updated_at ON system_config;
CREATE TRIGGER trigger_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_websites_updated_at ON websites;
CREATE TRIGGER trigger_websites_updated_at
    BEFORE UPDATE ON websites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_config_templates_updated_at ON config_templates;
CREATE TRIGGER trigger_config_templates_updated_at
    BEFORE UPDATE ON config_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 提交事务
COMMIT;

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '✅ Test Web App 数据库初始化完成!';
    RAISE NOTICE '📊 创建的表: users, projects, tests, test_history, user_sessions';
    RAISE NOTICE '📊 创建的表: test_reports, api_keys, user_preferences, system_config';
    RAISE NOTICE '📊 创建的表: test_queue, test_statistics, system_metrics';
    RAISE NOTICE '📊 创建的表: system_health_checks, websites, config_templates';
    RAISE NOTICE '🔑 默认管理员: admin@testweb.local / admin123';
    RAISE NOTICE '🚀 应用程序可以启动了!';
END $$;
