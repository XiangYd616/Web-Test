#!/usr/bin/env node

/**
 * 数据库迁移执行脚本
 * 用法：node server/scripts/run-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'test_web_app',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// 迁移文件目录
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

/**
 * 获取所有迁移文件
 */
function getMigrationFiles() {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // 按文件名排序
    
    return files.map(file => ({
      filename: file,
      version: file.split('_')[0],
      path: path.join(MIGRATIONS_DIR, file)
    }));
  } catch (error) {
    console.error('❌ 读取迁移文件失败:', error.message);
    return [];
  }
}

/**
 * 获取已执行的迁移
 */
async function getExecutedMigrations() {
  try {
    const result = await pool.query(
      'SELECT version FROM migration_history WHERE status = $1 ORDER BY version',
      ['completed']
    );
    return result.rows.map(row => row.version);
  } catch (error) {
    // 如果表不存在，返回空数组
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }
}

/**
 * 执行单个迁移
 */
async function executeMigration(migration) {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 执行迁移: ${migration.filename}`);
    
    // 读取迁移文件
    const sql = fs.readFileSync(migration.path, 'utf8');
    
    // 在事务中执行迁移
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query('COMMIT');
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ 迁移完成: ${migration.filename} (${executionTime}ms)`);
    
    return { success: true, executionTime };
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(`❌ 迁移失败: ${migration.filename}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 主函数
 */
async function runMigrations() {
  try {
    console.log('🚀 开始数据库迁移...\n');
    
    // 获取所有迁移文件
    const migrations = getMigrationFiles();
    if (migrations.length === 0) {
      console.log('📝 没有找到迁移文件');
      return;
    }
    
    console.log(`📋 找到 ${migrations.length} 个迁移文件:`);
    migrations.forEach(m => console.log(`   - ${m.filename}`));
    console.log('');
    
    // 获取已执行的迁移
    const executedVersions = await getExecutedMigrations();
    console.log(`📊 已执行的迁移: ${executedVersions.length} 个`);
    if (executedVersions.length > 0) {
      executedVersions.forEach(v => console.log(`   - ${v}`));
    }
    console.log('');
    
    // 筛选需要执行的迁移
    const pendingMigrations = migrations.filter(
      m => !executedVersions.includes(m.version)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✨ 所有迁移都已执行，数据库是最新的！');
      return;
    }
    
    console.log(`🔄 需要执行 ${pendingMigrations.length} 个迁移:`);
    pendingMigrations.forEach(m => console.log(`   - ${m.filename}`));
    console.log('');
    
    // 执行迁移
    let successCount = 0;
    for (const migration of pendingMigrations) {
      const result = await executeMigration(migration);
      if (result.success) {
        successCount++;
      } else {
        console.error(`\n❌ 迁移失败，停止执行后续迁移`);
        break;
      }
    }
    
    console.log(`\n🎉 迁移完成！成功执行 ${successCount}/${pendingMigrations.length} 个迁移`);
    
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行迁移
if (require.main === module) {
  runMigrations().catch(error => {
    console.error('❌ 迁移脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations };
