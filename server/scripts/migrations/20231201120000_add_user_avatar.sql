-- Migration: add_user_avatar
-- Created: 2023-12-01T12:00:00.000Z
-- Description: 添加用户头像字段和相关索引

-- 添加用户头像字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMP WITH TIME ZONE;

-- 创建头像相关索引
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users(avatar_url) WHERE avatar_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_avatar_updated ON users(avatar_updated_at DESC) WHERE avatar_updated_at IS NOT NULL;

-- 添加头像文件大小限制检查
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS chk_avatar_url_length CHECK (length(avatar_url) <= 255);

-- 更新现有用户的头像更新时间
UPDATE users SET avatar_updated_at = updated_at WHERE avatar_url IS NOT NULL AND avatar_updated_at IS NULL;
