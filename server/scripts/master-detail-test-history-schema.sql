-- ===========================================
-- 测试历史主从表设计 - 最终方案
-- 1个主表 + 7个测试类型详情表
-- 符合数据库规范化原则，支持测试页面历史标签页
-- ===========================================

-- 设计原则：
-- 1. 完全符合数据库规范化（1NF、2NF、3NF）
-- 2. 主表存储所有测试类型的通用信息
-- 3. 详情表存储各测试类型的特定数据
-- 4. 通过视图简化常用查询
-- 5. 优化索引策略提升查询性能

-- ===========================================
-- 1. 主表：测试会话基础信息
-- ===========================================

CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 基础信息（所有测试类型通用）
    test_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    
    -- 状态和时间信息
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- 测试持续时间（秒）
    
    -- 通用评分和等级
    overall_score DECIMAL(5,2), -- 总体评分 0-100
    grade VARCHAR(2), -- 等级：A+, A, B+, B, C+, C, D, F
    
    -- 通用问题统计
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    major_issues INTEGER DEFAULT 0,
    minor_issues INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    
    -- 配置和环境信息
    config JSONB DEFAULT '{}', -- 测试配置参数
    environment VARCHAR(50) DEFAULT 'production',
    tags TEXT[] DEFAULT '{}',
    
    -- 备注和描述
    description TEXT,
    notes TEXT,
    
    -- 软删除
    deleted_at TIMESTAMP,
    
    -- 约束
    CONSTRAINT valid_test_type CHECK (test_type IN ('stress', 'security', 'api', 'performance', 'compatibility', 'seo', 'accessibility')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_score CHECK (overall_score >= 0 AND overall_score <= 100)
);

-- ===========================================
-- 2. 压力测试详情表
-- ===========================================

CREATE TABLE IF NOT EXISTS stress_test_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- 测试配置
    concurrent_users INTEGER NOT NULL,
    ramp_up_time INTEGER DEFAULT 0, -- 加压时间（秒）
    test_duration INTEGER NOT NULL, -- 测试持续时间（秒）
    think_time INTEGER DEFAULT 0, -- 思考时间（毫秒）
    
    -- 吞吐量指标
    tps_peak DECIMAL(10,2), -- 峰值TPS
    tps_average DECIMAL(10,2), -- 平均TPS
    total_requests INTEGER, -- 总请求数
    successful_requests INTEGER, -- 成功请求数
    failed_requests INTEGER, -- 失败请求数
    
    -- 响应时间指标（毫秒）
    response_time_avg DECIMAL(10,2),
    response_time_min DECIMAL(10,2),
    response_time_max DECIMAL(10,2),
    response_time_p50 DECIMAL(10,2), -- 50%分位数
    response_time_p90 DECIMAL(10,2), -- 90%分位数
    response_time_p95 DECIMAL(10,2), -- 95%分位数
    response_time_p99 DECIMAL(10,2), -- 99%分位数
    
    -- 错误统计
    error_rate DECIMAL(5,2), -- 错误率（%）
    timeout_errors INTEGER DEFAULT 0,
    connection_errors INTEGER DEFAULT 0,
    server_errors INTEGER DEFAULT 0,
    client_errors INTEGER DEFAULT 0,
    
    -- 系统资源使用
    cpu_usage_avg DECIMAL(5,2), -- 平均CPU使用率（%）
    cpu_usage_max DECIMAL(5,2), -- 最大CPU使用率（%）
    memory_usage_avg DECIMAL(5,2), -- 平均内存使用率（%）
    memory_usage_max DECIMAL(5,2), -- 最大内存使用率（%）
    
    -- 网络指标
    bytes_sent BIGINT DEFAULT 0,
    bytes_received BIGINT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT valid_concurrent_users CHECK (concurrent_users > 0),
    CONSTRAINT valid_test_duration CHECK (test_duration > 0),
    CONSTRAINT valid_error_rate CHECK (error_rate >= 0 AND error_rate <= 100)
);

-- ===========================================
-- 3. 安全测试详情表
-- ===========================================

