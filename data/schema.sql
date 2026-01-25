-- =====================================================
-- 统一测试平台数据库架构
-- 版本: 1.0 - 完整统一版
-- 创建时间: 2025-08-13
-- 设计目标: 支持8个统一测试工具的完整功能
-- 测试类型: api, compatibility, infrastructure, security, seo, stress, ux, website
-- =====================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 0. 辅助函数
-- =====================================================

-- 生成批次ID的函数
CREATE OR REPLACE FUNCTION generate_batch_id()
RETURNS VARCHAR(100)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'BATCH_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || SUBSTRING(uuid_generate_v4()::TEXT FROM 1 FOR 8);
END;
$$;

-- 计算测试评分等级的函数
CREATE OR REPLACE FUNCTION calculate_grade(score INTEGER)
RETURNS VARCHAR(5)
LANGUAGE plpgsql
AS $$
BEGIN
    IF score IS NULL THEN
        RETURN NULL;
    END IF;

    CASE
        WHEN score >= 90 THEN RETURN 'A+';
        WHEN score >= 85 THEN RETURN 'A';
        WHEN score >= 80 THEN RETURN 'B+';
        WHEN score >= 75 THEN RETURN 'B';
        WHEN score >= 70 THEN RETURN 'C+';
        WHEN score >= 65 THEN RETURN 'C';
        WHEN score >= 60 THEN RETURN 'D+';
        WHEN score >= 55 THEN RETURN 'D';
        ELSE RETURN 'F';
    END CASE;
END;
$$;

-- 更新时间戳的通用函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- =====================================================
-- 1. 用户管理模块
-- =====================================================

-- 用户主表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,

    -- 角色和权限
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator', 'enterprise')),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    is_active BOOLEAN DEFAULT true,
    two_factor_enabled BOOLEAN DEFAULT false,

    -- 认证相关
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,

    -- 登录统计
    last_login TIMESTAMP WITH TIME ZONE,
    locked_until TIMESTAMP WITH TIME ZONE,

    login_attempts INTEGER DEFAULT 0,
    last_login_attempt TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    password_expired BOOLEAN DEFAULT false,
    last_password_warning TIMESTAMP WITH TIME ZONE,

    -- 用户配置和元数据
    preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 密码历史表
CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 密码重置令牌表
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- 登录尝试表
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,

    device_name VARCHAR(255),
    device_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    location JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    terminated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    refresh_token VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 工作空间表（用于团队协作）
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_visibility ON workspaces(visibility);
CREATE INDEX IF NOT EXISTS idx_workspaces_metadata_gin ON workspaces USING GIN (metadata);

-- 工作空间成员表
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
    permissions JSONB DEFAULT '[]',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON workspace_members(status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_permissions_gin ON workspace_members USING GIN (permissions);

-- =====================================================
-- 1.1 协作/集合/环境/运行模块（由 Sequelize 模型反推）
-- =====================================================

-- 集合表
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    definition JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_workspace_id ON collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collections_created_by ON collections(created_by);
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);

-- 环境表
CREATE TABLE IF NOT EXISTS environments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_environments_workspace_id ON environments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_environments_created_at ON environments(created_at DESC);

-- 环境变量表
CREATE TABLE IF NOT EXISTS environment_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(50),
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    secret BOOLEAN DEFAULT false,
    encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_environment_variables_environment_id ON environment_variables(environment_id);
CREATE INDEX IF NOT EXISTS idx_environment_variables_key ON environment_variables(key);

-- 全局变量表
CREATE TABLE IF NOT EXISTS global_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(50),
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    secret BOOLEAN DEFAULT false,
    encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_variables_key ON global_variables(key);

-- 运行记录表
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES environments(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    options JSONB DEFAULT '{}',
    summary JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_workspace_id ON runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_runs_collection_id ON runs(collection_id);
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);

-- 运行结果表
CREATE TABLE IF NOT EXISTS run_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    response JSONB,
    assertions JSONB,
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_results_run_id ON run_results(run_id);
CREATE INDEX IF NOT EXISTS idx_run_results_status ON run_results(status);

