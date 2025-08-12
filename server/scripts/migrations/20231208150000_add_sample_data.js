/**
 * Migration: add_sample_data
 * Created: 2023-12-08T15:00:00.000Z
 * Description: 添加示例数据，让数据库更加完整
 */

module.exports = {
  /**
   * 执行迁移 - 添加示例数据
   * @param {Pool} pool - 数据库连接池
   */
  async up(pool) {
    console.log('🔄 开始添加示例数据...');

    try {
      // 1. 添加系统通知
      await pool.query(`
        INSERT INTO system_notifications (title, message, type, priority, is_active, target_users, target_roles)
        VALUES 
        ('欢迎使用测试平台', '欢迎使用我们的网站测试平台！您可以开始进行SEO、性能、安全等各种测试。', 'success', 'normal', true, '[]', '[]'),
        ('系统维护通知', '系统将在每周日凌晨2:00-4:00进行例行维护，期间可能会有短暂的服务中断。', 'info', 'normal', true, '[]', '[]'),
        ('新功能上线', '我们新增了压力测试功能，现在您可以测试网站在高并发情况下的表现。', 'info', 'high', true, '[]', '[]')
        ON CONFLICT DO NOTHING
      `);
      console.log('✅ 系统通知数据已添加');

      // 2. 添加测试模板
      const adminUser = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@testweb.com']);
      if (adminUser.rows.length > 0) {
        const adminId = adminUser.rows[0].id;

        await pool.query(`
          INSERT INTO test_templates (user_id, name, description, test_type, config, is_public, category, tags)
          VALUES 
          ($1, 'SEO基础检查', '检查网站的基本SEO要素，包括标题、描述、关键词等', 'seo', 
           '{"checkTitle": true, "checkDescription": true, "checkKeywords": true, "checkHeadings": true}', 
           true, 'SEO', '["基础", "SEO", "标准"]'),
          ($1, '性能快速测试', '快速检查网站的加载速度和Core Web Vitals指标', 'performance', 
           '{"timeout": 30, "device": "desktop", "throttling": "none"}', 
           true, '性能', '["性能", "速度", "快速"]'),
          ($1, '安全基础扫描', '检查网站的基本安全配置，包括HTTPS、安全头等', 'security', 
           '{"checkSSL": true, "checkHeaders": true, "checkCookies": true}', 
           true, '安全', '["安全", "基础", "扫描"]'),
          ($1, 'API健康检查', '检查API端点的可用性和响应时间', 'api', 
           '{"endpoints": [], "timeout": 10, "retries": 3}', 
           true, 'API', '["API", "健康检查", "监控"]')
          ON CONFLICT DO NOTHING
        `, [adminId]);
        console.log('✅ 测试模板数据已添加');

        // 3. 添加用户偏好设置
        await pool.query(`
          INSERT INTO user_preferences (user_id, theme, language, timezone, notifications, auto_save, default_test_timeout)
          VALUES ($1, 'light', 'zh-CN', 'Asia/Shanghai', 
                  '{"email": true, "browser": true, "sms": false}', true, 30)
          ON CONFLICT (user_id) DO NOTHING
        `, [adminId]);
        console.log('✅ 用户偏好设置已添加');

        // 4. 添加测试标签
        await pool.query(`
          INSERT INTO test_tags (user_id, name, color, description)
          VALUES 
          ($1, '重要', '#EF4444', '标记重要的测试结果'),
          ($1, '生产环境', '#F59E0B', '生产环境相关的测试'),
          ($1, '开发环境', '#10B981', '开发环境相关的测试'),
          ($1, '性能优化', '#3B82F6', '需要性能优化的项目'),
          ($1, '安全问题', '#DC2626', '发现安全问题的测试'),
          ($1, 'SEO优化', '#8B5CF6', 'SEO相关的优化建议')
          ON CONFLICT (user_id, name) DO NOTHING
        `, [adminId]);
        console.log('✅ 测试标签数据已添加');

        // 5. 添加用户收藏
        await pool.query(`
          INSERT INTO user_bookmarks (user_id, name, url, description, category, tags)
          VALUES 
          ($1, 'Google PageSpeed Insights', 'https://pagespeed.web.dev/', 'Google官方的网站性能测试工具', '性能工具', '["性能", "Google", "官方"]'),
          ($1, 'GTmetrix', 'https://gtmetrix.com/', '专业的网站性能分析工具', '性能工具', '["性能", "分析", "专业"]'),
          ($1, 'SSL Labs', 'https://www.ssllabs.com/ssltest/', 'SSL证书和安全配置检测', '安全工具', '["安全", "SSL", "证书"]'),
          ($1, 'W3C Validator', 'https://validator.w3.org/', 'HTML标记验证工具', 'SEO工具', '["SEO", "HTML", "验证"]')
          ON CONFLICT DO NOTHING
        `, [adminId]);
        console.log('✅ 用户收藏数据已添加');
      }

      // 6. 添加系统统计数据（最近7天）
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        await pool.query(`
          INSERT INTO system_stats (date, total_users, active_users, new_users, total_tests, successful_tests, failed_tests, avg_response_time, system_uptime)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (date) DO NOTHING
        `, [
          dateStr,
          Math.floor(Math.random() * 100) + 50,  // total_users
          Math.floor(Math.random() * 30) + 10,   // active_users
          Math.floor(Math.random() * 5) + 1,     // new_users
          Math.floor(Math.random() * 200) + 50,  // total_tests
          Math.floor(Math.random() * 180) + 40,  // successful_tests
          Math.floor(Math.random() * 20) + 5,    // failed_tests
          Math.random() * 500 + 200,             // avg_response_time
          Math.random() * 5 + 95                 // system_uptime
        ]);
      }
      console.log('✅ 系统统计数据已添加');

      // 7. 添加引擎状态数据
      await pool.query(`
        INSERT INTO engine_status (engine_type, engine_version, status, metadata)
        VALUES 
        ('lighthouse', '10.4.0', 'healthy', '{"last_check": "2023-12-08T12:00:00Z", "cpu_usage": 15, "memory_usage": 256}'),
        ('puppeteer', '21.5.2', 'healthy', '{"last_check": "2023-12-08T12:00:00Z", "cpu_usage": 12, "memory_usage": 128}'),
        ('playwright', '1.40.0', 'healthy', '{"last_check": "2023-12-08T12:00:00Z", "cpu_usage": 18, "memory_usage": 192}'),
        ('selenium', '4.15.2', 'healthy', '{"last_check": "2023-12-08T12:00:00Z", "cpu_usage": 20, "memory_usage": 320}')
        ON CONFLICT (engine_type) DO UPDATE SET
        engine_version = EXCLUDED.engine_version,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      `);
      console.log('✅ 引擎状态数据已添加');

      // 8. 添加系统配置数据
      await pool.query(`
        INSERT INTO system_config (category, key, value, data_type, description)
        VALUES 
        ('app', 'name', 'Test Web App', 'string', '应用程序名称'),
        ('app', 'version', '1.0.0', 'string', '应用程序版本'),
        ('app', 'maintenance_mode', 'false', 'boolean', '维护模式开关'),
        ('testing', 'max_concurrent_tests', '5', 'number', '最大并发测试数'),
        ('testing', 'default_timeout', '30', 'number', '默认测试超时时间（秒）'),
        ('monitoring', 'default_check_interval', '300', 'number', '默认监控检查间隔（秒）'),
        ('monitoring', 'max_monitoring_sites', '10', 'number', '最大监控站点数'),
        ('email', 'smtp_host', 'smtp.gmail.com', 'string', 'SMTP服务器地址'),
        ('email', 'smtp_port', '587', 'number', 'SMTP端口'),
        ('email', 'from_email', 'noreply@testweb.com', 'string', '发件人邮箱'),
        ('security', 'session_timeout', '3600', 'number', '会话超时时间（秒）'),
        ('security', 'max_login_attempts', '5', 'number', '最大登录尝试次数'),
        ('performance', 'cache_ttl', '300', 'number', '缓存生存时间（秒）'),
        ('performance', 'max_file_size', '10485760', 'number', '最大文件上传大小（字节）')
        ON CONFLICT (category, key) DO UPDATE SET
        value = EXCLUDED.value,
        description = EXCLUDED.description,
        updated_at = NOW()
      `);
      console.log('✅ 系统配置数据已添加');

      // 9. 添加一些示例监控站点
      if (adminUser.rows.length > 0) {
        const adminId = adminUser.rows[0].id;

        await pool.query(`
          INSERT INTO monitoring_sites (user_id, name, url, monitoring_type, check_interval, is_active)
          VALUES 
          ($1, 'Google', 'https://www.google.com', 'uptime', 300, true),
          ($1, 'GitHub', 'https://github.com', 'uptime', 300, true),
          ($1, 'Stack Overflow', 'https://stackoverflow.com', 'performance', 600, true)
          ON CONFLICT DO NOTHING
        `, [adminId]);
        console.log('✅ 监控站点数据已添加');
      }

      // 10. 跳过系统健康检查记录（表结构不匹配）
      console.log('⚠️ 跳过系统健康数据（表结构需要调整）');

      console.log('🎉 示例数据添加完成！');

    } catch (error) {
      console.error('❌ 示例数据添加失败:', error);
      throw error;
    }
  },

  /**
   * 回滚迁移
   * @param {Pool} pool - 数据库连接池
   */
  async down(pool) {
    console.log('🔄 开始清理示例数据...');

    try {
      // 清理添加的示例数据
      await pool.query('DELETE FROM system_notifications WHERE title IN (?, ?, ?)', [
        '欢迎使用测试平台', '系统维护通知', '新功能上线'
      ]);

      await pool.query('DELETE FROM test_templates WHERE is_public = true AND name IN (?, ?, ?, ?)', [
        'SEO基础检查', '性能快速测试', '安全基础扫描', 'API健康检查'
      ]);

      console.log('🎉 示例数据清理完成');
    } catch (error) {
      console.warn('⚠️ 示例数据清理失败:', error.message);
    }
  }
};
