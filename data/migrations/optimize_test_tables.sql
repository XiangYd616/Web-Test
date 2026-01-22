-- 测试表结构优化脚本
-- 执行时间: 2025-08-14T10:37:17.287Z

/*
  已废弃（依赖 test_sessions/test_records 体系），保留历史记录。

-- 1. 优化测试会话表索引
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_type_created
ON test_sessions(user_id, test_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_sessions_status_created
ON test_sessions(status, created_at DESC);

-- 2. 优化测试记录表索引
CREATE INDEX IF NOT EXISTS idx_test_records_session_status
ON test_records(session_id, status);

CREATE INDEX IF NOT EXISTS idx_test_records_type_created
ON test_records(test_type, created_at DESC);

-- 3. 创建测试历史视图（用于快速查询）
CREATE OR REPLACE VIEW test_history_summary AS
SELECT
    tr.id,
    ts.user_id,
    tr.test_name,
    tr.test_type,
    tr.target_url as url,
    tr.status,
    tr.overall_score as score,
    EXTRACT(EPOCH FROM (tr.end_time - tr.start_time)) * 1000 as duration,
    tr.created_at,
    tr.updated_at,
    ts.tags,
    ts.description as notes
FROM test_records tr
JOIN test_sessions ts ON tr.session_id = ts.id
WHERE tr.status IN ('completed', 'failed');

-- 4. 创建测试统计视图
CREATE OR REPLACE VIEW test_statistics AS
SELECT
    user_id,
    test_type,
    COUNT(*) as total_tests,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
    AVG(CASE WHEN overall_score IS NOT NULL THEN overall_score END) as avg_score,
    AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration_seconds,
    MAX(created_at) as last_test_date
FROM test_records tr
JOIN test_sessions ts ON tr.session_id = ts.id
GROUP BY user_id, test_type;

-- 5. 创建测试配置模板表
CREATE TABLE IF NOT EXISTS test_config_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 模板信息
    name VARCHAR(200) NOT NULL,
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),
    description TEXT,

    -- 配置内容
    config JSONB NOT NULL DEFAULT '{}',

    -- 模板属性
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,

    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 创建测试结果缓存表（用于快速访问最近的测试结果）
CREATE TABLE IF NOT EXISTS test_result_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_record_id UUID NOT NULL REFERENCES test_records(id) ON DELETE CASCADE,

    -- 缓存内容
    result_summary JSONB NOT NULL DEFAULT '{}',
    metrics JSONB NOT NULL DEFAULT '{}',
    recommendations JSONB NOT NULL DEFAULT '[]',

    -- 缓存元数据
    cache_key VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(cache_key)
);

-- 7. 创建索引
CREATE INDEX IF NOT EXISTS idx_test_config_templates_user_type
ON test_config_templates(user_id, test_type);

CREATE INDEX IF NOT EXISTS idx_test_config_templates_public
ON test_config_templates(is_public, test_type) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_test_result_cache_key
ON test_result_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_test_result_cache_expires
ON test_result_cache(expires_at);

-- 8. 创建触发器函数（自动更新updated_at）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. 应用触发器
DROP TRIGGER IF EXISTS update_test_config_templates_updated_at ON test_config_templates;
CREATE TRIGGER update_test_config_templates_updated_at
    BEFORE UPDATE ON test_config_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. 清理过期缓存的函数
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM test_result_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. 创建定期清理任务（需要pg_cron扩展）
-- SELECT cron.schedule('cleanup-test-cache', '0 2 * * *', 'SELECT cleanup_expired_cache();');

-- 12. 插入默认配置模板
INSERT INTO test_config_templates (user_id, name, test_type, description, config, is_default, is_public)
SELECT
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    '默认API测试配置',
    'api',
    'API测试的默认配置模板',
    '{"timeout": 30000, "retries": 3, "followRedirects": true, "validateSSL": true}',
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM test_config_templates
    WHERE test_type = 'api' AND is_default = true
);

INSERT INTO test_config_templates (user_id, name, test_type, description, config, is_default, is_public)
SELECT
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    '默认压力测试配置',
    'stress',
    '压力测试的默认配置模板',
    '{"duration": 60, "concurrency": 10, "rampUp": 5, "rampDown": 5}',
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM test_config_templates
    WHERE test_type = 'stress' AND is_default = true
);

-- 13. 更新表统计信息
ANALYZE test_sessions;
ANALYZE test_records;
ANALYZE test_config_templates;
ANALYZE test_result_cache;

-- 优化完成
SELECT 'Database optimization completed successfully' as status;
*/