CREATE TABLE IF NOT EXISTS security_test_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- 安全评分
    security_score DECIMAL(5,2), -- 总体安全评分
    ssl_score DECIMAL(5,2), -- SSL/TLS评分
    header_security_score DECIMAL(5,2), -- HTTP头安全评分
    authentication_score DECIMAL(5,2), -- 认证安全评分
    
    -- 漏洞统计
    vulnerabilities_total INTEGER DEFAULT 0,
    vulnerabilities_critical INTEGER DEFAULT 0,
    vulnerabilities_high INTEGER DEFAULT 0,
    vulnerabilities_medium INTEGER DEFAULT 0,
    vulnerabilities_low INTEGER DEFAULT 0,
    vulnerabilities_info INTEGER DEFAULT 0,
    
    -- 具体漏洞类型
    sql_injection_found INTEGER DEFAULT 0,
    xss_vulnerabilities INTEGER DEFAULT 0,
    csrf_vulnerabilities INTEGER DEFAULT 0,
    directory_traversal INTEGER DEFAULT 0,
    file_inclusion INTEGER DEFAULT 0,
    command_injection INTEGER DEFAULT 0,
    
    -- 安全配置检查
    https_enforced BOOLEAN DEFAULT FALSE,
    hsts_enabled BOOLEAN DEFAULT FALSE,
    csrf_protection BOOLEAN DEFAULT FALSE,
    secure_cookies BOOLEAN DEFAULT FALSE,
    content_security_policy BOOLEAN DEFAULT FALSE,
    x_frame_options BOOLEAN DEFAULT FALSE,
    
    -- 认证和授权
    weak_passwords_found INTEGER DEFAULT 0,
    default_credentials_found INTEGER DEFAULT 0,
    session_management_issues INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT valid_security_scores CHECK (
        security_score >= 0 AND security_score <= 100 AND
        ssl_score >= 0 AND ssl_score <= 100 AND
        header_security_score >= 0 AND header_security_score <= 100
    )
);

-- ===========================================
-- 4. API测试详情表
-- ===========================================

CREATE TABLE IF NOT EXISTS api_test_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- API测试概况
    endpoints_total INTEGER DEFAULT 0,
    endpoints_tested INTEGER DEFAULT 0,
    endpoints_passed INTEGER DEFAULT 0,
    endpoints_failed INTEGER DEFAULT 0,
    endpoints_skipped INTEGER DEFAULT 0,
    
    -- 性能指标
    api_response_time_avg DECIMAL(10,2), -- 平均响应时间（毫秒）
    api_response_time_max DECIMAL(10,2), -- 最大响应时间（毫秒）
    api_throughput DECIMAL(10,2), -- API吞吐量（请求/秒）
    
    -- HTTP状态码统计
    status_2xx_count INTEGER DEFAULT 0, -- 成功响应
    status_3xx_count INTEGER DEFAULT 0, -- 重定向
    status_4xx_count INTEGER DEFAULT 0, -- 客户端错误
    status_5xx_count INTEGER DEFAULT 0, -- 服务器错误
    
    -- 数据验证
    schema_validation_passed INTEGER DEFAULT 0,
    schema_validation_failed INTEGER DEFAULT 0,
    data_type_errors INTEGER DEFAULT 0,
    required_field_errors INTEGER DEFAULT 0,
    
    -- 认证和授权测试
    auth_methods_tested INTEGER DEFAULT 0,
    auth_methods_passed INTEGER DEFAULT 0,
    unauthorized_access_attempts INTEGER DEFAULT 0,
    
    -- API文档一致性
    documentation_coverage DECIMAL(5,2), -- 文档覆盖率（%）
    undocumented_endpoints INTEGER DEFAULT 0,
    deprecated_endpoints_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT valid_endpoints CHECK (endpoints_tested <= endpoints_total),
    CONSTRAINT valid_documentation_coverage CHECK (documentation_coverage >= 0 AND documentation_coverage <= 100)
);

-- ===========================================
-- 5. SEO测试详情表
-- ===========================================

