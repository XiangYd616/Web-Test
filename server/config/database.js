/**
 * 数据库配置和连接管理
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const DatabaseConnectionManager = require('../utils/DatabaseConnectionManager');

// 数据库连接池和管理器
let pool = null;
let connectionManager = null;

// 根据环境自动选择数据库
const getDefaultDatabase = () => {
  return process.env.NODE_ENV === 'production' ? 'testweb_prod' : 'testweb_dev';
};

// 优化的数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || getDefaultDatabase(),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',

  // 连接池优化配置
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20, // 最大连接数
  min: parseInt(process.env.DB_MIN_CONNECTIONS) || 5,  // 最小连接数
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // 空闲超时
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, // 连接超时
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000, // 获取连接超时

  // 性能优化配置
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // SQL语句超时
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000, // 查询超时

  // SSL配置 (生产环境)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,

  // 应用名称 (便于监控)
  application_name: process.env.DB_APPLICATION_NAME || 'testweb_platform'
};

/**
 * 创建数据库连接池
 */
const createPool = () => {
  if (!pool) {
    pool = new Pool(dbConfig);

    // 连接池事件监听
    pool.on('connect', (client) => {
      console.log('🔗 新的数据库连接已建立');

      // 设置连接级别的优化参数
      client.query(`
        SET search_path TO public;
        SET timezone TO 'UTC';
        SET statement_timeout TO '${dbConfig.statement_timeout}ms';
        SET lock_timeout TO '10s';
        SET idle_in_transaction_session_timeout TO '60s';
      `).catch(err => {
        console.error('❌ 连接初始化失败:', err);
      });
    });

    pool.on('error', (err, client) => {
      console.error('❌ 数据库连接池错误:', err);

      // 记录错误详情用于监控
      if (process.env.NODE_ENV === 'production') {
        // 这里可以集成错误监控服务
        console.error('生产环境数据库错误:', {
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
      }
    });

    pool.on('acquire', (client) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📥 获取数据库连接');
      }
    });

    pool.on('release', (client) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📤 释放数据库连接');
      }
    });

    pool.on('remove', (client) => {
      console.log('🔌 数据库连接已移除');
    });
  }
  return pool;
};

/**
 * 连接数据库
 */
const connectDB = async () => {
  try {
    const dbPool = createPool();

    const client = await dbPool.connect();
    await client.query('SELECT NOW()');
    client.release();

    console.log(`✅ 数据库连接成功: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // 初始化数据库表
    await initializeTables();

    return dbPool;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    throw error;
  }
};

/**
 * 测试数据库连接
 */
const testConnection = async () => {
  try {
    const dbPool = getPool();
    const client = await dbPool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    throw error;
  }
};

/**
 * 获取连接池
 */
const getPool = () => {
  if (!pool) {
    throw new Error('数据库连接池未初始化');
  }
  return pool;
};

/**
 * 执行查询
 */
const query = async (text, params = []) => {
  const dbPool = getPool();
  const start = Date.now();

  try {
    const result = await dbPool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 SQL查询:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('❌ SQL查询错误:', { text, error: error.message });
    throw error;
  }
};

/**
 * 初始化数据库表
 */
const initializeTables = async () => {
  try {
    const dbPool = getPool();

    // 检查是否需要初始化 (检查新的优化表结构)
    const tablesResult = await dbPool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'test_results', 'system_config', 'engine_status')
    `);

    const tableCount = parseInt(tablesResult.rows[0].count);

    if (tableCount >= 4) {
      console.log('✅ 优化数据库表已存在，跳过初始化');

      // 检查是否需要升级到新架构
      const newTablesResult = await dbPool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('seo_test_details', 'performance_test_details', 'security_test_details')
      `);

      if (parseInt(newTablesResult.rows[0].count) < 3) {
        console.log('🔄 检测到旧版数据库架构，建议运行迁移脚本');
        console.log('💡 运行: node server/scripts/migrate-database.js');
      }

      return;
    }

    console.log('🔧 开始优化数据库架构初始化...');

    // 读取并执行优化的数据库架构脚本
    const optimizedSchemaSqlPath = path.join(__dirname, '..', 'scripts', 'optimized-database-schema.sql');
    const fallbackSqlPath = path.join(__dirname, '..', 'scripts', 'fix-database.sql');

    let sqlPath = optimizedSchemaSqlPath;
    if (!fs.existsSync(optimizedSchemaSqlPath) && fs.existsSync(fallbackSqlPath)) {
      console.log('⚠️ 未找到优化架构脚本，使用备用脚本');
      sqlPath = fallbackSqlPath;
    }

    if (fs.existsSync(sqlPath)) {
      const schemaSql = fs.readFileSync(sqlPath, 'utf8');
      await dbPool.query(schemaSql);
      console.log('✅ 数据库架构初始化完成');

      // 验证初始化结果
      const verifyResult = await dbPool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      console.log(`📊 创建了 ${verifyResult.rows[0].count} 个表`);

    } else {
      console.log('⚠️ 未找到数据库初始化脚本，跳过表创建');
      console.log('💡 提示：运行 npm run init-db 手动初始化数据库');
    }
  } catch (error) {
    console.error('❌ 数据库表初始化失败:', error.message);

    if (process.env.NODE_ENV === 'development') {
      console.log('💡 开发环境提示：');
      console.log('   1. 检查数据库连接配置');
      console.log('   2. 确保PostgreSQL服务正在运行');
      console.log('   3. 运行 npm run init-db 手动初始化');
      console.log('   4. 或运行 npm run reset-db 重置数据库');
    }

    // 不抛出错误，允许应用继续启动
  }
};

/**
 * 关闭数据库连接
 */
const closeConnection = async () => {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('✅ 数据库连接已关闭');
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error);
    }
  }
};

/**
 * 事务处理
 */
const transaction = async (callback) => {
  const dbPool = getPool();
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * 批量插入
 */
const batchInsert = async (tableName, columns, values) => {
  if (!values || values.length === 0) {
    return { rowCount: 0 };
  }

  const dbPool = getPool();
  const columnNames = columns.join(', ');
  const placeholders = values.map((_, index) => {
    const rowPlaceholders = columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`);
    return `(${rowPlaceholders.join(', ')})`;
  }).join(', ');

  const flatValues = values.flat();
  const query = `INSERT INTO ${tableName} (${columnNames}) VALUES ${placeholders}`;

  try {
    const result = await dbPool.query(query, flatValues);
    return result;
  } catch (error) {
    console.error('批量插入失败:', error);
    throw error;
  }
};

