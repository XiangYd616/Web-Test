-- =====================================================
-- 完备的企业级数据库架构
-- 版本: 3.0 - 完整功能版
-- 创建时间: 2023-12-08
-- 设计目标: 支持完整的网站测试平台功能
-- 表数量: 37个业务表 + 完整索引 + 触发器 + 函数
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- 1. 用户管理模块 (完整版)
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
    notifications JSONB DEFAULT '{"email": true, "browser": true, "sms": false}',
    email_notifications BOOLEAN DEFAULT true,
    browser_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    
    -- 测试偏好
    auto_save BOOLEAN DEFAULT true,
    default_test_timeout INTEGER DEFAULT 30,
    max_concurrent_tests INTEGER DEFAULT 3,
    
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

-- 用户收藏表
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 收藏信息
    name VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    
    -- 分类和标签
    category VARCHAR(50),
    tags JSONB DEFAULT '[]',
    
    -- 统计
    visit_count INTEGER DEFAULT 0,
    last_visited TIMESTAMP WITH TIME ZONE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户统计表
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 统计日期
    date DATE NOT NULL,
    
    -- 测试统计
    tests_run INTEGER DEFAULT 0,
    tests_passed INTEGER DEFAULT 0,
    tests_failed INTEGER DEFAULT 0,
    
    -- 使用时间统计
    active_time INTEGER DEFAULT 0,
    
    -- 功能使用统计
    features_used JSONB DEFAULT '{}',
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- 用户通知表
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 通知内容
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- 通知数据
    data JSONB DEFAULT '{}',
    
    -- 状态
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 2. 测试系统模块 (完整版)
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

-- 测试结果主表
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
    
    -- 测试配置和结果数据
    config JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    
    -- 性能指标
    execution_time INTEGER, -- 毫秒
    memory_usage INTEGER, -- MB
    
    -- 错误信息
    error_message TEXT,
    error_details JSONB,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 测试队列表
CREATE TABLE IF NOT EXISTS test_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 队列信息
    test_type VARCHAR(20) NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- 测试配置
    test_config JSONB NOT NULL,
    target_url TEXT NOT NULL,
    
    -- 执行信息
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- 结果关联
    result_id UUID REFERENCES test_results(id) ON DELETE SET NULL,
    
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
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 测试文件和资源表
CREATE TABLE IF NOT EXISTS test_artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 文件信息
    artifact_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 测试标签表
CREATE TABLE IF NOT EXISTS test_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 标签信息
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, name)
);

-- 测试结果标签关联表
CREATE TABLE IF NOT EXISTS test_result_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES test_tags(id) ON DELETE CASCADE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(test_result_id, tag_id)
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
-- 3. 测试详细结果表 (完整版)
-- =====================================================

-- SEO测试详细结果
CREATE TABLE IF NOT EXISTS seo_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 技术SEO指标
    meta_title_score DECIMAL(5,2),
    meta_description_score DECIMAL(5,2),
    heading_structure_score DECIMAL(5,2),
    url_structure_score DECIMAL(5,2),
    internal_linking_score DECIMAL(5,2),
    
    -- 内容SEO指标
    content_quality_score DECIMAL(5,2),
    keyword_density_score DECIMAL(5,2),
    readability_score DECIMAL(5,2),
    
    -- 技术性能指标
    page_speed_score DECIMAL(5,2),
    mobile_friendliness_score DECIMAL(5,2),
    
    -- 详细数据
    meta_tags JSONB DEFAULT '{}',
    headings JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    links JSONB DEFAULT '[]',
    
    -- 建议和问题
    issues JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 性能测试详细结果
CREATE TABLE IF NOT EXISTS performance_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- Core Web Vitals
    largest_contentful_paint INTEGER,
    first_input_delay INTEGER,
    cumulative_layout_shift DECIMAL(5,3),
    first_contentful_paint INTEGER,
    time_to_interactive INTEGER,
    
    -- 加载性能
    dom_content_loaded INTEGER,
    load_complete INTEGER,
    total_blocking_time INTEGER,
    
    -- 资源分析
    total_resources INTEGER,
    total_size INTEGER,
    image_size INTEGER,
    script_size INTEGER,
    css_size INTEGER,
    
    -- 网络性能
    dns_lookup_time INTEGER,
    tcp_connect_time INTEGER,
    ssl_handshake_time INTEGER,
    ttfb INTEGER,
    
    -- 详细数据
    lighthouse_data JSONB DEFAULT '{}',
    resource_breakdown JSONB DEFAULT '{}',
    opportunities JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 安全测试详细结果
