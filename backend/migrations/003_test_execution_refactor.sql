-- 测试执行核心表
CREATE TABLE IF NOT EXISTS test_executions (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    engine_type VARCHAR(50) NOT NULL,
    engine_name VARCHAR(100) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_url VARCHAR(500),
    test_config JSONB DEFAULT '{}',

    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'medium',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time INTEGER,

    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_executions_user_id ON test_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_engine_type ON test_executions(engine_type);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_executions_test_id ON test_executions(test_id);

-- 测试结果汇总表
CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    summary JSONB NOT NULL,
    score DECIMAL(5, 2),
    grade VARCHAR(10),
    passed BOOLEAN,
    warnings JSONB DEFAULT '[]',
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_results_execution_id ON test_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_results_score ON test_results(score);

-- 指标明细表
CREATE TABLE IF NOT EXISTS test_metrics (
    id SERIAL PRIMARY KEY,
    result_id INTEGER REFERENCES test_results(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value JSONB NOT NULL,
    metric_unit VARCHAR(50),
    metric_type VARCHAR(50),
    threshold_min DECIMAL(10, 2),
    threshold_max DECIMAL(10, 2),
    passed BOOLEAN DEFAULT true,
    severity VARCHAR(20),
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_metrics_result_id ON test_metrics(result_id);
CREATE INDEX IF NOT EXISTS idx_test_metrics_type ON test_metrics(metric_type);

-- 执行日志表
CREATE TABLE IF NOT EXISTS test_logs (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_logs_execution_id ON test_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_level ON test_logs(level);

-- 报告记录表
CREATE TABLE IF NOT EXISTS test_reports (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL,
    report_data JSONB NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_test_reports_execution_id ON test_reports(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_type ON test_reports(report_type);

-- 测试模板表（保留，并补充索引/更新时间字段）
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON test_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_engine_type ON test_templates(engine_type);

-- 测试对比表
CREATE TABLE IF NOT EXISTS test_comparisons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    comparison_name VARCHAR(255) NOT NULL,
    execution_ids INTEGER[] NOT NULL,
    comparison_type VARCHAR(50) NOT NULL,
    comparison_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON test_comparisons(user_id);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_test_executions_updated_at'
    ) THEN
        CREATE TRIGGER update_test_executions_updated_at BEFORE UPDATE
            ON test_executions FOR EACH ROW EXECUTE PROCEDURE
            update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_test_templates_updated_at'
    ) THEN
        CREATE TRIGGER update_test_templates_updated_at BEFORE UPDATE
            ON test_templates FOR EACH ROW EXECUTE PROCEDURE
            update_updated_at_column();
    END IF;
END $$;
