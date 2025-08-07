-- =====================================================
-- 数据库性能优化配置
-- 针对测试工具平台的高频查询和大数据量优化
-- =====================================================

-- =====================================================
-- 1. 分区表设计 (时间序列优化)
-- =====================================================

-- 为test_results表创建按月分区 (提升查询性能)
-- 注意: 这需要在创建表之前执行，或者重建表

-- 创建分区表的示例 (如果需要重建)
/*
-- 1. 重命名现有表
ALTER TABLE test_results RENAME TO test_results_old;

-- 2. 创建分区主表
CREATE TABLE test_results (
    -- 所有字段定义与原表相同
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    test_type VARCHAR(20) NOT NULL,
    -- ... 其他字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 3. 创建月度分区
CREATE TABLE test_results_2025_01 PARTITION OF test_results
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE test_results_2025_02 PARTITION OF test_results
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- 继续创建更多分区...

-- 4. 迁移数据
INSERT INTO test_results SELECT * FROM test_results_old;

-- 5. 删除旧表
DROP TABLE test_results_old;
*/

-- =====================================================
-- 2. 高级索引优化
-- =====================================================

-- 部分索引 (只索引活跃数据)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_results_active_tests 
ON test_results (user_id, test_type, created_at DESC) 
WHERE status IN ('pending', 'running');

-- 表达式索引 (优化JSON查询)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_results_config_url 
ON test_results ((config->>'url')) 
WHERE config ? 'url';

-- 复合GIN索引 (优化多字段搜索)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_results_search 
ON test_results USING gin (
    to_tsvector('english', test_name || ' ' || COALESCE(url, '') || ' ' || COALESCE(notes, ''))
);

-- 条件索引 (优化特定查询)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_results_failed 
ON test_results (user_id, created_at DESC) 
WHERE status = 'failed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_results_high_score 
ON test_results (test_type, overall_score DESC, created_at DESC) 
WHERE overall_score >= 80;

-- =====================================================
-- 3. 统计信息优化
-- =====================================================

-- 增加统计信息采样
ALTER TABLE test_results ALTER COLUMN test_type SET STATISTICS 1000;
ALTER TABLE test_results ALTER COLUMN status SET STATISTICS 1000;
ALTER TABLE test_results ALTER COLUMN overall_score SET STATISTICS 1000;
ALTER TABLE test_results ALTER COLUMN created_at SET STATISTICS 1000;

-- 为JSONB字段设置统计信息
ALTER TABLE test_results ALTER COLUMN config SET STATISTICS 1000;
ALTER TABLE test_results ALTER COLUMN results SET STATISTICS 1000;

-- =====================================================
-- 4. 查询优化函数
-- =====================================================

