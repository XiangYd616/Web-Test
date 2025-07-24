-- ===========================================
-- 测试历史记录功能增强脚本
-- ===========================================
-- 版本: 1.0
-- 更新日期: 2025-01-24
-- 描述: 为压力测试系统添加完整的历史记录功能

-- 确保uuid-ossp扩展存在
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 创建测试历史表 (Test History)
-- ===========================================
CREATE TABLE IF NOT EXISTS test_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 测试基本信息
    test_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('stress', 'load', 'spike', 'volume', 'endurance')),
    url VARCHAR(2048) NOT NULL,
    
    -- 测试状态管理
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
    
    -- 时间管理
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- 实际运行时间（秒）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 测试配置（JSON格式存储）
    config JSONB DEFAULT '{}',
    
    -- 测试结果（JSON格式存储）
    results JSONB DEFAULT '{}',
    
    -- 性能评分
    overall_score DECIMAL(5,2), -- 0-100分
    performance_grade VARCHAR(2), -- A+, A, B+, B, C+, C, D, F
    
    -- 错误信息
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    
    -- 状态变更历史
    status_history JSONB DEFAULT '[]',
    
    -- 实时数据存储
    real_time_data JSONB DEFAULT '[]',
    
    -- 标签和分类
    tags TEXT[] DEFAULT '{}',
    environment VARCHAR(50) DEFAULT 'production',
    
    -- 报告相关
    report_generated BOOLEAN DEFAULT false,
    report_path VARCHAR(500),
    
    -- 统计信息
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    average_response_time DECIMAL(10,2),
    peak_tps DECIMAL(10,2),
    error_rate DECIMAL(5,2)
);

-- ===========================================
-- 创建测试状态变更日志表
-- ===========================================
CREATE TABLE IF NOT EXISTS test_status_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_history_id UUID REFERENCES test_history(id) ON DELETE CASCADE,
    
    -- 状态变更信息
    from_status VARCHAR(20),
    to_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 变更原因和详情
    reason VARCHAR(255),
    details JSONB DEFAULT '{}',
    
    -- 操作者信息
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_source VARCHAR(50) DEFAULT 'system' -- 'system', 'user', 'api'
);

-- ===========================================
-- 创建测试进度记录表
-- ===========================================
CREATE TABLE IF NOT EXISTS test_progress_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_history_id UUID REFERENCES test_history(id) ON DELETE CASCADE,
    
    -- 进度信息
    progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_phase VARCHAR(50), -- 'initialization', 'ramp_up', 'steady_state', 'ramp_down', 'cleanup'
    current_step VARCHAR(255),
    
    -- 实时指标
    current_users INTEGER DEFAULT 0,
    current_tps DECIMAL(10,2) DEFAULT 0,
    current_response_time DECIMAL(10,2) DEFAULT 0,
    current_error_rate DECIMAL(5,2) DEFAULT 0,
    
    -- 时间戳
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 额外数据
    metrics JSONB DEFAULT '{}'
);

-- ===========================================
-- 索引优化
-- ===========================================

-- 测试历史表索引
CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id);
CREATE INDEX IF NOT EXISTS idx_test_history_status ON test_history(status);
CREATE INDEX IF NOT EXISTS idx_test_history_test_type ON test_history(test_type);
CREATE INDEX IF NOT EXISTS idx_test_history_created_at ON test_history(created_at);
CREATE INDEX IF NOT EXISTS idx_test_history_start_time ON test_history(start_time);
CREATE INDEX IF NOT EXISTS idx_test_history_url ON test_history(url);
CREATE INDEX IF NOT EXISTS idx_test_history_score ON test_history(overall_score);

-- 状态日志表索引
CREATE INDEX IF NOT EXISTS idx_test_status_logs_test_id ON test_status_logs(test_history_id);
CREATE INDEX IF NOT EXISTS idx_test_status_logs_changed_at ON test_status_logs(changed_at);
CREATE INDEX IF NOT EXISTS idx_test_status_logs_status ON test_status_logs(to_status);