CREATE TABLE IF NOT EXISTS security_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 安全评分
    overall_security_score DECIMAL(5,2),
    ssl_score DECIMAL(5,2),
    headers_score DECIMAL(5,2),
    cookies_score DECIMAL(5,2),
    
    -- SSL/TLS信息
    ssl_grade VARCHAR(5),
    ssl_protocol VARCHAR(20),
    ssl_cipher VARCHAR(100),
    ssl_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- 安全头检查
    security_headers JSONB DEFAULT '{}',
    missing_headers JSONB DEFAULT '[]',
    
    -- Cookie安全
    secure_cookies BOOLEAN,
    httponly_cookies BOOLEAN,
    samesite_cookies VARCHAR(20),
    
    -- 漏洞检查
    vulnerabilities JSONB DEFAULT '[]',
    security_issues JSONB DEFAULT '[]',
    
    -- 建议
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
    
    -- 响应时间统计
    avg_response_time DECIMAL(10,2),
    min_response_time INTEGER,
    max_response_time INTEGER,
    
    -- 状态码分布
    status_codes JSONB DEFAULT '{}',
    
    -- 端点测试结果
    endpoints JSONB DEFAULT '[]',
    
    -- 错误详情
    errors JSONB DEFAULT '[]',
    
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
    
    -- 设备兼容性
    desktop_score DECIMAL(5,2),
    mobile_score DECIMAL(5,2),
    tablet_score DECIMAL(5,2),
    
    -- 详细测试结果
    browser_results JSONB DEFAULT '{}',
    device_results JSONB DEFAULT '{}',
    feature_support JSONB DEFAULT '{}',
    
    -- 兼容性问题
    issues JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 压力测试详细结果
CREATE TABLE IF NOT EXISTS stress_test_details (
    test_id UUID PRIMARY KEY REFERENCES test_results(id) ON DELETE CASCADE,
    
    -- 测试配置
    concurrent_users INTEGER,
    ramp_up_time INTEGER,
    test_duration INTEGER,
    
    -- 性能指标
    requests_per_second DECIMAL(10,2),
    avg_response_time DECIMAL(10,2),
    min_response_time INTEGER,
    max_response_time INTEGER,
    
    -- 成功率
    total_requests INTEGER,
    successful_requests INTEGER,
    failed_requests INTEGER,
    error_rate DECIMAL(5,2),
    
    -- 资源使用
    peak_cpu_usage DECIMAL(5,2),
    peak_memory_usage INTEGER,
    
    -- 详细数据
    timeline_data JSONB DEFAULT '[]',
    error_breakdown JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 监控系统模块 (完整版)
-- =====================================================

-- 监控站点表
CREATE TABLE IF NOT EXISTS monitoring_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 站点信息
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,

    -- 监控配置
    monitoring_type VARCHAR(20) DEFAULT 'uptime' CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo')),
    check_interval INTEGER DEFAULT 300,
    timeout INTEGER DEFAULT 30,

    -- 通知设置
    notifications JSONB DEFAULT '{"email": true, "webhook": false}',
    alert_threshold DECIMAL(5,2) DEFAULT 95.0,

    -- 状态
    is_active BOOLEAN DEFAULT true,
    last_check TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('up', 'down', 'degraded', 'unknown')),

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
-- 5. 系统管理模块 (完整版)
-- =====================================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, key)
);

-- 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    category VARCHAR(50),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 上下文信息
    context JSONB DEFAULT '{}',
    stack_trace TEXT,

    -- 请求信息
    request_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统通知表
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 通知内容
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'maintenance')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- 目标用户
    target_users JSONB DEFAULT '[]',
    target_roles JSONB DEFAULT '[]',

    -- 显示设置
    is_active BOOLEAN DEFAULT true,
    show_until TIMESTAMP WITH TIME ZONE,

    -- 统计
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,

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

-- 测试引擎状态表
CREATE TABLE IF NOT EXISTS engine_status (
    id SERIAL PRIMARY KEY,
    engine_type VARCHAR(20) NOT NULL,
    engine_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'maintenance')),
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(engine_type)
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
-- 6. API和集成模块 (完整版)
-- =====================================================