-- 高效的用户测试历史查询函数
CREATE OR REPLACE FUNCTION get_user_test_history(
    p_user_id UUID,
    p_test_type VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    test_type VARCHAR(20),
    test_name VARCHAR(255),
    url TEXT,
    status VARCHAR(20),
    overall_score DECIMAL(5,2),
    grade VARCHAR(5),
    created_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.test_type,
        tr.test_name,
        tr.url,
        tr.status,
        tr.overall_score,
        tr.grade,
        tr.created_at,
        tr.duration_ms
    FROM test_results tr
    WHERE tr.user_id = p_user_id
        AND tr.deleted_at IS NULL
        AND (p_test_type IS NULL OR tr.test_type = p_test_type)
    ORDER BY tr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- 测试统计聚合函数
CREATE OR REPLACE FUNCTION get_test_statistics(
    p_user_id UUID DEFAULT NULL,
    p_test_type VARCHAR(20) DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_tests BIGINT,
    completed_tests BIGINT,
    failed_tests BIGINT,
    avg_score DECIMAL(5,2),
    avg_duration_ms DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_tests,
        COUNT(CASE WHEN tr.status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN tr.status = 'failed' THEN 1 END) as failed_tests,
        AVG(tr.overall_score) as avg_score,
        AVG(tr.duration_ms) as avg_duration_ms
    FROM test_results tr
    WHERE tr.deleted_at IS NULL
        AND tr.created_at >= NOW() - INTERVAL '1 day' * p_days
        AND (p_user_id IS NULL OR tr.user_id = p_user_id)
        AND (p_test_type IS NULL OR tr.test_type = p_test_type);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 5. 数据清理和维护
-- =====================================================

-- 自动清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_old_test_data(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 软删除过期的测试结果
    UPDATE test_results 
    SET deleted_at = NOW()
    WHERE deleted_at IS NULL 
        AND created_at < NOW() - INTERVAL '1 day' * p_retention_days
        AND status IN ('completed', 'failed', 'cancelled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 硬删除已软删除超过30天的记录
    DELETE FROM test_results 
    WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days';
    
    -- 清理孤立的测试文件记录
    DELETE FROM test_artifacts ta
    WHERE NOT EXISTS (
        SELECT 1 FROM test_results tr 
        WHERE tr.id = ta.test_id AND tr.deleted_at IS NULL
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. 监控和诊断
-- =====================================================

-- 慢查询监控视图
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100 -- 超过100ms的查询
ORDER BY mean_time DESC;

-- 表大小监控视图
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 索引使用情况监控
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- =====================================================
-- 7. 性能配置建议
-- =====================================================

-- 创建性能配置建议函数
CREATE OR REPLACE FUNCTION get_performance_recommendations()
RETURNS TABLE (
    category TEXT,
    recommendation TEXT,
    current_value TEXT,
    suggested_value TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Memory'::TEXT as category,
        'shared_buffers should be 25% of RAM'::TEXT as recommendation,
        current_setting('shared_buffers') as current_value,
        '256MB'::TEXT as suggested_value
    UNION ALL
    SELECT 
        'Memory'::TEXT,
        'effective_cache_size should be 75% of RAM'::TEXT,
        current_setting('effective_cache_size'),
        '768MB'::TEXT
    UNION ALL
    SELECT 
        'Checkpoint'::TEXT,
        'checkpoint_completion_target'::TEXT,
        current_setting('checkpoint_completion_target'),
        '0.9'::TEXT
    UNION ALL
    SELECT 
        'WAL'::TEXT,
        'wal_buffers'::TEXT,
        current_setting('wal_buffers'),
        '16MB'::TEXT
    UNION ALL
    SELECT 
        'Query Planning'::TEXT,
        'random_page_cost for SSD'::TEXT,
        current_setting('random_page_cost'),
        '1.1'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. 定期维护任务
-- =====================================================

-- 创建定期维护函数
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- 更新表统计信息
    ANALYZE test_results;
    ANALYZE users;
    result := result || 'Statistics updated. ';
    
    -- 重建索引 (如果碎片化严重)
    -- REINDEX INDEX CONCURRENTLY idx_test_results_user_type_created;
    
    -- 清理过期数据
    PERFORM cleanup_old_test_data(90);
    result := result || 'Old data cleaned. ';
    
    -- 更新引擎状态
    UPDATE engine_status SET last_check = NOW() WHERE status = 'healthy';
    result := result || 'Engine status updated. ';
    
    RETURN result || 'Maintenance completed successfully.';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. 连接池优化建议
-- =====================================================

/*
推荐的连接池配置 (在应用层配置):

1. 使用 pgbouncer 或应用内置连接池
2. 连接池大小: CPU核心数 * 2 + 磁盘数
3. 最大连接数: 不超过 PostgreSQL max_connections 的 80%
4. 连接超时: 30秒
5. 空闲连接超时: 10分钟

示例 pgbouncer 配置:
[databases]
testweb_dev = host=localhost port=5432 dbname=testweb_dev

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
max_db_connections = 50
*/

-- =====================================================
-- 10. 完成信息
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '🚀 数据库性能优化配置完成!';
    RAISE NOTICE '📊 建议执行: SELECT * FROM get_performance_recommendations();';
    RAISE NOTICE '🔧 定期维护: SELECT perform_maintenance();';
    RAISE NOTICE '📈 监控查询: SELECT * FROM slow_queries LIMIT 10;';
END $$;
