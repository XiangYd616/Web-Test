-- Deprecated / Merged into data/schema.sql as baseline
-- Do NOT execute in production after 2026-01
-- Last reviewed: 2026-01

/*
  已合并到 data/schema.sql，迁移中保留作为历史记录。

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
*/
