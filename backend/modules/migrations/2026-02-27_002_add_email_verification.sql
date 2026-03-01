-- 邮箱验证功能迁移
-- 1. users 表添加 email_verified 相关字段
-- 2. 创建 email_verification_tokens 表

-- users 表添加邮箱验证字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- 邮箱验证令牌表
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_email_verification_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);

-- system_configs 表（如果不存在）— 用于存储 email_verification_required 等配置
CREATE TABLE IF NOT EXISTS system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(255) NOT NULL UNIQUE,
  config_value JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 默认配置：邮箱验证关闭（可通过后台开启）
INSERT INTO system_configs (config_key, config_value, description)
VALUES ('email_verification_required', '{"value": false}', '是否要求邮箱验证后才能登录')
ON CONFLICT (config_key) DO NOTHING;