-- 定时运行表
CREATE TABLE IF NOT EXISTS scheduled_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    environment_id UUID REFERENCES environments(id) ON DELETE SET NULL,
    cron_expression VARCHAR(100) NOT NULL,
    config JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    name VARCHAR(255),
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_runs_workspace_id ON scheduled_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_collection_id ON scheduled_runs(collection_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_runs_status ON scheduled_runs(status);

-- 定时运行结果表
CREATE TABLE IF NOT EXISTS scheduled_run_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheduled_run_id UUID NOT NULL REFERENCES scheduled_runs(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    total_requests INTEGER DEFAULT 0,
    passed_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    logs JSONB DEFAULT '[]',
    triggered_by VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_run_results_scheduled_run_id ON scheduled_run_results(scheduled_run_id);

-- 工作空间邀请表
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    permissions JSONB DEFAULT '[]',
    token VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_invitee_email ON workspace_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON workspace_invitations(status);

-- 工作空间资源表
CREATE TABLE IF NOT EXISTS workspace_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    path TEXT,
    size BIGINT,
    mime_type VARCHAR(100),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    permissions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_resources_workspace_id ON workspace_resources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_resources_owner_id ON workspace_resources(owner_id);

-- 工作空间活动表
CREATE TABLE IF NOT EXISTS workspace_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    resource JSONB DEFAULT '{}',
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_activities_workspace_id ON workspace_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_user_id ON workspace_activities(user_id);

-- =====================================================
-- 2. 测试管理模块
-- =====================================================

-- 测试执行核心表（当前代码使用）
CREATE TABLE IF NOT EXISTS test_executions (
    id SERIAL PRIMARY KEY,
    test_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    engine_type VARCHAR(50) NOT NULL,
    engine_name VARCHAR(100) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_url VARCHAR(500),
    test_config JSONB DEFAULT '{}',
    url VARCHAR(500),
    config JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',

    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'medium',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_time INTEGER,

    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    tags TEXT[],

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_executions_user_id ON test_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_workspace_id ON test_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_engine_type ON test_executions(engine_type);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_executions_test_id ON test_executions(test_id);

-- 执行日志表
CREATE TABLE IF NOT EXISTS test_logs (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 测试结果详情表 - 存储测试的详细结果数据
CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,

    summary JSONB DEFAULT '{}',
    score DECIMAL(5, 2),
    grade VARCHAR(10),
    passed BOOLEAN,
    warnings JSONB DEFAULT '[]',
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 测试指标表 - 存储量化的测试指标（重构：统一值存储）
CREATE TABLE IF NOT EXISTS test_metrics (
    id SERIAL PRIMARY KEY,
    result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,

    metric_name VARCHAR(100) NOT NULL,
    metric_value JSONB NOT NULL,
    metric_unit VARCHAR(50),
    metric_type VARCHAR(50),
    threshold_min DECIMAL(10, 2),
    threshold_max DECIMAL(10, 2),
    passed BOOLEAN,
    severity VARCHAR(20),
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 用户测试统计表（用于统一统计）
CREATE TABLE IF NOT EXISTS user_test_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL,
    total_tests INTEGER NOT NULL DEFAULT 0,
    successful_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    last_test_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, test_type)
);

CREATE INDEX IF NOT EXISTS idx_user_test_stats_user_id ON user_test_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_test_stats_test_type ON user_test_stats(test_type);
CREATE INDEX IF NOT EXISTS idx_user_test_stats_updated_at ON user_test_stats(updated_at DESC);

-- 测试对比记录表
CREATE TABLE IF NOT EXISTS test_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comparison_name VARCHAR(255) NOT NULL,
    execution_ids INTEGER[] NOT NULL,
    comparison_type VARCHAR(50) NOT NULL,
    comparison_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_comparisons_user_id ON test_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_test_comparisons_created_at ON test_comparisons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_comparisons_type ON test_comparisons(comparison_type);

-- 压力测试结果表
CREATE TABLE IF NOT EXISTS stress_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    test_name VARCHAR(255),
    url TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'stopped')),
    results JSONB,
    total_requests INTEGER,
    successful_requests INTEGER,
    failed_requests INTEGER,
    success_rate DECIMAL(5, 2),
    avg_response_time DECIMAL(10, 2),
    min_response_time DECIMAL(10, 2),
    max_response_time DECIMAL(10, 2),
    throughput DECIMAL(10, 2),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    error_message TEXT,
    tags TEXT[] DEFAULT '{}',
    environment VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. 系统配置与监控模块（运行时依赖）
-- =====================================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    config_key VARCHAR(255) PRIMARY KEY,
    config_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 监控站点表
CREATE TABLE IF NOT EXISTS monitoring_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    monitoring_type VARCHAR(50) DEFAULT 'uptime',
    check_interval INTEGER DEFAULT 300,
    timeout INTEGER DEFAULT 30,
    config JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    last_check TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER DEFAULT 0,
    last_status VARCHAR(20),
    last_checked_at TIMESTAMP WITH TIME ZONE,
    last_response_time INTEGER,
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 监控结果表
CREATE TABLE IF NOT EXISTS monitoring_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL,
    response_time INTEGER,
    status_code INTEGER,
    results JSONB DEFAULT '{}',
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 监控告警表
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id VARCHAR(255) PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES monitoring_sites(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    source VARCHAR(50) NOT NULL DEFAULT 'monitoring',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    message TEXT,
    details JSONB DEFAULT '{}',
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统指标表
CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50),
    source VARCHAR(50) DEFAULT 'system',
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 系统统计表（供索引/报表使用）
CREATE TABLE IF NOT EXISTS system_stats (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. 索引创建
-- =====================================================

-- 压力测试结果表索引
CREATE INDEX IF NOT EXISTS idx_stress_test_results_test_id ON stress_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_stress_test_results_user_id ON stress_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_test_results_status ON stress_test_results(status);
CREATE INDEX IF NOT EXISTS idx_stress_test_results_created_at ON stress_test_results(created_at);
CREATE INDEX IF NOT EXISTS idx_stress_test_results_url ON stress_test_results USING HASH (url);

-- =====================================================
-- 5. 触发器 - 自动更新时间戳
-- =====================================================

-- 为相关表创建触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_executions_updated_at ON test_executions;
CREATE TRIGGER update_test_executions_updated_at
    BEFORE UPDATE ON test_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_test_stats_updated_at ON user_test_stats;
CREATE TRIGGER update_user_test_stats_updated_at
    BEFORE UPDATE ON user_test_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stress_test_results_updated_at ON stress_test_results;
CREATE TRIGGER update_stress_test_results_updated_at
    BEFORE UPDATE ON stress_test_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_configs_updated_at ON system_configs;
CREATE TRIGGER update_system_configs_updated_at
    BEFORE UPDATE ON system_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monitoring_alerts_updated_at ON monitoring_alerts;
CREATE TRIGGER update_monitoring_alerts_updated_at
    BEFORE UPDATE ON monitoring_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    IF to_regclass('public.user_permissions') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
        CREATE TRIGGER update_user_permissions_updated_at
            BEFORE UPDATE ON user_permissions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.projects') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
        CREATE TRIGGER update_projects_updated_at
            BEFORE UPDATE ON projects
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.project_members') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS update_project_members_updated_at ON project_members;
        CREATE TRIGGER update_project_members_updated_at
            BEFORE UPDATE ON project_members
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER update_workspace_members_updated_at
    BEFORE UPDATE ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_environments_updated_at ON environments;
CREATE TRIGGER update_environments_updated_at
    BEFORE UPDATE ON environments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_environment_variables_updated_at ON environment_variables;
CREATE TRIGGER update_environment_variables_updated_at
    BEFORE UPDATE ON environment_variables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_variables_updated_at ON global_variables;
CREATE TRIGGER update_global_variables_updated_at
    BEFORE UPDATE ON global_variables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_runs_updated_at ON runs;
CREATE TRIGGER update_runs_updated_at
    BEFORE UPDATE ON runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_run_results_updated_at ON run_results;
CREATE TRIGGER update_run_results_updated_at
    BEFORE UPDATE ON run_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_runs_updated_at ON scheduled_runs;
CREATE TRIGGER update_scheduled_runs_updated_at
    BEFORE UPDATE ON scheduled_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_run_results_updated_at ON scheduled_run_results;
CREATE TRIGGER update_scheduled_run_results_updated_at
    BEFORE UPDATE ON scheduled_run_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_resources_updated_at ON workspace_resources;
CREATE TRIGGER update_workspace_resources_updated_at
    BEFORE UPDATE ON workspace_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. 扩展功能表
-- =====================================================

-- 测试模板表
CREATE TABLE IF NOT EXISTS test_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

    -- 模板信息
    template_name VARCHAR(200) NOT NULL,
    description TEXT,
    engine_type VARCHAR(20) NOT NULL CHECK (engine_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),

    -- 模板配置
    config JSONB DEFAULT '{}',

    -- 使用统计
    usage_count INTEGER DEFAULT 0,

    -- 共享设置
    is_public BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_templates_user_id ON test_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_test_templates_workspace_id ON test_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_test_templates_engine_type ON test_templates(engine_type);
CREATE INDEX IF NOT EXISTS idx_test_templates_is_public ON test_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_test_templates_is_default ON test_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_test_templates_usage_count ON test_templates(usage_count);

-- 测试报告表（以当前代码使用为准）
CREATE TABLE IF NOT EXISTS test_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

    report_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}',

    file_path TEXT,
    file_size INTEGER,

    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_reports_execution_id ON test_reports(execution_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_user_id ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_workspace_id ON test_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_type ON test_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_test_reports_format ON test_reports(format);
CREATE INDEX IF NOT EXISTS idx_test_reports_generated_at ON test_reports(generated_at DESC);

-- 报告分享表
CREATE TABLE IF NOT EXISTS report_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    share_type VARCHAR(20) DEFAULT 'link' CHECK (share_type IN ('link', 'email', 'download')),
    password_hash VARCHAR(255),
    allowed_ips JSONB DEFAULT '[]',
    max_access_count INTEGER,
    current_access_count INTEGER DEFAULT 0,
    permissions JSONB DEFAULT '["view"]',
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 报告访问日志表
CREATE TABLE IF NOT EXISTS report_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    share_id UUID REFERENCES report_shares(id) ON DELETE SET NULL,
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('view', 'download', 'share', 'generate')),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 报告模板表
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    template_config JSONB NOT NULL,
    default_format VARCHAR(20) DEFAULT 'html',
    is_public BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 报告配置表
CREATE TABLE IF NOT EXISTS report_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    schedule JSONB DEFAULT '{}',
    recipients JSONB DEFAULT '[]',
    filters JSONB DEFAULT '[]',
    format JSONB DEFAULT '{}',
    delivery JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 报告实例表
CREATE TABLE IF NOT EXISTS report_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES test_reports(id) ON DELETE SET NULL,
    config_id UUID REFERENCES report_configs(id) ON DELETE SET NULL,
    template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'cancelled')),
    format VARCHAR(20) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    path TEXT,
    url TEXT,
    size INTEGER,
    error TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 报告分享邮件表
