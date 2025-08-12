/**
 * Migration: complete_database_schema
 * Created: 2023-12-08T13:00:00.000Z
 * Description: 完善数据库架构，添加所有缺失的重要表
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * 执行迁移 - 创建完整的数据库架构
   * @param {Pool} pool - 数据库连接池
   */
  async up(pool) {
    console.log('🔄 开始完善数据库架构...');

    try {
      // 启用必要的扩展
      await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await pool.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
      console.log('✅ 数据库扩展已启用');

      // 1. 创建用户偏好设置表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 界面偏好
          theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
          language VARCHAR(10) DEFAULT 'zh-CN',
          timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
          
          -- 通知偏好
          notifications JSONB DEFAULT '{"email": true, "browser": true, "sms": false}',
          email_notifications BOOLEAN DEFAULT true,
          browser_notifications BOOLEAN DEFAULT true,
          sms_notifications BOOLEAN DEFAULT false,
          
          -- 测试偏好
          auto_save BOOLEAN DEFAULT true,
          default_test_timeout INTEGER DEFAULT 30,
          max_concurrent_tests INTEGER DEFAULT 3,
          
          -- 仪表板偏好
          dashboard_layout JSONB DEFAULT '{}',
          favorite_tests JSONB DEFAULT '[]',
          recent_urls JSONB DEFAULT '[]',
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(user_id)
        )
      `);
      console.log('✅ 用户偏好设置表已创建');

      // 2. 创建用户活动日志表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_activity_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 活动信息
          action VARCHAR(50) NOT NULL,
          resource_type VARCHAR(50),
          resource_id UUID,
          
          -- 详细信息
          description TEXT,
          metadata JSONB DEFAULT '{}',
          
          -- 请求信息
          ip_address INET,
          user_agent TEXT,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ 用户活动日志表已创建');

      // 3. 创建测试队列表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_queue (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 队列信息
          test_type VARCHAR(20) NOT NULL,
          priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
          
          -- 测试配置
          test_config JSONB NOT NULL,
          target_url TEXT NOT NULL,
          
          -- 执行信息
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          max_retries INTEGER DEFAULT 3,
          
          -- 结果关联
          result_id UUID REFERENCES test_results(id) ON DELETE SET NULL,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ 测试队列表已创建');

      // 4. 创建测试模板表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_templates (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 模板信息
          name VARCHAR(100) NOT NULL,
          description TEXT,
          test_type VARCHAR(20) NOT NULL,
          
          -- 模板配置
          config JSONB NOT NULL,
          is_public BOOLEAN DEFAULT false,
          
          -- 使用统计
          usage_count INTEGER DEFAULT 0,
          
          -- 标签和分类
          tags JSONB DEFAULT '[]',
          category VARCHAR(50),
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ 测试模板表已创建');

      // 5. 创建API密钥管理表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 密钥信息
          name VARCHAR(100) NOT NULL,
          key_hash VARCHAR(255) NOT NULL UNIQUE,
          key_prefix VARCHAR(20) NOT NULL,
          
          -- 权限和限制
          permissions JSONB DEFAULT '[]',
          rate_limit INTEGER DEFAULT 1000,
          allowed_ips JSONB DEFAULT '[]',
          
          -- 状态
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
          last_used_at TIMESTAMP WITH TIME ZONE,
          usage_count INTEGER DEFAULT 0,
          
          -- 过期设置
          expires_at TIMESTAMP WITH TIME ZONE,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ API密钥管理表已创建');

      // 6. 创建系统通知表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS system_notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          
          -- 通知内容
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'maintenance')),
          priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
          
          -- 目标用户
          target_users JSONB DEFAULT '[]',
          target_roles JSONB DEFAULT '[]',
          
          -- 显示设置
          is_active BOOLEAN DEFAULT true,
          show_until TIMESTAMP WITH TIME ZONE,
          
          -- 统计
          view_count INTEGER DEFAULT 0,
          click_count INTEGER DEFAULT 0,
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✅ 系统通知表已创建');

      // 7. 创建用户统计表
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_stats (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- 统计日期
          date DATE NOT NULL,
          
          -- 测试统计
          tests_run INTEGER DEFAULT 0,
          tests_passed INTEGER DEFAULT 0,
          tests_failed INTEGER DEFAULT 0,
          
          -- 使用时间统计
          active_time INTEGER DEFAULT 0,
          
          -- 功能使用统计
          features_used JSONB DEFAULT '{}',
          
          -- 时间戳
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          UNIQUE(user_id, date)
        )
      `);
      console.log('✅ 用户统计表已创建');

      // 8. 创建索引
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_action ON user_activity_logs(user_id, action, created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_test_queue_status_priority ON test_queue(status, priority DESC, created_at)',
        'CREATE INDEX IF NOT EXISTS idx_test_templates_user_type ON test_templates(user_id, test_type)',
        'CREATE INDEX IF NOT EXISTS idx_api_keys_user_status ON api_keys(user_id, status)',
        'CREATE INDEX IF NOT EXISTS idx_system_notifications_active ON system_notifications(is_active, created_at DESC) WHERE is_active = true',
        'CREATE INDEX IF NOT EXISTS idx_user_stats_user_date ON user_stats(user_id, date DESC)'
      ];

      for (const indexSql of indexes) {
        await pool.query(indexSql);
      }
      console.log('✅ 索引已创建');

      // 9. 创建触发器函数
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);

      // 10. 为需要的表添加触发器
      const triggers = [
        'CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_test_queue_updated_at BEFORE UPDATE ON test_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_test_templates_updated_at BEFORE UPDATE ON test_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        'CREATE TRIGGER update_system_notifications_updated_at BEFORE UPDATE ON system_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
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

      console.log('🎉 数据库架构完善完成！');

    } catch (error) {
      console.error('❌ 数据库架构完善失败:', error);
      throw error;
    }
  },

  /**
   * 回滚迁移
   * @param {Pool} pool - 数据库连接池
   */
  async down(pool) {
    console.log('🔄 开始回滚数据库架构...');

    const tablesToDrop = [
      'user_stats',
      'system_notifications', 
      'api_keys',
      'test_templates',
      'test_queue',
      'user_activity_logs',
      'user_preferences'
    ];

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ 删除表: ${table}`);
      } catch (error) {
        console.warn(`⚠️ 删除表失败 ${table}:`, error.message);
      }
    }

    // 删除触发器函数
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
    console.log('✅ 触发器函数已删除');

    console.log('🎉 数据库架构回滚完成');
  }
};
