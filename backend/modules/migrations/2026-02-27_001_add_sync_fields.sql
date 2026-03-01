-- ============================================================
-- 双向同步基础设施：为可同步表添加 sync 字段 + 新建同步元数据表
-- ============================================================

-- 1. 为可同步的业务表添加 sync 字段
-- sync_id:          全局唯一标识，跨设备一致（桌面端创建时生成，云端创建时 = id）
-- sync_version:     乐观锁版本号，每次修改 +1
-- sync_updated_at:  最后同步时间
-- sync_device_id:   最后修改来源设备

-- workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sync_id UUID UNIQUE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sync_updated_at TIMESTAMPTZ;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sync_device_id VARCHAR(64);
UPDATE workspaces SET sync_id = id WHERE sync_id IS NULL;
UPDATE workspaces SET sync_updated_at = COALESCE(updated_at, created_at, NOW()) WHERE sync_updated_at IS NULL;

-- collections
ALTER TABLE collections ADD COLUMN IF NOT EXISTS sync_id UUID UNIQUE;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS sync_updated_at TIMESTAMPTZ;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS sync_device_id VARCHAR(64);
UPDATE collections SET sync_id = id::uuid WHERE sync_id IS NULL;
UPDATE collections SET sync_updated_at = COALESCE(updated_at, created_at, NOW()) WHERE sync_updated_at IS NULL;

-- environments
ALTER TABLE environments ADD COLUMN IF NOT EXISTS sync_id UUID UNIQUE;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS sync_updated_at TIMESTAMPTZ;
ALTER TABLE environments ADD COLUMN IF NOT EXISTS sync_device_id VARCHAR(64);
UPDATE environments SET sync_id = id::uuid WHERE sync_id IS NULL;
UPDATE environments SET sync_updated_at = COALESCE(updated_at, created_at, NOW()) WHERE sync_updated_at IS NULL;

-- test_templates
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS sync_id UUID UNIQUE;
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS sync_updated_at TIMESTAMPTZ;
ALTER TABLE test_templates ADD COLUMN IF NOT EXISTS sync_device_id VARCHAR(64);
UPDATE test_templates SET sync_id = id::uuid WHERE sync_id IS NULL;
UPDATE test_templates SET sync_updated_at = COALESCE(updated_at, created_at, NOW()) WHERE sync_updated_at IS NULL;

-- test_executions（如果存在）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_executions') THEN
    ALTER TABLE test_executions ADD COLUMN IF NOT EXISTS sync_id UUID UNIQUE;
    ALTER TABLE test_executions ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
    ALTER TABLE test_executions ADD COLUMN IF NOT EXISTS sync_updated_at TIMESTAMPTZ;
    ALTER TABLE test_executions ADD COLUMN IF NOT EXISTS sync_device_id VARCHAR(64);
  END IF;
END $$;

-- 2. 同步日志表：记录每次同步操作
CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('pull', 'push')),
  tables_synced TEXT[],
  records_pulled INTEGER DEFAULT 0,
  records_pushed INTEGER DEFAULT 0,
  conflicts_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user ON sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_device ON sync_log(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at DESC);

-- 3. 同步冲突表：记录冲突及其解决方式
CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_name VARCHAR(64) NOT NULL,
  record_sync_id UUID NOT NULL,
  local_version INTEGER,
  remote_version INTEGER,
  local_data JSONB,
  remote_data JSONB,
  resolution VARCHAR(20) DEFAULT 'pending' CHECK (resolution IN ('pending', 'local', 'remote', 'merged')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user ON sync_conflicts(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_pending ON sync_conflicts(resolution) WHERE resolution = 'pending';
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_record ON sync_conflicts(table_name, record_sync_id);

-- 4. 设备注册表：跟踪同步设备
CREATE TABLE IF NOT EXISTS sync_devices (
  id VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL,
  device_name VARCHAR(128),
  device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('desktop', 'web')),
  platform VARCHAR(20),
  last_sync_at TIMESTAMPTZ,
  last_pull_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_devices_user ON sync_devices(user_id);
