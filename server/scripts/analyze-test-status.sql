-- 压力测试状态使用情况分析脚本
-- 用于分析数据库中各种状态的实际使用情况

-- ===========================================
-- 1. 总体状态分布统计
-- ===========================================
SELECT 
    '=== 总体状态分布 ===' as analysis_type,
    NULL as status,
    NULL as count,
    NULL as percentage,
    NULL as first_seen,
    NULL as last_seen
UNION ALL
SELECT 
    'data' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
    MIN(created_at)::date as first_seen,
    MAX(created_at)::date as last_seen
FROM test_history 
GROUP BY status 
ORDER BY analysis_type, count DESC;

-- ===========================================
-- 2. 压力测试专门的状态分布
-- ===========================================
SELECT 
    '=== 压力测试状态分布 ===' as analysis_type,
    NULL as status,
    NULL as count,
    NULL as percentage,
    NULL as first_seen,
    NULL as last_seen
UNION ALL
SELECT 
    'stress_data' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
    MIN(created_at)::date as first_seen,
    MAX(created_at)::date as last_seen
FROM test_history 
WHERE test_type LIKE '%stress%' OR test_type = 'load' OR test_type = 'spike'
GROUP BY status 
ORDER BY analysis_type, count DESC;

-- ===========================================
-- 3. 最近30天的状态分布
-- ===========================================
SELECT 
    '=== 最近30天状态分布 ===' as analysis_type,
    NULL as status,
    NULL as count,
    NULL as percentage,
    NULL as first_seen,
    NULL as last_seen
UNION ALL
SELECT 
    'recent_data' as analysis_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
    MIN(created_at)::date as first_seen,
    MAX(created_at)::date as last_seen
FROM test_history 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status 
ORDER BY analysis_type, count DESC;

-- ===========================================
-- 4. 状态转换分析（如果存在状态日志表）
-- ===========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_status_logs') THEN
        RAISE NOTICE '=== 状态转换分析 ===';
        
        -- 执行状态转换查询
        PERFORM * FROM (
            SELECT 
                '=== 状态转换统计 ===' as analysis_type,
                NULL as from_status,
                NULL as to_status,
                NULL as transition_count,
                NULL as percentage
            UNION ALL
            SELECT 
                'transition_data' as analysis_type,
                from_status,
                to_status,
                COUNT(*) as transition_count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM test_status_logs tsl
            JOIN test_history th ON tsl.test_history_id = th.id
            GROUP BY from_status, to_status
            ORDER BY analysis_type, transition_count DESC
        ) t;
    ELSE
        RAISE NOTICE '状态日志表不存在，跳过状态转换分析';
    END IF;
END $$;

-- ===========================================
-- 5. 异常状态分析
-- ===========================================
SELECT 
    '=== 异常状态分析 ===' as analysis_type,
    NULL as status,
    NULL as count,
    NULL as avg_duration,
    NULL as error_rate
UNION ALL
SELECT 
    'error_data' as analysis_type,
    status,
    COUNT(*) as count,
    AVG(duration) as avg_duration,
    CASE 
        WHEN status IN ('failed', 'cancelled', 'timeout') THEN 100.0
        ELSE 0.0
    END as error_rate
FROM test_history 
WHERE status IN ('failed', 'cancelled', 'timeout', 'pending', 'running')
GROUP BY status 
ORDER BY analysis_type, count DESC;

-- ===========================================
-- 6. 长时间运行状态分析
-- ===========================================
SELECT 
    '=== 长时间运行状态 ===' as analysis_type,
    NULL as status,
    NULL as count,
    NULL as avg_hours,
    NULL as max_hours
UNION ALL
SELECT 
    'long_running' as analysis_type,
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 3600) as avg_hours,
    MAX(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 3600) as max_hours
FROM test_history 
WHERE start_time IS NOT NULL
    AND (
        end_time IS NULL 
        OR EXTRACT(EPOCH FROM (end_time - start_time)) > 3600 -- 超过1小时
    )
GROUP BY status 
ORDER BY analysis_type, avg_hours DESC;

