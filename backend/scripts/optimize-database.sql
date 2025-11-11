-- ====================================
-- 数据库性能优化脚本
-- ====================================

-- 1. 创建缺失的索引
-- ====================================

-- test_history表索引优化
CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_created_at ON test_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_history_status ON test_history(status);
CREATE INDEX IF NOT EXISTS idx_test_history_test_type ON test_history(test_type);

-- 复合索引(优化常见查询)
CREATE INDEX IF NOT EXISTS idx_test_history_user_created ON test_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_history_user_status ON test_history(user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_history_composite ON test_history(user_id, status, created_at DESC);

-- test_sessions表索引
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);

-- engine_status表索引
CREATE INDEX IF NOT EXISTS idx_engine_status_type ON engine_status(engine_type);
CREATE INDEX IF NOT EXISTS idx_engine_status_status ON engine_status(status);

-- system_config表索引
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- test_metrics表索引
CREATE INDEX IF NOT EXISTS idx_test_metrics_test_id ON test_metrics(test_id);
CREATE INDEX IF NOT EXISTS idx_test_metrics_type ON test_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_test_metrics_timestamp ON test_metrics(timestamp);

-- test_errors表索引
CREATE INDEX IF NOT EXISTS idx_test_errors_test_id ON test_errors(test_id);
CREATE INDEX IF NOT EXISTS idx_test_errors_type ON test_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_test_errors_occurred_at ON test_errors(occurred_at DESC);

-- 2. 分析表统计信息
-- ====================================

ANALYZE test_history;
ANALYZE test_sessions;
ANALYZE engine_status;
ANALYZE system_config;
ANALYZE test_metrics;
ANALYZE test_errors;
ANALYZE users;

-- 3. 清理并重建索引
-- ====================================

-- REINDEX TABLE test_history;
-- REINDEX TABLE test_sessions;
-- (仅在性能严重下降时执行)

-- 4. 创建物化视图(用于复杂统计查询)
-- ====================================

-- 用户测试统计物化视图(每小时刷新)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_test_stats AS
SELECT 
  u.id AS user_id,
  u.username,
  u.role,
  COUNT(th.test_id) AS total_tests,
  COUNT(CASE WHEN th.status = 'completed' THEN 1 END) AS completed_tests,
  COUNT(CASE WHEN th.status = 'failed' THEN 1 END) AS failed_tests,
  COUNT(CASE WHEN th.status = 'running' THEN 1 END) AS running_tests,
  AVG(th.overall_score) AS avg_score,
  AVG(th.duration) AS avg_duration,
  MAX(th.created_at) AS last_test_at,
  NOW() AS refreshed_at
FROM users u
LEFT JOIN test_history th ON u.id = th.user_id
GROUP BY u.id, u.username, u.role;

-- 为物化视图创建索引
CREATE INDEX IF NOT EXISTS idx_mv_user_test_stats_user_id ON mv_user_test_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_user_test_stats_role ON mv_user_test_stats(role);

-- 每日测试统计物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_test_stats AS
SELECT 
  DATE(created_at) AS test_date,
  test_type,
  COUNT(*) AS total_tests,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_tests,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_tests,
  AVG(overall_score) AS avg_score,
  AVG(duration) AS avg_duration,
  NOW() AS refreshed_at
FROM test_history
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), test_type
ORDER BY test_date DESC, test_type;

-- 为物化视图创建索引
CREATE INDEX IF NOT EXISTS idx_mv_daily_test_stats_date ON mv_daily_test_stats(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_mv_daily_test_stats_type ON mv_daily_test_stats(test_type);

-- 5. 创建函数用于刷新物化视图
-- ====================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_test_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_test_stats;
END;
$$ LANGUAGE plpgsql;

-- 6. 优化查询示例
-- ====================================

-- 优化前: 使用SELECT *
-- SELECT * FROM test_history WHERE user_id = 'user123';

-- 优化后: 只查询需要的字段
-- SELECT test_id, test_type, url, status, overall_score, duration, created_at
-- FROM test_history 
-- WHERE user_id = 'user123'
-- ORDER BY created_at DESC
-- LIMIT 20;

-- 优化前: 没有索引的范围查询
-- SELECT * FROM test_history WHERE created_at BETWEEN '2025-01-01' AND '2025-12-31';

-- 优化后: 使用索引的查询
-- SELECT test_id, test_type, status, created_at
-- FROM test_history 
-- WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01'
-- ORDER BY created_at DESC;

-- 7. 分区表设置(针对大数据量)
-- ====================================

-- 如果test_history表数据量超过100万,建议按月分区
/*
CREATE TABLE test_history_2025_01 PARTITION OF test_history
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE test_history_2025_02 PARTITION OF test_history
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
*/

-- 8. 配置优化建议
-- ====================================

/*
-- 在postgresql.conf中添加以下配置(根据服务器资源调整):

shared_buffers = 256MB                  -- 共享缓冲区(建议25%的RAM)
effective_cache_size = 1GB              -- 有效缓存大小(建议50-75%的RAM)
work_mem = 16MB                         -- 工作内存(每个查询操作)
maintenance_work_mem = 128MB            -- 维护工作内存
random_page_cost = 1.1                  -- SSD磁盘建议设置为1.1
effective_io_concurrency = 200          -- SSD磁盘建议200

-- 连接池配置
max_connections = 100                   -- 最大连接数
*/

-- 9. 定期维护命令
-- ====================================

/*
-- 每日执行
VACUUM ANALYZE test_history;
VACUUM ANALYZE test_sessions;

-- 每周执行
REINDEX TABLE test_history;
REINDEX TABLE test_sessions;

-- 每月执行
VACUUM FULL test_history;  -- 慎用,会锁表

-- 刷新物化视图(每小时执行)
SELECT refresh_materialized_views();
*/

-- 10. 监控查询
-- ====================================

-- 查看慢查询
/*
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
*/

-- 查看表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看索引使用情况
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 查看未使用的索引(考虑删除)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 11. 完成消息
-- ====================================

DO $$
BEGIN
  RAISE NOTICE '数据库性能优化完成!';
  RAISE NOTICE '索引已创建';
  RAISE NOTICE '表统计信息已更新';
  RAISE NOTICE '物化视图已创建';
  RAISE NOTICE '';
  RAISE NOTICE '建议:';
  RAISE NOTICE '1. 定期执行 VACUUM ANALYZE';
  RAISE NOTICE '2. 每小时刷新物化视图: SELECT refresh_materialized_views()';
  RAISE NOTICE '3. 监控慢查询并优化';
  RAISE NOTICE '4. 根据实际情况调整PostgreSQL配置';
END $$;
