/**
 * 测试历史记录功能增强迁移脚本
 * 执行数据库结构升级和数据迁移
 */

require('dotenv').config();
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
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
};

console.log('🚀 开始测试历史记录功能增强迁移...');
console.log(`📍 连接到: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

async function runMigration() {
  let pool;

  try {
    // 创建连接池
    pool = new Pool(dbConfig);

    // 测试连接
    console.log('🔌 测试数据库连接...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ 数据库连接成功，当前时间: ${result.rows[0].current_time}`);
    client.release();

    // 读取迁移脚本
    console.log('📜 读取迁移脚本...');
    const sqlPath = path.join(__dirname, 'safe-test-history-migration.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`迁移脚本文件不存在: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(`📄 脚本大小: ${(sqlContent.length / 1024).toFixed(2)} KB`);

    // 执行迁移脚本
    console.log('⚡ 执行数据库迁移...');
    const startTime = Date.now();

    await pool.query(sqlContent);

    const duration = Date.now() - startTime;
    console.log(`✅ 数据库迁移完成，耗时: ${duration}ms`);

    // 验证迁移结果
    console.log('🔍 验证迁移结果...');
    await verifyMigration(pool);

    // 显示统计信息
    console.log('📊 显示迁移统计信息...');
    await showMigrationStats(pool);

    console.log('🎉 测试历史记录功能增强迁移成功完成！');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);

    if (error.code) {
      console.error(`错误代码: ${error.code}`);
    }

    if (error.detail) {
      console.error(`错误详情: ${error.detail}`);
    }

    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

async function verifyMigration(pool) {
  const expectedTables = [
    'test_history',
    'test_status_logs',
    'test_progress_logs'
  ];

  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = ANY($1)
    ORDER BY table_name
  `, [expectedTables]);

  const actualTables = result.rows.map(row => row.table_name);
  const missingTables = expectedTables.filter(table => !actualTables.includes(table));

  console.log(`📋 预期新表数量: ${expectedTables.length}`);
  console.log(`📋 实际新表数量: ${actualTables.length}`);

  if (missingTables.length === 0) {
    console.log('✅ 所有新表都已创建成功');
  } else {
    console.log(`❌ 缺失表: ${missingTables.join(', ')}`);
  }

  // 检查表结构
  for (const table of actualTables) {
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
    console.log(`  📊 ${table}: ${countResult.rows[0].count} 条记录`);
  }

  // 检查索引
  const indexResult = await pool.query(`
    SELECT COUNT(*) as index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND tablename = ANY($1)
  `, [expectedTables]);
  console.log(`📇 新表索引数量: ${indexResult.rows[0].index_count}`);

  // 检查触发器
  const triggerResult = await pool.query(`
    SELECT COUNT(*) as trigger_count 
    FROM information_schema.triggers 
    WHERE event_object_schema = 'public'
    AND event_object_table = ANY($1)
  `, [expectedTables]);
  console.log(`⚡ 新表触发器数量: ${triggerResult.rows[0].trigger_count}`);
}

async function showMigrationStats(pool) {
  try {
    // 测试历史记录统计
    const historyStats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tests,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_tests
      FROM test_history
    `);

    const stats = historyStats.rows[0];
    console.log(`📈 测试历史统计:`);
    console.log(`  总记录数: ${stats.total_records}`);
    console.log(`  已完成: ${stats.completed_tests}`);
    console.log(`  已失败: ${stats.failed_tests}`);
    console.log(`  运行中: ${stats.running_tests}`);
    console.log(`  已取消: ${stats.cancelled_tests}`);

    // 状态日志统计
    const statusLogStats = await pool.query(`
      SELECT COUNT(*) as total_status_changes
      FROM test_status_logs
    `);
    console.log(`📝 状态变更记录: ${statusLogStats.rows[0].total_status_changes} 条`);

    // 进度日志统计
    const progressLogStats = await pool.query(`
      SELECT COUNT(*) as total_progress_logs
      FROM test_progress_logs
    `);
    console.log(`📊 进度记录: ${progressLogStats.rows[0].total_progress_logs} 条`);

  } catch (error) {
    console.warn('⚠️ 获取迁移统计信息失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
