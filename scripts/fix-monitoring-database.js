/**
 * 修复监控数据库字段脚本
 * 添加缺失的monitoring_type等字段
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'test_web',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

async function fixMonitoringDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 开始修复监控数据库字段...');
    
    // 1. 添加monitoring_type字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS monitoring_type VARCHAR(50) DEFAULT 'uptime' 
        CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo'))
      `);
      console.log('✅ 添加monitoring_type字段成功');
    } catch (error) {
      console.log('⚠️ monitoring_type字段可能已存在:', error.message);
    }

    // 2. 添加config字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'
      `);
      console.log('✅ 添加config字段成功');
    } catch (error) {
      console.log('⚠️ config字段可能已存在:', error.message);
    }

    // 3. 添加notification_settings字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'
      `);
      console.log('✅ 添加notification_settings字段成功');
    } catch (error) {
      console.log('⚠️ notification_settings字段可能已存在:', error.message);
    }

    // 4. 添加last_check字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS last_check TIMESTAMP WITH TIME ZONE
      `);
      console.log('✅ 添加last_check字段成功');
    } catch (error) {
      console.log('⚠️ last_check字段可能已存在:', error.message);
    }

    // 5. 添加consecutive_failures字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0
      `);
      console.log('✅ 添加consecutive_failures字段成功');
    } catch (error) {
      console.log('⚠️ consecutive_failures字段可能已存在:', error.message);
    }

    // 6. 添加status字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'paused', 'disabled'))
      `);
      console.log('✅ 添加status字段成功');
    } catch (error) {
      console.log('⚠️ status字段可能已存在:', error.message);
    }

    // 7. 添加deleted_at字段（软删除）
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE
      `);
      console.log('✅ 添加deleted_at字段成功');
    } catch (error) {
      console.log('⚠️ deleted_at字段可能已存在:', error.message);
    }

    // 8. 创建索引
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_monitoring_sites_monitoring_type ON monitoring_sites(monitoring_type)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_monitoring_sites_status ON monitoring_sites(status)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_monitoring_sites_last_check ON monitoring_sites(last_check)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_monitoring_sites_deleted_at ON monitoring_sites(deleted_at)
      `);
      console.log('✅ 创建索引成功');
    } catch (error) {
      console.log('⚠️ 索引可能已存在:', error.message);
    }

    // 9. 验证字段
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites' 
      AND column_name IN ('monitoring_type', 'config', 'notification_settings', 'last_check', 'consecutive_failures', 'status', 'deleted_at')
      ORDER BY column_name
    `);

    console.log('\n📊 监控表字段状态:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.column_name}: ${row.data_type} (默认: ${row.column_default || 'NULL'})`);
    });

    console.log('\n🎉 监控数据库字段修复完成！');
    
  } catch (error) {
    console.error('❌ 修复监控数据库失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 执行修复
if (require.main === module) {
  fixMonitoringDatabase()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { fixMonitoringDatabase };