-- ===========================================
-- 7. 状态完整性检查
-- ===========================================
SELECT 
    '=== 状态完整性检查 ===' as analysis_type,
    NULL as issue_type,
    NULL as count,
    NULL as description
UNION ALL
SELECT 
    'integrity_check' as analysis_type,
    'missing_end_time' as issue_type,
    COUNT(*) as count,
    '已完成但缺少结束时间的记录' as description
FROM test_history 
WHERE status = 'completed' AND end_time IS NULL
UNION ALL
SELECT 
    'integrity_check' as analysis_type,
    'running_too_long' as issue_type,
    COUNT(*) as count,
    '运行状态超过24小时的记录' as description
FROM test_history 
WHERE status = 'running' 
    AND start_time IS NOT NULL 
    AND start_time < NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'integrity_check' as analysis_type,
    'pending_too_long' as issue_type,
    COUNT(*) as count,
    '准备状态超过1小时的记录' as description
FROM test_history 
WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY analysis_type, count DESC;

-- ===========================================
-- 8. 用户状态使用模式分析
-- ===========================================
SELECT 
    '=== 用户状态使用模式 ===' as analysis_type,
    NULL as user_pattern,
    NULL as user_count,
    NULL as avg_tests_per_user,
    NULL as most_common_status
UNION ALL
SELECT 
    'user_pattern' as analysis_type,
    CASE 
        WHEN completed_ratio > 0.8 THEN 'high_success_users'
        WHEN completed_ratio > 0.5 THEN 'medium_success_users'
        ELSE 'low_success_users'
    END as user_pattern,
    COUNT(*) as user_count,
    AVG(total_tests) as avg_tests_per_user,
    NULL as most_common_status
FROM (
    SELECT 
        user_id,
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*)::float as completed_ratio
    FROM test_history 
    GROUP BY user_id
    HAVING COUNT(*) >= 5 -- 至少5次测试的用户
) user_stats
GROUP BY 
    CASE 
        WHEN completed_ratio > 0.8 THEN 'high_success_users'
        WHEN completed_ratio > 0.5 THEN 'medium_success_users'
        ELSE 'low_success_users'
    END
ORDER BY analysis_type, user_count DESC;

-- ===========================================
-- 9. 时间趋势分析
-- ===========================================
SELECT 
    '=== 状态时间趋势 ===' as analysis_type,
    NULL as time_period,
    NULL as status,
    NULL as count,
    NULL as trend
UNION ALL
SELECT 
    'time_trend' as analysis_type,
    TO_CHAR(created_at, 'YYYY-MM') as time_period,
    status,
    COUNT(*) as count,
    LAG(COUNT(*)) OVER (PARTITION BY status ORDER BY TO_CHAR(created_at, 'YYYY-MM')) as trend
FROM test_history 
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY TO_CHAR(created_at, 'YYYY-MM'), status
ORDER BY analysis_type, time_period DESC, count DESC;

-- ===========================================
-- 10. 清理建议生成
-- ===========================================
SELECT 
    '=== 清理建议 ===' as analysis_type,
    NULL as recommendation,
    NULL as reason,
    NULL as impact_level
UNION ALL
SELECT 
    'recommendations' as analysis_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'remove_unused_status'
        WHEN COUNT(*) < 10 THEN 'consider_merging_status'
        ELSE 'keep_status'
    END as recommendation,
    status || ' (使用次数: ' || COUNT(*) || ')' as reason,
    CASE 
        WHEN COUNT(*) = 0 THEN 'low'
        WHEN COUNT(*) < 10 THEN 'medium'
        ELSE 'high'
    END as impact_level
FROM test_history 
GROUP BY status
ORDER BY analysis_type, COUNT(*) ASC;

-- 输出分析完成信息
SELECT 
    '分析完成时间: ' || NOW()::timestamp as completion_info,
    '总记录数: ' || (SELECT COUNT(*) FROM test_history) as total_records,
    '分析范围: 全部历史数据' as analysis_scope;
