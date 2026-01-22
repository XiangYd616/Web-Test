-- =====================================================
-- 统一测试平台初始数据
-- 版本: 1.0 - 完整统一版
-- 创建时间: 2025-01-13
-- 描述: 为8个统一测试工具创建初始数据
-- =====================================================

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('supported_test_types', '["api", "compatibility", "infrastructure", "security", "seo", "stress", "ux", "website"]', '支持的测试类型列表'),
('max_concurrent_tests', '5', '最大并发测试数量'),
('default_test_timeout', '300000', '默认测试超时时间（毫秒）'),
('enable_test_history', 'true', '是否启用测试历史记录'),
('enable_user_registration', 'true', '是否允许用户注册'),
('site_name', '"统一测试平台"', '网站名称'),
('site_description', '"支持8种测试工具的统一测试平台"', '网站描述'),
('admin_email', '"admin@testplatform.com"', '管理员邮箱'),
('maintenance_mode', 'false', '维护模式开关')
ON CONFLICT (config_key) DO UPDATE SET 
config_value = EXCLUDED.config_value,
updated_at = NOW();

-- 创建默认用户
DO $$
DECLARE
    admin_user_id UUID;
    test_user_id UUID;
BEGIN
    -- 创建管理员用户
    INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
    ('admin', 'admin@testplatform.com', '$2b$10$rOzJqQZJqQZJqQZJqQZJqO', '系统', '管理员', 'admin', 'active', TRUE)
    ON CONFLICT (username) DO NOTHING
    RETURNING id INTO admin_user_id;
    
    -- 如果管理员用户已存在，获取其ID
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    END IF;
    
    -- 创建测试用户
    INSERT INTO users (username, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
    ('testuser', 'user@testplatform.com', '$2b$10$rOzJqQZJqQZJqQZJqQZJqO', '测试', '用户', 'user', 'active', TRUE)
    ON CONFLICT (username) DO NOTHING
    RETURNING id INTO test_user_id;
    
    -- 如果测试用户已存在，获取其ID
    IF test_user_id IS NULL THEN
        SELECT id INTO test_user_id FROM users WHERE username = 'testuser';
    END IF;
    
    -- 为所有用户创建测试统计记录
    INSERT INTO user_test_stats (user_id, test_type, total_tests, successful_tests) VALUES
    (admin_user_id, 'api', 0, 0),
    (admin_user_id, 'compatibility', 0, 0),
    (admin_user_id, 'infrastructure', 0, 0),
    (admin_user_id, 'security', 0, 0),
    (admin_user_id, 'seo', 0, 0),
    (admin_user_id, 'stress', 0, 0),
    (admin_user_id, 'ux', 0, 0),
    (admin_user_id, 'website', 0, 0),
    (test_user_id, 'api', 0, 0),
    (test_user_id, 'compatibility', 0, 0),
    (test_user_id, 'infrastructure', 0, 0),
    (test_user_id, 'security', 0, 0),
    (test_user_id, 'seo', 0, 0),
    (test_user_id, 'stress', 0, 0),
    (test_user_id, 'ux', 0, 0),
    (test_user_id, 'website', 0, 0)
    ON CONFLICT (user_id, test_type) DO UPDATE SET
    total_tests = EXCLUDED.total_tests,
    successful_tests = EXCLUDED.successful_tests;

END $$;

-- 插入系统日志示例
INSERT INTO system_logs (level, message, context) VALUES
('info', '数据库初始化完成', '{"component": "database", "action": "initialize"}'),
('info', '支持的测试类型已配置', '{"test_types": ["api", "compatibility", "infrastructure", "security", "seo", "stress", "ux", "website"]}')
ON CONFLICT DO NOTHING;

-- 插入引擎状态初始数据
INSERT INTO engine_status (engine_name, engine_type, version, status, max_concurrent_tests, is_enabled) VALUES
('api-engine-1', 'api', '1.0.0', 'healthy', 10, true),
('compatibility-engine-1', 'compatibility', '1.0.0', 'healthy', 5, true),
('infrastructure-engine-1', 'infrastructure', '1.0.0', 'healthy', 8, true),
('security-engine-1', 'security', '1.0.0', 'healthy', 6, true),
('seo-engine-1', 'seo', '1.0.0', 'healthy', 12, true),
('stress-engine-1', 'stress', '1.0.0', 'healthy', 3, true),
('ux-engine-1', 'ux', '1.0.0', 'healthy', 7, true),
('website-engine-1', 'website', '1.0.0', 'healthy', 10, true)
ON CONFLICT (engine_name, engine_type) DO UPDATE SET
version = EXCLUDED.version,
status = EXCLUDED.status,
max_concurrent_tests = EXCLUDED.max_concurrent_tests,
is_enabled = EXCLUDED.is_enabled,
updated_at = NOW();

-- 插入今日系统统计初始数据
INSERT INTO system_stats (
    date, total_users, active_users, new_users,
    total_tests, successful_tests, failed_tests,
    api_tests, compatibility_tests, infrastructure_tests, security_tests,
    seo_tests, stress_tests, ux_tests, website_tests
) VALUES (
    CURRENT_DATE, 2, 0, 2,
    0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0
) ON CONFLICT (date) DO UPDATE SET
total_users = EXCLUDED.total_users,
new_users = EXCLUDED.new_users;

-- 记录初始化完成
INSERT INTO schema_migrations (version, description) VALUES
('001_initial_schema', '初始数据库架构和数据'),
('002_complete_setup', '完整的统一测试平台设置')
ON CONFLICT (version) DO NOTHING;
