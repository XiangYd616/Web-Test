-- 测试平台初始数据
-- 插入系统配置和示例数据

-- 系统配置数据
INSERT INTO system_configurations (config_key, config_value, description) VALUES
('app_name', '"测试平台"', '应用程序名称'),
('app_version', '"1.0.0"', '应用程序版本'),
('max_concurrent_tests', '10', '最大并发测试数量'),
('test_timeout_seconds', '300', '测试超时时间（秒）'),
('max_file_upload_size', '10485760', '最大文件上传大小（字节）'),
('supported_browsers', '["chrome", "firefox", "safari", "edge"]', '支持的浏览器列表'),
('default_test_location', '"global"', '默认测试位置'),
('enable_email_notifications', 'true', '启用邮件通知'),
('enable_webhook_notifications', 'false', '启用Webhook通知'),
('rate_limit_per_minute', '100', '每分钟请求限制'),
('free_tier_daily_tests', '50', '免费用户每日测试限制'),
('premium_tier_daily_tests', '500', '高级用户每日测试限制'),
('enterprise_tier_daily_tests', '5000', '企业用户每日测试限制');

-- 测试配置模板
INSERT INTO test_configurations (user_id, test_type, name, configuration, is_template) VALUES
(NULL, 'performance', '基础性能测试', '{
  "device": "desktop",
  "network_condition": "4g",
  "lighthouse_config": {
    "performance": true,
    "accessibility": false,
    "best_practices": false,
    "seo": false
  },
  "custom_metrics": []
}', true),

(NULL, 'performance', '移动端性能测试', '{
  "device": "mobile",
  "network_condition": "3g",
  "lighthouse_config": {
    "performance": true,
    "accessibility": true,
    "best_practices": true,
    "seo": true
  },
  "custom_metrics": ["first-contentful-paint", "largest-contentful-paint"]
}', true),

(NULL, 'security', '基础安全扫描', '{
  "scan_depth": "basic",
  "include_ssl": true,
  "include_headers": true,
  "include_vulnerabilities": true,
  "custom_checks": []
}', true),

(NULL, 'security', '全面安全审计', '{
  "scan_depth": "comprehensive",
  "include_ssl": true,
  "include_headers": true,
  "include_vulnerabilities": true,
  "include_content_security": true,
  "include_mixed_content": true,
  "custom_checks": ["xss", "sql_injection", "csrf"]
}', true),

(NULL, 'api', 'REST API测试', '{
  "timeout": 30000,
  "retry_count": 3,
  "parallel_requests": 5,
  "authentication": {
    "type": "none"
  },
  "assertions": [
    {"type": "status_code", "expected": 200},
    {"type": "response_time", "max": 2000}
  ]
}', true),

(NULL, 'stress', '基础压力测试', '{
  "concurrent_users": 10,
  "duration_seconds": 60,
  "ramp_up_time": 10,
  "test_scenarios": [
    {
      "name": "页面访问",
      "requests": [
        {"method": "GET", "path": "/", "weight": 100}
      ]
    }
  ]
}', true),

(NULL, 'stress', '高负载压力测试', '{
  "concurrent_users": 100,
  "duration_seconds": 300,
  "ramp_up_time": 60,
  "test_scenarios": [
    {
      "name": "用户浏览",
      "requests": [
        {"method": "GET", "path": "/", "weight": 40},
        {"method": "GET", "path": "/products", "weight": 30},
        {"method": "GET", "path": "/about", "weight": 20},
        {"method": "POST", "path": "/api/search", "weight": 10}
      ]
    }
  ]
}', true),

(NULL, 'seo', '基础SEO检查', '{
  "depth": "page",
  "include_technical": true,
  "include_content": true,
  "include_performance": false,
  "competitor_urls": []
}', true),

(NULL, 'seo', '全站SEO审计', '{
  "depth": "site",
  "include_technical": true,
  "include_content": true,
  "include_performance": true,
  "include_mobile": true,
  "competitor_urls": [],
  "crawl_limit": 100
}', true),

