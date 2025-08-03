/**
 * 数据库初始化脚本
 * 使用环境变量配置，支持完整的数据库设置
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_prod',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
};

console.log('🔧 数据库初始化开始...');
console.log(`📍 连接到: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

async function initializeDatabase() {
  let pool;
  
  try {
    // 创建连接池
    pool = new Pool(dbConfig);

    console.log('🔌 测试数据库连接...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log(`✅ 数据库连接成功`);
    console.log(`⏰ 服务器时间: ${result.rows[0].current_time}`);
    console.log(`🗄️ PostgreSQL版本: ${result.rows[0].version.split(' ')[1]}`);
    client.release();
    
    // 读取并执行SQL脚本
    console.log('📜 读取数据库初始化脚本...');
    const sqlPath = path.join(__dirname, 'fix-database.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL脚本文件不存在: ${sqlPath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(`📄 脚本大小: ${(sqlContent.length / 1024).toFixed(2)} KB`);
    
    // 执行SQL脚本
    console.log('⚡ 执行数据库初始化脚本...');
    const startTime = Date.now();
    
    await pool.query(sqlContent);
    
    const duration = Date.now() - startTime;
    console.log(`✅ 数据库初始化完成，耗时: ${duration}ms`);
    
    // 验证表结构
    console.log('🔍 验证表结构...');
    await verifyTables(pool);
    
    // 显示统计信息
    console.log('📊 显示数据库统计信息...');
    await showDatabaseStats(pool);
    
    console.log('🎉 数据库初始化成功完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    
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

async function verifyTables(pool) {
  const expectedTables = [
    'users',
    'user_preferences', 
    'test_results',
    'activity_logs',
    'monitoring_sites',
    'monitoring_results',
    'data_tasks',
    'test_templates',
    'system_settings',
    'notifications'
  ];
  
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const actualTables = result.rows.map(row => row.table_name);
  const missingTables = expectedTables.filter(table => !actualTables.includes(table));
  const extraTables = actualTables.filter(table => !expectedTables.includes(table));
  
  console.log(`📋 预期表数量: ${expectedTables.length}`);
  console.log(`📋 实际表数量: ${actualTables.length}`);
  
  if (missingTables.length === 0) {
    console.log('✅ 所有必需的表都已创建');
  } else {
    console.log(`❌ 缺失表: ${missingTables.join(', ')}`);
  }
  
  if (extraTables.length > 0) {
    console.log(`ℹ️ 额外表: ${extraTables.join(', ')}`);
  }
  
  // 显示表详情
  for (const table of expectedTables) {
    if (actualTables.includes(table)) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  📊 ${table}: ${countResult.rows[0].count} 条记录`);
    }
  }
}

async function showDatabaseStats(pool) {
  try {
    // 数据库大小
    const sizeResult = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    console.log(`💾 数据库大小: ${sizeResult.rows[0].size}`);
    
    // 连接信息
    const connResult = await pool.query(`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    console.log(`🔗 活跃连接数: ${connResult.rows[0].active_connections}`);
    
    // 索引信息
    const indexResult = await pool.query(`
      SELECT count(*) as index_count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    console.log(`📇 索引数量: ${indexResult.rows[0].index_count}`);
    
  } catch (error) {
    console.warn('⚠️ 获取数据库统计信息失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
