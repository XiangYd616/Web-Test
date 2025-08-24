-- Migration: Add Test Reports Management Table
-- Created: 2025-08-24T00:00:00.000Z
-- Description: 添加测试报告生成和管理功能，支持API规范中的报告接口

-- 创建测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- 报告基本信息
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- 报告类型和格式
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('comprehensive', 'performance', 'security', 'comparison', 'trend', 'summary')),
  format VARCHAR(20) DEFAULT 'html' CHECK (format IN ('html', 'pdf', 'json', 'csv', 'xlsx')),
  
  -- 报告内容配置
  test_ids JSONB NOT NULL, -- 包含的测试ID列表
  configuration JSONB DEFAULT '{}', -- 报告生成配置
  filters JSONB DEFAULT '{}', -- 数据过滤条件
  
  -- 报告状态和文件信息
  status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'expired', 'cancelled')),
  file_path TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_hash VARCHAR(64),
  
  -- 报告设置
  is_public BOOLEAN DEFAULT false,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_config JSONB DEFAULT '{}',
  
  -- 时间管理
  generated_at TIMESTAMP,
  expires_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  
  -- 错误信息
  error_message TEXT,
  error_details JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建报告表索引
CREATE INDEX IF NOT EXISTS idx_test_reports_user_id ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_project_id ON test_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_status ON test_reports(status);
CREATE INDEX IF NOT EXISTS idx_test_reports_type ON test_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_test_reports_format ON test_reports(format);
CREATE INDEX IF NOT EXISTS idx_test_reports_created_at ON test_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_test_reports_generated_at ON test_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_test_reports_expires_at ON test_reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_test_reports_user_status ON test_reports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_test_reports_project_status ON test_reports(project_id, status);

-- 为test_reports表的JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_test_reports_test_ids_gin ON test_reports USING GIN (test_ids);
CREATE INDEX IF NOT EXISTS idx_test_reports_configuration_gin ON test_reports USING GIN (configuration);
CREATE INDEX IF NOT EXISTS idx_test_reports_filters_gin ON test_reports USING GIN (filters);
CREATE INDEX IF NOT EXISTS idx_test_reports_schedule_config_gin ON test_reports USING GIN (schedule_config);

-- 创建报告分享表
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 分享配置
  share_token VARCHAR(255) UNIQUE NOT NULL,
  share_type VARCHAR(20) DEFAULT 'link' CHECK (share_type IN ('link', 'email', 'download')),
  
  -- 访问控制
  password_hash VARCHAR(255),
  allowed_ips JSONB DEFAULT '[]',
  max_access_count INTEGER,
  current_access_count INTEGER DEFAULT 0,
  
  -- 权限设置
  permissions JSONB DEFAULT '["view"]', -- ["view", "download", "comment"]
  
  -- 时间控制
  expires_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建报告分享表索引
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_shared_by ON report_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_expires_at ON report_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_report_shares_is_active ON report_shares(is_active);

-- 创建报告访问日志表
CREATE TABLE IF NOT EXISTS report_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  share_id UUID REFERENCES report_shares(id) ON DELETE SET NULL,
  
  -- 访问信息
  access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('view', 'download', 'share', 'generate')),
  ip_address INET,
  user_agent TEXT,
  
  -- 访问结果
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- 时间戳
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建报告访问日志索引
CREATE INDEX IF NOT EXISTS idx_report_access_logs_report_id ON report_access_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_user_id ON report_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_share_id ON report_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_accessed_at ON report_access_logs(accessed_at);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_report_time ON report_access_logs(report_id, accessed_at);

-- 创建报告模板表
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 模板信息
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- 模板配置
  report_type VARCHAR(50) NOT NULL,
  template_config JSONB NOT NULL,
  default_format VARCHAR(20) DEFAULT 'html',
  
  -- 模板设置
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建报告模板表索引
CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON report_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_public ON report_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_report_templates_is_system ON report_templates(is_system);

-- 为report_templates表的JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_report_templates_config_gin ON report_templates USING GIN (template_config);

-- 创建触发器，自动更新updated_at字段
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

-- 创建函数：生成报告分享令牌
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- 创建函数：检查报告访问权限
CREATE OR REPLACE FUNCTION check_report_access(p_user_id UUID, p_report_id UUID, p_access_type VARCHAR(20) DEFAULT 'view')
RETURNS BOOLEAN AS $$
DECLARE
    report_user_id UUID;
    report_project_id UUID;
    has_access BOOLEAN := false;