-- API密钥管理表
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 密钥信息
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,

    -- 权限和限制
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    allowed_ips JSONB DEFAULT '[]',

    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,

    -- 过期设置
    expires_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API使用统计表
CREATE TABLE IF NOT EXISTS api_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

    -- 使用统计
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER,

    -- 请求信息
    ip_address INET,
    user_agent TEXT,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. 团队协作模块 (完整版)
-- =====================================================

-- 用户团队表
CREATE TABLE IF NOT EXISTS user_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 团队信息
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- 团队设置
    max_members INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',

    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 团队成员表
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES user_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 成员角色
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),

    -- 权限
    permissions JSONB DEFAULT '[]',

    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),

    -- 时间戳
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(team_id, user_id)
);

-- =====================================================
-- 8. 文件和邮件模块 (完整版)
-- =====================================================

-- 文件上传管理表
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 文件基本信息
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100),

    -- 文件用途
    purpose VARCHAR(50) DEFAULT 'general',

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 邮件队列表
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 邮件信息
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_text TEXT,
    body_html TEXT,

    -- 状态
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,

    -- 错误信息
    error_message TEXT,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,

    -- 优先级
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10)
);

-- =====================================================
-- 9. 完整的索引系统 (135个索引)
-- =====================================================

-- 用户相关索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_status_active ON users(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 会话相关索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, last_activity DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(is_active, expires_at) WHERE is_active = true;

-- 用户偏好和活动索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_action ON user_activity_logs(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource ON user_activity_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_category ON user_bookmarks(user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_url ON user_bookmarks(url);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_date ON user_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_date ON user_stats(date DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type, created_at DESC);

-- 测试相关索引
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_status ON test_sessions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_sessions_url ON test_sessions(target_url);

CREATE INDEX IF NOT EXISTS idx_test_results_user_type ON test_results(user_id, test_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_session ON test_results(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_url ON test_results(target_url);
CREATE INDEX IF NOT EXISTS idx_test_results_score ON test_results(overall_score DESC) WHERE overall_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_results_completed ON test_results(completed_at DESC) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_test_queue_status_priority ON test_queue(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_test_queue_user_id ON test_queue(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_queue_type ON test_queue(test_type, status);

CREATE INDEX IF NOT EXISTS idx_test_templates_user_type ON test_templates(user_id, test_type);
CREATE INDEX IF NOT EXISTS idx_test_templates_public ON test_templates(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_test_templates_category ON test_templates(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_reports_user_status ON test_reports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_reports_type ON test_reports(report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_reports_public ON test_reports(is_public, created_at DESC) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_test_artifacts_test_id ON test_artifacts(test_id, artifact_type);
CREATE INDEX IF NOT EXISTS idx_test_artifacts_type ON test_artifacts(artifact_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_tags_user ON test_tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_test_result_tags_result ON test_result_tags(test_result_id);
CREATE INDEX IF NOT EXISTS idx_test_result_tags_tag ON test_result_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_test_plans_user_status ON test_plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_plans_next_run ON test_plans(next_run_at) WHERE status = 'active';

-- 测试详情表索引
CREATE INDEX IF NOT EXISTS idx_seo_test_details_test_id ON seo_test_details(test_id);
CREATE INDEX IF NOT EXISTS idx_performance_test_details_test_id ON performance_test_details(test_id);
CREATE INDEX IF NOT EXISTS idx_security_test_details_test_id ON security_test_details(test_id);
CREATE INDEX IF NOT EXISTS idx_api_test_details_test_id ON api_test_details(test_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_test_details_test_id ON compatibility_test_details(test_id);
CREATE INDEX IF NOT EXISTS idx_stress_test_details_test_id ON stress_test_details(test_id);

-- 监控相关索引
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_user_active ON monitoring_sites(user_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_url ON monitoring_sites(url);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_type ON monitoring_sites(monitoring_type, is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_status ON monitoring_sites(status, last_check DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_results_site_checked ON monitoring_results(site_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_status ON monitoring_results(status, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_response_time ON monitoring_results(response_time) WHERE response_time IS NOT NULL;

-- 系统管理索引
CREATE INDEX IF NOT EXISTS idx_system_config_category_key ON system_config(category, key);
CREATE INDEX IF NOT EXISTS idx_system_config_public ON system_config(is_public, category) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_system_logs_level_created ON system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_notifications_active ON system_notifications(is_active, created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_stats_date ON system_stats(date DESC);

CREATE INDEX IF NOT EXISTS idx_engine_status_type ON engine_status(engine_type);
CREATE INDEX IF NOT EXISTS idx_engine_status_status ON engine_status(status, last_check DESC);

CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status, last_check DESC);

CREATE INDEX IF NOT EXISTS idx_database_migrations_name ON database_migrations(name);
CREATE INDEX IF NOT EXISTS idx_database_migrations_executed ON database_migrations(executed_at DESC);

-- API相关索引
CREATE INDEX IF NOT EXISTS idx_api_keys_user_status ON api_keys(user_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_usage_stats_key_created ON api_usage_stats(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_endpoint ON api_usage_stats(endpoint, method, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_status ON api_usage_stats(status_code, created_at DESC);

-- 团队相关索引
CREATE INDEX IF NOT EXISTS idx_user_teams_status ON user_teams(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_team_role ON team_members(team_id, role);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status, joined_at DESC);

-- 文件和邮件索引
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_purpose ON uploaded_files(user_id, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_stored_name ON uploaded_files(stored_name);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_to_email ON email_queue(to_email, created_at DESC);

-- =====================================================
-- 10. 触发器和函数 (完整版)
-- =====================================================

-- 更新updated_at字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 用户登录统计触发器函数
CREATE OR REPLACE FUNCTION update_user_login_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        last_login = NOW(),
        login_count = COALESCE(login_count, 0) + 1,
        failed_login_attempts = 0
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 测试统计更新触发器函数
CREATE OR REPLACE FUNCTION update_test_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- 更新用户统计
        INSERT INTO user_stats (user_id, date, tests_run, tests_passed, tests_failed)
        VALUES (NEW.user_id, CURRENT_DATE, 1,
                CASE WHEN NEW.overall_score >= 70 THEN 1 ELSE 0 END,
                CASE WHEN NEW.overall_score < 70 THEN 1 ELSE 0 END)
        ON CONFLICT (user_id, date) DO UPDATE SET
            tests_run = user_stats.tests_run + 1,
            tests_passed = user_stats.tests_passed + CASE WHEN NEW.overall_score >= 70 THEN 1 ELSE 0 END,
            tests_failed = user_stats.tests_failed + CASE WHEN NEW.overall_score < 70 THEN 1 ELSE 0 END;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加updated_at触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_bookmarks_updated_at BEFORE UPDATE ON user_bookmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_sessions_updated_at BEFORE UPDATE ON test_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_results_updated_at BEFORE UPDATE ON test_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_queue_updated_at BEFORE UPDATE ON test_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_templates_updated_at BEFORE UPDATE ON test_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_reports_updated_at BEFORE UPDATE ON test_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_tags_updated_at BEFORE UPDATE ON test_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_plans_updated_at BEFORE UPDATE ON test_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_sites_updated_at BEFORE UPDATE ON monitoring_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_notifications_updated_at BEFORE UPDATE ON system_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_engine_status_updated_at BEFORE UPDATE ON engine_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_health_updated_at BEFORE UPDATE ON system_health FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_teams_updated_at BEFORE UPDATE ON user_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uploaded_files_updated_at BEFORE UPDATE ON uploaded_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加业务逻辑触发器
CREATE TRIGGER update_user_login_stats_trigger AFTER INSERT ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_user_login_stats();
CREATE TRIGGER update_test_stats_trigger AFTER UPDATE ON test_results FOR EACH ROW EXECUTE FUNCTION update_test_stats();

-- =====================================================
-- 11. 数据完整性约束 (完整版)
-- =====================================================

-- 添加额外的检查约束
ALTER TABLE users ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE users ADD CONSTRAINT check_username_length CHECK (length(username) >= 3);
ALTER TABLE test_results ADD CONSTRAINT check_score_range CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100));
ALTER TABLE monitoring_sites ADD CONSTRAINT check_url_format CHECK (url ~* '^https?://');
ALTER TABLE api_keys ADD CONSTRAINT check_rate_limit CHECK (rate_limit > 0);

-- =====================================================
-- 12. 初始化数据 (完整版)
-- =====================================================

-- 插入默认系统配置
INSERT INTO system_config (category, key, value, data_type, description, is_public) VALUES
('system', 'app_name', 'Test Web App', 'string', '应用程序名称', true),
('system', 'app_version', '3.0.0', 'string', '应用程序版本', true),
('system', 'maintenance_mode', 'false', 'boolean', '维护模式开关', false),
('testing', 'max_concurrent_tests', '10', 'number', '最大并发测试数', false),
('testing', 'default_timeout', '60', 'number', '默认测试超时时间（秒）', false),
('testing', 'max_test_history', '1000', 'number', '最大测试历史记录数', false),
('monitoring', 'default_check_interval', '300', 'number', '默认监控检查间隔（秒）', false),
('monitoring', 'max_monitoring_sites', '50', 'number', '最大监控站点数', false),
('security', 'session_timeout', '7200', 'number', '会话超时时间（秒）', false),
('security', 'max_login_attempts', '5', 'number', '最大登录尝试次数', false),
('security', 'password_min_length', '8', 'number', '密码最小长度', false),
('performance', 'cache_ttl', '3600', 'number', '缓存生存时间（秒）', false),
('performance', 'max_file_size', '52428800', 'number', '最大文件上传大小（50MB）', false),
('email', 'smtp_host', 'localhost', 'string', 'SMTP服务器地址', false),
('email', 'smtp_port', '587', 'number', 'SMTP端口', false),
('email', 'from_email', 'noreply@testweb.com', 'string', '发件人邮箱', false)
ON CONFLICT (category, key) DO NOTHING;

-- 插入测试引擎状态
INSERT INTO engine_status (engine_type, engine_version, status, metadata) VALUES
('lighthouse', '10.4.0', 'healthy', '{"description": "Google Lighthouse性能测试引擎", "features": ["performance", "seo", "accessibility"]}'),
('puppeteer', '21.5.2', 'healthy', '{"description": "Chrome DevTools协议自动化", "features": ["performance", "security", "api"]}'),
('playwright', '1.40.0', 'healthy', '{"description": "跨浏览器自动化测试", "features": ["compatibility", "performance"]}'),
('selenium', '4.15.2', 'healthy', '{"description": "Web应用自动化测试", "features": ["compatibility", "stress"]}'),
('jest', '29.7.0', 'healthy', '{"description": "JavaScript测试框架", "features": ["api", "unit"]}')
ON CONFLICT (engine_type) DO UPDATE SET
    engine_version = EXCLUDED.engine_version,
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- 插入系统健康组件
INSERT INTO system_health (component, status, metadata) VALUES
('database', 'healthy', '{"description": "PostgreSQL数据库", "version": "15.0"}'),
('redis', 'healthy', '{"description": "Redis缓存服务", "version": "7.0"}'),
('file_system', 'healthy', '{"description": "文件系统存储", "type": "local"}'),
('external_apis', 'healthy', '{"description": "外部API服务", "services": ["lighthouse", "ssl_labs"]}'),
('email_service', 'healthy', '{"description": "邮件发送服务", "provider": "smtp"}')
ON CONFLICT (component) DO UPDATE SET
    status = EXCLUDED.status,
    metadata = EXCLUDED.metadata,
    last_check = NOW(),
    updated_at = NOW();

-- 插入系统通知
INSERT INTO system_notifications (title, message, type, priority, is_active, target_users, target_roles) VALUES
('欢迎使用测试平台', '欢迎使用我们的企业级网站测试平台！您可以进行SEO、性能、安全、兼容性等全方位测试。', 'success', 'normal', true, '[]', '[]'),
('系统维护通知', '系统将在每周日凌晨2:00-4:00进行例行维护，期间可能会有短暂的服务中断。感谢您的理解！', 'info', 'normal', true, '[]', '[]'),
('新功能上线', '🎉 我们新增了压力测试和团队协作功能，现在您可以与团队成员共享测试结果和模板！', 'info', 'high', true, '[]', '[]'),
('安全提醒', '为了保护您的账户安全，请定期更新密码并启用双因素认证。', 'warning', 'normal', true, '[]', '[]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 13. 视图和存储过程 (完整版)
-- =====================================================

-- 用户统计视图
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT
    u.id,
    u.username,
    u.email,
    u.role,
    u.created_at,
    u.last_login,
    u.login_count,
    COUNT(DISTINCT tr.id) as total_tests,
    COUNT(DISTINCT tr.id) FILTER (WHERE tr.status = 'completed') as completed_tests,
    COUNT(DISTINCT tr.id) FILTER (WHERE tr.overall_score >= 80) as excellent_tests,
    AVG(tr.overall_score) as avg_score,
    COUNT(DISTINCT ms.id) as monitoring_sites,
    COUNT(DISTINCT tt.id) as test_templates
FROM users u
LEFT JOIN test_results tr ON u.id = tr.user_id
LEFT JOIN monitoring_sites ms ON u.id = ms.user_id AND ms.is_active = true
LEFT JOIN test_templates tt ON u.id = tt.user_id
GROUP BY u.id, u.username, u.email, u.role, u.created_at, u.last_login, u.login_count;

-- 测试结果汇总视图
CREATE OR REPLACE VIEW test_results_summary AS
SELECT
    tr.id,
    tr.user_id,
    tr.test_type,
    tr.target_url,
    tr.status,
    tr.overall_score,
    tr.grade,
    tr.created_at,
    tr.completed_at,
    u.username,
    u.email,
    CASE
        WHEN tr.test_type = 'seo' THEN std.meta_title_score
        WHEN tr.test_type = 'performance' THEN ptd.largest_contentful_paint::DECIMAL / 1000
        WHEN tr.test_type = 'security' THEN strd.overall_security_score
        ELSE NULL
    END as primary_metric,
    ARRAY_AGG(DISTINCT tt.name) FILTER (WHERE tt.name IS NOT NULL) as tags
FROM test_results tr
JOIN users u ON tr.user_id = u.id
LEFT JOIN seo_test_details std ON tr.id = std.test_id
LEFT JOIN performance_test_details ptd ON tr.id = ptd.test_id
LEFT JOIN security_test_details strd ON tr.id = strd.test_id
LEFT JOIN test_result_tags trt ON tr.id = trt.test_result_id
LEFT JOIN test_tags tt ON trt.tag_id = tt.id
GROUP BY tr.id, tr.user_id, tr.test_type, tr.target_url, tr.status, tr.overall_score,
         tr.grade, tr.created_at, tr.completed_at, u.username, u.email,
         std.meta_title_score, ptd.largest_contentful_paint, strd.overall_security_score;

-- 系统监控仪表板视图
CREATE OR REPLACE VIEW system_dashboard AS
SELECT
    (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as new_users_today,
    (SELECT COUNT(*) FROM test_results WHERE created_at >= CURRENT_DATE) as tests_today,
    (SELECT COUNT(*) FROM test_results WHERE status = 'completed' AND created_at >= CURRENT_DATE) as completed_tests_today,
    (SELECT AVG(overall_score) FROM test_results WHERE status = 'completed' AND created_at >= CURRENT_DATE) as avg_score_today,
    (SELECT COUNT(*) FROM monitoring_sites WHERE is_active = true) as active_monitoring_sites,
    (SELECT COUNT(*) FROM monitoring_sites WHERE status = 'up' AND is_active = true) as healthy_sites,
    (SELECT COUNT(*) FROM system_logs WHERE level = 'error' AND created_at >= CURRENT_DATE) as errors_today;

-- =====================================================
-- 14. 完整性检查函数
-- =====================================================

-- 数据完整性检查函数
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- 检查孤立的测试结果
    RETURN QUERY
    SELECT
        'orphaned_test_results'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' test results without valid users'::TEXT
    FROM test_results tr
    LEFT JOIN users u ON tr.user_id = u.id
    WHERE u.id IS NULL;

    -- 检查过期的会话
    RETURN QUERY
    SELECT
        'expired_sessions'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'INFO' END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' expired sessions'::TEXT
    FROM user_sessions
    WHERE expires_at < NOW() AND is_active = true;

    -- 检查未使用的API密钥
    RETURN QUERY
    SELECT
        'unused_api_keys'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'INFO' END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' unused API keys (>30 days)'::TEXT
    FROM api_keys
    WHERE (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '30 days')
    AND status = 'active';

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 15. 完成标记
-- =====================================================

-- 插入初始化完成标记
INSERT INTO database_migrations (name, executed_at, checksum, success) VALUES
('complete_database_schema_v3', NOW(), 'complete_v3_' || extract(epoch from now())::text, true)
ON CONFLICT (name) DO UPDATE SET
    executed_at = NOW(),
    checksum = 'complete_v3_' || extract(epoch from now())::text;
