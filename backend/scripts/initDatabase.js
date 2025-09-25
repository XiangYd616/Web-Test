/**
 * 数据库初始化脚本 - PostgreSQL版本
 * 创建所有必要的表和初始数据，与Sequelize模型保持同步
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// 导入数据库配置
const dbConfigModule = require('../config/database');

// 获取当前环境配置
const environment = process.env.NODE_ENV || 'development';

// 从配置模块获取数据库配置
const config = dbConfigModule.getDatabaseConfig ? dbConfigModule.getDatabaseConfig() : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

console.log('🚀 Test-Web数据库初始化脚本');
console.log('📊 环境:', environment);
console.log('🔧 数据库配置:', {
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user || config.username
});

// 创建连接池
const pool = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user || config.username,
  password: config.password
});

/**
 * 创建表的SQL语句 - 与Sequelize模型保持同步
 */
const createTables = {
  // 用户表
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      profile JSONB DEFAULT '{}',
      preferences JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 测试记录表 (与Sequelize Test模型对应)
  tests: `
    CREATE TABLE IF NOT EXISTS tests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      url TEXT NOT NULL,
      config JSONB DEFAULT '{}',
      results JSONB DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'pending',
      user_id UUID REFERENCES users(id),
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 配置模板表 (与Sequelize ConfigTemplate模型对应)
  config_templates: `
    CREATE TABLE IF NOT EXISTS config_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      config JSONB NOT NULL,
      description TEXT,
      is_default BOOLEAN DEFAULT false,
      is_public BOOLEAN DEFAULT false,
      user_id UUID REFERENCES users(id),
      usage_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 测试历史表
  test_history: `
    CREATE TABLE IF NOT EXISTS test_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_id UUID REFERENCES tests(id),
      user_id UUID REFERENCES users(id),
      action VARCHAR(100) NOT NULL,
      details JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 网站信息表
  websites: `
    CREATE TABLE IF NOT EXISTS websites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      url TEXT NOT NULL,
      name VARCHAR(255),
      description TEXT,
      category VARCHAR(50),
      metadata JSONB DEFAULT '{}',
      last_tested TIMESTAMP,
      test_count INTEGER DEFAULT 0,
      average_score REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // API密钥表
  api_keys: `
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      key_hash VARCHAR(255) UNIQUE NOT NULL,
      permissions JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      expires_at TIMESTAMP,
      last_used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 用户偏好表 (新增，与databaseService对应)
  user_preferences: `
    CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES users(id),
      preferences JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 系统配置表
  system_config: `
    CREATE TABLE IF NOT EXISTS system_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR(255) UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      type VARCHAR(50) DEFAULT 'string',
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 测试队列表
  test_queue: `
    CREATE TABLE IF NOT EXISTS test_queue (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('api', 'compatibility', 'infrastructure', 'security', 'seo', 'stress', 'ux', 'website')),
      target_url TEXT NOT NULL,
      config JSONB DEFAULT '{}',
      priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
      assigned_worker VARCHAR(100),
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `,

  // 测试统计表
  test_statistics: `
    CREATE TABLE IF NOT EXISTS test_statistics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE NOT NULL,
      test_type VARCHAR(50) NOT NULL,
      user_id UUID REFERENCES users(id),
      total_tests INTEGER DEFAULT 0,
      successful_tests INTEGER DEFAULT 0,
      failed_tests INTEGER DEFAULT 0,
      avg_duration FLOAT DEFAULT 0,
      avg_score FLOAT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, test_type, user_id)
    )
  `,

  // 项目管理表
  projects: `
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      target_url TEXT,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived', 'deleted')),
      settings JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      test_count INTEGER DEFAULT 0,
      last_test_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 测试报告表
  test_reports: `
    CREATE TABLE IF NOT EXISTS test_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('comprehensive', 'performance', 'security', 'comparison', 'trend', 'summary')),
      format VARCHAR(20) DEFAULT 'html' CHECK (format IN ('html', 'pdf', 'json', 'csv', 'xlsx')),
      test_ids JSONB NOT NULL,
      configuration JSONB DEFAULT '{}',
      filters JSONB DEFAULT '{}',
      status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'expired', 'cancelled')),
      file_path TEXT,
      file_name VARCHAR(255),
      file_size INTEGER,
      file_hash VARCHAR(64),
      is_public BOOLEAN DEFAULT false,
      generated_at TIMESTAMP,
      expires_at TIMESTAMP,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 系统指标表
  system_metrics: `
    CREATE TABLE IF NOT EXISTS system_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      metric_type VARCHAR(50) NOT NULL,
      metric_name VARCHAR(100) NOT NULL,
      metric_category VARCHAR(50),
      value FLOAT NOT NULL,
      unit VARCHAR(20),
      tags JSONB DEFAULT '{}',
      labels JSONB DEFAULT '{}',
      source VARCHAR(100),
      host VARCHAR(100),
      service VARCHAR(100),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // 系统健康检查表
  system_health_checks: `
    CREATE TABLE IF NOT EXISTS system_health_checks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_name VARCHAR(100) NOT NULL,
      service_type VARCHAR(50) NOT NULL,
      endpoint VARCHAR(255),
      status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'degraded', 'unknown')),
      response_time INTEGER,
      success BOOLEAN DEFAULT true,
      error_message TEXT,
      error_code VARCHAR(50),
      details JSONB DEFAULT '{}',
      metrics JSONB DEFAULT '{}',
      check_type VARCHAR(50) DEFAULT 'ping',
      timeout_ms INTEGER DEFAULT 5000,
      checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      next_check_at TIMESTAMP
    )
  `,

  // 用户会话表
  user_sessions: `
    CREATE TABLE IF NOT EXISTS user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token VARCHAR(255) UNIQUE NOT NULL,
      refresh_token VARCHAR(255) UNIQUE,
      ip_address INET,
      user_agent TEXT,
      device_type VARCHAR(50),
      browser VARCHAR(100),
      os VARCHAR(100),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'invalid')),
      expires_at TIMESTAMP NOT NULL,
      last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      login_method VARCHAR(50) DEFAULT 'password',
      is_secure BOOLEAN DEFAULT true,
      session_data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
};

/**
 * 创建索引 - 优化查询性能
 */
const createIndexes = [
  // 用户表索引
  'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
  'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',

  // 测试表索引
  'CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_tests_type ON tests(type)',
  'CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status)',
  'CREATE INDEX IF NOT EXISTS idx_tests_url ON tests(url)',
  'CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_tests_type_status ON tests(type, status)',

  // 配置模板表索引
  'CREATE INDEX IF NOT EXISTS idx_config_templates_type ON config_templates(type)',
  'CREATE INDEX IF NOT EXISTS idx_config_templates_user_id ON config_templates(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_config_templates_is_default ON config_templates(is_default)',
  'CREATE INDEX IF NOT EXISTS idx_config_templates_is_public ON config_templates(is_public)',

  // 测试历史表索引
  'CREATE INDEX IF NOT EXISTS idx_test_history_test_id ON test_history(test_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_history_user_id ON test_history(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_history_timestamp ON test_history(timestamp)',

  // 网站表索引
  'CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_websites_url ON websites(url)',
  'CREATE INDEX IF NOT EXISTS idx_websites_category ON websites(category)',

  // API密钥表索引
  'CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)',
  'CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active)',

  // 用户偏好表索引
  'CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)',

  // 系统配置表索引
  'CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key)',
  'CREATE INDEX IF NOT EXISTS idx_system_config_type ON system_config(type)',

  // 测试队列表索引
  'CREATE INDEX IF NOT EXISTS idx_test_queue_status ON test_queue(status)',
  'CREATE INDEX IF NOT EXISTS idx_test_queue_test_type ON test_queue(test_type)',
  'CREATE INDEX IF NOT EXISTS idx_test_queue_user_id ON test_queue(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_queue_priority ON test_queue(priority)',
  'CREATE INDEX IF NOT EXISTS idx_test_queue_created_at ON test_queue(created_at)',

  // 测试统计表索引
  'CREATE INDEX IF NOT EXISTS idx_test_statistics_date ON test_statistics(date)',
  'CREATE INDEX IF NOT EXISTS idx_test_statistics_test_type ON test_statistics(test_type)',
  'CREATE INDEX IF NOT EXISTS idx_test_statistics_user_id ON test_statistics(user_id)',

  // JSONB字段的GIN索引
  'CREATE INDEX IF NOT EXISTS idx_tests_config_gin ON tests USING GIN (config)',
  'CREATE INDEX IF NOT EXISTS idx_tests_results_gin ON tests USING GIN (results)',
  'CREATE INDEX IF NOT EXISTS idx_config_templates_config_gin ON config_templates USING GIN (config)',
  'CREATE INDEX IF NOT EXISTS idx_test_history_details_gin ON test_history USING GIN (details)',
  'CREATE INDEX IF NOT EXISTS idx_test_queue_config_gin ON test_queue USING GIN (config)',

  // 项目管理表索引
  'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)',
  'CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)',
  'CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_projects_settings_gin ON projects USING GIN (settings)',
  'CREATE INDEX IF NOT EXISTS idx_projects_metadata_gin ON projects USING GIN (metadata)',

  // 测试报告表索引
  'CREATE INDEX IF NOT EXISTS idx_test_reports_user_id ON test_reports(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_reports_session_id ON test_reports(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_test_reports_status ON test_reports(status)',
  'CREATE INDEX IF NOT EXISTS idx_test_reports_type ON test_reports(report_type)',
  'CREATE INDEX IF NOT EXISTS idx_test_reports_file_format ON test_reports(file_format)',
  'CREATE INDEX IF NOT EXISTS idx_test_reports_created_at ON test_reports(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_test_reports_content_gin ON test_reports USING GIN (content)',
  'CREATE INDEX IF NOT EXISTS idx_test_reports_summary_gin ON test_reports USING GIN (summary)',

  // 系统指标表索引
  'CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type)',
  'CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name)',
  'CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_system_metrics_type_time ON system_metrics(metric_type, timestamp)',
  'CREATE INDEX IF NOT EXISTS idx_system_metrics_tags_gin ON system_metrics USING GIN (tags)',

  // 系统健康检查表索引
  'CREATE INDEX IF NOT EXISTS idx_system_health_checks_service_name ON system_health_checks(service_name)',
  'CREATE INDEX IF NOT EXISTS idx_system_health_checks_service_type ON system_health_checks(service_type)',
  'CREATE INDEX IF NOT EXISTS idx_system_health_checks_status ON system_health_checks(status)',
  'CREATE INDEX IF NOT EXISTS idx_system_health_checks_checked_at ON system_health_checks(checked_at)',

  // 用户会话表索引
  'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)',
  'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)',
  'CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at)',

  // 测试表额外索引
  'CREATE INDEX IF NOT EXISTS idx_tests_type_status ON tests(type, status)',
  'CREATE INDEX IF NOT EXISTS idx_tests_user_created ON tests(user_id, created_at)'
];

/**
 * 初始数据
 */
const initialData = {
  system_config: [
    {
      key: 'app_version',
      value: '2.0.0',
      description: 'Test-Web应用版本号',
      type: 'string',
      is_public: true
    },
    {
      key: 'max_concurrent_tests',
      value: '10',
      description: '最大并发测试数',
      type: 'number',
      is_public: false
    },
    {
      key: 'default_test_timeout',
      value: '300000',
      description: '默认测试超时时间(毫秒)',
      type: 'number',
      is_public: false
    },
    {
      key: 'enable_test_queue',
      value: 'true',
      description: '启用测试队列功能',
      type: 'boolean',
      is_public: false
    },
    {
      key: 'enable_background_tests',
      value: 'true',
      description: '启用后台测试功能',
      type: 'boolean',
      is_public: false
    },
    {
      key: 'max_test_history',
      value: '1000',
      description: '最大测试历史记录数',
      type: 'number',
      is_public: false
    },
    {
      key: 'enable_auto_backup',
      value: 'true',
      description: '启用自动数据库备份',
      type: 'boolean',
      is_public: false
    }
  ],

  config_templates: [
    {
      name: '基础性能测试',
      type: 'performance',
      description: '标准的网站性能测试配置',
      config: {
        device: 'desktop',
        throttling: 'none',
        categories: ['performance', 'accessibility'],
        timeout: 60000
      },
      is_default: true,
      is_public: true
    },
    {
      name: '移动端性能测试',
      type: 'performance',
      description: '针对移动设备的性能测试配置',
      config: {
        device: 'mobile',
        throttling: '3g',
        categories: ['performance'],
        timeout: 90000
      },
      is_default: false,
      is_public: true
    },
    {
      name: 'API接口测试',
      type: 'api',
      description: 'RESTful API接口测试配置',
      config: {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: process.env.REQUEST_TIMEOUT || 30000,
        validateResponse: true
      },
      is_default: false,
      is_public: true
    },
    {
      name: '安全性测试',
      type: 'security',
      description: '网站安全性检查配置',
      config: {
        checks: ['ssl', 'headers', 'vulnerabilities', 'cookies'],
        depth: 'basic',
        timeout: 120000
      },
      is_default: false,
      is_public: true
    },
    {
      name: 'SEO优化检查',
      type: 'seo',
      description: '搜索引擎优化检查配置',
      config: {
        checks: ['meta', 'headings', 'images', 'links', 'structured-data', 'robots', 'sitemap'],
        depth: 'comprehensive',
        timeout: 90000
      },
      is_default: false,
      is_public: true
    },
    {
      name: '浏览器兼容性测试',
      type: 'compatibility',
      description: '多浏览器兼容性测试配置',
      config: {
        browsers: ['chrome', 'firefox', 'safari', 'edge'],
        devices: ['desktop', 'mobile', 'tablet'],
        testTypes: ['css', 'javascript', 'html5'],
        timeout: 180000
      },
      is_default: false,
      is_public: true
    }
  ],

  // 系统健康检查初始数据
  system_health_checks: [
    {
      service_name: 'database',
      service_type: 'database',
      endpoint: 'postgresql://localhost:5432',
      status: 'healthy',
      details: {
        connection_pool: 'active',
        max_connections: 100,
        active_connections: 5
      }
    },
    {
      service_name: 'redis',
      service_type: 'cache',
      endpoint: 'redis://localhost:6379',
      status: 'healthy',
      details: {
        memory_usage: 'normal',
        connected_clients: 2
      }
    },
    {
      service_name: 'api_server',
      service_type: 'api',
      endpoint: 'http://${process.env.BACKEND_HOST || 'localhost'}:${process.env.BACKEND_PORT || 3001}/health',
      status: 'healthy',
      details: {
        uptime: 'running',
        version: '2.0.0'
      }
    }
  ]
};

/**
 * 初始化数据库
 */
async function initializeDatabase() {
  const client = await pool.connect();

  try {
    console.log('🚀 开始初始化Test-Web数据库...');

    // 开始事务
    await client.query('BEGIN');

    // 1. 创建扩展
    try {
      // PostgreSQL 13+ 内置 gen_random_uuid()，但为了兼容性也创建 uuid-ossp
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      console.log('✅ UUID扩展创建成功');
    } catch (error) {
      console.log('⚠️ UUID扩展创建失败，使用内置函数:', error.message);
      // PostgreSQL 13+ 有内置的 gen_random_uuid()，不需要扩展
    }

    // 2. 创建表
    let tableCount = 0;
    for (const [tableName, sql] of Object.entries(createTables)) {
      try {
        await client.query(sql);
        console.log(`✅ 表 ${tableName} 创建成功`);
        tableCount++;
      } catch (error) {
        console.error(`❌ 创建表 ${tableName} 失败:`, error.message);
        throw error;
      }
    }
    console.log(`📊 共创建 ${tableCount} 个数据表`);

    // 3. 创建索引 (使用保存点处理失败)
    console.log('🔍 创建索引...');
    let indexCount = 0;
    for (const sql of createIndexes) {
      try {
        // 为每个索引创建保存点
        await client.query('SAVEPOINT index_creation');
        await client.query(sql);
        await client.query('RELEASE SAVEPOINT index_creation');
        indexCount++;
      } catch (error) {
        console.error(`❌ 创建索引失败: ${error.message}`);
        console.error(`❌ 失败的SQL: ${sql}`);
        // 回滚到保存点，继续执行下一个索引
        try {
          await client.query('ROLLBACK TO SAVEPOINT index_creation');
        } catch (rollbackError) {
          console.error(`❌ 回滚保存点失败:`, rollbackError.message);
        }
      }
    }
    console.log(`✅ 共创建 ${indexCount} 个索引`);

    // 4. 插入初始数据
    let dataCount = 0;

    for (const [tableName, records] of Object.entries(initialData)) {
      for (const record of records) {
        try {
          // 为每个数据插入创建保存点
          await client.query('SAVEPOINT data_insertion');

          const columns = Object.keys(record);
          const values = Object.values(record);
          const placeholders = columns.map((_, index) => `$${index + 1}`);

          // 处理JSONB字段
          const processedValues = values.map(value => {
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value);
            }
            return value;
          });

          const sql = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
            ON CONFLICT DO NOTHING
          `;

          const result = await client.query(sql, processedValues);
          await client.query('RELEASE SAVEPOINT data_insertion');

          if (result.rowCount > 0) {
            dataCount++;
          }
        } catch (error) {
          console.error(`❌ 插入数据到 ${tableName} 失败: ${error.message}`);
          // 回滚到保存点，继续执行下一个插入
          try {
            await client.query('ROLLBACK TO SAVEPOINT data_insertion');
          } catch (rollbackError) {
            console.error(`❌ 回滚保存点失败:`, rollbackError.message);
          }
        }
      }
      console.log(`✅ 表 ${tableName} 初始数据插入完成`);
    }
    console.log(`📊 共插入 ${dataCount} 条初始数据`);

    // 提交事务
    await client.query('COMMIT');


    // 显示数据库统计信息
    await showDatabaseStats(client);

  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK');
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 显示数据库统计信息
 */
