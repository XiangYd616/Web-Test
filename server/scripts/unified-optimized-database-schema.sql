-- =====================================================
-- 测试工具平台统一优化数据库架构
-- 版本: 3.0 - 数据兼容性修复版本
-- 创建时间: 2025-01-08
-- 设计目标: 解决前后端数据库不适配问题，统一架构，高性能优化
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- 1. 用户管理模块 (统一架构)
-- =====================================================

-- 用户表 (统一前后端需求)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
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

-- 用户表索引优化
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users USING hash(email);
CREATE INDEX IF NOT EXISTS idx_users_username_hash ON users USING hash(username);
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin(preferences);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_verification ON users(verification_token) WHERE verification_token IS NOT NULL;

-- =====================================================
-- 2. 测试系统模块 (核心统一架构)
-- =====================================================

-- 测试结果主表 (支持所有测试类型的统一架构)
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 测试基本信息
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('seo', 'performance', 'security', 'api', 'compatibility', 'accessibility', 'stress')),
    test_name VARCHAR(255) NOT NULL,
    url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
    
    -- 核心评分指标 (统一所有测试类型)
    overall_score DECIMAL(5,2),
    grade VARCHAR(5), -- A+, A, B+, B, C+, C, D, F
    
    -- 时间信息
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER, -- 毫秒
    
    -- 配置和结果 (JSONB for flexibility)
    config JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    
    -- 统计信息
    total_checks INTEGER DEFAULT 0,
    passed_checks INTEGER DEFAULT 0,
    failed_checks INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    
    -- 技术元数据
    engine_version VARCHAR(50), -- 本地引擎版本
    user_agent TEXT,
    ip_address INET,
    tags TEXT[],
    notes TEXT,
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 测试结果表索引优化 (支持高频查询)
CREATE INDEX IF NOT EXISTS idx_test_results_user_type ON test_results(user_id, test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_url_gin ON test_results USING gin(to_tsvector('english', COALESCE(url, '')));
CREATE INDEX IF NOT EXISTS idx_test_results_tags ON test_results USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_test_results_config ON test_results USING gin(config);
CREATE INDEX IF NOT EXISTS idx_test_results_active ON test_results(user_id, test_type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_test_results_score ON test_results(overall_score DESC) WHERE overall_score IS NOT NULL;

-- =====================================================
-- 3. 测试详细结果表 (各测试类型专用)
-- =====================================================

-- SEO测试详细结果
CREATE TABLE IF NOT EXISTS seo_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 技术SEO指标
    meta_title_score DECIMAL(5,2),
    meta_description_score DECIMAL(5,2),
    meta_keywords_score DECIMAL(5,2),
    heading_structure_score DECIMAL(5,2),
    internal_links_score DECIMAL(5,2),
    
    -- 内容质量指标
    content_length INTEGER,
    word_count INTEGER,
    readability_score DECIMAL(5,2),
    keyword_density DECIMAL(5,2),
    
    -- 技术性能指标
    page_speed_score DECIMAL(5,2),
    mobile_friendly_score DECIMAL(5,2),
    core_web_vitals_score DECIMAL(5,2),
    
    -- 结构化数据
    structured_data_count INTEGER DEFAULT 0,
    structured_data_errors INTEGER DEFAULT 0,
    
    -- 详细分析结果
    meta_analysis JSONB DEFAULT '{}',
    content_analysis JSONB DEFAULT '{}',
    technical_analysis JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 性能测试详细结果
CREATE TABLE IF NOT EXISTS performance_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- Core Web Vitals
    largest_contentful_paint INTEGER, -- 毫秒
    first_input_delay INTEGER, -- 毫秒
    cumulative_layout_shift DECIMAL(5,3),
    first_contentful_paint INTEGER, -- 毫秒
    time_to_interactive INTEGER, -- 毫秒
    
    -- 性能指标
    speed_index INTEGER,
    total_blocking_time INTEGER, -- 毫秒
    dom_content_loaded INTEGER, -- 毫秒
    load_event_end INTEGER, -- 毫秒
    
    -- 资源分析
    total_page_size BIGINT, -- 字节
    image_size BIGINT,
    css_size BIGINT,
    js_size BIGINT,
    font_size BIGINT,
    other_size BIGINT,
    
    -- 网络性能
    dns_lookup_time INTEGER, -- 毫秒
    tcp_connect_time INTEGER, -- 毫秒
    ssl_handshake_time INTEGER, -- 毫秒
    server_response_time INTEGER, -- 毫秒
    
    -- 优化建议计数
    image_optimization_opportunities INTEGER DEFAULT 0,
    css_optimization_opportunities INTEGER DEFAULT 0,
    js_optimization_opportunities INTEGER DEFAULT 0,
    
    -- 详细分析结果
    resource_analysis JSONB DEFAULT '{}',
    optimization_suggestions JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 安全测试详细结果
CREATE TABLE IF NOT EXISTS security_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 安全评分
    overall_security_score DECIMAL(5,2),
    ssl_score DECIMAL(5,2),
    headers_score DECIMAL(5,2),
    vulnerabilities_score DECIMAL(5,2),
    
    -- 漏洞统计
    critical_vulnerabilities INTEGER DEFAULT 0,
    high_vulnerabilities INTEGER DEFAULT 0,
    medium_vulnerabilities INTEGER DEFAULT 0,
    low_vulnerabilities INTEGER DEFAULT 0,
    
    -- 具体漏洞类型
    sql_injection_found INTEGER DEFAULT 0,
    xss_vulnerabilities INTEGER DEFAULT 0,
    csrf_vulnerabilities INTEGER DEFAULT 0,
    directory_traversal INTEGER DEFAULT 0,
    
    -- SSL/TLS分析
    ssl_enabled BOOLEAN DEFAULT false,
    ssl_version VARCHAR(20),
    ssl_cipher VARCHAR(100),
    ssl_expires_at TIMESTAMP WITH TIME ZONE,
    ssl_issuer VARCHAR(255),
    
    -- 安全头检查
    hsts_enabled BOOLEAN DEFAULT false,
    csp_enabled BOOLEAN DEFAULT false,
    xframe_options_enabled BOOLEAN DEFAULT false,
    xss_protection_enabled BOOLEAN DEFAULT false,
    
    -- 详细分析结果
    vulnerability_details JSONB DEFAULT '[]',
    ssl_analysis JSONB DEFAULT '{}',
    headers_analysis JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API测试详细结果
CREATE TABLE IF NOT EXISTS api_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- API测试统计
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    
    -- 性能指标
    avg_response_time INTEGER, -- 毫秒
    min_response_time INTEGER,
    max_response_time INTEGER,
    p50_response_time INTEGER,
    p90_response_time INTEGER,
    p95_response_time INTEGER,
    
    -- HTTP状态码统计
    status_2xx INTEGER DEFAULT 0,
    status_3xx INTEGER DEFAULT 0,
    status_4xx INTEGER DEFAULT 0,
    status_5xx INTEGER DEFAULT 0,
    
    -- 数据验证
    schema_validation_passed INTEGER DEFAULT 0,
    schema_validation_failed INTEGER DEFAULT 0,
    
    -- 详细测试结果
    test_cases JSONB DEFAULT '[]',
    validation_results JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 兼容性测试详细结果
CREATE TABLE IF NOT EXISTS compatibility_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 浏览器兼容性评分
    chrome_score DECIMAL(5,2),
    firefox_score DECIMAL(5,2),
    safari_score DECIMAL(5,2),
    edge_score DECIMAL(5,2),
    ie_score DECIMAL(5,2),
    
    -- 设备兼容性评分
    desktop_score DECIMAL(5,2),
    tablet_score DECIMAL(5,2),
    mobile_score DECIMAL(5,2),
    
    -- 特性支持统计
    css_features_tested INTEGER DEFAULT 0,
    css_features_supported INTEGER DEFAULT 0,
    js_features_tested INTEGER DEFAULT 0,
    js_features_supported INTEGER DEFAULT 0,
    
    -- 详细兼容性结果
    browser_results JSONB DEFAULT '{}',
    device_results JSONB DEFAULT '{}',
    feature_support JSONB DEFAULT '{}',
    compatibility_issues JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 可访问性测试详细结果表已移除
-- 可访问性功能已整合到兼容性测试中

-- 压力测试详细结果
CREATE TABLE IF NOT EXISTS stress_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 测试配置
    concurrent_users INTEGER,
    ramp_up_time INTEGER, -- 秒
    test_duration INTEGER, -- 秒
    think_time INTEGER, -- 毫秒
    
    -- 性能指标
    tps_peak DECIMAL(10,2),
    tps_average DECIMAL(10,2),
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    
    -- 响应时间统计
    response_time_avg INTEGER, -- 毫秒
    response_time_min INTEGER,
    response_time_max INTEGER,
    response_time_p50 INTEGER,
    response_time_p90 INTEGER,
    response_time_p95 INTEGER,
    response_time_p99 INTEGER,
    
    -- 错误统计
    error_rate DECIMAL(5,2), -- 百分比
    timeout_errors INTEGER,
    connection_errors INTEGER,
    server_errors INTEGER,
    client_errors INTEGER,
    
    -- 系统资源使用
    cpu_usage_avg DECIMAL(5,2), -- 百分比
    cpu_usage_max DECIMAL(5,2),
    memory_usage_avg BIGINT, -- 字节
    memory_usage_max BIGINT,
    
    -- 网络统计
    bytes_sent BIGINT,
    bytes_received BIGINT,
    
    -- 详细结果
    performance_timeline JSONB DEFAULT '[]',
    error_details JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 监控系统模块
-- =====================================================

-- 监控站点表
CREATE TABLE IF NOT EXISTS monitoring_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    monitoring_type VARCHAR(20) DEFAULT 'uptime' CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo')),
    check_interval INTEGER DEFAULT 300, -- 秒
    timeout INTEGER DEFAULT 30, -- 秒
    
    -- 监控配置
    config JSONB DEFAULT '{}',
    
    -- 状态信息
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
    last_check TIMESTAMP WITH TIME ZONE,
    last_status VARCHAR(20),
    consecutive_failures INTEGER DEFAULT 0,
    
    -- 通知设置
    notification_settings JSONB DEFAULT '{}',
    
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
    response_time INTEGER, -- 毫秒
    status_code INTEGER,
    
    -- 详细结果
    results JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- 时间信息
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 索引优化
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 监控相关索引
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_user ON monitoring_sites(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_status ON monitoring_sites(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_site_time ON monitoring_results(site_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_status ON monitoring_results(status, checked_at DESC);

-- =====================================================
-- 5. 系统管理模块
-- =====================================================

-- 系统配置表 (统一前后端配置)
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT false,
    validation_rules JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, key)
);

-- 测试引擎状态表 (监控本地引擎健康状态)
CREATE TABLE IF NOT EXISTS engine_status (
    id SERIAL PRIMARY KEY,
    engine_type VARCHAR(20) NOT NULL,
    engine_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'maintenance')),
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time INTEGER, -- 毫秒
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(engine_type)
);

-- 测试文件和资源表
CREATE TABLE IF NOT EXISTS test_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) NOT NULL, -- screenshot, report, log, trace, etc.
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 系统日志表 (统一日志管理)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    category VARCHAR(50),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- 上下文信息
    context JSONB DEFAULT '{}',
    stack_trace TEXT,
    request_id VARCHAR(100),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统管理相关索引
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);
CREATE INDEX IF NOT EXISTS idx_system_config_public ON system_config(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_engine_status_type ON engine_status(engine_type);
CREATE INDEX IF NOT EXISTS idx_test_artifacts_test_id ON test_artifacts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_artifacts_type ON test_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_time ON system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category_time ON system_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON system_logs(user_id, created_at DESC);

-- =====================================================
-- 6. 触发器和函数
-- =====================================================

-- 自动更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加 updated_at 触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_results_updated_at ON test_results;
CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monitoring_sites_updated_at ON monitoring_sites;
CREATE TRIGGER update_monitoring_sites_updated_at BEFORE UPDATE ON monitoring_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_engine_status_updated_at ON engine_status;
CREATE TRIGGER update_engine_status_updated_at BEFORE UPDATE ON engine_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. 视图和查询优化
-- =====================================================

-- 测试结果汇总视图 (前后端统一数据格式)
CREATE OR REPLACE VIEW test_results_summary AS
SELECT 
    tr.id,
    tr.user_id,
    tr.test_type,
    tr.test_name,
    tr.url,
    tr.status,
    tr.overall_score,
    tr.grade,
    tr.started_at,
    tr.completed_at,
    tr.duration_ms,
    tr.total_checks,
    tr.passed_checks,
    tr.failed_checks,
    tr.warnings,
    tr.created_at,
    u.username,
    u.email,
    u.plan
FROM test_results tr
JOIN users u ON tr.user_id = u.id
WHERE tr.deleted_at IS NULL AND u.deleted_at IS NULL;

-- 用户测试统计视图
CREATE OR REPLACE VIEW user_test_stats AS
SELECT 
    u.id as user_id,
    u.username,
    u.plan,
    COUNT(tr.id) as total_tests,
    COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) as completed_tests,
    COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) as failed_tests,
    COUNT(CASE WHEN tr.status = 'running' THEN 1 END) as running_tests,
    AVG(CASE WHEN tr.overall_score IS NOT NULL THEN tr.overall_score END) as avg_score,
    MAX(tr.created_at) as last_test_date,
    COUNT(CASE WHEN tr.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as tests_last_30_days
FROM users u
LEFT JOIN test_results tr ON u.id = tr.user_id AND tr.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.plan;

-- 系统健康状态视图
CREATE OR REPLACE VIEW system_health AS
SELECT 
    'database' as component,
    'healthy' as status,
    NOW() as last_check,
    NULL as error_message
UNION ALL
SELECT 
    engine_type as component,
    status,
    last_check,
    error_message
FROM engine_status;

-- =====================================================
-- 8. 初始化数据
-- =====================================================

-- 插入默认系统配置
INSERT INTO system_config (category, key, value, data_type, description, is_public, is_required) VALUES
-- 引擎配置
('engine', 'seo_version', '2.0.0', 'string', 'SEO引擎版本', true, false),
('engine', 'performance_version', '2.0.0', 'string', '性能测试引擎版本', true, false),
('engine', 'security_version', '2.0.0', 'string', '安全测试引擎版本', true, false),
('engine', 'api_version', '2.0.0', 'string', 'API测试引擎版本', true, false),
('engine', 'compatibility_version', '2.0.0', 'string', '兼容性测试引擎版本', true, false),
('engine', 'accessibility_version', '2.0.0', 'string', '可访问性测试引擎版本', true, false),
('engine', 'stress_version', '2.0.0', 'string', '压力测试引擎版本', true, false),

-- 系统限制
('system', 'max_concurrent_tests', '10', 'number', '最大并发测试数', true, true),
('system', 'test_timeout', '300000', 'number', '测试超时时间(毫秒)', true, true),
('system', 'cleanup_retention_days', '90', 'number', '数据保留天数', false, true),
('system', 'max_file_size', '10485760', 'number', '最大文件上传大小(字节)', true, true),

-- 用户限制
('limits', 'free_tests_per_day', '10', 'number', '免费用户每日测试限制', true, true),
('limits', 'pro_tests_per_day', '100', 'number', 'Pro用户每日测试限制', true, true),
('limits', 'enterprise_tests_per_day', '1000', 'number', '企业用户每日测试限制', true, true),

-- 通知配置
('notification', 'email_enabled', 'true', 'boolean', '邮件通知启用', true, true),
('notification', 'webhook_enabled', 'true', 'boolean', 'Webhook通知启用', true, true),
('notification', 'slack_enabled', 'false', 'boolean', 'Slack通知启用', true, false),

-- 监控配置
('monitoring', 'default_check_interval', '300', 'number', '默认检查间隔(秒)', true, true),
('monitoring', 'max_monitoring_sites', '50', 'number', '最大监控站点数', true, true),
('monitoring', 'alert_threshold', '3', 'number', '告警阈值(连续失败次数)', true, true)

ON CONFLICT (category, key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 初始化引擎状态
INSERT INTO engine_status (engine_type, engine_version, status, metadata) VALUES
('seo', '2.0.0', 'healthy', '{"features": ["meta_analysis", "content_analysis", "technical_seo"]}'),
('performance', '2.0.0', 'healthy', '{"features": ["core_web_vitals", "resource_analysis", "optimization"]}'),
('security', '2.0.0', 'healthy', '{"features": ["vulnerability_scan", "ssl_analysis", "headers_check"]}'),
('api', '2.0.0', 'healthy', '{"features": ["endpoint_testing", "schema_validation", "performance"]}'),
('compatibility', '2.0.0', 'healthy', '{"features": ["browser_testing", "device_testing", "feature_detection"]}'),
('accessibility', '2.0.0', 'healthy', '{"features": ["wcag_compliance", "screen_reader", "keyboard_navigation"]}'),
('stress', '2.0.0', 'healthy', '{"features": ["load_testing", "concurrent_users", "performance_metrics"]}')
ON CONFLICT (engine_type) DO UPDATE SET
    engine_version = EXCLUDED.engine_version,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- =====================================================
-- 9. 性能优化
-- =====================================================

-- 分析表统计信息
ANALYZE users;
ANALYZE test_results;
ANALYZE seo_test_details;
ANALYZE performance_test_details;
ANALYZE security_test_details;
ANALYZE api_test_details;
ANALYZE compatibility_test_details;
-- accessibility_test_details table removed
ANALYZE stress_test_details;
ANALYZE monitoring_sites;
ANALYZE monitoring_results;
ANALYZE test_artifacts;
ANALYZE system_config;
ANALYZE engine_status;
ANALYZE system_logs;

-- =====================================================
-- 10. 完成信息
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ 统一优化数据库架构创建完成!';
    RAISE NOTICE '📊 支持前后端统一的高性能数据库已就绪';
    RAISE NOTICE '🔧 包含用户管理、测试系统、监控系统、系统管理四大模块';
    RAISE NOTICE '🚀 数据兼容性问题已解决，可以开始应用开发';
    RAISE NOTICE '💡 建议运行数据库验证: SELECT * FROM system_health;';
END $$;