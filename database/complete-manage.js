#!/usr/bin/env node

import {
  backupDatabase,
  closePool,
  dropAllTables,
  getDatabaseInfo,
  pool,
  testConnection,
  executeSqlFile
} from './config.js';

// 显示完备数据库状态
async function showCompleteStatus() {
  console.log('📊 完备数据库状态信息\n');

  try {
    const connected = await testConnection();
    if (!connected) return;

    const info = await getDatabaseInfo();
    console.log(`🗄️  数据库版本: ${info.version.split(' ')[0]} ${info.version.split(' ')[1]}`);
    console.log(`📦 数据库大小: ${info.size}`);
    console.log(`📋 表数量: ${info.tableCount}\n`);

    // 显示核心业务表信息
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') as column_count
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
        ORDER BY 
          CASE 
            WHEN tablename LIKE 'users%' THEN 1
            WHEN tablename LIKE 'test_%' THEN 2
            WHEN tablename LIKE 'monitoring_%' THEN 3
            WHEN tablename LIKE 'system_%' THEN 4
            ELSE 5
          END,
          tablename
      `);

      console.log('📋 完备数据库表结构:');
      console.log('┌─────────────────────────────────┬──────────────┬──────────┐');
      console.log('│ 表名                            │ 大小         │ 字段数   │');
      console.log('├─────────────────────────────────┼──────────────┼──────────┤');

      let currentCategory = '';
      for (const row of result.rows) {
        // 分类显示
        let category = '';
        if (row.tablename.startsWith('users')) category = '用户管理';
        else if (row.tablename.startsWith('test_')) category = '测试管理';
        else if (row.tablename.startsWith('monitoring_')) category = '监控管理';
        else if (row.tablename.startsWith('system_')) category = '系统管理';
        else category = '其他';

        if (category !== currentCategory) {
          if (currentCategory !== '') {
            console.log('├─────────────────────────────────┼──────────────┼──────────┤');
          }
          currentCategory = category;
        }

        const tableName = row.tablename.padEnd(31);
        const size = row.size.padEnd(12);
        const columns = row.column_count.toString().padEnd(8);
        console.log(`│ ${tableName} │ ${size} │ ${columns} │`);
      }
      console.log('└─────────────────────────────────┴──────────────┴──────────┘');

      // 显示系统统计
      console.log('\n📈 系统统计:');
      const statsResult = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
          (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND last_login > NOW() - INTERVAL '30 days') as active_users,
          (SELECT COUNT(*) FROM test_results) as total_tests,
          (SELECT COUNT(*) FROM test_results WHERE status = 'completed') as completed_tests,
          (SELECT COUNT(*) FROM monitoring_sites WHERE is_active = true) as active_monitors,
          (SELECT COUNT(*) FROM system_configs) as system_configs
      `);

      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];
        console.log(`👥 总用户数: ${stats.total_users}`);
        console.log(`🟢 活跃用户: ${stats.active_users}`);
        console.log(`🧪 总测试数: ${stats.total_tests}`);
        console.log(`✅ 完成测试: ${stats.completed_tests}`);
        console.log(`📡 活跃监控: ${stats.active_monitors}`);
        console.log(`⚙️  系统配置: ${stats.system_configs}`);
      }

      // 显示索引信息
      const indexResult = await client.query(`
        SELECT COUNT(*) as index_count
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);
      console.log(`🔍 索引数量: ${indexResult.rows[0].index_count}`);

      // 显示触发器信息
      const triggerResult = await client.query(`
        SELECT COUNT(*) as trigger_count
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
      `);
      console.log(`⚡ 触发器数量: ${triggerResult.rows[0].trigger_count}`);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 获取数据库状态失败:', error.message);
  }
}

// 重建完备数据库
async function rebuildCompleteDatabase() {
  console.log('🔄 重建完备数据库...\n');

  try {
    // 1. 备份现有数据
    console.log('1️⃣  备份现有数据...');
    const backupFile = await backupDatabase();
    console.log(`✅ 备份完成: ${backupFile}`);

    // 2. 删除所有表
    console.log('\n2️⃣  删除现有表结构...');
    await dropAllTables();
    console.log('✅ 表结构已清理');

    // 3. 执行完备架构脚本
    console.log('\n3️⃣  创建完备数据库架构...');
    await executeSqlFile('complete-schema.sql');
    console.log('✅ 完备架构创建完成');

    // 4. 验证重建结果
    console.log('\n4️⃣  验证重建结果...');
    await showCompleteStatus();

    console.log('\n🎉 完备数据库重建完成！');

  } catch (error) {
    console.error('\n❌ 重建数据库失败:', error.message);
    process.exit(1);
  }
}

// 清理过期数据
async function cleanupExpiredData() {
  console.log('🧹 清理过期数据...\n');

  try {
    const client = await pool.connect();
    try {
      // 调用清理函数
      await client.query('SELECT cleanup_expired_data()');
      console.log('✅ 过期数据清理完成');

      // 显示清理统计
      const statsResult = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM user_sessions WHERE is_active = true) as active_sessions,
          (SELECT COUNT(*) FROM refresh_tokens WHERE is_active = true) as active_tokens,
          (SELECT COUNT(*) FROM test_reports WHERE is_public = true) as public_reports
      `);

      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];
        console.log(`🔐 活跃会话: ${stats.active_sessions}`);
        console.log(`🎫 活跃令牌: ${stats.active_tokens}`);
        console.log(`📊 公开报告: ${stats.public_reports}`);
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 清理过期数据失败:', error.message);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
📚 完备数据库管理工具

用法: node complete-manage.js <命令>

可用命令:
  status     显示完备数据库状态
  rebuild    重建完备数据库（包含备份）
  cleanup    清理过期数据
  help       显示此帮助信息

示例:
  node complete-manage.js status
  node complete-manage.js rebuild
  node complete-manage.js cleanup
`);
}

// 主函数
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'status':
        await showCompleteStatus();
        break;
      case 'rebuild':
        await rebuildCompleteDatabase();
        break;
      case 'cleanup':
        await cleanupExpiredData();
        break;
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
      default:
        console.log('❌ 未知命令:', command);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { showCompleteStatus, rebuildCompleteDatabase, cleanupExpiredData };
