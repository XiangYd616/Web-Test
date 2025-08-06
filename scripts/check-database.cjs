#!/usr/bin/env node

/**
 * 检查数据库连接和表结构
 */

const { query } = require('../server/config/database');

async function checkDatabase() {
  try {
    console.log('🔍 检查数据库连接...');

    // 检查数据库连接
    const connectionTest = await query('SELECT NOW() as current_time');
    console.log('✅ 数据库连接正常:', connectionTest.rows[0].current_time);

    // 检查test_history表结构
    console.log('\n📋 检查test_history表结构...');
    const tableStructure = await query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'test_history' 
      ORDER BY ordinal_position
    `);

    if (tableStructure.rows.length === 0) {
      console.log('❌ test_history表不存在');
      return false;
    }

    console.log('✅ test_history表结构:');
    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // 检查现有记录数量
    console.log('\n📊 检查现有记录...');
    const recordCount = await query('SELECT COUNT(*) as count FROM test_sessions WHERE deleted_at IS NULL');
    console.log(`✅ 当前记录数量: ${recordCount.rows[0].count}`);

    // 检查最近的记录
    const recentRecords = await query(`
      SELECT id, test_name, test_type, status, created_at
      FROM test_sessions
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (recentRecords.rows.length > 0) {
      console.log('\n📝 最近的测试记录:');
      recentRecords.rows.forEach(record => {
        console.log(`  - ${record.id}: ${record.test_name} (${record.test_type}) - ${record.status}`);
      });
    } else {
      console.log('\n📝 暂无测试记录');
    }

    return true;
  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
    return false;
  }
}

async function testAPI() {
  try {
    console.log('\n🌐 测试API端点...');

    const fetch = (await import('node-fetch')).default;

    // 测试测试历史API
    const response = await fetch('http://localhost:3001/api/test/history');
    const data = await response.json();

    console.log('✅ API响应:', {
      status: response.status,
      success: data.success,
      dataLength: data.data?.tests?.length || 0
    });

    return true;
  } catch (error) {
    console.error('❌ API测试失败:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 开始检查数据库和API状态...\n');

  const dbOk = await checkDatabase();
  const apiOk = await testAPI();

  console.log('\n📊 检查结果:');
  console.log(`  数据库: ${dbOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`  API: ${apiOk ? '✅ 正常' : '❌ 异常'}`);

  if (dbOk && apiOk) {
    console.log('\n🎉 系统状态正常，可以进行压力测试！');
  } else {
    console.log('\n⚠️ 系统存在问题，需要修复后才能正常使用。');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkDatabase, testAPI };
