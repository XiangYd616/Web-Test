-- 认证系统增强迁移脚本
-- 添加刷新令牌表和用户权限表

-- 创建刷新令牌表
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    jti UUID NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 索引优化
    INDEX idx_refresh_tokens_user_id (user_id),
    INDEX idx_refresh_tokens_token_hash (token_hash),
    INDEX idx_refresh_tokens_jti (jti),
    INDEX idx_refresh_tokens_expires_at (expires_at),
    INDEX idx_refresh_tokens_active (user_id, is_revoked, expires_at)
);

-- 创建用户权限表（可选，用于自定义权限）
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    granted_by INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 唯一约束
    UNIQUE(user_id, permission),
    
    -- 索引优化
    INDEX idx_user_permissions_user_id (user_id),
    INDEX idx_user_permissions_permission (permission),
    INDEX idx_user_permissions_active (user_id, is_active)
);

-- 创建用户会话表（增强版）
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    access_token_hash VARCHAR(64),
    refresh_token_hash VARCHAR(64),
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location_info JSONB,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 索引优化
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_session_id (session_id),
    INDEX idx_user_sessions_active (user_id, is_active, expires_at),
    INDEX idx_user_sessions_last_activity (last_activity_at)
);

-- 创建安全日志表
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    risk_level VARCHAR(20) DEFAULT 'low',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- 索引优化
    INDEX idx_security_logs_user_id (user_id),
    INDEX idx_security_logs_event_type (event_type),
    INDEX idx_security_logs_created_at (created_at),
    INDEX idx_security_logs_risk_level (risk_level),
    INDEX idx_security_logs_success (success)
);

-- 更新用户表，添加新字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(32),
ADD COLUMN IF NOT EXISTS backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;

-- 添加用户表的新索引
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

-- 创建权限常量表（用于权限管理界面）
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_permissions_code (code),
    INDEX idx_permissions_category (category),
    INDEX idx_permissions_active (is_active)
);

-- 插入预定义权限
INSERT INTO permissions (code, name, description, category) VALUES
-- 用户管理权限
('user:read', '查看用户', '可以查看用户信息', 'user'),
('user:write', '编辑用户', '可以编辑用户信息', 'user'),
('user:delete', '删除用户', '可以删除用户', 'user'),
('user:admin', '用户管理', '完整的用户管理权限', 'user'),

-- 测试相关权限
('test:create', '创建测试', '可以创建新的测试', 'test'),
('test:read', '查看测试', '可以查看测试结果', 'test'),
('test:update', '编辑测试', '可以编辑测试配置', 'test'),
('test:delete', '删除测试', '可以删除测试记录', 'test'),
('test:execute', '执行测试', '可以执行测试', 'test'),
('test:admin', '测试管理', '完整的测试管理权限', 'test'),

-- 监控权限
('monitoring:read', '查看监控', '可以查看监控数据', 'monitoring'),
('monitoring:write', '配置监控', '可以配置监控规则', 'monitoring'),
('monitoring:admin', '监控管理', '完整的监控管理权限', 'monitoring'),

-- 系统管理权限
('system:config', '系统配置', '可以修改系统配置', 'system'),
('system:logs', '系统日志', '可以查看系统日志', 'system'),
('system:admin', '系统管理', '完整的系统管理权限', 'system'),

-- 数据管理权限
('data:export', '数据导出', '可以导出数据', 'data'),
('data:import', '数据导入', '可以导入数据', 'data'),
('data:backup', '数据备份', '可以备份和恢复数据', 'data'),
('data:admin', '数据管理', '完整的数据管理权限', 'data'),

-- 报告权限
('report:read', '查看报告', '可以查看报告', 'report'),
('report:create', '创建报告', '可以创建自定义报告', 'report'),
('report:admin', '报告管理', '完整的报告管理权限', 'report'),

-- 集成权限
('integration:read', '查看集成', '可以查看集成配置', 'integration'),
('integration:write', '配置集成', '可以配置第三方集成', 'integration'),
('integration:admin', '集成管理', '完整的集成管理权限', 'integration')

