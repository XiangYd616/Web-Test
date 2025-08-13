#!/usr/bin/env node

import {
  backupDatabase,
  closePool,
  dropAllTables,
  getDatabaseInfo,
  pool,
  testConnection
} from './config.js';

// 显示数据库状态
async function showStatus() {
  console.log('📊 数据库状态信息\n');

  try {
    const connected = await testConnection();
    if (!connected) return;

    const info = await getDatabaseInfo();
    console.log(`🗄️  数据库版本: ${info.version.split(' ')[0]} ${info.version.split(' ')[1]}`);
    console.log(`📦 数据库大小: ${info.size}`);
    console.log(`📋 表数量: ${info.tableCount}\n`);

    // 显示表信息
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      console.log('📋 表列表:');
      console.log('┌─────────────────────────────────┬──────────────┐');
      console.log('│ 表名                            │ 大小         │');
      console.log('├─────────────────────────────────┼──────────────┤');

      for (const row of result.rows) {
        const tableName = row.tablename.padEnd(31);
        const size = row.size.padEnd(12);
        console.log(`│ ${tableName} │ ${size} │`);
      }
      console.log('└─────────────────────────────────┴──────────────┘');

      // 显示用户统计
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      const testCount = await client.query('SELECT COUNT(*) as count FROM test_executions');

      console.log('\n📈 数据统计:');
      console.log(`👥 用户数量: ${userCount.rows[0].count}`);
      console.log(`🧪 测试执行数: ${testCount.rows[0].count}`);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 获取状态失败:', error.message);
  }
}

// 创建管理员用户
async function createAdmin() {
  const readline = await import('readline');
  const bcrypt = await import('bcrypt');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('👤 创建管理员用户\n');

    const username = await new Promise(resolve => {
      rl.question('用户名: ', resolve);
    });

    const email = await new Promise(resolve => {
      rl.question('邮箱: ', resolve);
    });

    const password = await new Promise(resolve => {
      rl.question('密码: ', (input) => {
        console.log(''); // 换行
        resolve(input);
      });
    });

    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.default.hash(password, saltRounds);

    // 插入用户
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO users (username, email, password_hash, role, subscription_type)
        VALUES ($1, $2, $3, 'admin', 'enterprise')
        RETURNING id, username, email, role
      `, [username, email, passwordHash]);

      const user = result.rows[0];
      console.log('✅ 管理员用户创建成功:');
      console.log(`   ID: ${user.id}`);
      console.log(`   用户名: ${user.username}`);
      console.log(`   邮箱: ${user.email}`);
      console.log(`   角色: ${user.role}`);

    } finally {
      client.release();
    }

  } catch (error) {
    if (error.code === '23505') {
      console.error('❌ 用户名或邮箱已存在');
    } else {
      console.error('❌ 创建用户失败:', error.message);
    }
  } finally {
    rl.close();
  }
}

// 备份数据库
async function backup() {
  console.log('💾 开始备份数据库...\n');

  try {
    const backupPath = await backupDatabase('./backups');
    console.log(`\n✅ 备份完成: ${backupPath}`);
  } catch (error) {
    console.error('❌ 备份失败:', error.message);
    console.log('\n💡 确保已安装 pg_dump 工具');
    console.log('   Ubuntu/Debian: sudo apt-get install postgresql-client');
    console.log('   macOS: brew install postgresql');
    console.log('   Windows: 安装 PostgreSQL 客户端工具');
  }
}

// 重置数据库
async function reset() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('⚠️  重置数据库将删除所有数据！\n');

    const confirm = await new Promise(resolve => {
      rl.question('确认重置数据库？输入 "RESET" 确认: ', resolve);
    });

    if (confirm !== 'RESET') {
      console.log('❌ 重置已取消');
      return;
    }

    console.log('\n🗑️  删除所有表...');
    await dropAllTables();

    console.log('🔄 重新初始化数据库...');
    const { initializeDatabase } = await import('./init.js');
    await initializeDatabase();

  } finally {
    rl.close();
  }
}

// 清理测试数据
async function cleanTestData() {
  console.log('🧹 清理测试数据...\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 删除测试相关数据
    const tables = [
      'performance_test_results',
      'security_test_results',
      'api_test_results',
      'stress_test_results',
      'compatibility_test_results',
      'seo_test_results',
      'ux_test_results',
      'infrastructure_test_results',
      'test_executions',
      'test_reports'
    ];

    for (const table of tables) {
      const result = await client.query(`DELETE FROM ${table}`);
      console.log(`🗑️  ${table}: 删除 ${result.rowCount} 条记录`);
    }

    await client.query('COMMIT');
    console.log('\n✅ 测试数据清理完成');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 清理失败:', error.message);
  } finally {
    client.release();
  }
}

// 主函数
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;
      case 'create-admin':
        await createAdmin();
        break;
      case 'backup':
        await backup();
        break;
      case 'reset':
        await reset();
        break;
      case 'clean':
        await cleanTestData();
        break;
      default:
        console.log('📋 可用命令:');
        console.log('  npm run db:status      - 显示数据库状态');
        console.log('  npm run db:create-admin - 创建管理员用户');
        console.log('  npm run db:backup      - 备份数据库');
        console.log('  npm run db:reset       - 重置数据库');
        console.log('  npm run db:clean       - 清理测试数据');
        break;
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  backup, cleanTestData, createAdmin, reset, showStatus
};

