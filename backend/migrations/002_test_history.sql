-- 测试历史记录表
CREATE TABLE IF NOT EXISTS test_history (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    engine_type VARCHAR(50) NOT NULL, -- performance, security, seo, api, stress, compatibility, ux, database
    engine_name VARCHAR(100) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_url VARCHAR(500),
    test_config JSONB DEFAULT '{}',
    
    -- 测试执行信息
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    progress INTEGER DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- 时间信息
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time INTEGER, -- 执行时间（秒）
    
    -- 测试结果
    result JSONB DEFAULT '{}',
    score DECIMAL(5, 2),
    grade VARCHAR(10), -- A+, A, B, C, D, F
    passed BOOLEAN,
    
    -- 错误和警告
    errors JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    
    -- 元数据
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- 索引优化
    INDEX idx_test_history_user_id (user_id),
    INDEX idx_test_history_engine_type (engine_type),
    INDEX idx_test_history_status (status),
    INDEX idx_test_history_created_at (created_at DESC),
    INDEX idx_test_history_test_id (test_id)
);

-- 测试结果详情表
CREATE TABLE IF NOT EXISTS test_result_details (
    id SERIAL PRIMARY KEY,
    test_history_id INTEGER REFERENCES test_history(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value JSONB NOT NULL,
    metric_unit VARCHAR(50),
    metric_type VARCHAR(50), -- performance, security, seo, etc.
    threshold_min DECIMAL(10, 2),
    threshold_max DECIMAL(10, 2),
    passed BOOLEAN DEFAULT true,
    severity VARCHAR(20), -- info, warning, error, critical
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_result_details_test_id (test_history_id),
    INDEX idx_result_details_metric_type (metric_type)
);

-- 测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
    id SERIAL PRIMARY KEY,
    test_history_id INTEGER REFERENCES test_history(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- summary, detailed, comparison
    format VARCHAR(20) NOT NULL, -- pdf, html, json, csv
    report_data JSONB NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_reports_test_id (test_history_id),
    INDEX idx_reports_type (report_type)
);

-- 测试模板表
CREATE TABLE IF NOT EXISTS test_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    engine_type VARCHAR(50) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_templates_user_id (user_id),
    INDEX idx_templates_engine_type (engine_type)
);

-- 测试调度任务表
CREATE TABLE IF NOT EXISTS test_schedules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES test_templates(id) ON DELETE SET NULL,
    schedule_name VARCHAR(255) NOT NULL,
    engine_type VARCHAR(50) NOT NULL,
    test_url VARCHAR(500),
    test_config JSONB DEFAULT '{}',
    
    -- 调度配置
    schedule_type VARCHAR(50) NOT NULL, -- once, daily, weekly, monthly, cron
    cron_expression VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_schedules_user_id (user_id),
    INDEX idx_schedules_is_active (is_active),
    INDEX idx_schedules_next_run (next_run_at)
);

-- 测试比较表
CREATE TABLE IF NOT EXISTS test_comparisons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    comparison_name VARCHAR(255) NOT NULL,
    test_ids INTEGER[] NOT NULL,
    comparison_type VARCHAR(50) NOT NULL, -- before-after, multi-url, multi-config
    comparison_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_comparisons_user_id (user_id)
);

-- 添加触发器更新updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_test_templates_updated_at BEFORE UPDATE
    ON test_templates FOR EACH ROW EXECUTE PROCEDURE 
    update_updated_at_column();

CREATE TRIGGER update_test_schedules_updated_at BEFORE UPDATE
    ON test_schedules FOR EACH ROW EXECUTE PROCEDURE 
    update_updated_at_column();

-- 添加一些默认测试模板
INSERT INTO test_templates (user_id, engine_type, template_name, description, config, is_public, is_default) VALUES
(NULL, 'performance', '标准性能测试', '基于Lighthouse的标准性能测试配置', 
 '{"throttling": "4G", "viewport": {"width": 1920, "height": 1080}, "metrics": ["FCP", "LCP", "CLS", "TTI", "TBT"]}', 
 true, true),
(NULL, 'security', '基础安全扫描', 'OWASP Top 10安全漏洞扫描', 
 '{"scanType": "basic", "depth": 3, "checkSSL": true, "checkHeaders": true}', 
 true, true),
(NULL, 'seo', 'SEO全面检查', '搜索引擎优化全面检查', 
 '{"checkMeta": true, "checkSitemap": true, "checkRobots": true, "checkSchema": true}', 
 true, true),
(NULL, 'api', 'REST API测试', 'RESTful API端点测试', 
 '{"method": "GET", "timeout": 30000, "validateResponse": true, "checkStatusCode": true}', 
 true, true),
(NULL, 'stress', '压力测试-标准', '标准压力测试配置', 
 '{"virtualUsers": 100, "duration": 300, "rampUp": 60, "thinkTime": 1000}', 
 true, true);
