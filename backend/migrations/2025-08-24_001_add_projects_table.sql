-- Deprecated / Merged into data/schema.sql as baseline
-- Do NOT execute in production after 2026-01
-- Last reviewed: 2026-01

-- Migration: Add Projects Management Table
-- Created: 2025-08-24T00:00:00.000Z
-- Description: 添加项目管理功能，支持API规范中的项目管理接口

/* 已合并到 data/schema.sql，迁移保留作为历史记录。

-- 创建项目表
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 项目基本信息
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_url TEXT,
  
  -- 项目状态和配置
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived', 'deleted')),
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- 统计信息
  test_count INTEGER DEFAULT 0,
  last_test_at TIMESTAMP,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);

-- 为projects表的JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_projects_settings_gin ON projects USING GIN (settings);
CREATE INDEX IF NOT EXISTS idx_projects_metadata_gin ON projects USING GIN (metadata);

-- 更新tests表，添加project_id外键
ALTER TABLE tests ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 为tests表的project_id创建索引
CREATE INDEX IF NOT EXISTS idx_tests_project_id ON tests(project_id);
CREATE INDEX IF NOT EXISTS idx_tests_project_status ON tests(project_id, status);

-- 更新config_templates表，添加project_id外键
ALTER TABLE config_templates ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 为config_templates表的project_id创建索引
CREATE INDEX IF NOT EXISTS idx_config_templates_project_id ON config_templates(project_id);

-- 创建项目成员表（支持项目协作）
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 成员角色和权限
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '[]',
  
  -- 邀请状态
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 确保用户在项目中唯一
  UNIQUE(project_id, user_id)
);

-- 创建项目成员表索引
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON project_members(status);

-- 为project_members表的JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_project_members_permissions_gin ON project_members USING GIN (permissions);

-- 创建项目活动日志表
CREATE TABLE IF NOT EXISTS project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 活动信息
  activity_type VARCHAR(50) NOT NULL,
  activity_description TEXT,
  details JSONB DEFAULT '{}',
  
  -- 关联资源
  resource_type VARCHAR(50), -- 'test', 'config', 'member', 'project'
  resource_id UUID,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建项目活动日志索引
CREATE INDEX IF NOT EXISTS idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_user_id ON project_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_type ON project_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_project_activities_created_at ON project_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_project_activities_project_time ON project_activities(project_id, created_at);

-- 为project_activities表的JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_project_activities_details_gin ON project_activities USING GIN (details);

-- 插入示例项目数据（如果users表中有数据）
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- 查找admin用户
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin' LIMIT 1;
    
    -- 如果找到admin用户，创建示例项目
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO projects (id, user_id, name, description, target_url, settings, metadata)
        VALUES 
        (
            gen_random_uuid(),
            admin_user_id,
            '示例项目',
            '这是一个用于演示的示例项目',
            'https://www.example.com',
            '{"notifications": true, "auto_test": false}',
            '{"tags": ["demo", "example"], "priority": "normal"}'
        ),
        (
            gen_random_uuid(),
            admin_user_id,
            'Google性能测试',
            'Google网站的性能监控项目',
            'https://www.google.com',
            '{"notifications": true, "auto_test": true, "test_frequency": "daily"}',
            '{"tags": ["performance", "monitoring"], "priority": "high"}'
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 创建触发器函数，自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为projects表创建更新触发器
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为project_members表创建更新触发器
DROP TRIGGER IF EXISTS update_project_members_updated_at ON project_members;
CREATE TRIGGER update_project_members_updated_at
    BEFORE UPDATE ON project_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：获取用户在项目中的角色
CREATE OR REPLACE FUNCTION get_user_project_role(p_user_id UUID, p_project_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    user_role VARCHAR(20);
    project_owner UUID;
BEGIN
    -- 检查用户是否是项目所有者
    SELECT user_id INTO project_owner FROM projects WHERE id = p_project_id;
    IF project_owner = p_user_id THEN
        RETURN 'owner';
    END IF;
    
    -- 检查用户在项目成员表中的角色
    SELECT role INTO user_role 
    FROM project_members 
    WHERE project_id = p_project_id AND user_id = p_user_id AND status = 'active';
    
    RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql;

-- 创建函数：检查用户是否有项目访问权限
CREATE OR REPLACE FUNCTION check_project_access(p_user_id UUID, p_project_id UUID, p_required_role VARCHAR(20) DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(20);
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    user_role := get_user_project_role(p_user_id, p_project_id);
    
    -- 定义角色层级
    role_hierarchy := CASE user_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    required_hierarchy := CASE p_required_role
        WHEN 'owner' THEN 4
        WHEN 'admin' THEN 3
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE projects IS '项目管理表，支持多用户协作的测试项目管理';
COMMENT ON TABLE project_members IS '项目成员表，管理项目的协作用户和权限';
COMMENT ON TABLE project_activities IS '项目活动日志表，记录项目中的所有操作活动';

COMMENT ON COLUMN projects.settings IS '项目设置，包括通知、自动测试等配置';
COMMENT ON COLUMN projects.metadata IS '项目元数据，包括标签、优先级等信息';
COMMENT ON COLUMN project_members.permissions IS '成员权限列表，JSON数组格式';
COMMENT ON COLUMN project_activities.details IS '活动详细信息，JSON格式存储';

-- 验证迁移结果
DO $$
BEGIN
    -- 检查表是否创建成功
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        RAISE NOTICE '✅ projects表创建成功';
    ELSE
        RAISE EXCEPTION '❌ projects表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_members') THEN
        RAISE NOTICE '✅ project_members表创建成功';
    ELSE
        RAISE EXCEPTION '❌ project_members表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_activities') THEN
        RAISE NOTICE '✅ project_activities表创建成功';
    ELSE
        RAISE EXCEPTION '❌ project_activities表创建失败';
    END IF;
    
    -- 检查外键是否添加成功
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tests' AND column_name = 'project_id') THEN
        RAISE NOTICE '✅ tests表project_id字段添加成功';
    ELSE
        RAISE EXCEPTION '❌ tests表project_id字段添加失败';
    END IF;
    
    RAISE NOTICE '🎉 项目管理功能迁移完成！';
END $$;
*/