CREATE TABLE IF NOT EXISTS report_share_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
    share_id UUID NOT NULL REFERENCES report_shares(id) ON DELETE CASCADE,
    recipients JSONB NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Key 表
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 上传文件表
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size BIGINT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Removed storage_items table (2026-01): no read/write references found after full scan, unified to other storage tables

-- 清理策略与任务表
CREATE TABLE IF NOT EXISTS cleanup_policies (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    retention_days INTEGER NOT NULL,
    conditions JSONB DEFAULT '[]',
    actions JSONB DEFAULT '[]',
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleanup_jobs (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_id VARCHAR(80) NOT NULL REFERENCES cleanup_policies(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    items_processed INTEGER DEFAULT 0,
    items_total INTEGER DEFAULT 0,
    size_processed BIGINT DEFAULT 0,
    size_freed BIGINT DEFAULT 0,
    errors JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_status ON cleanup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_policy ON cleanup_jobs(policy_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_created ON cleanup_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_status_created ON cleanup_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_policies_priority ON cleanup_policies(priority);
CREATE INDEX IF NOT EXISTS idx_cleanup_policies_enabled ON cleanup_policies(enabled);

-- 归档策略与任务表
CREATE TABLE IF NOT EXISTS archive_policies (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules JSONB DEFAULT '[]',
    schedule VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archive_jobs (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    policy_id VARCHAR(80) REFERENCES archive_policies(id) ON DELETE SET NULL,
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    size BIGINT DEFAULT 0,
    compressed_size BIGINT,
    compression_ratio NUMERIC(8, 2),
    files_count INTEGER DEFAULT 0,
    archived_files_count INTEGER DEFAULT 0,
    error TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_archive_jobs_status ON archive_jobs(status);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_created ON archive_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_policy ON archive_jobs(policy_id);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_status_created ON archive_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_policies_enabled ON archive_policies(enabled);

-- 数据管理记录与备份表
CREATE TABLE IF NOT EXISTS data_records (
    id VARCHAR(80) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    workspace_id VARCHAR(80),
    data JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_data_records_type ON data_records(type);
CREATE INDEX IF NOT EXISTS idx_data_records_workspace_id ON data_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_data_records_created ON data_records(created_at DESC);

CREATE TABLE IF NOT EXISTS data_record_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id VARCHAR(80) NOT NULL,
    type VARCHAR(100) NOT NULL,
    workspace_id VARCHAR(80),
    data JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL,
    action VARCHAR(30) NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_record_versions_record_id ON data_record_versions(record_id);
CREATE INDEX IF NOT EXISTS idx_data_record_versions_created_at ON data_record_versions(created_at DESC);

CREATE TABLE IF NOT EXISTS data_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    data_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    summary JSONB DEFAULT '{}',
    records JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS export_tasks (
    id VARCHAR(80) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    filters JSONB,
    format VARCHAR(20) NOT NULL DEFAULT 'json',
    options JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    file_path TEXT,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_export_tasks_user_id ON export_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_export_tasks_status ON export_tasks(status);

-- 引擎状态表
CREATE TABLE IF NOT EXISTS engine_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 引擎信息
    engine_name VARCHAR(50) NOT NULL,
    engine_type VARCHAR(20) NOT NULL CHECK (engine_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),
    version VARCHAR(20),

    -- 状态信息
    status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('healthy', 'degraded', 'down', 'maintenance', 'unknown')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,

    -- 性能指标
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    active_tests INTEGER DEFAULT 0,
    queue_length INTEGER DEFAULT 0,

    -- 配置
    max_concurrent_tests INTEGER DEFAULT 5,
    is_enabled BOOLEAN DEFAULT true,

    -- 错误信息
    last_error TEXT,
    error_count INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(engine_name, engine_type)
);

-- =====================================================
-- 7. 完整索引创建
-- =====================================================

-- 扩展功能表索引

CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_shared_by ON report_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_expires_at ON report_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_report_shares_is_active ON report_shares(is_active);

CREATE INDEX IF NOT EXISTS idx_report_access_logs_report_id ON report_access_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_user_id ON report_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_share_id ON report_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_accessed_at ON report_access_logs(accessed_at);

CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_public ON report_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_system ON report_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_report_templates_config_gin ON report_templates USING GIN (template_config);

CREATE INDEX IF NOT EXISTS idx_report_configs_template_id ON report_configs(template_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_user_id ON report_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_enabled ON report_configs(enabled);

CREATE INDEX IF NOT EXISTS idx_report_instances_report_id ON report_instances(report_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_config_id ON report_instances(config_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_status ON report_instances(status);
CREATE INDEX IF NOT EXISTS idx_report_instances_generated_at ON report_instances(generated_at);

CREATE INDEX IF NOT EXISTS idx_report_share_emails_report_id ON report_share_emails(report_id);
CREATE INDEX IF NOT EXISTS idx_report_share_emails_share_id ON report_share_emails(share_id);
CREATE INDEX IF NOT EXISTS idx_report_share_emails_status ON report_share_emails(status);
CREATE INDEX IF NOT EXISTS idx_report_share_emails_next_retry_at ON report_share_emails(next_retry_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_mimetype ON uploaded_files(mimetype);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_upload_date ON uploaded_files(upload_date DESC);

CREATE INDEX IF NOT EXISTS idx_system_stats_date ON system_stats(date);

CREATE INDEX IF NOT EXISTS idx_engine_status_engine_type ON engine_status(engine_type);
CREATE INDEX IF NOT EXISTS idx_engine_status_status ON engine_status(status);
CREATE INDEX IF NOT EXISTS idx_engine_status_is_enabled ON engine_status(is_enabled);

-- =====================================================
-- 8. 完整触发器创建
-- =====================================================

-- 为所有扩展表创建触发器
DROP TRIGGER IF EXISTS update_test_templates_updated_at ON test_templates;
CREATE TRIGGER update_test_templates_updated_at
    BEFORE UPDATE ON test_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_reports_updated_at ON test_reports;
CREATE TRIGGER update_test_reports_updated_at
    BEFORE UPDATE ON test_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_shares_updated_at ON report_shares;
CREATE TRIGGER update_report_shares_updated_at
    BEFORE UPDATE ON report_shares
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates;
CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_configs_updated_at ON report_configs;
CREATE TRIGGER update_report_configs_updated_at
    BEFORE UPDATE ON report_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_instances_updated_at ON report_instances;
CREATE TRIGGER update_report_instances_updated_at
    BEFORE UPDATE ON report_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_share_emails_updated_at ON report_share_emails;
CREATE TRIGGER update_report_share_emails_updated_at
    BEFORE UPDATE ON report_share_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_uploaded_files_updated_at ON uploaded_files;
CREATE TRIGGER update_uploaded_files_updated_at
    BEFORE UPDATE ON uploaded_files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. 扩展表的数据完整性约束
-- =====================================================

-- 确保用户测试统计的数据逻辑正确
DO $$
BEGIN
    IF to_regclass('public.user_test_stats') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conname = 'chk_user_stats_logic'
       ) THEN
        ALTER TABLE user_test_stats
            ADD CONSTRAINT chk_user_stats_logic
            CHECK (successful_tests + failed_tests <= total_tests);
    END IF;
END $$;

-- 确保监控站点的检查间隔合理
DO $$
BEGIN
    IF to_regclass('public.monitoring_sites') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conname = 'chk_monitoring_interval'
       ) THEN
        ALTER TABLE monitoring_sites
            ADD CONSTRAINT chk_monitoring_interval
            CHECK (check_interval >= 60 AND check_interval <= 86400); -- 1分钟到1天
    END IF;
END $$;

-- 确保文件大小合理
DO $$
BEGIN
    IF to_regclass('public.uploaded_files') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM pg_constraint
           WHERE conname = 'chk_file_size'
       ) THEN
        ALTER TABLE uploaded_files
            ADD CONSTRAINT chk_file_size
            CHECK (size > 0 AND size <= 1073741824); -- 最大1GB
    END IF;
END $$;

-- =====================================================
-- 10. 视图创建 - 便于查询的视图
-- =====================================================

-- 系统健康状态视图
CREATE OR REPLACE VIEW system_health_overview AS
SELECT
    'database' as component,
    'healthy' as status,
    NOW() as last_check,
    NULL as details
UNION ALL
SELECT
    CONCAT(engine_type, '_engine') as component,
    status,
    last_heartbeat as last_check,
    JSONB_BUILD_OBJECT(
        'active_tests', active_tests,
        'queue_length', queue_length,
        'cpu_usage', cpu_usage,
        'memory_usage', memory_usage
    ) as details
FROM engine_status
WHERE is_enabled = true;

-- =====================================================
-- 11. 初始化数据
-- =====================================================

-- 插入系统配置数据
INSERT INTO system_configs (config_key, config_value, description, category, is_public) VALUES
('app_name', '{"value": "Test Web Platform"}', '应用程序名称', 'general', true),
('app_version', '{"value": "2.0.0"}', '应用程序版本', 'general', true),
('max_concurrent_tests', '{"value": 10}', '最大并发测试数', 'performance', false),
('default_test_timeout', '{"value": 30000}', '默认测试超时时间(毫秒)', 'performance', false),
('enable_test_history', '{"value": true}', '启用测试历史记录', 'features', false),
('enable_user_registration', '{"value": true}', '启用用户注册', 'features', true),
('maintenance_mode', '{"value": false}', '维护模式', 'system', false)
ON CONFLICT (config_key) DO NOTHING;

-- 创建默认管理员用户 (用户名: admin, 密码: admin123)
INSERT INTO users (
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    status,
    email_verified,
    email_verified_at
) VALUES (
    'admin',
    'admin@testweb.com',
    '$2b$12$rQZ8kHWKQYXHjQQJQYXHjQQJQYXHjQQJQYXHjQQJQYXHjQQJQYXHjQ',
    'Admin',
    'User',
    'admin',
    'active',
    true,
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 插入默认权限
INSERT INTO permissions (id, name, description, resource, action, effect, conditions, metadata)
VALUES
  (gen_random_uuid(), 'user:read', '查看用户', 'user', 'read', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'user:write', '编辑用户', 'user', 'write', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'user:delete', '删除用户', 'user', 'delete', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'user:admin', '用户管理', 'user', 'admin', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'test:create', '创建测试', 'test', 'create', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'test:read', '查看测试', 'test', 'read', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'test:update', '编辑测试', 'test', 'update', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'test:delete', '删除测试', 'test', 'delete', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'test:execute', '执行测试', 'test', 'execute', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'test:admin', '测试管理', 'test', 'admin', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'monitoring:read', '查看监控', 'monitoring', 'read', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'monitoring:write', '配置监控', 'monitoring', 'write', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'monitoring:admin', '监控管理', 'monitoring', 'admin', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'system:config', '系统配置', 'system', 'config', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'system:logs', '系统日志', 'system', 'logs', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'system:admin', '系统管理', 'system', 'admin', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'data:export', '数据导出', 'data', 'export', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'data:import', '数据导入', 'data', 'import', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'data:backup', '数据备份', 'data', 'backup', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'data:admin', '数据管理', 'data', 'admin', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'report:read', '查看报告', 'report', 'read', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'report:create', '创建报告', 'report', 'create', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'report:admin', '报告管理', 'report', 'admin', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'integration:read', '查看集成', 'integration', 'read', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'integration:write', '配置集成', 'integration', 'write', 'allow', '[]', '{}'),
  (gen_random_uuid(), 'integration:admin', '集成管理', 'integration', 'admin', 'allow', '[]', '{}')
ON CONFLICT (name) DO NOTHING;

-- 插入默认角色
INSERT INTO roles (
  id, name, description, type, level, is_active, is_system, metadata,
  created_at, updated_at, created_by, updated_by
) VALUES
  (gen_random_uuid(), 'admin', '超级管理员', 'system', 10, true, true, '{}', NOW(), NOW(),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1)),
  (gen_random_uuid(), 'manager', '管理员', 'system', 7, true, true, '{}', NOW(), NOW(),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1)),
  (gen_random_uuid(), 'premium', '高级用户', 'system', 5, true, true, '{}', NOW(), NOW(),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1)),
  (gen_random_uuid(), 'user', '普通用户', 'system', 3, true, true, '{}', NOW(), NOW(),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1)),
  (gen_random_uuid(), 'viewer', '只读用户', 'system', 1, true, true, '{}', NOW(), NOW(),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
   (SELECT id FROM users WHERE username = 'admin' LIMIT 1))
ON CONFLICT (name) DO NOTHING;

-- 角色权限关联（admin 拥有全部权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'user:read','user:write','user:delete','user:admin',
  'test:create','test:read','test:update','test:delete','test:execute','test:admin',
  'monitoring:read','monitoring:write','monitoring:admin',
  'system:config','system:logs','system:admin',
  'data:export','data:import','data:backup','data:admin',
  'report:read','report:create','report:admin',
  'integration:read','integration:write','integration:admin'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- manager 权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'user:read','user:write',
  'test:create','test:read','test:update','test:delete','test:execute','test:admin',
  'monitoring:read','monitoring:write','monitoring:admin',
  'data:export','data:import','data:backup',
  'report:read','report:create','report:admin',
  'integration:read','integration:write'
)
WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- premium 权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'user:read',
  'test:create','test:read','test:update','test:delete','test:execute',
  'monitoring:read',
  'data:export',
  'report:read','report:create',
  'integration:read'
)
WHERE r.name = 'premium'
ON CONFLICT DO NOTHING;

-- user 权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'user:read',
  'test:create','test:read','test:update','test:execute',
  'monitoring:read',
  'data:export',
  'report:read'
)
WHERE r.name = 'user'
ON CONFLICT DO NOTHING;

-- viewer 权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
  'user:read',
  'test:read',
  'monitoring:read',
  'report:read'
)
WHERE r.name = 'viewer'
ON CONFLICT DO NOTHING;

-- 为默认管理员用户分配 admin 角色
INSERT INTO user_roles (id, user_id, role_id, assigned_by, assigned_at, is_active)
SELECT gen_random_uuid(), u.id, r.id, u.id, NOW(), true
FROM users u
JOIN roles r ON r.name = 'admin'
WHERE u.username = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 插入测试模板数据
INSERT INTO test_templates (
    template_name,
    description,
    engine_type,
    config,
    is_public,
    is_default
) VALUES
('基础网站测试', '检查网站基本功能和性能', 'website', '{"timeout": 30000, "checks": ["accessibility", "performance", "seo"]}', true, true),
('API接口测试', '测试API接口的可用性和性能', 'api', '{"timeout": 10000, "methods": ["GET", "POST"], "headers": {}}', true, true),
('安全扫描测试', '检查网站安全漏洞', 'security', '{"depth": "basic", "checks": ["ssl", "headers", "vulnerabilities"]}', true, true),
('SEO优化检查', '检查网站SEO优化情况', 'seo', '{"checks": ["meta", "structure", "performance", "mobile"]}', true, true)
ON CONFLICT (template_name) DO NOTHING;

-- 完成提示
SELECT 'Database schema updated successfully! Added target_url and results fields, initialized basic data.' as message;