#!/usr/bin/env node

import {
  closePool,
  executeSqlFile,
  getDatabaseInfo,
  tableExists,
  testConnection
} from './config.js';

async function initializeDatabase() {
  console.log('🚀 开始初始化数据库...\n');

  try {
    // 1. 测试数据库连接
    console.log('1️⃣  测试数据库连接...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('无法连接到数据库');
    }

    // 2. 检查是否已有表存在
    console.log('\n2️⃣  检查现有表结构...');
    const hasUsers = await tableExists('users');
    if (hasUsers) {
      console.log('⚠️  检测到现有表结构，建议先备份数据');
      console.log('   使用命令: npm run db:backup');

      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('是否继续初始化？这将覆盖现有表结构 (y/N): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ 初始化已取消');
        return;
      }
    }

    // 3. 执行数据库架构脚本
    console.log('\n3️⃣  创建数据库表结构...');
    await executeSqlFile('schema.sql');

    // 4. 执行初始数据脚本
    console.log('\n4️⃣  插入初始数据...');
    try {
      await executeSqlFile('initial_data.sql');
    } catch (err) {
      console.log('⚠️  初始数据插入失败（可能文件不存在）:', err.message);
    }

    // 5. 验证安装
    console.log('\n5️⃣  验证数据库安装...');
    const info = await getDatabaseInfo();
    console.log(`✅ 数据库版本: ${info.version.split(' ')[0]} ${info.version.split(' ')[1]}`);
    console.log(`✅ 数据库大小: ${info.size}`);
    console.log(`✅ 表数量: ${info.tableCount}`);

    // 6. 验证关键表
    const criticalTables = [
      'users', 'test_projects', 'test_configurations',
      'test_executions', 'performance_test_results',
      'security_test_results', 'api_test_results'
    ];

    console.log('\n6️⃣  验证关键表...');
    for (const table of criticalTables) {
      const exists = await tableExists(table);
      if (exists) {
        console.log(`✅ ${table}`);
      } else {
        console.log(`❌ ${table} - 表不存在`);
      }
    }

    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📋 下一步操作:');
    console.log('   1. 创建管理员用户: npm run db:create-admin');
    console.log('   2. 查看数据库状态: npm run db:status');
    console.log('   3. 启动应用程序: npm run dev');

  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase();
}

export { initializeDatabase };
