-- 创建迁移历史表
-- 版本：000
-- 日期：2025-08-06
-- 描述：创建数据库迁移历史跟踪表

-- ============================================================================
-- 创建迁移历史表
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    version VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    checksum VARCHAR(64), -- 用于验证迁移文件完整性
    execution_time_ms INTEGER, -- 执行时间（毫秒）
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'rolled_back')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_migration_history_version ON migration_history(version);
CREATE INDEX IF NOT EXISTS idx_migration_history_executed_at ON migration_history(executed_at);

-- 添加注释
COMMENT ON TABLE migration_history IS '数据库迁移历史记录表';
COMMENT ON COLUMN migration_history.version IS '迁移版本号';
COMMENT ON COLUMN migration_history.name IS '迁移名称';
COMMENT ON COLUMN migration_history.executed_at IS '执行时间';
COMMENT ON COLUMN migration_history.description IS '迁移描述';
COMMENT ON COLUMN migration_history.checksum IS '迁移文件校验和';
COMMENT ON COLUMN migration_history.execution_time_ms IS '执行时间（毫秒）';
COMMENT ON COLUMN migration_history.status IS '迁移状态';

-- 插入初始记录
INSERT INTO migration_history (version, name, executed_at, description, status)
VALUES (
    '000',
    'create_migration_history',
    NOW(),
    '创建数据库迁移历史跟踪表',
    'completed'
)
ON CONFLICT (version) DO NOTHING;

-- 验证表创建成功
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'migration_history' 
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'Failed to create migration_history table';
    END IF;
    
    RAISE NOTICE 'Migration history table created successfully!';
END $$;
