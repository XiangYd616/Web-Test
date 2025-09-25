/**
 * 数据库修复API
 * 用于修复数据库schema问题
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

/**
 * 修复监控表字段
 */
router.post('/fix-monitoring-fields', async (req, res) => {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 开始修复监控数据库字段...');
    
    const results = [];
    
    // 1. 添加monitoring_type字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS monitoring_type VARCHAR(50) DEFAULT 'uptime'
      `);
      
      // 添加约束
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_name = 'monitoring_sites_monitoring_type_check'
          ) THEN
            ALTER TABLE monitoring_sites 
            ADD CONSTRAINT monitoring_sites_monitoring_type_check 
            CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo'));
          END IF;
        END $$;
      `);
      
      results.push('✅ monitoring_type字段添加成功');
    } catch (error) {
      results.push(`⚠️ monitoring_type字段: ${error.message}`);
    }

    // 2. 添加config字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'
      `);
      results.push('✅ config字段添加成功');
    } catch (error) {
      results.push(`⚠️ config字段: ${error.message}`);
    }

    // 3. 添加notification_settings字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'
      `);
      results.push('✅ notification_settings字段添加成功');
    } catch (error) {
      results.push(`⚠️ notification_settings字段: ${error.message}`);
    }

    // 4. 添加last_check字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS last_check TIMESTAMP WITH TIME ZONE
      `);
      results.push('✅ last_check字段添加成功');
    } catch (error) {
      results.push(`⚠️ last_check字段: ${error.message}`);
    }

    // 5. 添加consecutive_failures字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0
      `);
      results.push('✅ consecutive_failures字段添加成功');
    } catch (error) {
      results.push(`⚠️ consecutive_failures字段: ${error.message}`);
    }

    // 6. 添加status字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
      `);
      
      // 添加约束
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_name = 'monitoring_sites_status_check'
          ) THEN
            ALTER TABLE monitoring_sites 
            ADD CONSTRAINT monitoring_sites_status_check 
            CHECK (status IN ('active', 'paused', 'disabled'));
          END IF;
        END $$;
      `);
      
      results.push('✅ status字段添加成功');
    } catch (error) {
      results.push(`⚠️ status字段: ${error.message}`);
    }

    // 7. 添加deleted_at字段
    try {
      await pool.query(`
        ALTER TABLE monitoring_sites 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE
      `);
      results.push('✅ deleted_at字段添加成功');
    } catch (error) {
      results.push(`⚠️ deleted_at字段: ${error.message}`);
    }

    // 8. 创建索引
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_monitoring_sites_monitoring_type ON monitoring_sites(monitoring_type)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_monitoring_sites_status ON monitoring_sites(status)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_monitoring_sites_last_check ON monitoring_sites(last_check)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_monitoring_sites_deleted_at ON monitoring_sites(deleted_at)`);
      results.push('✅ 索引创建成功');
    } catch (error) {
      results.push(`⚠️ 索引创建: ${error.message}`);
    }

    // 9. 验证字段
    const fieldCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites' 
      AND column_name IN ('monitoring_type', 'config', 'notification_settings', 'last_check', 'consecutive_failures', 'status', 'deleted_at')
      ORDER BY column_name
    `);

    console.log('📊 监控表字段状态:');
    fieldCheck.rows.forEach(row => {
    });

    res.json({
      success: true,
      message: '监控数据库字段修复完成',
      results,
      fields: fieldCheck.rows
    });

  } catch (error) {
    console.error('❌ 修复监控数据库失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '数据库修复失败'
    });
  } finally {
    await pool.end();
  }
});

/**
 * 检查数据库状态
 */
router.get('/check-database', async (req, res) => {
  const pool = new Pool(dbConfig);
  
  try {
    // 检查表结构
    const tableCheck = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%monitoring%'
      ORDER BY table_name
    `);

    // 检查monitoring_sites字段
    const fieldCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites'
      ORDER BY ordinal_position
    `);

    res.json({
      success: true,
      tables: tableCheck.rows,
      monitoring_sites_fields: fieldCheck.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await pool.end();
  }
});

module.exports = router;
