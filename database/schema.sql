-- 测试平台数据库架构设计
-- 支持所有测试工具的完整数据存储需求

-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    subscription_type VARCHAR(20) DEFAULT 'free',
    api_key VARCHAR(255) UNIQUE
);

-- 测试项目表
CREATE TABLE test_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    target_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 测试配置模板表
CREATE TABLE test_configurations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES test_projects(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL, -- 'stress', 'security', 'api', 'performance', etc.
    name VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL, -- 存储测试配置的JSON数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_template BOOLEAN DEFAULT false
);

-- 测试执行记录表
CREATE TABLE test_executions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES test_projects(id) ON DELETE CASCADE,
    configuration_id INTEGER REFERENCES test_configurations(id) ON DELETE SET NULL,
    test_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    target_url VARCHAR(500),
    configuration JSONB, -- 执行时的配置快照
    results JSONB, -- 测试结果数据
    error_message TEXT,
    execution_logs TEXT
);

-- 性能测试结果表
CREATE TABLE performance_test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    overall_score INTEGER,
    first_contentful_paint INTEGER, -- 毫秒
    largest_contentful_paint INTEGER,
    first_input_delay INTEGER,
    cumulative_layout_shift DECIMAL(5,3),
    speed_index INTEGER,
    time_to_interactive INTEGER,
    total_blocking_time INTEGER,
    page_size_bytes BIGINT,
    requests_count INTEGER,
    dom_elements_count INTEGER,
    opportunities JSONB, -- 优化建议
    diagnostics JSONB, -- 诊断信息
    screenshots JSONB, -- 截图数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 安全测试结果表
CREATE TABLE security_test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    overall_score INTEGER,
    vulnerabilities JSONB, -- 漏洞列表
    ssl_grade VARCHAR(5), -- A+, A, B, C, D, F
    ssl_details JSONB,
    security_headers JSONB,
    content_security_policy JSONB,
    mixed_content_issues JSONB,
    certificate_info JSONB,
    scan_duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API测试结果表
CREATE TABLE api_test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    endpoint_url VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    response_size_bytes INTEGER,
    success BOOLEAN,
    error_message TEXT,
    request_headers JSONB,
    request_body TEXT,
    response_headers JSONB,
    response_body TEXT,
    assertions JSONB, -- 断言结果
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 压力测试结果表
CREATE TABLE stress_test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    concurrent_users INTEGER,
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    average_response_time DECIMAL(10,2),
    min_response_time DECIMAL(10,2),
    max_response_time DECIMAL(10,2),
    requests_per_second DECIMAL(10,2),
    throughput_mb_per_sec DECIMAL(10,2),
    error_rate DECIMAL(5,2),
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_mb DECIMAL(10,2),
    network_io_mb DECIMAL(10,2),
    time_series_data JSONB, -- 时间序列性能数据
    error_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 兼容性测试结果表
CREATE TABLE compatibility_test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    browser_name VARCHAR(50),
    browser_version VARCHAR(20),
    platform VARCHAR(50),
    device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
    viewport_width INTEGER,
    viewport_height INTEGER,
    features_tested JSONB, -- 测试的特性列表
    compatibility_score INTEGER,
    issues_found JSONB, -- 发现的兼容性问题
    screenshots JSONB, -- 不同浏览器的截图
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEO测试结果表
CREATE TABLE seo_test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    overall_score INTEGER,
    title_tag VARCHAR(500),
    meta_description TEXT,
    h1_tags JSONB,
    meta_keywords TEXT,
    canonical_url VARCHAR(500),
    robots_txt_status VARCHAR(20),
    sitemap_status VARCHAR(20),
    page_speed_score INTEGER,
    mobile_friendly BOOLEAN,
    structured_data JSONB,
    internal_links_count INTEGER,
    external_links_count INTEGER,
    images_without_alt INTEGER,
    content_analysis JSONB,
    recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户体验测试结果表
CREATE TABLE ux_test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    accessibility_score INTEGER,
    wcag_compliance_level VARCHAR(5), -- 'A', 'AA', 'AAA'
    color_contrast_issues INTEGER,
    keyboard_navigation_score INTEGER,
    screen_reader_compatibility INTEGER,
    form_usability_score INTEGER,
    mobile_usability_score INTEGER,
    page_structure_score INTEGER,
    accessibility_issues JSONB,
    usability_recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 基础设施测试结果表
CREATE TABLE infrastructure_test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    database_connection_time_ms INTEGER,
    database_query_time_ms INTEGER,
    database_connection_success BOOLEAN,
    network_latency_ms INTEGER,
    network_bandwidth_mbps DECIMAL(10,2),
    dns_resolution_time_ms INTEGER,
    server_response_time_ms INTEGER,
    ssl_handshake_time_ms INTEGER,
    connection_details JSONB,
    network_trace JSONB,
    infrastructure_health_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 测试报告表
CREATE TABLE test_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES test_projects(id) ON DELETE CASCADE,
    execution_ids INTEGER[], -- 包含的测试执行ID数组
    report_type VARCHAR(50), -- 'comprehensive', 'performance', 'security', etc.
    title VARCHAR(200),
    summary JSONB,
    recommendations JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    report_data JSONB, -- 完整报告数据
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(255) UNIQUE
);

-- 用户使用统计表
CREATE TABLE user_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    test_type VARCHAR(50),
    tests_run_count INTEGER DEFAULT 0,
    total_test_duration_seconds BIGINT DEFAULT 0,
    last_test_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, test_type)
);

-- 系统配置表
CREATE TABLE system_configurations (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_test_executions_user_id ON test_executions(user_id);
CREATE INDEX idx_test_executions_project_id ON test_executions(project_id);
CREATE INDEX idx_test_executions_test_type ON test_executions(test_type);
CREATE INDEX idx_test_executions_status ON test_executions(status);
CREATE INDEX idx_test_executions_started_at ON test_executions(started_at);

CREATE INDEX idx_performance_results_execution_id ON performance_test_results(execution_id);
CREATE INDEX idx_security_results_execution_id ON security_test_results(execution_id);
CREATE INDEX idx_api_results_execution_id ON api_test_results(execution_id);
CREATE INDEX idx_stress_results_execution_id ON stress_test_results(execution_id);
CREATE INDEX idx_compatibility_results_execution_id ON compatibility_test_results(execution_id);
CREATE INDEX idx_seo_results_execution_id ON seo_test_results(execution_id);
CREATE INDEX idx_ux_results_execution_id ON ux_test_results(execution_id);
CREATE INDEX idx_infrastructure_results_execution_id ON infrastructure_test_results(execution_id);

CREATE INDEX idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX idx_user_statistics_test_type ON user_statistics(test_type);