ON CONFLICT (code) DO NOTHING;

-- 创建角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_roles_code (code),
    INDEX idx_roles_active (is_active)
);

-- 插入预定义角色
INSERT INTO roles (code, name, description) VALUES
('admin', '超级管理员', '拥有系统的完整访问权限'),
('manager', '管理员', '拥有大部分管理权限，但不能修改系统配置'),
('premium', '高级用户', '可以使用高级功能和创建报告'),
('user', '普通用户', '可以使用基本的测试功能'),
('viewer', '只读用户', '只能查看数据，不能进行修改操作')
ON CONFLICT (code) DO NOTHING;

-- 创建角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(role_code, permission_code),
    INDEX idx_role_permissions_role (role_code),
    INDEX idx_role_permissions_permission (permission_code)
);

-- 创建清理过期令牌的函数
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除过期的刷新令牌
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() OR is_revoked = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 删除过期的用户会话
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = FALSE;
    
    -- 删除过期的密码重置令牌
    UPDATE users 
    SET password_reset_token = NULL, password_reset_expires = NULL
    WHERE password_reset_expires < NOW();
    
    -- 删除过期的邮箱验证令牌
    UPDATE users 
    SET verification_token = NULL, verification_expires = NULL
    WHERE verification_expires < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建定时清理任务（需要pg_cron扩展，如果没有则忽略）
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_tokens();');

-- 创建触发器函数来更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表创建更新时间触发器
CREATE TRIGGER update_refresh_tokens_updated_at
    BEFORE UPDATE ON refresh_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at
    BEFORE UPDATE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建安全相关的视图
CREATE OR REPLACE VIEW active_user_sessions AS
SELECT 
    us.id,
    us.user_id,
    u.username,
    u.email,
    us.ip_address,
    us.user_agent,
    us.last_activity_at,
    us.created_at,
    EXTRACT(EPOCH FROM (NOW() - us.last_activity_at)) / 60 AS minutes_since_last_activity
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE us.is_active = TRUE 
  AND us.expires_at > NOW()
ORDER BY us.last_activity_at DESC;

CREATE OR REPLACE VIEW user_security_summary AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    u.is_active,
    u.email_verified,
    u.two_factor_enabled,
    u.failed_login_attempts,
    u.locked_until,
    u.last_login,
    u.created_at,
    COUNT(DISTINCT rt.id) AS active_refresh_tokens,
    COUNT(DISTINCT us.id) AS active_sessions,
    MAX(sl.created_at) AS last_security_event
FROM users u
LEFT JOIN refresh_tokens rt ON u.id = rt.user_id AND rt.is_revoked = FALSE AND rt.expires_at > NOW()
LEFT JOIN user_sessions us ON u.id = us.user_id AND us.is_active = TRUE AND us.expires_at > NOW()
LEFT JOIN security_logs sl ON u.id = sl.user_id
GROUP BY u.id, u.username, u.email, u.role, u.is_active, u.email_verified, 
         u.two_factor_enabled, u.failed_login_attempts, u.locked_until, 
         u.last_login, u.created_at;

-- 添加注释
COMMENT ON TABLE refresh_tokens IS '刷新令牌表，用于JWT令牌刷新机制';
COMMENT ON TABLE user_permissions IS '用户自定义权限表，用于扩展基于角色的权限';
COMMENT ON TABLE user_sessions IS '用户会话表，跟踪用户登录会话';
COMMENT ON TABLE security_logs IS '安全日志表，记录安全相关事件';
COMMENT ON TABLE permissions IS '权限定义表';
COMMENT ON TABLE roles IS '角色定义表';
COMMENT ON TABLE role_permissions IS '角色权限关联表';

COMMENT ON FUNCTION cleanup_expired_tokens() IS '清理过期令牌和会话的函数';
COMMENT ON VIEW active_user_sessions IS '活跃用户会话视图';
COMMENT ON VIEW user_security_summary IS '用户安全状态汇总视图';