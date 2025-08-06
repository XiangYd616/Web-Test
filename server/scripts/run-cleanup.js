/**
 * 数据库清理执行脚本
 * 用于清理旧的数据库表结构
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

async function runCleanup() {
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
    
    // 询问用户确认
    console.log('\n⚠️  警告: 此操作将删除上述所有旧表和数据！');
    console.log('这是不可逆的操作，请确保你在开发环境中操作。');
    
    // 在Node.js环境中，我们直接执行（因为这是开发环境）
    console.log('\n🗑️  开始执行清理...');
    
    // 读取清理脚本
    const cleanupScriptPath = path.join(__dirname, 'cleanup-current-database.sql');
    const cleanupScript = fs.readFileSync(cleanupScriptPath, 'utf8');
    
    // 执行清理脚本
    await client.query(cleanupScript);
    
    console.log('✅ 清理脚本执行完成');
    
    // 显示清理后的表
    console.log('\n📋 清理后剩余的表:');
    const remainingTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    if (remainingTablesResult.rows.length === 0) {
      console.log('   (无表)');
    } else {
      remainingTablesResult.rows.forEach(row => {
        console.log(`   - ${row.tablename}`);
      });
    }
    
    // 显示剩余的视图
    console.log('\n📋 剩余的视图:');
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
    
    client.release();
    
    console.log('\n🎉 数据库清理完成！');
    console.log('\n📝 下一步操作:');
    console.log('1. 如果需要创建核心表，执行:');
    console.log('   node server/scripts/run-init.js');
    console.log('2. 创建测试历史主从表，执行:');
    console.log('   psql -d your_database -f server/scripts/master-detail-test-history-schema.sql');
    
  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 检查是否直接运行此脚本
if (require.main === module) {
  console.log('🧹 数据库清理工具');
  console.log('==================');
  
  // 检查环境变量
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'development') {
    console.log('⚠️  建议在开发环境中运行此脚本');
    console.log('设置环境变量: NODE_ENV=development');
  }
  
  runCleanup().catch(console.error);
}

module.exports = { runCleanup };
