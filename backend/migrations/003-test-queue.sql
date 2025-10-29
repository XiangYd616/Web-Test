/**
 * 测试队列表迁移
 * 版本: 003
 * 描述: 创建test_queue表用于队列管理和测试持久化
 */

-- 创建测试队列表
CREATE TABLE IF NOT EXISTS test_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id VARCHAR(255) UNIQUE NOT NULL,
  test_type VARCHAR(50) NOT NULL,
  test_name VARCHAR(255),
  url TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  user_id UUID,
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_test_queue_test_id ON test_queue(test_id);
CREATE INDEX IF NOT EXISTS idx_test_queue_status ON test_queue(status);
CREATE INDEX IF NOT EXISTS idx_test_queue_user_id ON test_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_test_queue_created_at ON test_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_queue_priority ON test_queue(priority DESC, created_at);

-- 添加外键约束(如果users表存在)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE test_queue
        ADD CONSTRAINT fk_test_queue_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 创建更新updated_at的触发器
CREATE OR REPLACE FUNCTION update_test_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_test_queue_updated_at
    BEFORE UPDATE ON test_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_test_queue_updated_at();

-- 添加注释
COMMENT ON TABLE test_queue IS '测试任务队列表';
COMMENT ON COLUMN test_queue.id IS '主键UUID';
COMMENT ON COLUMN test_queue.test_id IS '测试唯一标识符';
COMMENT ON COLUMN test_queue.test_type IS '测试类型: performance, security, seo等';
COMMENT ON COLUMN test_queue.status IS '任务状态: queued, running, completed, failed, cancelled';
COMMENT ON COLUMN test_queue.priority IS '任务优先级,数值越大优先级越高';
COMMENT ON COLUMN test_queue.progress IS '任务进度(0-100)';
COMMENT ON COLUMN test_queue.result IS '测试结果JSON';
COMMENT ON COLUMN test_queue.retry_count IS '重试次数';