/**
 * 数据库健康检查
 */
const healthCheck = async () => {
  try {
    const dbPool = getPool();
    const start = Date.now();

    // 基础连接测试
    const connectionTest = await dbPool.query('SELECT NOW() as current_time, version() as version');
    const connectionTime = Date.now() - start;

    // 检查连接池状态
    const poolStats = {
      totalCount: dbPool.totalCount,
      idleCount: dbPool.idleCount,
      waitingCount: dbPool.waitingCount
    };

    // 检查核心表是否存在
    const tablesCheck = await dbPool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'test_results', 'system_config', 'engine_status')
    `);

    const coreTablesExist = parseInt(tablesCheck.rows[0].count) >= 4;

    // 检查引擎状态 (如果表存在)
    let engineStatus = null;
    if (coreTablesExist) {
      try {
        const engineCheck = await dbPool.query('SELECT engine_type, status FROM engine_status');
        engineStatus = engineCheck.rows;
      } catch (err) {
        // 引擎状态表可能不存在
        engineStatus = [];
      }
    }

    return {
      status: 'healthy',
      connectionTime: `${connectionTime}ms`,
      database: connectionTest.rows[0],
      poolStats,
      coreTablesExist,
      engineStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * 获取数据库统计信息
 */
const getStats = async () => {
  try {
    const dbPool = getPool();

    // 获取表大小信息
    const tableSizes = await dbPool.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `);

    // 获取连接统计
    const connectionStats = await dbPool.query(`
      SELECT
        COUNT(*) as total_connections,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
        COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    return {
      tableSizes: tableSizes.rows,
      connectionStats: connectionStats.rows[0],
      poolStats: {
        totalCount: dbPool.totalCount,
        idleCount: dbPool.idleCount,
        waitingCount: dbPool.waitingCount
      }
    };
  } catch (error) {
    console.error('获取数据库统计信息失败:', error);
    throw error;
  }
};

/**
 * 获取增强的数据库连接管理器
 */
const getConnectionManager = async () => {
  if (!connectionManager) {
    connectionManager = new DatabaseConnectionManager(dbConfig);
    await connectionManager.initialize();
  }
  return connectionManager;
};

/**
 * 执行优化的数据库查询
 */
const executeOptimizedQuery = async (sql, params = [], options = {}) => {
  const manager = await getConnectionManager();
  return manager.query(sql, params, options);
};

/**
 * 获取数据库连接状态
 */
const getDatabaseStatus = async () => {
  try {
    const manager = await getConnectionManager();
    return manager.getStatus();
  } catch (error) {
    return {
      isConnected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = {
  connectDB,
  testConnection,
  getPool,
  query,
  closeConnection,
  transaction,
  batchInsert,
  healthCheck,
  getStats,
  getConnectionManager,
  executeOptimizedQuery,
  getDatabaseStatus,
  // 兼容性导出
  db: { query },
  pool: () => getPool()
};