CREATE TABLE IF NOT EXISTS seo_test_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- SEO评分
    seo_score DECIMAL(5,2), -- 总体SEO评分
    meta_tags_score DECIMAL(5,2), -- Meta标签评分
    content_score DECIMAL(5,2), -- 内容质量评分
    technical_score DECIMAL(5,2), -- 技术SEO评分
    performance_score DECIMAL(5,2), -- 性能评分
    
    -- Meta标签检查
    title_tag_present BOOLEAN DEFAULT FALSE,
    title_tag_length INTEGER DEFAULT 0,
    meta_description_present BOOLEAN DEFAULT FALSE,
    meta_description_length INTEGER DEFAULT 0,
    meta_keywords_present BOOLEAN DEFAULT FALSE,
    og_tags_present BOOLEAN DEFAULT FALSE,
    twitter_cards_present BOOLEAN DEFAULT FALSE,
    
    -- 内容分析
    h1_tags_count INTEGER DEFAULT 0,
    h2_tags_count INTEGER DEFAULT 0,
    h3_tags_count INTEGER DEFAULT 0,
    images_total INTEGER DEFAULT 0,
    images_without_alt INTEGER DEFAULT 0,
    internal_links_count INTEGER DEFAULT 0,
    external_links_count INTEGER DEFAULT 0,
    broken_links_count INTEGER DEFAULT 0,
    
    -- 技术SEO
    sitemap_present BOOLEAN DEFAULT FALSE,
    robots_txt_present BOOLEAN DEFAULT FALSE,
    canonical_tags_present BOOLEAN DEFAULT FALSE,
    schema_markup_present BOOLEAN DEFAULT FALSE,
    page_load_time DECIMAL(10,2), -- 页面加载时间（秒）
    mobile_friendly BOOLEAN DEFAULT FALSE,
    
    -- 内容质量
    word_count INTEGER DEFAULT 0,
    reading_level VARCHAR(50),
    duplicate_content_detected BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT valid_seo_scores CHECK (
        seo_score >= 0 AND seo_score <= 100 AND
        meta_tags_score >= 0 AND meta_tags_score <= 100 AND
        content_score >= 0 AND content_score <= 100 AND
        technical_score >= 0 AND technical_score <= 100
    )
);

-- ===========================================
-- 6. 可访问性测试详情表
-- ===========================================

CREATE TABLE IF NOT EXISTS accessibility_test_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- 可访问性评分
    accessibility_score DECIMAL(5,2), -- 总体可访问性评分
    wcag_aa_score DECIMAL(5,2), -- WCAG 2.1 AA合规评分
    wcag_aaa_score DECIMAL(5,2), -- WCAG 2.1 AAA合规评分
    
    -- WCAG原则检查
    perceivable_score DECIMAL(5,2), -- 可感知性评分
    operable_score DECIMAL(5,2), -- 可操作性评分
    understandable_score DECIMAL(5,2), -- 可理解性评分
    robust_score DECIMAL(5,2), -- 健壮性评分
    
    -- 具体问题统计
    color_contrast_issues INTEGER DEFAULT 0,
    keyboard_navigation_issues INTEGER DEFAULT 0,
    screen_reader_issues INTEGER DEFAULT 0,
    focus_management_issues INTEGER DEFAULT 0,
    
    -- 语义化和结构
    heading_structure_issues INTEGER DEFAULT 0,
    alt_text_missing INTEGER DEFAULT 0,
    form_labels_missing INTEGER DEFAULT 0,
    landmark_issues INTEGER DEFAULT 0,
    aria_issues INTEGER DEFAULT 0,
    
    -- 交互性检查
    interactive_elements_accessible BOOLEAN DEFAULT TRUE,
    error_messages_accessible BOOLEAN DEFAULT TRUE,
    skip_links_present BOOLEAN DEFAULT FALSE,
    
    -- 媒体可访问性
    video_captions_present BOOLEAN DEFAULT FALSE,
    audio_transcripts_present BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT valid_accessibility_scores CHECK (
        accessibility_score >= 0 AND accessibility_score <= 100 AND
        wcag_aa_score >= 0 AND wcag_aa_score <= 100 AND
        wcag_aaa_score >= 0 AND wcag_aaa_score <= 100
    )
);

-- ===========================================
-- 7. 兼容性测试详情表
-- ===========================================

