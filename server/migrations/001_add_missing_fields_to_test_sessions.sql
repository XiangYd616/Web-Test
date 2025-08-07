-- 数据库迁移脚本：添加缺失的字段到 test_sessions 表
-- 版本：001
-- 日期：2025-08-06
-- 描述：添加 results 字段和修复 grade 字段长度

-- ============================================================================
-- 向前迁移 (UP)
-- ============================================================================

-- 1. 添加 results 字段用于存储测试结果详情
ALTER TABLE test_sessions 
ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}';

-- 2. 修改 grade 字段长度以支持 "A+" 等值
ALTER TABLE test_sessions 
ALTER COLUMN grade TYPE VARCHAR(5);

-- 3. 添加注释说明
COMMENT ON COLUMN test_sessions.results IS '测试结果详情数据，JSON格式存储';
COMMENT ON COLUMN test_sessions.grade IS '测试等级：A+, A, B+, B, C+, C, D, F';

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_test_sessions_results_gin 
ON test_sessions USING GIN (results);

-- ============================================================================
-- 验证迁移
-- ============================================================================

-- 检查字段是否添加成功
DO $$
BEGIN
    -- 检查 results 字段
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_sessions' 
        AND column_name = 'results'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Migration failed: results column not found';
    END IF;
    
    -- 检查 grade 字段长度
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_sessions' 
        AND column_name = 'grade'
        AND character_maximum_length >= 5
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Migration failed: grade column length not updated';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

-- ============================================================================
-- 回滚脚本 (DOWN) - 仅在需要时执行
-- ============================================================================

/*
-- 警告：回滚将删除 results 字段中的所有数据！
-- 只有在确认需要回滚时才执行以下命令：

-- 删除索引
DROP INDEX IF EXISTS idx_test_sessions_results_gin;

-- 删除 results 字段
ALTER TABLE test_sessions DROP COLUMN IF EXISTS results;

-- 恢复 grade 字段长度（注意：如果已有长度超过2的数据，此操作会失败）
ALTER TABLE test_sessions ALTER COLUMN grade TYPE VARCHAR(2);

-- 删除注释
COMMENT ON COLUMN test_sessions.grade IS NULL;
*/

-- ============================================================================
-- 迁移完成
-- ============================================================================

-- 记录迁移历史（如果有迁移历史表的话）
INSERT INTO migration_history (version, name, executed_at, description)
VALUES (
    '001',
    'add_missing_fields_to_test_sessions',
    NOW(),
    '添加 results 字段和修复 grade 字段长度'
)
ON CONFLICT (version) DO NOTHING;
