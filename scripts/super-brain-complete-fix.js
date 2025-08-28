/**
 * 🧠 超级大脑系统 - 完整数据库修复脚本 v2.0
 * 基于智能分析的全面数据库架构修复
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';

// 加载环境变量
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

console.log('🧠 超级大脑系统 v2.0 - 完整数据库修复');
console.log('🎯 目标: 修复所有数据库架构问题');

/**
 * 🧠 超级大脑完整修复函数
 */
async function superBrainCompleteFix() {
  const pool = new Pool(dbConfig);

  try {
    console.log('\n🔍 超级大脑深度扫描数据库架构...');

    // 1. 检查当前表结构
    const currentStructure = await analyzeCurrentStructure(pool);

    // 2. 执行全面修复
    const fixResults = await executeCompleteFix(pool, currentStructure);

    // 3. 最终验证
    const validationResult = await finalValidation(pool);

    console.log('\n🎉 超级大脑完整修复完成！');
    console.log('📊 修复结果:', fixResults);
    console.log('✅ 最终验证:', validationResult);

    return { success: true, results: fixResults, validation: validationResult };

  } catch (error) {
    console.error('❌ 超级大脑修复失败:', error);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

/**
 * 🔍 分析当前数据库结构
 */
async function analyzeCurrentStructure(pool) {
  console.log('🔍 分析当前数据库结构...');

  try {
    // 检查monitoring_sites表结构
    const monitoringFields = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites'
      ORDER BY ordinal_position
    `);

    console.log(`📊 monitoring_sites表当前有 ${monitoringFields.rows.length} 个字段`);

    // 检查security_logs表是否存在
    const securityLogsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'security_logs'
      )
    `);

    console.log(`🔒 security_logs表存在: ${securityLogsExists.rows[0].exists}`);

    return {
      monitoring_fields: monitoringFields.rows.map(r => r.column_name),
      security_logs_exists: securityLogsExists.rows[0].exists
    };

  } catch (error) {
    console.error('❌ 结构分析失败:', error);
    throw error;
  }
}

/**
 * 🔧 执行完整修复
 */
async function executeCompleteFix(pool, currentStructure) {
  console.log('🔧 执行完整数据库修复...');

  const results = {
    monitoring_fields_added: 0,
    security_table_created: false,
    errors: []
  };

  try {
    // 1. 修复monitoring_sites表的所有缺失字段
    const requiredMonitoringFields = {
      'monitoring_type': "VARCHAR(50) DEFAULT 'uptime' CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo'))",
      'config': "JSONB DEFAULT '{}'",
      'status': "VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled'))",
      'consecutive_failures': "INTEGER DEFAULT 0",
      'notification_settings': "JSONB DEFAULT '{}'",
      'last_check': "TIMESTAMP WITH TIME ZONE",
      'next_check': "TIMESTAMP WITH TIME ZONE",
      'check_interval': "INTEGER DEFAULT 300",
      'timeout': "INTEGER DEFAULT 30",
      'retry_count': "INTEGER DEFAULT 3",
      'alert_threshold': "INTEGER DEFAULT 3",
      'recovery_threshold': "INTEGER DEFAULT 2"
    };

    for (const [fieldName, fieldDef] of Object.entries(requiredMonitoringFields)) {
      if (!currentStructure.monitoring_fields.includes(fieldName)) {
        try {
          console.log(`🔧 添加字段: monitoring_sites.${fieldName}`);
          await pool.query(`
            ALTER TABLE monitoring_sites 
            ADD COLUMN ${fieldName} ${fieldDef}
          `);
          results.monitoring_fields_added++;
          console.log(`✅ 成功添加字段: ${fieldName}`);
        } catch (error) {
          console.error(`❌ 添加字段失败 ${fieldName}:`, error.message);
          results.errors.push(`${fieldName}: ${error.message}`);
        }
      } else {
        console.log(`✅ 字段已存在: ${fieldName}`);
      }
    }

    // 2. 创建security_logs表
    if (!currentStructure.security_logs_exists) {
      try {
        console.log('🔧 创建security_logs表...');
        await pool.query(`
          CREATE TABLE security_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            event_type VARCHAR(50) NOT NULL,
            event_data JSONB DEFAULT '{}',
            ip_address INET,
            user_agent TEXT,
            success BOOLEAN DEFAULT false,
            risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);
        results.security_table_created = true;
        console.log('✅ security_logs表创建成功');
      } catch (error) {
        console.error('❌ 创建security_logs表失败:', error.message);
        results.errors.push(`security_logs: ${error.message}`);
      }
    } else {
      console.log('✅ security_logs表已存在');
    }

    // 3. 创建索引优化性能
    try {
      console.log('🔧 创建性能优化索引...');

      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_monitoring_sites_status ON monitoring_sites(status)',
        'CREATE INDEX IF NOT EXISTS idx_monitoring_sites_type ON monitoring_sites(monitoring_type)',
        'CREATE INDEX IF NOT EXISTS idx_monitoring_sites_next_check ON monitoring_sites(next_check)',
        'CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type)',
        'CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id)'
      ];

      for (const indexSQL of indexes) {
        await pool.query(indexSQL);
      }

      console.log('✅ 性能优化索引创建完成');
    } catch (error) {
      console.error('❌ 索引创建失败:', error.message);
      results.errors.push(`indexes: ${error.message}`);
    }

    return results;

  } catch (error) {
    console.error('❌ 完整修复失败:', error);
    throw error;
  }
}

/**
 * ✅ 最终验证
 */
async function finalValidation(pool) {
  console.log('✅ 执行最终验证...');

  try {
    // 验证monitoring_sites表
    const monitoringFields = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites'
      ORDER BY ordinal_position
    `);

    // 验证security_logs表
    const securityLogsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'security_logs'
      )
    `);

    // 验证索引
    const indexes = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('monitoring_sites', 'security_logs')
    `);

    const validation = {
      monitoring_sites: {
        total_fields: monitoringFields.rows.length,
        fields: monitoringFields.rows.map(r => r.column_name)
      },
      security_logs: {
        exists: securityLogsExists.rows[0].exists
      },
      indexes: {
        count: indexes.rows.length,
        names: indexes.rows.map(r => r.indexname)
      }
    };

    console.log('📊 验证结果:');
    console.log(`  - monitoring_sites: ${validation.monitoring_sites.total_fields} 个字段`);
    console.log(`  - security_logs: ${validation.security_logs.exists ? '存在' : '不存在'}`);
    console.log(`  - 索引: ${validation.indexes.count} 个`);

    return validation;

  } catch (error) {
    console.error('❌ 验证失败:', error);
    return { error: error.message };
  }
}

// 直接执行修复
console.log('\n🚀 启动超级大脑完整修复流程...');
superBrainCompleteFix()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 超级大脑完整修复成功！');
      console.log('🔄 请重启服务器以应用所有修复');
      process.exit(0);
    } else {
      console.log('\n❌ 超级大脑完整修复失败:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

export { superBrainCompleteFix };

