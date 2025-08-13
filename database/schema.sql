-- =====================================================
-- 统一测试平台数据库架构
-- 版本: 1.0 - 完整统一版
-- 创建时间: 2025-08-13
-- 设计目标: 支持8个统一测试工具的完整功能
-- 测试类型: api, compatibility, infrastructure, security, seo, stress, ux, website
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- 1. 用户管理模块
-- =====================================================

-- 用户主表
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
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. 测试管理模块
-- =====================================================

-- =====================================================
-- 测试记录主从表设计
-- =====================================================

-- 测试会话主表 - 存储测试会话的基本信息
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 会话基本信息
    session_name VARCHAR(200),
    description TEXT,
    batch_id VARCHAR(100), -- 批次ID，用于批量测试

    -- 会话状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

    -- 会话级别统计
    total_tests INTEGER DEFAULT 0,
    completed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,

    -- 会话配置
    global_config JSONB DEFAULT '{}', -- 全局配置
    environment JSONB DEFAULT '{}', -- 环境信息

    -- 时间信息
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_duration INTEGER, -- 毫秒

    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试记录从表 - 存储具体的测试执行记录
CREATE TABLE IF NOT EXISTS test_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,

    -- 测试基本信息
    test_name VARCHAR(200) NOT NULL,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),
    target_url TEXT NOT NULL,

    -- 测试状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

    -- 测试配置
    test_config JSONB DEFAULT '{}',

    -- 测试结果
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    grade VARCHAR(5), -- A+, A, B, C, D, F

    -- 执行信息
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- 毫秒

    -- 错误和建议
    error_message TEXT,
    error_details JSONB DEFAULT '{}',

    -- 环境信息
    user_agent TEXT,
    ip_address INET,

    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试结果详情表 - 存储测试的详细结果数据
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES test_records(id) ON DELETE CASCADE,

    -- 结果分类
    result_type VARCHAR(50) NOT NULL, -- 'metrics', 'issues', 'recommendations', 'raw_data'
    category VARCHAR(50), -- 具体分类，如 'performance', 'accessibility', 'security'

    -- 结果数据
    data JSONB NOT NULL,
    summary JSONB DEFAULT '{}',

    -- 严重程度（用于问题类型）
    severity VARCHAR(20) CHECK (severity IN ('critical', 'major', 'minor', 'info')),

    -- 排序和分组
    sort_order INTEGER DEFAULT 0,
    group_name VARCHAR(100),

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试指标表 - 存储量化的测试指标
CREATE TABLE IF NOT EXISTS test_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES test_records(id) ON DELETE CASCADE,

    -- 指标信息
    metric_name VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL,

    -- 指标值
    numeric_value DECIMAL(15,6),
    text_value TEXT,
    boolean_value BOOLEAN,
    json_value JSONB,

    -- 指标单位和阈值
    unit VARCHAR(20),
    threshold_min DECIMAL(15,6),
    threshold_max DECIMAL(15,6),
    is_within_threshold BOOLEAN,

    -- 指标重要性
    weight DECIMAL(3,2) DEFAULT 1.0,
    is_key_metric BOOLEAN DEFAULT false,

    -- 时间戳
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试问题表 - 存储发现的问题和建议
CREATE TABLE IF NOT EXISTS test_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL REFERENCES test_records(id) ON DELETE CASCADE,

    -- 问题信息
    issue_type VARCHAR(20) NOT NULL CHECK (issue_type IN ('error', 'warning', 'suggestion', 'info')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'info')),

    -- 问题描述
    title VARCHAR(200) NOT NULL,
    description TEXT,

    -- 问题详情
    affected_element TEXT,
    location JSONB, -- 位置信息，如行号、选择器等

    -- 解决方案
    recommendation TEXT,
    fix_complexity VARCHAR(20) CHECK (fix_complexity IN ('easy', 'medium', 'hard')),
    estimated_fix_time INTEGER, -- 预估修复时间（分钟）

    -- 相关资源
    documentation_url TEXT,
    example_fix TEXT,

    -- 分组和排序
    category VARCHAR(50),
    subcategory VARCHAR(50),
    sort_order INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户测试统计表
CREATE TABLE IF NOT EXISTS user_test_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),

    -- 统计数据
    total_tests INTEGER DEFAULT 0,
    successful_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,

    -- 评分统计
    average_score DECIMAL(5,2) DEFAULT 0.00,
    best_score INTEGER DEFAULT 0,
    worst_score INTEGER DEFAULT 100,

    -- 时间统计
    total_duration INTEGER DEFAULT 0, -- 毫秒
    average_duration INTEGER DEFAULT 0, -- 毫秒
    last_test_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 确保每个用户每种测试类型只有一条记录
    UNIQUE(user_id, test_type)
);

-- =====================================================
-- 3. 系统管理模块
-- =====================================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 数据库迁移记录表
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    description TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 索引创建
-- =====================================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 用户会话表索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 测试会话表索引
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_batch_id ON test_sessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_created_at ON test_sessions(created_at);

-- 测试记录表索引
CREATE INDEX IF NOT EXISTS idx_test_records_session_id ON test_records(session_id);
CREATE INDEX IF NOT EXISTS idx_test_records_test_type ON test_records(test_type);
CREATE INDEX IF NOT EXISTS idx_test_records_status ON test_records(status);
CREATE INDEX IF NOT EXISTS idx_test_records_target_url ON test_records(target_url);
CREATE INDEX IF NOT EXISTS idx_test_records_overall_score ON test_records(overall_score);
CREATE INDEX IF NOT EXISTS idx_test_records_created_at ON test_records(created_at);

-- 测试结果表索引
CREATE INDEX IF NOT EXISTS idx_test_results_record_id ON test_results(record_id);
CREATE INDEX IF NOT EXISTS idx_test_results_result_type ON test_results(result_type);
CREATE INDEX IF NOT EXISTS idx_test_results_category ON test_results(category);
CREATE INDEX IF NOT EXISTS idx_test_results_severity ON test_results(severity);

-- 测试指标表索引
CREATE INDEX IF NOT EXISTS idx_test_metrics_record_id ON test_metrics(record_id);
CREATE INDEX IF NOT EXISTS idx_test_metrics_name ON test_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_test_metrics_category ON test_metrics(metric_category);
CREATE INDEX IF NOT EXISTS idx_test_metrics_key_metric ON test_metrics(is_key_metric);

-- 测试问题表索引
CREATE INDEX IF NOT EXISTS idx_test_issues_record_id ON test_issues(record_id);
CREATE INDEX IF NOT EXISTS idx_test_issues_type ON test_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_test_issues_severity ON test_issues(severity);
CREATE INDEX IF NOT EXISTS idx_test_issues_category ON test_issues(category);

-- 用户测试统计表索引
CREATE INDEX IF NOT EXISTS idx_user_test_stats_user_id ON user_test_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_test_stats_test_type ON user_test_stats(test_type);
CREATE INDEX IF NOT EXISTS idx_user_test_stats_total_tests ON user_test_stats(total_tests);

-- 系统配置表索引
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_system_configs_public ON system_configs(is_public);

-- 系统日志表索引
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- =====================================================
-- 5. 触发器 - 自动更新时间戳
-- =====================================================

-- 创建更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_sessions_updated_at BEFORE UPDATE ON test_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_records_updated_at BEFORE UPDATE ON test_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_test_stats_updated_at BEFORE UPDATE ON user_test_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON system_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. 扩展功能表
-- =====================================================

-- 测试模板表
CREATE TABLE IF NOT EXISTS test_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 模板信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),

    -- 模板配置
    config JSONB DEFAULT '{}',
    default_settings JSONB DEFAULT '{}',

    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- 共享设置
    is_public BOOLEAN DEFAULT false,
    is_system_template BOOLEAN DEFAULT false,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,

    -- 报告信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    report_type VARCHAR(20) DEFAULT 'standard' CHECK (report_type IN ('standard', 'detailed', 'summary', 'comparison')),

    -- 报告内容
    content JSONB DEFAULT '{}',
    summary JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',

    -- 文件信息
    file_path TEXT,
    file_size INTEGER,
    file_format VARCHAR(10) DEFAULT 'json' CHECK (file_format IN ('json', 'pdf', 'html', 'csv')),

    -- 状态
    status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),

    -- 分享设置
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE,
    share_expires_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试队列表