async function showDatabaseStats(client) {
  try {
    console.log('📊 数据库统计信息:');

    // 获取表信息
    const tablesResult = await client.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    tablesResult.rows.forEach(row => {
    });

    // 获取索引信息
    const indexesResult = await client.query(`
      SELECT COUNT(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);

    console.log(`🔍 索引: ${indexesResult.rows[0].index_count} 个`);

    // 获取数据统计
    const dataStats = [];
    for (const tableName of Object.keys(createTables)) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        dataStats.push({
          table: tableName,
          count: parseInt(countResult.rows[0].count)
        });
      } catch (error) {
        // 忽略统计错误
      }
    }

    console.log('📊 数据统计:');
    dataStats.forEach(stat => {
    });

  } catch (error) {
    console.error('❌ 获取数据库统计信息失败:', error.message);
  }
}

/**
 * 检查数据库连接状态
 */
async function checkDatabaseStatus() {
  const client = await pool.connect();

  try {
    // 测试连接
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ 数据库连接正常');

    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 清理数据库 (危险操作)
 */
async function cleanDatabase() {
  const client = await pool.connect();

  try {
    console.log('⚠️ 开始清理数据库...');

    await client.query('BEGIN');

    // 删除所有表 (按依赖关系逆序)
    const tablesToDrop = Object.keys(createTables).reverse();

    for (const tableName of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
      } catch (error) {
        console.error(`❌ 删除表 ${tableName} 失败:`, error.message);
      }
    }

    await client.query('COMMIT');
    console.log('✅ 数据库清理完成');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 数据库清理失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 重置数据库 (清理后重新初始化)
 */
async function resetDatabase() {

  try {
    await cleanDatabase();
    await initializeDatabase();
    console.log('✅ 数据库重置完成');
  } catch (error) {
    console.error('❌ 数据库重置失败:', error);
    throw error;
  }
}

/**
 * 关闭数据库连接池
 */
async function closeDatabase() {
  try {
    await pool.end();
    console.log('✅ 数据库连接池已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接池失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {
      console.log('🚀 Test-Web数据库初始化脚本启动');

      // 检查命令行参数
      const args = process.argv.slice(2);
      const command = args[0] || 'init';

      switch (command) {
        case 'init':
          await checkDatabaseStatus();
          await initializeDatabase();
          break;

        case 'reset':
          await checkDatabaseStatus();
          await resetDatabase();
          break;

        case 'clean':
          await checkDatabaseStatus();
          await cleanDatabase();
          break;

        case 'status':
          console.log('📊 检查数据库状态...');
          await checkDatabaseStatus();
          const client = await pool.connect();
          await showDatabaseStats(client);
          client.release();
          break;

        default:
          console.log('❌ 未知命令:', command);
          process.exit(1);
      }

      console.log('✅ 数据库脚本执行完成');

    } catch (error) {
      console.error('❌ 数据库脚本执行失败:', error);
      process.exit(1);
    } finally {
      await closeDatabase();
      process.exit(0);
    }
  })();
}

module.exports = {
  initializeDatabase,
  checkDatabaseStatus,
  showDatabaseStats,
  cleanDatabase,
  resetDatabase,
  closeDatabase,
  pool
};
