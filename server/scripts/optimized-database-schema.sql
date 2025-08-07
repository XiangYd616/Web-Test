-- =====================================================
-- 测试工具平台优化数据库设计 (本地化优先)
-- 版本: 2.0
-- 创建时间: 2025-01-08
-- 设计目标: 支持本地化测试引擎，高性能，可扩展
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- 1. 用户管理表
-- =====================================================

-- 用户表 (优化版)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户表索引优化
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users USING hash(email);
CREATE INDEX IF NOT EXISTS idx_users_username_hash ON users USING hash(username);
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING gin(preferences);

-- =====================================================
-- 2. 测试结果核心表 (时间序列优化)
-- =====================================================

-- 测试结果主表 (支持所有测试类型)
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('seo', 'performance', 'security', 'api', 'compatibility', 'accessibility', 'stress')),
    test_name VARCHAR(255) NOT NULL,
    url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- 核心指标 (所有测试类型通用)
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
    
    -- 元数据
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
CREATE INDEX IF NOT EXISTS idx_test_results_url_gin ON test_results USING gin(to_tsvector('english', url));
CREATE INDEX IF NOT EXISTS idx_test_results_tags ON test_results USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_test_results_config ON test_results USING gin(config);
CREATE INDEX IF NOT EXISTS idx_test_results_deleted_at ON test_results(deleted_at) WHERE deleted_at IS NULL;

-- 复合索引优化常见查询
CREATE INDEX IF NOT EXISTS idx_test_results_user_type_created ON test_results(user_id, test_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_active ON test_results(user_id, test_type, created_at DESC) WHERE deleted_at IS NULL;

-- =====================================================
-- 3. SEO测试详细结果表
-- =====================================================

CREATE TABLE IF NOT EXISTS seo_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 技术SEO指标 (本地分析)
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
    
    -- 详细分析结果 (JSONB)
    meta_analysis JSONB DEFAULT '{}',
    content_analysis JSONB DEFAULT '{}',
    technical_analysis JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 性能测试详细结果表
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- Core Web Vitals (本地计算)
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

-- =====================================================
-- 5. 安全测试详细结果表
-- =====================================================

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

-- =====================================================
-- 6. API测试详细结果表
-- =====================================================

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

-- =====================================================
-- 7. 兼容性测试详细结果表
-- =====================================================

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

-- =====================================================
-- 8. 可访问性测试详细结果表
-- =====================================================

CREATE TABLE IF NOT EXISTS accessibility_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- WCAG符合性评分
    wcag_a_score DECIMAL(5,2),
    wcag_aa_score DECIMAL(5,2),
    wcag_aaa_score DECIMAL(5,2),
    
    -- 可访问性指标
    keyboard_navigation_score DECIMAL(5,2),
    screen_reader_score DECIMAL(5,2),
    color_contrast_score DECIMAL(5,2),
    
    -- 检查统计
    total_elements_checked INTEGER DEFAULT 0,
    accessible_elements INTEGER DEFAULT 0,
    inaccessible_elements INTEGER DEFAULT 0,
    
    -- 具体问题统计
    missing_alt_text INTEGER DEFAULT 0,
    poor_color_contrast INTEGER DEFAULT 0,
    missing_aria_labels INTEGER DEFAULT 0,
    keyboard_navigation_issues INTEGER DEFAULT 0,
    
    -- 详细分析结果
    wcag_analysis JSONB DEFAULT '{}',
    accessibility_issues JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. 压力测试详细结果表 (保留现有设计)
-- =====================================================

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
-- 10. 测试文件和资源表
-- =====================================================

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试文件索引
CREATE INDEX IF NOT EXISTS idx_test_artifacts_test_id ON test_artifacts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_artifacts_type ON test_artifacts(artifact_type);

-- =====================================================
-- 11. 系统配置和缓存表
-- =====================================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, key)
);

-- 测试引擎状态表 (监控本地引擎健康状态)
CREATE TABLE IF NOT EXISTS engine_status (
    id SERIAL PRIMARY KEY,
    engine_type VARCHAR(20) NOT NULL,
    engine_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down')),
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time INTEGER, -- 毫秒
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(engine_type)
);

-- =====================================================
-- 12. 触发器和函数
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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_engine_status_updated_at BEFORE UPDATE ON engine_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 13. 视图和查询优化
-- =====================================================

-- 测试结果汇总视图
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
    u.email
FROM test_results tr
JOIN users u ON tr.user_id = u.id
WHERE tr.deleted_at IS NULL;

-- 用户测试统计视图
CREATE OR REPLACE VIEW user_test_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(tr.id) as total_tests,
    COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) as completed_tests,
    COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) as failed_tests,
    AVG(CASE WHEN tr.overall_score IS NOT NULL THEN tr.overall_score END) as avg_score,
    MAX(tr.created_at) as last_test_date
FROM users u
LEFT JOIN test_results tr ON u.id = tr.user_id AND tr.deleted_at IS NULL
GROUP BY u.id, u.username;

-- =====================================================
-- 14. 初始化数据
-- =====================================================

-- 插入默认系统配置
INSERT INTO system_config (category, key, value, data_type, description, is_public) VALUES
('engine', 'seo_version', '1.0.0', 'string', 'SEO引擎版本', true),
('engine', 'performance_version', '1.0.0', 'string', '性能测试引擎版本', true),
('engine', 'security_version', '1.0.0', 'string', '安全测试引擎版本', true),
('engine', 'api_version', '1.0.0', 'string', 'API测试引擎版本', true),
('engine', 'compatibility_version', '1.0.0', 'string', '兼容性测试引擎版本', true),
('engine', 'accessibility_version', '1.0.0', 'string', '可访问性测试引擎版本', true),
('engine', 'stress_version', '1.0.0', 'string', '压力测试引擎版本', true),
('system', 'max_concurrent_tests', '10', 'number', '最大并发测试数', true),
('system', 'test_timeout', '300000', 'number', '测试超时时间(毫秒)', true),
('system', 'cleanup_retention_days', '30', 'number', '数据保留天数', false)
ON CONFLICT (category, key) DO NOTHING;

-- 初始化引擎状态
INSERT INTO engine_status (engine_type, engine_version, status) VALUES
('seo', '1.0.0', 'healthy'),
('performance', '1.0.0', 'healthy'),
('security', '1.0.0', 'healthy'),
('api', '1.0.0', 'healthy'),
('compatibility', '1.0.0', 'healthy'),
('accessibility', '1.0.0', 'healthy'),
('stress', '1.0.0', 'healthy')
ON CONFLICT (engine_type) DO NOTHING;

-- =====================================================
-- 完成
-- =====================================================

-- 分析表统计信息
ANALYZE users;
ANALYZE test_results;
ANALYZE seo_test_details;
ANALYZE performance_test_details;
ANALYZE security_test_details;
ANALYZE api_test_details;
ANALYZE compatibility_test_details;
ANALYZE accessibility_test_details;
ANALYZE stress_test_details;
ANALYZE test_artifacts;
ANALYZE system_config;
ANALYZE engine_status;

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '✅ 优化数据库架构创建完成!';
    RAISE NOTICE '📊 支持本地化测试引擎的高性能数据库已就绪';
    RAISE NOTICE '🚀 可以开始执行测试工具核心功能开发';
END $$;
