/**
 * 数据库初始化执行脚本
 * 用于创建核心数据库表结构
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

async function runInit() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔗 连接到数据库...');
    console.log(`数据库: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    
    // 测试连接
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 显示当前的表
    console.log('\n📋 当前数据库中的表:');
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   (无表)');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}`);
      });
    }
    
    console.log('\n🏗️  开始创建核心表结构...');
    
    // 读取初始化脚本
    const initScriptPath = path.join(__dirname, 'init-database.sql');
    const initScript = fs.readFileSync(initScriptPath, 'utf8');
    
    // 执行初始化脚本
    await client.query(initScript);
    
    console.log('✅ 核心表结构创建完成');
    
    // 显示创建后的表
    console.log('\n📋 创建后的表:');
    const newTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    newTablesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });
    
    // 验证核心表是否创建成功
    const expectedTables = ['users', 'user_preferences', 'user_sessions', 'system_settings'];
    const createdTables = newTablesResult.rows.map(row => row.tablename);
    
    console.log('\n✅ 核心表验证:');
    expectedTables.forEach(table => {
      if (createdTables.includes(table)) {
        console.log(`   ✅ ${table} - 已创建`);
      } else {
        console.log(`   ❌ ${table} - 未创建`);
      }
    });
    
    // 检查系统配置是否插入成功
    const settingsResult = await client.query('SELECT COUNT(*) as count FROM system_settings');
    const settingsCount = parseInt(settingsResult.rows[0].count);
    console.log(`\n📊 系统配置记录: ${settingsCount} 条`);
    
    client.release();
    
    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📝 下一步操作:');
    console.log('1. 创建测试历史主从表:');
    console.log('   psql -d your_database -f server/scripts/master-detail-test-history-schema.sql');
    console.log('2. 或者运行:');
    console.log('   node server/scripts/run-test-history-init.js');
    console.log('3. 创建管理员用户:');
    console.log('   node server/scripts/create-admin.js');
    
  } catch (error) {
    console.error('❌ 初始化过程中发生错误:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 检查是否直接运行此脚本
if (require.main === module) {
  console.log('🏗️  数据库初始化工具');
  console.log('====================');
  
  runInit().catch(console.error);
}

module.exports = { runInit };
