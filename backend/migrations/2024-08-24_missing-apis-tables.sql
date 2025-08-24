-- 缺失API支持表结构
-- 为新实现的API端点创建必要的数据库表

-- 1. 告警相关表
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledgment_message TEXT,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    resolution TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- 2. 告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 导出任务表
CREATE TABLE IF NOT EXISTS export_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    filters JSONB,
    format VARCHAR(20) NOT NULL DEFAULT 'csv',
    options JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    file_path TEXT,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_export_tasks_user_id ON export_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_export_tasks_status ON export_tasks(status);

-- 4. 监控任务表
CREATE TABLE IF NOT EXISTS monitoring_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    targets JSONB NOT NULL,
    config JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    stopped_at TIMESTAMP
);

-- 5. 监控目标表
CREATE TABLE IF NOT EXISTS monitoring_targets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_targets_user_id ON monitoring_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_targets_status ON monitoring_targets(status);

-- 6. 监控检查记录表
CREATE TABLE IF NOT EXISTS monitoring_checks (
    id SERIAL PRIMARY KEY,
    target_id INTEGER NOT NULL REFERENCES monitoring_targets(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    response_time INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_checks_target_id ON monitoring_checks(target_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_checks_checked_at ON monitoring_checks(checked_at);

-- 7. 监控告警表
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    target_id INTEGER REFERENCES monitoring_targets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    resolution TEXT
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_user_id ON monitoring_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);

-- 8. 测试配置表
CREATE TABLE IF NOT EXISTS test_configurations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_configurations_user_id ON test_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_test_configurations_test_type ON test_configurations(test_type);

-- 9. 用户通知表
CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    data JSONB,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_at ON user_notifications(read_at);

-- 10. 权限表（如果不存在）
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. 角色表（如果不存在）
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 12. 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 13. 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- 14. 引擎状态表
CREATE TABLE IF NOT EXISTS engine_status (
    id SERIAL PRIMARY KEY,
    engine_type VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    last_heartbeat TIMESTAMP,
    active_tests INTEGER DEFAULT 0,
    total_tests_today INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 插入默认的引擎状态记录
INSERT INTO engine_status (engine_type, status) VALUES 
    ('stress', 'active'),
    ('performance', 'active'),
    ('security', 'active'),
    ('api', 'active'),
    ('compatibility', 'active')
ON CONFLICT (engine_type) DO NOTHING;

-- 插入默认角色
INSERT INTO roles (name, description) VALUES 
    ('admin', '管理员角色'),
    ('user', '普通用户角色'),
    ('viewer', '只读用户角色')
ON CONFLICT (name) DO NOTHING;

-- 插入默认权限
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('test.create', '创建测试', 'test', 'create'),
    ('test.read', '查看测试', 'test', 'read'),
    ('test.update', '更新测试', 'test', 'update'),
    ('test.delete', '删除测试', 'test', 'delete'),
    ('admin.users', '管理用户', 'user', 'manage'),
    ('admin.system', '系统管理', 'system', 'manage'),
    ('monitoring.create', '创建监控', 'monitoring', 'create'),
    ('monitoring.read', '查看监控', 'monitoring', 'read'),
    ('monitoring.update', '更新监控', 'monitoring', 'update'),
    ('monitoring.delete', '删除监控', 'monitoring', 'delete')
ON CONFLICT (name) DO NOTHING;

-- 为管理员角色分配所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为普通用户角色分配基本权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN ('test.create', 'test.read', 'test.update', 'test.delete', 'monitoring.create', 'monitoring.read', 'monitoring.update', 'monitoring.delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为只读用户角色分配查看权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.name IN ('test.read', 'monitoring.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为现有用户分配默认角色（如果没有角色）
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE r.name = 'user' 
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 添加一些索引以提高性能
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- 更新现有的test_records表，添加缺失的字段（如果不存在）
DO $$ 
BEGIN
    -- 添加cancelled_at字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_records' AND column_name = 'cancelled_at') THEN
        ALTER TABLE test_records ADD COLUMN cancelled_at TIMESTAMP;
    END IF;
    
    -- 添加error_message字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_records' AND column_name = 'error_message') THEN
        ALTER TABLE test_records ADD COLUMN error_message TEXT;
    END IF;
    
    -- 添加results字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_records' AND column_name = 'results') THEN
        ALTER TABLE test_records ADD COLUMN results JSONB;
    END IF;
END $$;

-- 更新现有的users表，添加缺失的字段（如果不存在）
DO $$ 
BEGIN
    -- 添加profile_data字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_data') THEN
        ALTER TABLE users ADD COLUMN profile_data JSONB;
    END IF;
    
    -- 添加last_login_at字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
    END IF;
END $$;