CREATE TABLE IF NOT EXISTS compatibility_test_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- 兼容性评分
    compatibility_score DECIMAL(5,2), -- 总体兼容性评分
    browser_support_rate DECIMAL(5,2), -- 浏览器支持率（%）
    mobile_compatibility_score DECIMAL(5,2), -- 移动端兼容性评分
    
    -- 桌面浏览器测试结果
    chrome_compatible BOOLEAN DEFAULT FALSE,
    chrome_version VARCHAR(20),
    firefox_compatible BOOLEAN DEFAULT FALSE,
    firefox_version VARCHAR(20),
    safari_compatible BOOLEAN DEFAULT FALSE,
    safari_version VARCHAR(20),
    edge_compatible BOOLEAN DEFAULT FALSE,
    edge_version VARCHAR(20),
    
    -- 移动浏览器测试结果
    mobile_chrome_compatible BOOLEAN DEFAULT FALSE,
    mobile_safari_compatible BOOLEAN DEFAULT FALSE,
    mobile_firefox_compatible BOOLEAN DEFAULT FALSE,
    
    -- 设备兼容性
    ios_compatible BOOLEAN DEFAULT FALSE,
    android_compatible BOOLEAN DEFAULT FALSE,
    tablet_compatible BOOLEAN DEFAULT FALSE,
    
    -- 响应式设计
    responsive_design_score DECIMAL(5,2),
    breakpoint_issues INTEGER DEFAULT 0,
    layout_issues INTEGER DEFAULT 0,
    
    -- 技术兼容性
    css_compatibility_issues INTEGER DEFAULT 0,
    js_compatibility_issues INTEGER DEFAULT 0,
    html5_features_supported INTEGER DEFAULT 0,
    css3_features_supported INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT valid_compatibility_scores CHECK (
        compatibility_score >= 0 AND compatibility_score <= 100 AND
        browser_support_rate >= 0 AND browser_support_rate <= 100 AND
        mobile_compatibility_score >= 0 AND mobile_compatibility_score <= 100
    )
);

-- ===========================================
-- 8. 性能测试详情表
-- ===========================================

CREATE TABLE IF NOT EXISTS performance_test_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Core Web Vitals
    first_contentful_paint DECIMAL(10,2), -- FCP（毫秒）
    largest_contentful_paint DECIMAL(10,2), -- LCP（毫秒）
    first_input_delay DECIMAL(10,2), -- FID（毫秒）
    cumulative_layout_shift DECIMAL(10,3), -- CLS
    
    -- 其他性能指标
    time_to_interactive DECIMAL(10,2), -- TTI（毫秒）
    speed_index DECIMAL(10,2), -- 速度指数
    total_blocking_time DECIMAL(10,2), -- TBT（毫秒）
    
    -- 页面加载指标
    dom_content_loaded DECIMAL(10,2), -- DOMContentLoaded（毫秒）
    load_event_end DECIMAL(10,2), -- Load事件结束（毫秒）
    
    -- 资源分析
    total_page_size INTEGER, -- 页面总大小（字节）
    image_size INTEGER, -- 图片大小（字节）
    css_size INTEGER, -- CSS大小（字节）
    js_size INTEGER, -- JavaScript大小（字节）
    font_size INTEGER, -- 字体大小（字节）
    
    -- 网络性能
    dns_lookup_time DECIMAL(10,2), -- DNS查询时间（毫秒）
    tcp_connect_time DECIMAL(10,2), -- TCP连接时间（毫秒）
    ssl_handshake_time DECIMAL(10,2), -- SSL握手时间（毫秒）
    server_response_time DECIMAL(10,2), -- 服务器响应时间（毫秒）
    
    -- 优化建议统计
    image_optimization_needed INTEGER DEFAULT 0,
    css_optimization_needed INTEGER DEFAULT 0,
    js_optimization_needed INTEGER DEFAULT 0,
    caching_issues INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT valid_cls CHECK (cumulative_layout_shift >= 0),
    CONSTRAINT valid_page_size CHECK (total_page_size >= 0)
);

-- ===========================================
-- 9. 测试文件资源表
-- ===========================================

CREATE TABLE IF NOT EXISTS test_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,

    -- 文件信息
    artifact_type VARCHAR(50) NOT NULL, -- 'screenshot', 'report', 'video', 'har', 'log', 'pdf'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),

    -- 文件描述
    title VARCHAR(255),
    description TEXT,

    -- 文件状态
    upload_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'uploading', 'completed', 'failed'
    is_public BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT valid_artifact_type CHECK (artifact_type IN ('screenshot', 'report', 'video', 'har', 'log', 'pdf', 'json', 'csv')),
    CONSTRAINT valid_upload_status CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    CONSTRAINT valid_file_size CHECK (file_size >= 0)
);

