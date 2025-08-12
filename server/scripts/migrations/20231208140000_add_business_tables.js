/**
 * Migration: add_business_tables
 * Created: 2023-12-08T14:00:00.000Z
 * Description: 添加业务相关的重要表
 */

module.exports = {
  /**
   * 执行迁移 - 添加业务表
   * @param {Pool} pool - 数据库连接池
   */
  async up(pool) {
    console.log('🔄 开始添加业务表...');

    try {
      // 1. 创建测试报告表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_reports (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 报告信息
          name VARCHAR(100) NOT NULL,
          description TEXT,
          report_type VARCHAR(20) DEFAULT 'custom' CHECK (report_type IN ('custom', 'scheduled', 'comparison')),
          
          -- 报告配置
          test_ids JSONB NOT NULL,
          filters JSONB DEFAULT '{}',
          format VARCHAR(20) DEFAULT 'html' CHECK (format IN ('html', 'pdf', 'json', 'csv')),
          
          -- 报告内容
          content JSONB,
          file_path TEXT,
          file_size INTEGER,
          
          -- 状态
          status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed', 'failed')),
          
          -- 分享设置
          is_public BOOLEAN DEFAULT false,
          share_token VARCHAR(255) UNIQUE,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE
        )
      `);
      console.log('✅ 测试报告表已创建');

      // 2. 创建API使用统计表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_usage_stats (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
          
          -- 使用统计
          endpoint VARCHAR(100) NOT NULL,
          method VARCHAR(10) NOT NULL,
          status_code INTEGER NOT NULL,
          response_time INTEGER,
          
          -- 请求信息
          ip_address INET,
          user_agent TEXT,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ API使用统计表已创建');

      // 3. 创建邮件队列表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_queue (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          
          -- 邮件信息
          to_email VARCHAR(255) NOT NULL,
          from_email VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          body_text TEXT,
          body_html TEXT,
          
          -- 状态
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          
          -- 错误信息
          error_message TEXT,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          sent_at TIMESTAMP WITH TIME ZONE,
          
          -- 优先级
          priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10)
        )
      `);
      console.log('✅ 邮件队列表已创建');

      // 4. 创建系统统计表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS system_stats (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          
          -- 统计日期
          date DATE NOT NULL,
          
          -- 用户统计
          total_users INTEGER DEFAULT 0,
          active_users INTEGER DEFAULT 0,
          new_users INTEGER DEFAULT 0,
          
          -- 测试统计
          total_tests INTEGER DEFAULT 0,
          successful_tests INTEGER DEFAULT 0,
          failed_tests INTEGER DEFAULT 0,
          
          -- 系统性能统计
          avg_response_time DECIMAL(10,2),
          system_uptime DECIMAL(5,2),
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(date)
        )
      `);
      console.log('✅ 系统统计表已创建');

      // 5. 创建网站收藏表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_bookmarks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 收藏信息
          name VARCHAR(100) NOT NULL,
          url TEXT NOT NULL,
          description TEXT,
          
          -- 分类和标签
          category VARCHAR(50),
          tags JSONB DEFAULT '[]',
          
          -- 统计
          visit_count INTEGER DEFAULT 0,
          last_visited TIMESTAMP WITH TIME ZONE,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ 用户收藏表已创建');

      // 6. 创建测试计划表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_plans (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 计划信息
          name VARCHAR(100) NOT NULL,
          description TEXT,
          
          -- 计划配置
          test_configs JSONB NOT NULL,
          schedule_config JSONB,
          
          -- 状态
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
          
          -- 执行统计
          total_runs INTEGER DEFAULT 0,
          successful_runs INTEGER DEFAULT 0,
          failed_runs INTEGER DEFAULT 0,
          
          -- 时间设置
          next_run_at TIMESTAMP WITH TIME ZONE,
          last_run_at TIMESTAMP WITH TIME ZONE,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ 测试计划表已创建');

      // 7. 创建用户团队表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_teams (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          
          -- 团队信息
          name VARCHAR(100) NOT NULL,
          description TEXT,
          
          -- 团队设置
          max_members INTEGER DEFAULT 10,
          settings JSONB DEFAULT '{}',
          
          -- 状态
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ 用户团队表已创建');

      // 8. 创建团队成员表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS team_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          team_id UUID NOT NULL REFERENCES user_teams(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 成员角色
          role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
          
          -- 权限
          permissions JSONB DEFAULT '[]',
          
          -- 状态
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
          
          -- 时间戳
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(team_id, user_id)
        )
      `);
      console.log('✅ 团队成员表已创建');

      // 9. 创建测试标签表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_tags (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 标签信息
          name VARCHAR(50) NOT NULL,
          color VARCHAR(7) DEFAULT '#3B82F6',
          description TEXT,
          
          -- 使用统计
          usage_count INTEGER DEFAULT 0,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(user_id, name)
        )
      `);
      console.log('✅ 测试标签表已创建');

      // 10. 创建测试结果标签关联表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_result_tags (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
          tag_id UUID NOT NULL REFERENCES test_tags(id) ON DELETE CASCADE,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(test_result_id, tag_id)
        )
      `);
      console.log('✅ 测试结果标签关联表已创建');

      // 11. 创建索引
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_test_reports_user_status ON test_reports(user_id, status)',
        'CREATE INDEX IF NOT EXISTS idx_api_usage_stats_key_created ON api_usage_stats(api_key_id, created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, priority DESC, created_at)',
        'CREATE INDEX IF NOT EXISTS idx_system_stats_date ON system_stats(date DESC)',
        'CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_category ON user_bookmarks(user_id, category)',
        'CREATE INDEX IF NOT EXISTS idx_test_plans_user_status ON test_plans(user_id, status)',
        'CREATE INDEX IF NOT EXISTS idx_test_plans_next_run ON test_plans(next_run_at) WHERE status = \'active\'',
        'CREATE INDEX IF NOT EXISTS idx_team_members_team_role ON team_members(team_id, role)',
        'CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_test_tags_user ON test_tags(user_id, name)',
        'CREATE INDEX IF NOT EXISTS idx_test_result_tags_result ON test_result_tags(test_result_id)',
        'CREATE INDEX IF NOT EXISTS idx_test_result_tags_tag ON test_result_tags(tag_id)'
      ];

      for (const indexSql of indexes) {
        await pool.query(indexSql);
      }
      console.log('✅ 索引已创建');

      // 12. 添加触发器
      const triggers = [
        'CREATE TRIGGER update_test_reports_updated_at BEFORE UPDATE ON test_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_user_bookmarks_updated_at BEFORE UPDATE ON user_bookmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_test_plans_updated_at BEFORE UPDATE ON test_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_user_teams_updated_at BEFORE UPDATE ON user_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_test_tags_updated_at BEFORE UPDATE ON test_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
      ];

      for (const triggerSql of triggers) {
        try {
          await pool.query(triggerSql);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
      console.log('✅ 触发器已创建');

      console.log('🎉 业务表添加完成！');

    } catch (error) {
      console.error('❌ 业务表添加失败:', error);
      throw error;
    }
  },

  /**
   * 回滚迁移
   * @param {Pool} pool - 数据库连接池
   */
  async down(pool) {
    console.log('🔄 开始回滚业务表...');

    const tablesToDrop = [
      'test_result_tags',
      'test_tags',
      'team_members',
      'user_teams',
      'test_plans',
      'user_bookmarks',
      'system_stats',
      'email_queue',
      'api_usage_stats',
      'test_reports'
    ];

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ 删除表: ${table}`);
      } catch (error) {
        console.warn(`⚠️ 删除表失败 ${table}:`, error.message);
      }
    }

    console.log('🎉 业务表回滚完成');
  }
};
