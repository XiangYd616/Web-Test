-- 修复监控表缺失字段
-- 创建时间: 2025-08-28
-- 目的: 添加monitoring_sites表缺失的字段

-- 1. 添加monitoring_type字段
DO $$
BEGIN
    -- 检查字段是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'monitoring_sites' 
        AND column_name = 'monitoring_type'
    ) THEN
        ALTER TABLE monitoring_sites 
        ADD COLUMN monitoring_type VARCHAR(50) DEFAULT 'uptime' 
        CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo'));
        
        RAISE NOTICE '✅ 添加monitoring_type字段成功';
    ELSE
        RAISE NOTICE '⚠️ monitoring_type字段已存在';
    END IF;
END $$;

-- 2. 添加config字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'monitoring_sites' 
        AND column_name = 'config'
    ) THEN
        ALTER TABLE monitoring_sites 
        ADD COLUMN config JSONB DEFAULT '{}';
        
        RAISE NOTICE '✅ 添加config字段成功';
    ELSE
        RAISE NOTICE '⚠️ config字段已存在';
    END IF;
END $$;

-- 3. 添加notification_settings字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'monitoring_sites' 
        AND column_name = 'notification_settings'
    ) THEN
        ALTER TABLE monitoring_sites 
        ADD COLUMN notification_settings JSONB DEFAULT '{}';
        
        RAISE NOTICE '✅ 添加notification_settings字段成功';
    ELSE
        RAISE NOTICE '⚠️ notification_settings字段已存在';
    END IF;
END $$;

-- 4. 添加last_check字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'monitoring_sites' 
        AND column_name = 'last_check'
    ) THEN
        ALTER TABLE monitoring_sites 
        ADD COLUMN last_check TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE '✅ 添加last_check字段成功';
    ELSE
        RAISE NOTICE '⚠️ last_check字段已存在';
    END IF;
END $$;

-- 5. 添加consecutive_failures字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'monitoring_sites' 
        AND column_name = 'consecutive_failures'
    ) THEN
        ALTER TABLE monitoring_sites 
        ADD COLUMN consecutive_failures INTEGER DEFAULT 0;
        
        RAISE NOTICE '✅ 添加consecutive_failures字段成功';
    ELSE
        RAISE NOTICE '⚠️ consecutive_failures字段已存在';
    END IF;
END $$;

-- 6. 添加status字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'monitoring_sites' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE monitoring_sites 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'paused', 'disabled'));
        
        RAISE NOTICE '✅ 添加status字段成功';
    ELSE
        RAISE NOTICE '⚠️ status字段已存在';
    END IF;
END $$;

-- 7. 添加deleted_at字段（软删除）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'monitoring_sites' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE monitoring_sites 
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE '✅ 添加deleted_at字段成功';
    ELSE
        RAISE NOTICE '⚠️ deleted_at字段已存在';
    END IF;
END $$;

-- 8. 创建索引
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_monitoring_type ON monitoring_sites(monitoring_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_status ON monitoring_sites(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_last_check ON monitoring_sites(last_check);
CREATE INDEX IF NOT EXISTS idx_monitoring_sites_deleted_at ON monitoring_sites(deleted_at);

-- 9. 验证迁移结果
DO $$
DECLARE
    field_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO field_count
    FROM information_schema.columns 
    WHERE table_name = 'monitoring_sites' 
    AND column_name IN ('monitoring_type', 'config', 'notification_settings', 'last_check', 'consecutive_failures', 'status', 'deleted_at');
    
    IF field_count >= 7 THEN
        RAISE NOTICE '✅ 监控表字段迁移完成，添加了 % 个字段', field_count;
    ELSE
        RAISE WARNING '⚠️ 监控表字段迁移不完整，只添加了 % 个字段', field_count;
    END IF;
END $$;

-- 10. 更新现有数据（如果有的话）
UPDATE monitoring_sites 
SET 
    monitoring_type = 'uptime',
    config = '{}',
    notification_settings = '{}',
    status = 'active',
    consecutive_failures = 0
WHERE monitoring_type IS NULL;

RAISE NOTICE '🎉 监控表字段修复迁移完成！';