CREATE TABLE IF NOT EXISTS test_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 队列信息
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),
    target_url TEXT NOT NULL,
    config JSONB DEFAULT '{}',

    -- 优先级和状态
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    -- 执行信息
    assigned_worker VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    -- 重试机制
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 密钥信息
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    key_hash VARCHAR(255) NOT NULL,

    -- 权限和限制
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000, -- 每小时请求数
    allowed_test_types JSONB DEFAULT '["api", "compatibility", "infrastructure", "security", "seo", "stress", "ux", "website"]',

    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- 状态
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    browser_notifications BOOLEAN DEFAULT true,
    test_completion_notifications BOOLEAN DEFAULT true,
    weekly_report_notifications BOOLEAN DEFAULT false,

    -- 测试偏好
    default_test_timeout INTEGER DEFAULT 300000, -- 毫秒
    auto_save_results BOOLEAN DEFAULT true,
    max_concurrent_tests INTEGER DEFAULT 3,

    -- 仪表板偏好
    dashboard_layout JSONB DEFAULT '{}',
    favorite_test_types JSONB DEFAULT '[]',
    recent_urls JSONB DEFAULT '[]',

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- 系统通知表
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 通知内容
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),

    -- 目标用户
    target_users JSONB DEFAULT '[]', -- 空数组表示所有用户
    target_roles JSONB DEFAULT '[]', -- 特定角色

    -- 显示设置
    is_active BOOLEAN DEFAULT true,
    is_dismissible BOOLEAN DEFAULT true,
    auto_dismiss_after INTEGER, -- 秒数，null表示不自动消失

    -- 优先级
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),

    -- 时间设置
    show_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    show_until TIMESTAMP WITH TIME ZONE,

    -- 统计
    view_count INTEGER DEFAULT 0,
    dismiss_count INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 监控站点表
CREATE TABLE IF NOT EXISTS monitoring_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 站点信息
    name VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,

    -- 监控配置
    check_interval INTEGER DEFAULT 300, -- 秒
    timeout INTEGER DEFAULT 30, -- 秒
    expected_status_code INTEGER DEFAULT 200,
    expected_content TEXT,

    -- 通知设置
    notify_on_down BOOLEAN DEFAULT true,
    notify_on_slow BOOLEAN DEFAULT false,
    slow_threshold INTEGER DEFAULT 5000, -- 毫秒

    -- 状态
    is_active BOOLEAN DEFAULT true,
    current_status VARCHAR(20) DEFAULT 'unknown' CHECK (current_status IN ('up', 'down', 'slow', 'unknown')),
    last_check_at TIMESTAMP WITH TIME ZONE,
    last_down_at TIMESTAMP WITH TIME ZONE,

    -- 统计
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    average_response_time INTEGER DEFAULT 0,
    total_checks INTEGER DEFAULT 0,
    failed_checks INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 监控结果表
CREATE TABLE IF NOT EXISTS monitoring_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,

    -- 检查结果
    status VARCHAR(20) NOT NULL CHECK (status IN ('up', 'down', 'slow', 'timeout', 'error')),
    response_time INTEGER, -- 毫秒
    status_code INTEGER,

    -- 详细信息
    error_message TEXT,
    response_headers JSONB DEFAULT '{}',
    response_body_size INTEGER,

    -- 性能指标
    dns_time INTEGER,
    connect_time INTEGER,
    ssl_time INTEGER,
    ttfb INTEGER, -- Time to First Byte

    -- 检查时间
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 文件上传表
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 文件信息
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    file_hash VARCHAR(255),

    -- 用途分类
    purpose VARCHAR(50) DEFAULT 'general' CHECK (purpose IN ('general', 'test_data', 'report', 'avatar', 'template')),
    related_entity_type VARCHAR(50), -- 关联的实体类型
    related_entity_id UUID, -- 关联的实体ID

    -- 访问控制
    is_public BOOLEAN DEFAULT false,
    access_token VARCHAR(255),

    -- 状态
    is_processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),

    -- 过期设置
    expires_at TIMESTAMP WITH TIME ZONE,

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

    -- 按测试类型统计
    api_tests INTEGER DEFAULT 0,
    compatibility_tests INTEGER DEFAULT 0,
    infrastructure_tests INTEGER DEFAULT 0,
    security_tests INTEGER DEFAULT 0,
    seo_tests INTEGER DEFAULT 0,
    stress_tests INTEGER DEFAULT 0,
    ux_tests INTEGER DEFAULT 0,
    website_tests INTEGER DEFAULT 0,

    -- 性能统计
    average_test_duration INTEGER DEFAULT 0, -- 毫秒
    total_test_duration BIGINT DEFAULT 0, -- 毫秒

    -- 系统资源统计
    storage_used BIGINT DEFAULT 0, -- 字节
    bandwidth_used BIGINT DEFAULT 0, -- 字节

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(date)
);