BEGIN
    -- 获取报告信息
    SELECT user_id, project_id INTO report_user_id, report_project_id
    FROM test_reports WHERE id = p_report_id;
    
    -- 检查是否是报告所有者
    IF report_user_id = p_user_id THEN
        RETURN true;
    END IF;
    
    -- 检查是否是公开报告
    IF EXISTS (SELECT 1 FROM test_reports WHERE id = p_report_id AND is_public = true) THEN
        RETURN true;
    END IF;
    
    -- 检查项目访问权限
    IF report_project_id IS NOT NULL THEN
        has_access := check_project_access(p_user_id, report_project_id, 'viewer');
        IF has_access THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：清理过期报告
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除过期的报告文件记录
    UPDATE test_reports 
    SET status = 'expired', file_path = NULL, file_size = NULL
    WHERE expires_at < CURRENT_TIMESTAMP AND status = 'completed';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 删除过期的分享链接
    UPDATE report_shares 
    SET is_active = false
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = true;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 插入系统默认报告模板
INSERT INTO report_templates (id, name, description, report_type, template_config, is_system, is_public)
VALUES 
(
    gen_random_uuid(),
    '综合测试报告',
    '包含所有测试类型的综合报告模板',
    'comprehensive',
    '{
        "sections": ["summary", "performance", "security", "seo", "accessibility"],
        "charts": ["trend", "comparison", "distribution"],
        "include_recommendations": true,
        "include_raw_data": false
    }',
    true,
    true
),
(
    gen_random_uuid(),
    '性能测试报告',
    '专注于性能指标的报告模板',
    'performance',
    '{
        "sections": ["performance_summary", "core_web_vitals", "resource_analysis"],
        "charts": ["performance_trend", "metrics_comparison"],
        "include_lighthouse_data": true,
        "include_recommendations": true
    }',
    true,
    true
),
(
    gen_random_uuid(),
    '安全测试报告',
    '专注于安全检查的报告模板',
    'security',
    '{
        "sections": ["security_summary", "vulnerabilities", "ssl_analysis", "headers_check"],
        "charts": ["vulnerability_distribution", "security_score_trend"],
        "include_remediation": true,
        "severity_filter": "all"
    }',
    true,
    true
)
ON CONFLICT DO NOTHING;

-- 添加注释
COMMENT ON TABLE test_reports IS '测试报告表，管理生成的测试报告文件和元数据';
COMMENT ON TABLE report_shares IS '报告分享表，管理报告的分享链接和访问控制';
COMMENT ON TABLE report_access_logs IS '报告访问日志表，记录报告的访问历史';
COMMENT ON TABLE report_templates IS '报告模板表，存储报告生成的模板配置';

COMMENT ON COLUMN test_reports.test_ids IS '包含的测试ID列表，JSON数组格式';
COMMENT ON COLUMN test_reports.configuration IS '报告生成配置，包括样式、内容等设置';
COMMENT ON COLUMN test_reports.filters IS '数据过滤条件，用于筛选测试结果';
COMMENT ON COLUMN report_shares.permissions IS '分享权限列表，如["view", "download"]';
COMMENT ON COLUMN report_templates.template_config IS '模板配置，定义报告的结构和样式';

-- 验证迁移结果
DO $$
BEGIN
    -- 检查表是否创建成功
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_reports') THEN
        RAISE NOTICE '✅ test_reports表创建成功';
    ELSE
        RAISE EXCEPTION '❌ test_reports表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_shares') THEN
        RAISE NOTICE '✅ report_shares表创建成功';
    ELSE
        RAISE EXCEPTION '❌ report_shares表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_access_logs') THEN
        RAISE NOTICE '✅ report_access_logs表创建成功';
    ELSE
        RAISE EXCEPTION '❌ report_access_logs表创建失败';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_templates') THEN
        RAISE NOTICE '✅ report_templates表创建成功';
    ELSE
        RAISE EXCEPTION '❌ report_templates表创建失败';
    END IF;
    
    -- 检查默认模板是否插入成功
    IF (SELECT COUNT(*) FROM report_templates WHERE is_system = true) >= 3 THEN
        RAISE NOTICE '✅ 默认报告模板插入成功';
    ELSE
        RAISE NOTICE '⚠️ 默认报告模板插入可能不完整';
    END IF;
    
    RAISE NOTICE '🎉 报告管理功能迁移完成！';
END $$;