-- ===========================================
-- 10. 索引策略（针对测试页面历史标签页优化）
-- ===========================================

-- 主表索引（覆盖90%的查询场景）
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_type_time ON test_sessions(user_id, test_type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_type_status ON test_sessions(user_id, test_type, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_type_score ON test_sessions(user_id, test_type, overall_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_test_sessions_status_time ON test_sessions(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_test_sessions_type_time ON test_sessions(test_type, created_at DESC) WHERE deleted_at IS NULL;

-- 详情表索引（用于JOIN查询）
CREATE INDEX IF NOT EXISTS idx_stress_test_details_session_id ON stress_test_details(session_id);
CREATE INDEX IF NOT EXISTS idx_security_test_details_session_id ON security_test_details(session_id);
CREATE INDEX IF NOT EXISTS idx_api_test_details_session_id ON api_test_details(session_id);
CREATE INDEX IF NOT EXISTS idx_seo_test_details_session_id ON seo_test_details(session_id);
CREATE INDEX IF NOT EXISTS idx_accessibility_test_details_session_id ON accessibility_test_details(session_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_test_details_session_id ON compatibility_test_details(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_test_details_session_id ON performance_test_details(session_id);

-- 文件资源索引
CREATE INDEX IF NOT EXISTS idx_test_artifacts_session_type ON test_artifacts(session_id, artifact_type);
CREATE INDEX IF NOT EXISTS idx_test_artifacts_type_status ON test_artifacts(artifact_type, upload_status);

-- 复合索引（用于特定查询场景）
CREATE INDEX IF NOT EXISTS idx_stress_test_tps_score ON stress_test_details(tps_peak DESC, session_id);
CREATE INDEX IF NOT EXISTS idx_security_test_vuln_score ON security_test_details(vulnerabilities_total DESC, session_id);
CREATE INDEX IF NOT EXISTS idx_seo_test_score ON seo_test_details(seo_score DESC, session_id);

-- ===========================================
-- 11. 查询优化视图（简化常用查询）
-- ===========================================

-- 压力测试历史视图（用于测试页面历史标签页）
CREATE OR REPLACE VIEW stress_test_history AS
SELECT
    ts.id, ts.user_id, ts.test_name, ts.url, ts.status, ts.created_at, ts.updated_at,
    ts.start_time, ts.end_time, ts.duration, ts.overall_score, ts.grade,
    ts.total_issues, ts.critical_issues, ts.major_issues, ts.minor_issues,
    ts.environment, ts.tags, ts.description,
    -- 压力测试关键指标
    std.tps_peak, std.tps_average, std.concurrent_users, std.total_requests,
    std.successful_requests, std.failed_requests, std.response_time_avg,
    std.response_time_p95, std.error_rate, std.cpu_usage_avg, std.memory_usage_avg
FROM test_sessions ts
LEFT JOIN stress_test_details std ON ts.id = std.session_id
WHERE ts.test_type = 'stress' AND ts.deleted_at IS NULL;

-- 安全测试历史视图
CREATE OR REPLACE VIEW security_test_history AS
SELECT
    ts.id, ts.user_id, ts.test_name, ts.url, ts.status, ts.created_at, ts.updated_at,
    ts.start_time, ts.end_time, ts.duration, ts.overall_score, ts.grade,
    ts.total_issues, ts.critical_issues, ts.major_issues, ts.minor_issues,
    ts.environment, ts.tags, ts.description,
    -- 安全测试关键指标
    std.security_score, std.ssl_score, std.vulnerabilities_total,
    std.vulnerabilities_critical, std.vulnerabilities_high,
    std.sql_injection_found, std.xss_vulnerabilities, std.csrf_vulnerabilities,
    std.https_enforced, std.hsts_enabled, std.csrf_protection
FROM test_sessions ts
LEFT JOIN security_test_details std ON ts.id = std.session_id
WHERE ts.test_type = 'security' AND ts.deleted_at IS NULL;

-- API测试历史视图
CREATE OR REPLACE VIEW api_test_history AS
SELECT
    ts.id, ts.user_id, ts.test_name, ts.url, ts.status, ts.created_at, ts.updated_at,
    ts.start_time, ts.end_time, ts.duration, ts.overall_score, ts.grade,
    ts.total_issues, ts.critical_issues, ts.major_issues, ts.minor_issues,
    ts.environment, ts.tags, ts.description,
    -- API测试关键指标
    atd.endpoints_total, atd.endpoints_tested, atd.endpoints_passed, atd.endpoints_failed,
    atd.api_response_time_avg, atd.status_2xx_count, atd.status_4xx_count, atd.status_5xx_count,
    atd.schema_validation_passed, atd.schema_validation_failed, atd.documentation_coverage
FROM test_sessions ts
LEFT JOIN api_test_details atd ON ts.id = atd.session_id
WHERE ts.test_type = 'api' AND ts.deleted_at IS NULL;

-- SEO测试历史视图
CREATE OR REPLACE VIEW seo_test_history AS
SELECT
    ts.id, ts.user_id, ts.test_name, ts.url, ts.status, ts.created_at, ts.updated_at,
    ts.start_time, ts.end_time, ts.duration, ts.overall_score, ts.grade,
    ts.total_issues, ts.critical_issues, ts.major_issues, ts.minor_issues,
    ts.environment, ts.tags, ts.description,
    -- SEO测试关键指标
    std.seo_score, std.meta_tags_score, std.content_score, std.technical_score,
    std.title_tag_present, std.meta_description_present, std.h1_tags_count,
    std.images_without_alt, std.broken_links_count, std.mobile_friendly,
    std.sitemap_present, std.robots_txt_present, std.page_load_time
FROM test_sessions ts
LEFT JOIN seo_test_details std ON ts.id = std.session_id
WHERE ts.test_type = 'seo' AND ts.deleted_at IS NULL;

-- 可访问性测试历史视图
CREATE OR REPLACE VIEW accessibility_test_history AS
SELECT
    ts.id, ts.user_id, ts.test_name, ts.url, ts.status, ts.created_at, ts.updated_at,
    ts.start_time, ts.end_time, ts.duration, ts.overall_score, ts.grade,
    ts.total_issues, ts.critical_issues, ts.major_issues, ts.minor_issues,
    ts.environment, ts.tags, ts.description,
    -- 可访问性测试关键指标
    atd.accessibility_score, atd.wcag_aa_score, atd.wcag_aaa_score,
    atd.color_contrast_issues, atd.keyboard_navigation_issues, atd.screen_reader_issues,
    atd.alt_text_missing, atd.form_labels_missing, atd.interactive_elements_accessible
FROM test_sessions ts
LEFT JOIN accessibility_test_details atd ON ts.id = atd.session_id
WHERE ts.test_type = 'accessibility' AND ts.deleted_at IS NULL;

-- 兼容性测试历史视图
CREATE OR REPLACE VIEW compatibility_test_history AS
SELECT
    ts.id, ts.user_id, ts.test_name, ts.url, ts.status, ts.created_at, ts.updated_at,
    ts.start_time, ts.end_time, ts.duration, ts.overall_score, ts.grade,
    ts.total_issues, ts.critical_issues, ts.major_issues, ts.minor_issues,
    ts.environment, ts.tags, ts.description,
    -- 兼容性测试关键指标
    ctd.compatibility_score, ctd.browser_support_rate, ctd.mobile_compatibility_score,
    ctd.chrome_compatible, ctd.firefox_compatible, ctd.safari_compatible, ctd.edge_compatible,
    ctd.ios_compatible, ctd.android_compatible, ctd.responsive_design_score,
    ctd.css_compatibility_issues, ctd.js_compatibility_issues
FROM test_sessions ts
LEFT JOIN compatibility_test_details ctd ON ts.id = ctd.session_id
WHERE ts.test_type = 'compatibility' AND ts.deleted_at IS NULL;

-- 性能测试历史视图
CREATE OR REPLACE VIEW performance_test_history AS
SELECT
    ts.id, ts.user_id, ts.test_name, ts.url, ts.status, ts.created_at, ts.updated_at,
    ts.start_time, ts.end_time, ts.duration, ts.overall_score, ts.grade,
    ts.total_issues, ts.critical_issues, ts.major_issues, ts.minor_issues,
    ts.environment, ts.tags, ts.description,
    -- 性能测试关键指标
    ptd.first_contentful_paint, ptd.largest_contentful_paint, ptd.first_input_delay,
    ptd.cumulative_layout_shift, ptd.time_to_interactive, ptd.speed_index,
    ptd.total_page_size, ptd.image_size, ptd.css_size, ptd.js_size,
    ptd.dns_lookup_time, ptd.server_response_time
FROM test_sessions ts
LEFT JOIN performance_test_details ptd ON ts.id = ptd.session_id
WHERE ts.test_type = 'performance' AND ts.deleted_at IS NULL;

-- ===========================================
-- 12. 数据操作函数
-- ===========================================

-- 插入压力测试结果的函数
CREATE OR REPLACE FUNCTION insert_stress_test_result(
    p_user_id UUID,
    p_test_name VARCHAR,
    p_url VARCHAR,
    p_config JSONB,
    p_stress_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- 插入主表
    INSERT INTO test_sessions (
        user_id, test_name, test_type, url, status,
        overall_score, grade, total_issues, critical_issues,
        config, start_time, end_time, duration
    ) VALUES (
        p_user_id, p_test_name, 'stress', p_url, 'completed',
        (p_stress_data->>'overall_score')::decimal,
        p_stress_data->>'grade',
        (p_stress_data->>'total_issues')::integer,
        (p_stress_data->>'critical_issues')::integer,
        p_config,
        (p_stress_data->>'start_time')::timestamp,
        (p_stress_data->>'end_time')::timestamp,
        (p_stress_data->>'duration')::integer
    ) RETURNING id INTO v_session_id;

    -- 插入压力测试详情
    INSERT INTO stress_test_details (
        session_id, concurrent_users, test_duration, tps_peak, tps_average,
        total_requests, successful_requests, failed_requests,
        response_time_avg, response_time_p95, response_time_p99,
        error_rate, cpu_usage_avg, memory_usage_avg
    ) VALUES (
        v_session_id,
        (p_stress_data->>'concurrent_users')::integer,
        (p_stress_data->>'test_duration')::integer,
        (p_stress_data->>'tps_peak')::decimal,
        (p_stress_data->>'tps_average')::decimal,
        (p_stress_data->>'total_requests')::integer,
        (p_stress_data->>'successful_requests')::integer,
        (p_stress_data->>'failed_requests')::integer,
        (p_stress_data->>'response_time_avg')::decimal,
        (p_stress_data->>'response_time_p95')::decimal,
        (p_stress_data->>'response_time_p99')::decimal,
        (p_stress_data->>'error_rate')::decimal,
        (p_stress_data->>'cpu_usage_avg')::decimal,
        (p_stress_data->>'memory_usage_avg')::decimal
    );

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- 插入安全测试结果的函数
CREATE OR REPLACE FUNCTION insert_security_test_result(
    p_user_id UUID,
    p_test_name VARCHAR,
    p_url VARCHAR,
    p_config JSONB,
    p_security_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- 插入主表
    INSERT INTO test_sessions (
        user_id, test_name, test_type, url, status,
        overall_score, grade, total_issues, critical_issues,
        config, start_time, end_time, duration
    ) VALUES (
        p_user_id, p_test_name, 'security', p_url, 'completed',
        (p_security_data->>'overall_score')::decimal,
        p_security_data->>'grade',
        (p_security_data->>'total_issues')::integer,
        (p_security_data->>'critical_issues')::integer,
        p_config,
        (p_security_data->>'start_time')::timestamp,
        (p_security_data->>'end_time')::timestamp,
        (p_security_data->>'duration')::integer
    ) RETURNING id INTO v_session_id;

    -- 插入安全测试详情
    INSERT INTO security_test_details (
        session_id, security_score, ssl_score, vulnerabilities_total,
        vulnerabilities_critical, vulnerabilities_high, vulnerabilities_medium,
        sql_injection_found, xss_vulnerabilities, csrf_vulnerabilities,
        https_enforced, hsts_enabled, csrf_protection
    ) VALUES (
        v_session_id,
        (p_security_data->>'security_score')::decimal,
        (p_security_data->>'ssl_score')::decimal,
        (p_security_data->>'vulnerabilities_total')::integer,
        (p_security_data->>'vulnerabilities_critical')::integer,
        (p_security_data->>'vulnerabilities_high')::integer,
        (p_security_data->>'vulnerabilities_medium')::integer,
        (p_security_data->>'sql_injection_found')::integer,
        (p_security_data->>'xss_vulnerabilities')::integer,
        (p_security_data->>'csrf_vulnerabilities')::integer,
        (p_security_data->>'https_enforced')::boolean,
        (p_security_data->>'hsts_enabled')::boolean,
        (p_security_data->>'csrf_protection')::boolean
    );

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- 软删除测试记录的函数
CREATE OR REPLACE FUNCTION soft_delete_test_session(p_session_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE test_sessions
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 批量软删除测试记录的函数
CREATE OR REPLACE FUNCTION batch_soft_delete_test_sessions(p_session_ids UUID[]) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE test_sessions
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ANY(p_session_ids) AND deleted_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 13. 查询示例（针对测试页面历史标签页）
-- ===========================================

-- 示例1：压力测试历史列表查询（90%的使用场景）
/*
-- 基础列表查询（只查主表，性能最佳）
SELECT
    id, test_name, url, status, created_at, overall_score, grade,
    total_issues, critical_issues, duration
FROM test_sessions
WHERE user_id = 'user-uuid'
  AND test_type = 'stress'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- 带搜索的列表查询
SELECT
    id, test_name, url, status, created_at, overall_score, grade,
    total_issues, critical_issues, duration
FROM test_sessions
WHERE user_id = 'user-uuid'
  AND test_type = 'stress'
  AND deleted_at IS NULL
  AND (test_name ILIKE '%search%' OR url ILIKE '%search%')
ORDER BY created_at DESC
LIMIT 20;

-- 带状态筛选的列表查询
SELECT
    id, test_name, url, status, created_at, overall_score, grade,
    total_issues, critical_issues, duration
FROM test_sessions
WHERE user_id = 'user-uuid'
  AND test_type = 'stress'
  AND status = 'completed'
  AND deleted_at IS NULL
ORDER BY overall_score DESC
LIMIT 20;
*/

-- 示例2：详细历史查询（使用视图，10%的使用场景）
/*
-- 压力测试详细历史
SELECT * FROM stress_test_history
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 20;

-- 安全测试详细历史
SELECT * FROM security_test_history
WHERE user_id = 'user-uuid'
  AND security_score < 80
ORDER BY created_at DESC;

-- API测试详细历史
SELECT * FROM api_test_history
WHERE user_id = 'user-uuid'
  AND endpoints_failed > 0
ORDER BY created_at DESC;
*/

-- 示例3：统计分析查询
/*
-- 用户各测试类型统计
SELECT
    test_type,
    COUNT(*) as total_tests,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
    AVG(overall_score) as avg_score,
    AVG(duration) as avg_duration
FROM test_sessions
WHERE user_id = 'user-uuid'
  AND deleted_at IS NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY test_type
ORDER BY total_tests DESC;

-- 压力测试性能趋势
SELECT
    DATE(ts.created_at) as test_date,
    AVG(std.tps_peak) as avg_tps,
    AVG(std.response_time_avg) as avg_response_time,
    AVG(std.error_rate) as avg_error_rate
FROM test_sessions ts
JOIN stress_test_details std ON ts.id = std.session_id
WHERE ts.user_id = 'user-uuid'
  AND ts.test_type = 'stress'
  AND ts.status = 'completed'
  AND ts.deleted_at IS NULL
  AND ts.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(ts.created_at)
ORDER BY test_date;
*/

-- 示例4：测试详情查询（1%的使用场景）
/*
-- 查看压力测试完整详情
SELECT
    ts.*,
    std.*
FROM test_sessions ts
JOIN stress_test_details std ON ts.id = std.session_id
WHERE ts.id = 'session-uuid';

-- 查看安全测试完整详情
SELECT
    ts.*,
    std.*
FROM test_sessions ts
JOIN security_test_details std ON ts.id = std.session_id
WHERE ts.id = 'session-uuid';
*/

-- ===========================================
-- 14. 性能监控查询
-- ===========================================

-- 查看表大小和记录数
/*
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables
WHERE tablename LIKE '%test%'
ORDER BY n_live_tup DESC;
*/

-- 查看索引使用情况
/*
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename LIKE '%test%'
ORDER BY idx_scan DESC;
*/

-- 查看慢查询
/*
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%test_sessions%'
ORDER BY mean_time DESC
LIMIT 10;
*/
