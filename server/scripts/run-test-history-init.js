/**
 * 测试历史表初始化执行脚本
 * 用于创建测试历史主从表结构
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'test_web_app',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function runTestHistoryInit() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔗 连接到数据库...');
    console.log(`数据库: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    
    // 测试连接
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 检查核心表是否存在
    console.log('\n🔍 检查核心表是否存在...');
    const coreTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('users', 'user_preferences', 'user_sessions', 'system_settings')
      ORDER BY tablename
    `);
    
    const coreTables = coreTablesResult.rows.map(row => row.tablename);
    const expectedCoreTables = ['users', 'user_preferences', 'user_sessions', 'system_settings'];
    
    expectedCoreTables.forEach(table => {
      if (coreTables.includes(table)) {
        console.log(`   ✅ ${table} - 存在`);
      } else {
        console.log(`   ⚠️  ${table} - 不存在`);
      }
    });
    
    if (coreTables.length < expectedCoreTables.length) {
      console.log('\n⚠️  建议先运行核心表初始化:');
      console.log('   node server/scripts/run-init.js');
    }
    
    // 显示当前的表
    console.log('\n📋 当前数据库中的表:');
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });
    
    console.log('\n🏗️  开始创建测试历史主从表结构...');
    
    // 读取测试历史表创建脚本
    const testHistoryScriptPath = path.join(__dirname, 'master-detail-test-history-schema.sql');
    const testHistoryScript = fs.readFileSync(testHistoryScriptPath, 'utf8');
    
    // 执行测试历史表创建脚本
    await client.query(testHistoryScript);
    
    console.log('✅ 测试历史主从表结构创建完成');
    
    // 显示创建后的表
    console.log('\n📋 创建后的所有表:');
    const allTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    allTablesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });
    
    // 验证测试历史表是否创建成功
    const expectedTestTables = [
      'test_sessions',
      'stress_test_details',
      'security_test_details',
      'api_test_details',
      'seo_test_details',
      'accessibility_test_details',
      'compatibility_test_details',
      'performance_test_details',
      'test_artifacts'
    ];
    
    const allTables = allTablesResult.rows.map(row => row.tablename);
    
    console.log('\n✅ 测试历史表验证:');
    expectedTestTables.forEach(table => {
      if (allTables.includes(table)) {
        console.log(`   ✅ ${table} - 已创建`);
      } else {
        console.log(`   ❌ ${table} - 未创建`);
      }
    });
    
    // 检查视图是否创建成功
    console.log('\n📋 创建的视图:');
    const viewsResult = await client.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public' 
      ORDER BY viewname
    `);
    
    if (viewsResult.rows.length === 0) {
      console.log('   (无视图)');
    } else {
      viewsResult.rows.forEach(row => {
        console.log(`   - ${row.viewname}`);
      });
    }
    
    // 检查索引是否创建成功
    console.log('\n📋 创建的索引:');
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname NOT LIKE '%pkey'
      ORDER BY indexname
    `);
    
    console.log(`   总计: ${indexesResult.rows.length} 个索引`);
    
    client.release();
    
    console.log('\n🎉 测试历史表初始化完成！');
    console.log('\n📝 下一步操作:');
    console.log('1. 启动应用程序并测试API');
    console.log('2. 创建管理员用户:');
    console.log('   node server/scripts/create-admin.js');
    console.log('3. 测试前端测试页面历史标签页功能');
    
  } catch (error) {
    console.error('❌ 测试历史表初始化过程中发生错误:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 检查是否直接运行此脚本
if (require.main === module) {
  console.log('🧪 测试历史表初始化工具');
  console.log('========================');
  
  runTestHistoryInit().catch(console.error);
}

module.exports = { runTestHistoryInit };
