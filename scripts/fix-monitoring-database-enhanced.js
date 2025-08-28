/**
 * 增强版监控数据库字段修复脚本
 * 基于PostgreSQL官方文档的最佳实践
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
 * 检查字段是否存在
 */
async function checkColumnExists(pool, tableName, columnName) {
  const query = `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    ) as exists
  `;
  
  const result = await pool.query(query, [tableName, columnName]);
  return result.rows[0].exists;
}

/**
 * 检查约束是否存在
 */
async function checkConstraintExists(pool, tableName, constraintName) {
  const query = `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = $1 AND constraint_name = $2
    ) as exists
  `;
  
  const result = await pool.query(query, [tableName, constraintName]);
  return result.rows[0].exists;
}

/**
 * 安全添加字段
 */
async function safeAddColumn(pool, tableName, columnName, columnDefinition) {
  const exists = await checkColumnExists(pool, tableName, columnName);
  
  if (!exists) {
    const query = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`;
    await pool.query(query);
    console.log(`✅ 成功添加字段: ${tableName}.${columnName}`);
    return true;
  } else {
    console.log(`⚠️ 字段已存在: ${tableName}.${columnName}`);
    return false;
  }
}

/**
 * 安全添加约束
 */
async function safeAddConstraint(pool, tableName, constraintName, constraintDefinition) {
  const exists = await checkConstraintExists(pool, tableName, constraintName);
  
  if (!exists) {
    const query = `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} ${constraintDefinition}`;
    await pool.query(query);
    console.log(`✅ 成功添加约束: ${constraintName}`);
    return true;
  } else {
    console.log(`⚠️ 约束已存在: ${constraintName}`);
    return false;
  }
}

/**
 * 创建索引
 */
async function safeCreateIndex(pool, indexName, tableName, columns) {
  try {
    const query = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columns})`;
    await pool.query(query);
    console.log(`✅ 成功创建索引: ${indexName}`);
    return true;
  } catch (error) {
    console.log(`⚠️ 索引创建失败: ${indexName} - ${error.message}`);
    return false;
  }
}

/**
 * 修复监控数据库字段
 */
async function fixMonitoringDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔧 开始增强版监控数据库字段修复...');
    
    // 开始事务
    await pool.query('BEGIN');
    
    const results = [];
    
    // 1. 添加monitoring_type字段
    const added1 = await safeAddColumn(
      pool, 
      'monitoring_sites', 
      'monitoring_type', 
      "VARCHAR(50) DEFAULT 'uptime'"
    );
    if (added1) results.push('monitoring_type字段');
    
    // 2. 添加monitoring_type约束
    await safeAddConstraint(
      pool,
      'monitoring_sites',
      'monitoring_sites_monitoring_type_check',
      "CHECK (monitoring_type IN ('uptime', 'performance', 'security', 'seo'))"
    );

    // 3. 添加config字段
    const added2 = await safeAddColumn(
      pool, 
      'monitoring_sites', 
      'config', 
      "JSONB DEFAULT '{}'"
    );
    if (added2) results.push('config字段');

    // 4. 添加notification_settings字段
    const added3 = await safeAddColumn(
      pool, 
      'monitoring_sites', 
      'notification_settings', 
      "JSONB DEFAULT '{}'"
    );
    if (added3) results.push('notification_settings字段');

    // 5. 添加last_check字段
    const added4 = await safeAddColumn(
      pool, 
      'monitoring_sites', 
      'last_check', 
      "TIMESTAMP WITH TIME ZONE"
    );
    if (added4) results.push('last_check字段');

    // 6. 添加consecutive_failures字段
    const added5 = await safeAddColumn(
      pool, 
      'monitoring_sites', 
      'consecutive_failures', 
      "INTEGER DEFAULT 0"
    );
    if (added5) results.push('consecutive_failures字段');

    // 7. 添加status字段
    const added6 = await safeAddColumn(
      pool, 
      'monitoring_sites', 
      'status', 
      "VARCHAR(20) DEFAULT 'active'"
    );
    if (added6) results.push('status字段');
    
    // 8. 添加status约束
    await safeAddConstraint(
      pool,
      'monitoring_sites',
      'monitoring_sites_status_check',
      "CHECK (status IN ('active', 'paused', 'disabled'))"
    );

    // 9. 添加deleted_at字段（软删除）
    const added7 = await safeAddColumn(
      pool, 
      'monitoring_sites', 
      'deleted_at', 
      "TIMESTAMP WITH TIME ZONE"
    );
    if (added7) results.push('deleted_at字段');

    // 10. 创建性能优化索引
    await safeCreateIndex(pool, 'idx_monitoring_sites_monitoring_type', 'monitoring_sites', 'monitoring_type');
    await safeCreateIndex(pool, 'idx_monitoring_sites_status', 'monitoring_sites', 'status');
    await safeCreateIndex(pool, 'idx_monitoring_sites_last_check', 'monitoring_sites', 'last_check');
    await safeCreateIndex(pool, 'idx_monitoring_sites_deleted_at', 'monitoring_sites', 'deleted_at');
    await safeCreateIndex(pool, 'idx_monitoring_sites_user_id_status', 'monitoring_sites', 'user_id, status');

    // 11. 更新现有数据
    const updateResult = await pool.query(`
      UPDATE monitoring_sites 
      SET 
        monitoring_type = COALESCE(monitoring_type, 'uptime'),
        config = COALESCE(config, '{}'),
        notification_settings = COALESCE(notification_settings, '{}'),
        status = COALESCE(status, 'active'),
        consecutive_failures = COALESCE(consecutive_failures, 0)
      WHERE monitoring_type IS NULL 
         OR config IS NULL 
         OR notification_settings IS NULL 
         OR status IS NULL 
         OR consecutive_failures IS NULL
    `);

    console.log(`📊 更新了 ${updateResult.rowCount} 行现有数据`);

    // 12. 验证修复结果
    const fieldCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'monitoring_sites' 
      AND column_name IN ('monitoring_type', 'config', 'notification_settings', 'last_check', 'consecutive_failures', 'status', 'deleted_at')
      ORDER BY column_name
    `);

    console.log('\n📊 监控表字段验证:');
    fieldCheck.rows.forEach(row => {
      console.log(`  ✅ ${row.column_name}: ${row.data_type} (默认: ${row.column_default || 'NULL'})`);
    });

    // 提交事务
    await pool.query('COMMIT');

    console.log(`\n🎉 监控数据库字段修复完成！新增了 ${results.length} 个字段`);
    console.log(`📋 新增字段: ${results.join(', ')}`);
    
    return {
      success: true,
      addedFields: results,
      updatedRows: updateResult.rowCount,
      totalFields: fieldCheck.rows.length
    };

  } catch (error) {
    // 回滚事务
    await pool.query('ROLLBACK');
    console.error('❌ 修复监控数据库失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 执行修复
if (require.main === module) {
  fixMonitoringDatabase()
    .then((result) => {
      console.log('✅ 脚本执行完成');
      console.log('📊 修复结果:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { fixMonitoringDatabase };
