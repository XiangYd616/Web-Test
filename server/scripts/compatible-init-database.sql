-- ===========================================
-- Test Web App - 兼容现有表结构的初始化脚本
-- ===========================================
-- 版本: 3.2
-- 描述: 完全兼容现有users表结构，只创建缺失的表

-- 确保uuid-ossp扩展存在
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- 检查现有users表并创建索引
-- ===========================================

-- 为现有users表创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- ===========================================
-- 用户偏好设置表
-- ===========================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- 界面设置
    theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',

    -- 通知设置
    email_notifications BOOLEAN DEFAULT true,
    browser_notifications BOOLEAN DEFAULT true,

    -- 测试默认设置
    default_test_environment VARCHAR(50) DEFAULT 'production',
    auto_save_results BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 确保每个用户只有一条偏好记录
    UNIQUE(user_id)
);

-- 用户偏好索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ===========================================
-- 会话管理表
-- ===========================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 会话信息
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    
    -- 设备和位置信息
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    -- 时间信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- 状态
    is_active BOOLEAN DEFAULT true
);

-- 会话表索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- ===========================================
-- 系统配置表
-- ===========================================

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统配置索引
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON system_settings(is_public) WHERE is_public = true;

-- ===========================================
-- 插入默认系统配置
-- ===========================================

INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('app_name', '"Test Web App"', '应用程序名称', 'general', true),
('app_version', '"3.0.0"', '应用程序版本', 'general', true),
('maintenance_mode', 'false', '维护模式开关', 'system', false),
('max_file_size', '10485760', '最大文件上传大小（字节）', 'upload', false),
('allowed_file_types', '["pdf", "png", "jpg", "jpeg", "gif", "csv", "json"]', '允许的文件类型', 'upload', false),
('session_timeout', '86400', '会话超时时间（秒）', 'security', false),
('max_login_attempts', '5', '最大登录尝试次数', 'security', false),
('password_min_length', '8', '密码最小长度', 'security', true)
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- 创建触发器函数
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加更新时间戳触发器
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 创建用户偏好自动创建函数
-- ===========================================

CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为用户表添加触发器（为新用户自动创建偏好设置）
DROP TRIGGER IF EXISTS trigger_create_user_preferences ON users;
CREATE TRIGGER trigger_create_user_preferences
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_preferences();

-- ===========================================
-- 为现有用户创建偏好设置
-- ===========================================

-- 为所有现有用户创建偏好设置（如果不存在）
INSERT INTO user_preferences (user_id)
SELECT id FROM users 
WHERE id NOT IN (SELECT user_id FROM user_preferences WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- ===========================================
-- 清理过期会话的函数
-- ===========================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
       OR last_accessed < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 完成信息
-- ===========================================

DO $$
DECLARE
    user_count INTEGER;
    preference_count INTEGER;
    setting_count INTEGER;
BEGIN
    -- 统计信息
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO preference_count FROM user_preferences;
    SELECT COUNT(*) INTO setting_count FROM system_settings;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ 兼容初始化完成！';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '📊 数据统计：';
    RAISE NOTICE '- 用户数量: %', user_count;
    RAISE NOTICE '- 用户偏好记录: %', preference_count;
    RAISE NOTICE '- 系统配置记录: %', setting_count;
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ 已创建的表：';
    RAISE NOTICE '- user_preferences (用户偏好)';
    RAISE NOTICE '- user_sessions (会话管理)';
    RAISE NOTICE '- system_settings (系统配置)';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ 已创建的功能：';
    RAISE NOTICE '- 自动为新用户创建偏好设置';
    RAISE NOTICE '- 自动更新时间戳';
    RAISE NOTICE '- 会话清理函数';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '📝 下一步：执行测试历史表创建脚本';
    RAISE NOTICE '   psql -d testweb_dev -f server/scripts/master-detail-test-history-schema.sql';
    RAISE NOTICE '===========================================';
END $$;
