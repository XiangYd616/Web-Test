/**
 * PostgreSQL数据库初始化脚本
 * 创建所有必要的表和初始数据
 */

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
};

console.log('🔧 正在初始化PostgreSQL数据库...');
console.log('📊 数据库配置:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user
});

/**
 * 创建表的SQL语句
 */
const createTables = {
  // 用户表
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      is_active BOOLEAN DEFAULT true
    )
  `,

  // 测试记录表
  test_records: `
    CREATE TABLE IF NOT EXISTS test_records (
      id SERIAL PRIMARY KEY,
      test_id VARCHAR(36) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      test_type VARCHAR(50) NOT NULL,
      url TEXT NOT NULL,
      status VARCHAR(20) NOT NULL,
      config JSONB,
      result JSONB,
      error_message TEXT,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 测试历史表
  test_history: `
    CREATE TABLE IF NOT EXISTS test_history (
      id SERIAL PRIMARY KEY,
      test_id VARCHAR(36) NOT NULL,
      user_id INTEGER REFERENCES users(id),
      test_type VARCHAR(50) NOT NULL,
      url TEXT NOT NULL,
      status VARCHAR(20) NOT NULL,
      score INTEGER,
      duration INTEGER,
      config JSONB,
      result JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 系统配置表
  system_config: `
    CREATE TABLE IF NOT EXISTS system_config (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 测试队列表
  test_queue: `
    CREATE TABLE IF NOT EXISTS test_queue (
      id SERIAL PRIMARY KEY,
      test_id VARCHAR(36) UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      test_type VARCHAR(50) NOT NULL,
      priority INTEGER DEFAULT 0,
      config JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    )
  `,

  // API密钥表
  api_keys: `
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      key_name VARCHAR(100) NOT NULL,
      api_key VARCHAR(255) UNIQUE NOT NULL,
      permissions JSONB,
      is_active BOOLEAN DEFAULT true,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP
    )
  `,

  // 测试统计表
  test_statistics: `
    CREATE TABLE IF NOT EXISTS test_statistics (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      test_type VARCHAR(50) NOT NULL,
      total_tests INTEGER DEFAULT 0,
      successful_tests INTEGER DEFAULT 0,
      failed_tests INTEGER DEFAULT 0,
      avg_duration FLOAT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, test_type)
    )
  `
};

/**
 * 创建索引的SQL语句
 */
const createIndexes = [
  'CREATE INDEX IF NOT EXISTS idx_test_records_user_id ON test_records(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_records_test_type ON test_records(test_type)',
  'CREATE INDEX IF NOT EXISTS idx_test_records_status ON test_records(status)',
  'CREATE INDEX IF NOT EXISTS idx_test_records_created_at ON test_records(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_history_test_type ON test_history(test_type)',
  'CREATE INDEX IF NOT EXISTS idx_test_history_created_at ON test_history(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_test_queue_status ON test_queue(status)',
  'CREATE INDEX IF NOT EXISTS idx_test_queue_priority ON test_queue(priority)',
  'CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_statistics_date ON test_statistics(date)',
  'CREATE INDEX IF NOT EXISTS idx_test_statistics_test_type ON test_statistics(test_type)'
];

/**
 * 初始数据
 */
const initialData = {
  users: [
    {
      username: 'admin',
      email: 'admin@testweb.com',
      password_hash: '$2b$10$rQZ9QmjytWzQgwjvtpfzUeJ9oK8YrKzQgwjvtpfzUeJ9oK8YrKzQg', // password: admin123
      role: 'admin'
    },
    {
      username: 'demo',
      email: 'demo@testweb.com', 
      password_hash: '$2b$10$demo.hash.for.testing.purposes.only.demo.hash.for.testing', // password: demo123
      role: 'user'
    }
  ],
  
  system_config: [
    { key: 'app_name', value: 'Test-Web', description: '应用程序名称' },
    { key: 'app_version', value: '1.0.0', description: '应用程序版本' },
    { key: 'max_concurrent_tests', value: '10', description: '最大并发测试数' },
    { key: 'default_timeout', value: '30000', description: '默认超时时间(毫秒)' },
    { key: 'enable_registration', value: 'true', description: '是否允许用户注册' },
    { key: 'enable_guest_testing', value: 'true', description: '是否允许游客测试' }
  ]
};

/**
 * 初始化数据库
 */
async function initDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    
    // 测试连接
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 创建表
    for (const [tableName, sql] of Object.entries(createTables)) {
      try {
        await client.query(sql);
        console.log(`✅ 表 ${tableName} 创建成功`);
      } catch (error) {
        console.error(`❌ 创建表 ${tableName} 失败:`, error.message);
      }
    }
    
    // 创建索引
    console.log('🔍 正在创建索引...');
    for (const indexSql of createIndexes) {
      try {
        await client.query(indexSql);
      } catch (error) {
        console.error('❌ 创建索引失败:', error.message);
      }
    }
    console.log('✅ 索引创建完成');
    
    // 插入初始数据
    console.log('📊 正在插入初始数据...');
    
    // 插入用户数据
    for (const user of initialData.users) {
      try {
        const checkUser = await client.query('SELECT id FROM users WHERE username = $1', [user.username]);
        if (checkUser.rows.length === 0) {
          await client.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
            [user.username, user.email, user.password_hash, user.role]
          );
          console.log(`✅ 用户 ${user.username} 创建成功`);
        } else {
        }
      } catch (error) {
        console.error(`❌ 创建用户 ${user.username} 失败:`, error.message);
      }
    }
    
    // 插入系统配置
    for (const config of initialData.system_config) {
      try {
        const checkConfig = await client.query('SELECT id FROM system_config WHERE key = $1', [config.key]);
        if (checkConfig.rows.length === 0) {
          await client.query(
            'INSERT INTO system_config (key, value, description) VALUES ($1, $2, $3)',
            [config.key, config.value, config.description]
          );
          console.log(`✅ 配置 ${config.key} 创建成功`);
        } else {
        }
      } catch (error) {
        console.error(`❌ 创建配置 ${config.key} 失败:`, error.message);
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行初始化
if (require.main === module) {
  initDatabase().catch(console.error);
}

module.exports = { initDatabase, createTables, initialData };
