/**
 * 检查测试历史数据的脚本
 * 用于诊断数据加载问题
 */

const { query } = require('../config/database');

async function checkTestHistory() {
  console.log('🔍 检查测试历史数据...\n');

  try {
    // 1. 检查表是否存在
    console.log('1. 检查 test_history 表是否存在...');
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'test_history'
      );
    `);
    console.log('✅ 表存在:', tableExists.rows[0].exists);

    if (!tableExists.rows[0].exists) {
      console.log('❌ test_history 表不存在！');
      return;
    }

    // 2. 检查表结构
    console.log('\n2. 检查表结构...');
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'test_history' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 表字段:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // 3. 检查数据总数
    console.log('\n3. 检查数据总数...');
    const totalCount = await query('SELECT COUNT(*) as total FROM test_history');
    console.log('📊 总记录数:', totalCount.rows[0].total);

    if (totalCount.rows[0].total === '0') {
      console.log('⚠️ 没有测试记录数据');
      return;
    }

    // 4. 检查最近的记录
    console.log('\n4. 检查最近的记录...');
    const recentRecords = await query(`
      SELECT id, test_name, test_type, url, status, 
             start_time, end_time, created_at, updated_at
      FROM test_history 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('📝 最近的记录:');
    recentRecords.rows.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.id}`);
      console.log(`     名称: ${record.test_name}`);
      console.log(`     类型: ${record.test_type}`);
      console.log(`     URL: ${record.url}`);
      console.log(`     状态: ${record.status}`);
      console.log(`     创建时间: ${record.created_at}`);
      console.log(`     开始时间: ${record.start_time}`);
      console.log(`     结束时间: ${record.end_time}`);
      console.log('');
    });

    // 5. 检查压力测试记录
    console.log('5. 检查压力测试记录...');
    const stressTests = await query(`
      SELECT COUNT(*) as count 
      FROM test_history 
      WHERE test_type = 'stress'
    `);
    console.log('🏋️ 压力测试记录数:', stressTests.rows[0].count);

    // 6. 检查时间字段
    console.log('\n6. 检查时间字段完整性...');
    const timeFields = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(created_at) as has_created_at,
        COUNT(start_time) as has_start_time,
        COUNT(end_time) as has_end_time,
        COUNT(updated_at) as has_updated_at
      FROM test_history
    `);
    
    const timeStats = timeFields.rows[0];
    console.log('⏰ 时间字段统计:');
    console.log(`  - 总记录: ${timeStats.total}`);
    console.log(`  - 有 created_at: ${timeStats.has_created_at}`);
    console.log(`  - 有 start_time: ${timeStats.has_start_time}`);
    console.log(`  - 有 end_time: ${timeStats.has_end_time}`);
    console.log(`  - 有 updated_at: ${timeStats.has_updated_at}`);

    // 7. 测试查询语句
    console.log('\n7. 测试实际的查询语句...');
    const testQuery = await query(`
      SELECT id, test_name, test_type, url, status, start_time, end_time,
             duration, config, results, created_at, updated_at, overall_score
      FROM test_history
      WHERE test_type = 'stress'
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('🧪 查询结果:');
    if (testQuery.rows.length === 0) {
      console.log('  ⚠️ 没有查询到压力测试记录');
    } else {
      testQuery.rows.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.test_name} (${record.status})`);
        console.log(`     创建时间: ${record.created_at}`);
        console.log(`     开始时间: ${record.start_time}`);
      });
    }

    console.log('\n✅ 检查完成！');

  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
    console.error('错误详情:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkTestHistory()
    .then(() => {
      console.log('\n🎉 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { checkTestHistory };