(NULL, 'compatibility', '主流浏览器兼容性', '{
  "browsers": ["chrome", "firefox", "safari", "edge"],
  "devices": ["desktop", "mobile"],
  "features_to_test": ["css-grid", "flexbox", "es6-modules", "fetch-api"],
  "screenshot_comparison": true,
  "viewport_sizes": [
    {"width": 1920, "height": 1080},
    {"width": 375, "height": 667}
  ]
}', true),

(NULL, 'ux', '可访问性检查', '{
  "accessibility_level": "AA",
  "include_usability": true,
  "include_mobile": true,
  "custom_checks": [
    "color_contrast",
    "keyboard_navigation",
    "screen_reader",
    "form_labels"
  ]
}', true);

-- 示例用户数据（仅用于开发环境）
-- 注意：生产环境中应该删除这些示例用户
INSERT INTO users (username, email, password_hash, role, subscription_type) VALUES
('demo_user', 'demo@example.com', '$2b$10$example_hash_for_demo_user', 'user', 'free'),
('premium_user', 'premium@example.com', '$2b$10$example_hash_for_premium_user', 'user', 'premium'),
('test_admin', 'admin@example.com', '$2b$10$example_hash_for_admin_user', 'admin', 'enterprise');

-- 示例项目数据
INSERT INTO test_projects (user_id, name, description, target_url) VALUES
(1, '示例网站项目', '用于演示的示例项目', 'https://example.com'),
(1, '个人博客测试', '个人博客的性能和SEO测试', 'https://myblog.example.com'),
(2, '电商网站优化', '电商网站的全面测试和优化', 'https://shop.example.com');

-- 用户统计初始化
INSERT INTO user_statistics (user_id, test_type, tests_run_count, total_test_duration_seconds) VALUES
(1, 'performance', 0, 0),
(1, 'security', 0, 0),
(1, 'api', 0, 0),
(1, 'stress', 0, 0),
(1, 'seo', 0, 0),
(1, 'compatibility', 0, 0),
(1, 'ux', 0, 0),
(1, 'infrastructure', 0, 0),
(2, 'performance', 0, 0),
(2, 'security', 0, 0),
(2, 'api', 0, 0),
(2, 'stress', 0, 0),
(2, 'seo', 0, 0),
(2, 'compatibility', 0, 0),
(2, 'ux', 0, 0),
(2, 'infrastructure', 0, 0),
(3, 'performance', 0, 0),
(3, 'security', 0, 0),
(3, 'api', 0, 0),
(3, 'stress', 0, 0),
(3, 'seo', 0, 0),
(3, 'compatibility', 0, 0),
(3, 'ux', 0, 0),
(3, 'infrastructure', 0, 0);

-- 创建数据库函数：更新用户统计
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 当测试执行完成时更新用户统计
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO user_statistics (user_id, test_type, tests_run_count, total_test_duration_seconds, last_test_date)
        VALUES (NEW.user_id, NEW.test_type, 1, COALESCE(NEW.duration_seconds, 0), NEW.completed_at)
        ON CONFLICT (user_id, test_type)
        DO UPDATE SET
            tests_run_count = user_statistics.tests_run_count + 1,
            total_test_duration_seconds = user_statistics.total_test_duration_seconds + COALESCE(NEW.duration_seconds, 0),
            last_test_date = NEW.completed_at,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_user_statistics
    AFTER UPDATE ON test_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_statistics();

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_test_executions_user_test_type ON test_executions(user_id, test_type);
CREATE INDEX IF NOT EXISTS idx_test_executions_completed_at ON test_executions(completed_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_user_statistics_last_test_date ON user_statistics(last_test_date);

-- 插入完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 初始数据插入完成！';
    RAISE NOTICE '📊 已创建 % 个配置模板', (SELECT COUNT(*) FROM test_configurations WHERE is_template = true);
    RAISE NOTICE '👥 已创建 % 个示例用户', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '📁 已创建 % 个示例项目', (SELECT COUNT(*) FROM test_projects);
    RAISE NOTICE '⚙️  已创建 % 个系统配置', (SELECT COUNT(*) FROM system_configurations);
END $$;
