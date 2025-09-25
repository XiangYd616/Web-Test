/**
 * 🧠 基于Context7 PostgreSQL最佳实践的数据库修复脚本
 * 使用官方文档推荐的ALTER TABLE语法
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'testweb_dev',
  user: 'postgres',
  password: 'postgres'
});


async function context7DatabaseFix() {
  try {

    // 1. 检查monitoring_sites表的当前字段
    const currentFields = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites'
      ORDER BY ordinal_position
    `);

    console.log(`📊 monitoring_sites表当前有 ${currentFields.rows.length} 个字段`);
    const existingFields = currentFields.rows.map(row => row.column_name);

    // 2. 基于Context7文档的字段定义
    const requiredFields = {
      'monitoring_type': {
        type: "VARCHAR(50)",
        default: "'uptime'",
        constraint: "CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo'))"
      },
      'config': {
        type: "JSONB",
        default: "'{}'::jsonb"
      },
      'status': {
        type: "VARCHAR(20)",
        default: "'active'",
        constraint: "CHECK (status IN ('active', 'paused', 'disabled'))"
      },
      'consecutive_failures': {
        type: "INTEGER",
        default: "0"
      },
      'notification_settings': {
        type: "JSONB",
        default: "'{}'::jsonb"
      },
      'last_check': {
        type: "TIMESTAMP WITH TIME ZONE",
        default: null
      },
      'next_check': {
        type: "TIMESTAMP WITH TIME ZONE",
        default: null
      },
      'check_interval': {
        type: "INTEGER",
        default: "300"
      },
      'timeout': {
        type: "INTEGER",
        default: "30"
      },
      'retry_count': {
        type: "INTEGER",
        default: "3"
      },
      'alert_threshold': {
        type: "INTEGER",
        default: "3"
      },
      'recovery_threshold': {
        type: "INTEGER",
        default: "2"
      },
      'deleted_at': {
        type: "TIMESTAMP WITH TIME ZONE",
        default: null
      }
    };


    let addedCount = 0;
    let skippedCount = 0;

    // 3. 使用Context7推荐的ADD COLUMN IF NOT EXISTS语法
    for (const [fieldName, fieldDef] of Object.entries(requiredFields)) {
      if (!existingFields.includes(fieldName)) {
        try {
          // 构建完整的ALTER TABLE语句
          let sql = `ALTER TABLE monitoring_sites ADD COLUMN IF NOT EXISTS ${fieldName} ${fieldDef.type}`;

          if (fieldDef.default !== null) {
            sql += ` DEFAULT ${fieldDef.default}`;
          }

          if (fieldDef.constraint) {
            sql += ` ${fieldDef.constraint}`;
          }

          console.log(`🔧 添加字段: ${fieldName}`);

          await pool.query(sql);
          addedCount++;
          console.log(`✅ 成功添加: ${fieldName}`);

        } catch (error) {
          console.error(`❌ 添加字段失败 ${fieldName}:`, error.message);
        }
      } else {
        console.log(`✅ 字段已存在: ${fieldName}`);
        skippedCount++;
      }
    }


    // 4. 验证最终结果
    const finalFields = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites'
      ORDER BY ordinal_position
    `);


    // 5. 创建security_logs表（如果不存在）

    const securityTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'security_logs'
      )
    `);

    if (!securityTableExists.rows[0].exists) {
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

      console.log('✅ security_logs表创建成功');
    } else {
      console.log('✅ security_logs表已存在');
    }

    // 6. 创建性能优化索引

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_monitoring_sites_status ON monitoring_sites(status)',
      'CREATE INDEX IF NOT EXISTS idx_monitoring_sites_type ON monitoring_sites(monitoring_type)',
      'CREATE INDEX IF NOT EXISTS idx_monitoring_sites_next_check ON monitoring_sites(next_check)',
      'CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at)'
    ];

    for (const indexSQL of indexes) {
      try {
        await pool.query(indexSQL);
        console.log(`✅ 索引创建成功: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        console.log(`⚠️ 索引可能已存在: ${indexSQL.split(' ')[5]}`);
      }
    }


    return { success: true, addedFields: addedCount };

  } catch (error) {
    console.error('❌ Context7数据库修复失败:', error);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

// 执行修复
context7DatabaseFix()
  .then(result => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