-- 进度日志表索引
CREATE INDEX IF NOT EXISTS idx_test_progress_logs_test_id ON test_progress_logs(test_history_id);
CREATE INDEX IF NOT EXISTS idx_test_progress_logs_recorded_at ON test_progress_logs(recorded_at);
CREATE INDEX IF NOT EXISTS idx_test_progress_logs_phase ON test_progress_logs(current_phase);

-- ===========================================
-- 触发器函数
-- ===========================================

-- 更新时间戳触发器
DROP TRIGGER IF EXISTS update_test_history_updated_at ON test_history;
CREATE TRIGGER update_test_history_updated_at
    BEFORE UPDATE ON test_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 状态变更记录触发器函数
CREATE OR REPLACE FUNCTION log_test_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 只有当状态真正发生变化时才记录
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO test_status_logs (
            test_history_id,
            from_status,
            to_status,
            reason,
            change_source
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CASE 
                WHEN NEW.status = 'failed' AND NEW.error_message IS NOT NULL THEN 'Test failed: ' || LEFT(NEW.error_message, 200)
                WHEN NEW.status = 'completed' THEN 'Test completed successfully'
                WHEN NEW.status = 'cancelled' THEN 'Test cancelled by user'
                ELSE 'Status changed'
            END,
            'system'
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建状态变更触发器
DROP TRIGGER IF EXISTS test_status_change_log ON test_history;
CREATE TRIGGER test_status_change_log
    AFTER UPDATE ON test_history
    FOR EACH ROW EXECUTE FUNCTION log_test_status_change();

-- ===========================================
-- 数据迁移（如果需要）
-- ===========================================

-- 从现有test_results表迁移数据到test_history表（如果test_results表存在）
DO $$
BEGIN
    -- 检查test_results表是否存在
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_results') THEN
        -- 迁移数据
        INSERT INTO test_history (
            user_id,
            test_name,
            test_type,
            url,
            status,
            start_time,
            end_time,
            duration,
            created_at,
            updated_at,
            config,
            results,
            overall_score,
            total_requests,
            successful_requests,
            failed_requests
        )
        SELECT
            user_id,
            COALESCE(
                (results->>'testName')::text,
                'Stress Test - ' || SUBSTRING(url FROM 'https?://([^/]+)')
            ) as test_name,
            CASE
                WHEN type = 'stress' THEN 'stress'
                ELSE 'load'
            END as test_type,
            url,
            CASE
                WHEN status = 'success' THEN 'completed'
                WHEN status = 'error' THEN 'failed'
                WHEN status = 'cancelled' THEN 'cancelled'
                ELSE status
            END as status,
            start_time,
            end_time,
            CASE WHEN duration IS NOT NULL THEN duration / 1000 ELSE NULL END as duration, -- 转换为秒
            created_at,
            updated_at,
            config,
            results,
            score as overall_score,
            COALESCE((results->'metrics'->>'totalRequests')::integer, 0) as total_requests,
            COALESCE((results->'metrics'->>'successfulRequests')::integer, 0) as successful_requests,
            COALESCE((results->'metrics'->>'failedRequests')::integer, 0) as failed_requests
        FROM test_results
        WHERE type = 'stress'
        AND NOT EXISTS (
            SELECT 1 FROM test_history th
            WHERE th.url = test_results.url
            AND th.created_at = test_results.created_at
            AND th.user_id = test_results.user_id
        );

        RAISE NOTICE '📦 数据迁移完成';
    ELSE
        RAISE NOTICE 'ℹ️ test_results表不存在，跳过数据迁移';
    END IF;
END $$;

-- ===========================================
-- 验证和通知
-- ===========================================

DO $$
DECLARE
    table_count INTEGER;
    record_count INTEGER;
BEGIN
    -- 检查表是否创建成功
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('test_history', 'test_status_logs', 'test_progress_logs');

    IF table_count = 3 THEN
        RAISE NOTICE '✅ 测试历史记录表创建成功';

        -- 检查数据迁移情况
        SELECT COUNT(*) INTO record_count FROM test_history;
        RAISE NOTICE '📊 测试历史记录数量: %', record_count;
    ELSE
        RAISE NOTICE '❌ 部分表创建失败';
    END IF;

    RAISE NOTICE '🎉 测试历史记录功能增强完成！';
END $$;
