-- =====================================================
-- 测试工具平台权威数据库架构
-- 版本: 4.0 - 统一重构版本
-- 创建时间: 2025-08-11
-- 设计目标: 单一权威架构，解决前后端不匹配问题
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- 1. 用户管理模块
-- =====================================================

-- 用户表 (与代码完全匹配)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'enterprise')),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    
    -- 认证相关 (与代码匹配)
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    
    -- 登录统计 (与代码匹配的字段名)
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,  -- 注意：使用代码中的字段名
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- 用户配置
    preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 刷新令牌表 (与JwtService匹配)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    jti UUID NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 用户会话表 (与auth middleware匹配)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. 测试管理模块
-- =====================================================

-- 测试会话表
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('stress', 'security', 'api', 'performance', 'compatibility', 'seo', 'accessibility', 'ux', 'network', 'database', 'website')),
    url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- 测试持续时间（秒）
    overall_score DECIMAL(5,2), -- 总体评分 0-100
    grade VARCHAR(5), -- A+, A, B+, B, C+, C, D, F
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    major_issues INTEGER DEFAULT 0,
    minor_issues INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    environment VARCHAR(50) DEFAULT 'production',
    tags TEXT[],
    description TEXT,
    notes TEXT,
    results JSONB DEFAULT '{}', -- 测试结果详情
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 3. 索引优化
-- =====================================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 测试会话表索引
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_type ON test_sessions(test_type);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_created_at ON test_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_test_sessions_deleted_at ON test_sessions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_test_sessions_url ON test_sessions USING gin(to_tsvector('english', url));
CREATE INDEX IF NOT EXISTS idx_test_sessions_tags ON test_sessions USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 刷新令牌索引
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(user_id, is_revoked, expires_at);

-- 用户会话索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active, expires_at);

-- 测试会话索引
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_type ON test_sessions(test_type);
CREATE INDEX IF NOT EXISTS idx_test_sessions_created_at ON test_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_test_sessions_results_gin ON test_sessions USING GIN (results);

-- =====================================================
-- 4. 触发器 - 自动更新时间戳
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间戳触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refresh_tokens_updated_at BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_sessions_updated_at BEFORE UPDATE ON test_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