-- 引擎状态表
CREATE TABLE IF NOT EXISTS engine_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 引擎信息
    engine_name VARCHAR(50) NOT NULL,
    engine_type VARCHAR(20) NOT NULL CHECK (engine_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),
    version VARCHAR(20),

    -- 状态信息
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'down', 'maintenance', 'unknown')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,

    -- 性能指标
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    active_tests INTEGER DEFAULT 0,
    queue_length INTEGER DEFAULT 0,

    -- 配置
    max_concurrent_tests INTEGER DEFAULT 5,
    is_enabled BOOLEAN DEFAULT true,

    -- 错误信息
    last_error TEXT,
    error_count INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(engine_name, engine_type)
);

-- =====================================================
-- 7. 完整索引创建
-- =====================================================

-- 扩展功能表索引
CREATE INDEX IF NOT EXISTS idx_test_templates_user_id ON test_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_test_templates_test_type ON test_templates(test_type);
CREATE INDEX IF NOT EXISTS idx_test_templates_is_public ON test_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_test_templates_usage_count ON test_templates(usage_count);

CREATE INDEX IF NOT EXISTS idx_test_reports_user_id ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_session_id ON test_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_status ON test_reports(status);
CREATE INDEX IF NOT EXISTS idx_test_reports_is_public ON test_reports(is_public);

CREATE INDEX IF NOT EXISTS idx_test_queue_user_id ON test_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_test_queue_test_type ON test_queue(test_type);
CREATE INDEX IF NOT EXISTS idx_test_queue_status ON test_queue(status);
CREATE INDEX IF NOT EXISTS idx_test_queue_priority ON test_queue(priority);
CREATE INDEX IF NOT EXISTS idx_test_queue_created_at ON test_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_api_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_system_notifications_is_active ON system_notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_priority ON system_notifications(priority);

CREATE INDEX IF NOT EXISTS idx_monitoring_sites_user_id ON monitoring_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_is_active ON monitoring_sites(is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_current_status ON monitoring_sites(current_status);

CREATE INDEX IF NOT EXISTS idx_monitoring_results_site_id ON monitoring_results(site_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_status ON monitoring_results(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_checked_at ON monitoring_results(checked_at);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_purpose ON uploaded_files(purpose);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_is_public ON uploaded_files(is_public);

CREATE INDEX IF NOT EXISTS idx_system_stats_date ON system_stats(date);

CREATE INDEX IF NOT EXISTS idx_engine_status_engine_type ON engine_status(engine_type);
CREATE INDEX IF NOT EXISTS idx_engine_status_status ON engine_status(status);
CREATE INDEX IF NOT EXISTS idx_engine_status_is_enabled ON engine_status(is_enabled);

-- =====================================================
-- 8. 完整触发器创建
-- =====================================================

-- 为所有扩展表创建触发器
CREATE TRIGGER update_test_templates_updated_at BEFORE UPDATE ON test_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_reports_updated_at BEFORE UPDATE ON test_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_queue_updated_at BEFORE UPDATE ON test_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_notifications_updated_at BEFORE UPDATE ON system_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_sites_updated_at BEFORE UPDATE ON monitoring_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uploaded_files_updated_at BEFORE UPDATE ON uploaded_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_engine_status_updated_at BEFORE UPDATE ON engine_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. 数据完整性约束和业务规则
-- =====================================================

-- 确保测试会话的时间逻辑正确
ALTER TABLE test_sessions ADD CONSTRAINT check_session_time_logic
CHECK (started_at IS NULL OR completed_at IS NULL OR completed_at >= started_at);

-- 确保测试记录的时间逻辑正确
ALTER TABLE test_records ADD CONSTRAINT check_record_time_logic
CHECK (start_time IS NULL OR end_time IS NULL OR end_time >= start_time);

-- 确保测试会话统计数据逻辑正确
ALTER TABLE test_sessions ADD CONSTRAINT check_session_stats_logic
CHECK (completed_tests + failed_tests <= total_tests);

-- 确保用户测试统计的数据逻辑正确
ALTER TABLE user_test_stats ADD CONSTRAINT check_stats_logic
CHECK (successful_tests + failed_tests <= total_tests);

-- 确保监控站点的检查间隔合理
ALTER TABLE monitoring_sites ADD CONSTRAINT check_monitoring_interval
CHECK (check_interval >= 60 AND check_interval <= 86400); -- 1分钟到1天

-- 确保文件大小合理
ALTER TABLE uploaded_files ADD CONSTRAINT check_file_size
CHECK (file_size > 0 AND file_size <= 1073741824); -- 最大1GB

-- =====================================================
-- 10. 视图创建 - 便于查询的视图
-- =====================================================

-- 用户测试概览视图
CREATE OR REPLACE VIEW user_test_overview AS
SELECT
    u.id as user_id,
    u.username,
    u.email,
    u.role,
    COUNT(DISTINCT ts.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN ts.status = 'completed' THEN ts.id END) as completed_sessions,
    COUNT(DISTINCT CASE WHEN ts.status = 'failed' THEN ts.id END) as failed_sessions,
    COUNT(tr.id) as total_tests,
    COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) as completed_tests,
    COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) as failed_tests,
    AVG(CASE WHEN tr.overall_score IS NOT NULL THEN tr.overall_score END) as average_score,
    MAX(tr.created_at) as last_test_at
FROM users u
LEFT JOIN test_sessions ts ON u.id = ts.user_id
LEFT JOIN test_records tr ON ts.id = tr.session_id
GROUP BY u.id, u.username, u.email, u.role;

-- 测试类型统计视图
CREATE OR REPLACE VIEW test_type_stats AS
SELECT
    test_type,
    COUNT(*) as total_tests,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
    AVG(CASE WHEN overall_score IS NOT NULL THEN overall_score END) as average_score,
    AVG(CASE WHEN duration IS NOT NULL THEN duration END) as average_duration
FROM test_records
GROUP BY test_type;

-- 测试会话详情视图
CREATE OR REPLACE VIEW test_session_details AS
SELECT
    ts.id as session_id,
    ts.session_name,
    ts.user_id,
    u.username,
    ts.status as session_status,
    ts.total_tests,
    ts.completed_tests,
    ts.failed_tests,
    ts.started_at,
    ts.completed_at,
    ts.total_duration,
    COUNT(tr.id) as actual_test_count,
    AVG(tr.overall_score) as average_score,
    STRING_AGG(DISTINCT tr.test_type, ', ') as test_types
FROM test_sessions ts
LEFT JOIN users u ON ts.user_id = u.id
LEFT JOIN test_records tr ON ts.id = tr.session_id
GROUP BY ts.id, ts.session_name, ts.user_id, u.username, ts.status,
         ts.total_tests, ts.completed_tests, ts.failed_tests,
         ts.started_at, ts.completed_at, ts.total_duration;

-- 系统健康状态视图
CREATE OR REPLACE VIEW system_health_overview AS
SELECT
    'database' as component,
    'healthy' as status,
    NOW() as last_check,
    NULL as details
UNION ALL
SELECT
    CONCAT(engine_type, '_engine') as component,
    status,
    last_heartbeat as last_check,
    JSONB_BUILD_OBJECT(
        'active_tests', active_tests,
        'queue_length', queue_length,
        'cpu_usage', cpu_usage,
        'memory_usage', memory_usage
    ) as details
FROM engine_status
WHERE is_enabled = true;