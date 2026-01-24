/**
 * 数据库配置和连接管理 - 优化版本
 * 支持环境自适应、连接池优化、故障恢复
 */

import type { Pool, QueryResult } from 'pg';

const { Pool: PgPool } = require('pg');
const fs = require('fs');
const path = require('path');
const DatabaseConnectionManager = require('../utils/database');

type DbConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
  statement_timeout: number;
  query_timeout: number;
  ssl: false | { rejectUnauthorized: boolean };
  application_name: string;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  logLevel: string;
};

type ConnectionManager = {
  on: (event: string, handler: (data: { status?: string; error?: Error }) => void) => void;
  initialize: () => Promise<void>;
  query: (
    sql: string,
    params?: unknown[],
    options?: Record<string, unknown>
  ) => Promise<QueryResult<Record<string, unknown>>>;
  getStatus: () => { pool?: { totalCount?: number; idleCount?: number; waitingCount?: number } };
};

// 数据库连接池和管理器
let pool: Pool | null = null;
let connectionManager: ConnectionManager | null = null;

// 根据环境自动选择数据库
const getDefaultDatabase = () => {
  const env = process.env.NODE_ENV || 'development';
  switch (env) {
    case 'production':
      return process.env.DB_NAME || 'testweb_prod';
    case 'test':
      return process.env.DB_NAME || 'testweb_test';
    default:
      return process.env.DB_NAME || 'testweb_dev';
  }
};

// 优化的数据库配置 - 环境自适应版本
const dbConfig: DbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '', 10) || 5432,
  database: getDefaultDatabase(),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',

  // 连接池优化配置 (根据环境调整)
  max:
    parseInt(process.env.DB_MAX_CONNECTIONS || '', 10) ||
    (process.env.NODE_ENV === 'production' ? 50 : 20),
  min:
    parseInt(process.env.DB_MIN_CONNECTIONS || '', 10) ||
    (process.env.NODE_ENV === 'production' ? 10 : 5),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '', 10) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '', 10) || 5000,
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '', 10) || 60000,

  // 性能优化配置
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '', 10) || 30000,
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '', 10) || 30000,

  // SSL配置 (根据环境变量决定)
  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false,

  // 应用名称 (便于监控)
  application_name: process.env.DB_APPLICATION_NAME || `testweb_${process.env.NODE_ENV || 'dev'}`,

  // 连接重试配置
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '', 10) || 5,
  retryDelay: parseInt(process.env.DB_RETRY_DELAY || '', 10) || 1000,

  // 健康检查配置
  healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '', 10) || 30000,

  // 日志配置
  logLevel: process.env.DB_LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'info'),
};

/**
 * 创建数据库连接池
 */
const createPool = (): Pool => {
  const activePool = pool ?? new PgPool(dbConfig);
  if (!pool) {
    pool = activePool;

    // 连接池事件监听
    activePool.on('connect', (client: { query: (sql: string) => Promise<unknown> }) => {
      // 设置连接级别的优化参数
      client
        .query(
          `
        SET search_path TO public;
        SET timezone TO 'UTC';
        SET statement_timeout TO '${dbConfig.statement_timeout}ms';
        SET lock_timeout TO '10s';
        SET idle_in_transaction_session_timeout TO '60s';
      `
        )
        .catch((err: Error) => {
          console.error('❌ 连接初始化失败:', err);
        });
    });

    activePool.on('error', (err: Error) => {
      console.error('❌ 数据库连接池错误:', err);

      // 记录错误详情用于监控
      if (process.env.NODE_ENV === 'production') {
        // 这里可以集成错误监控服务
        console.error('生产环境数据库错误:', {
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
  return activePool;
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 数据库连接失败:', message);
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
    return result.rows[0] as Record<string, unknown>;
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    throw error;
  }
};

/**
 * 获取连接池
 */
export const getPool = () => {
  if (!pool) {
    throw new Error('数据库连接池未初始化');
  }
  return pool;
};

/**
 * 执行查询
 */
export const query = async (text: string, params: unknown[] = []) => {
  const dbPool = getPool();
  const start = Date.now();

  try {
    const result = await dbPool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 SQL查询:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ SQL查询错误:', { text, error: message });
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
      AND table_name IN ('users', 'test_results', 'system_configs', 'engine_status')
    `);

    const tableCount = parseInt(String(tablesResult.rows[0].count), 10);

    if (tableCount >= 4) {
      console.log('✅ 优化数据库表已存在，跳过初始化');

      // 检查是否需要升级到新架构
      const newTablesResult = await dbPool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('seo_test_details', 'performance_test_details', 'security_test_details')
      `);

      void newTablesResult;

      return;
    }

    console.log('🔧 开始数据库架构初始化 (data/schema.sql)...');

    const schemaSqlPath = path.join(__dirname, '..', '..', 'data', 'schema.sql');

    if (fs.existsSync(schemaSqlPath)) {
      const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
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
      console.log('⚠️ 未找到数据库初始化脚本 (data/schema.sql)，跳过表创建');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ 数据库表初始化失败:', message);
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
const transaction = async <T>(
  callback: (client: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<T>
) => {
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
const batchInsert = async (tableName: string, columns: string[], values: unknown[][]) => {
  if (!values || values.length === 0) {
    return { rowCount: 0 };
  }

  const dbPool = getPool();
  const columnNames = columns.join(', ');
  const placeholders = values
    .map((_, index) => {
      const rowPlaceholders = columns.map(
        (_, colIndex) => `$${index * columns.length + colIndex + 1}`
      );
      return `(${rowPlaceholders.join(', ')})`;
    })
    .join(', ');

  const flatValues = values.flat();
  const sql = `INSERT INTO ${tableName} (${columnNames}) VALUES ${placeholders}`;

  try {
    const result = await dbPool.query(sql, flatValues);
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
    const manager = await getConnectionManager();
    const start = Date.now();

    // 基础连接测试
    const connectionTest = await manager.query(
      'SELECT NOW() as current_time, version() as version'
    );
    const connectionTime = Date.now() - start;

    // 检查连接池状态
    const status = manager.getStatus();
    const poolStats = status.pool || {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };

    // 检查核心表是否存在
    const tablesCheck = await manager.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'test_results', 'system_configs', 'engine_status')
    `);
    const tableRows = tablesCheck.rows as Array<{ count?: string | number }>;
    const coreTablesExist = parseInt(String(tableRows[0]?.count ?? 0), 10) >= 4;

    // 检查引擎状态 (如果表存在)
    let engineStatus: unknown = null;
    if (coreTablesExist) {
      try {
        const engineCheck = await manager.query('SELECT engine_type, status FROM engine_status');
        engineStatus = engineCheck.rows;
      } catch {
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
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'unhealthy',
      error: message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * 获取数据库统计信息
 */
const getStats = async () => {
  try {
    const manager = await getConnectionManager();

    // 获取表大小信息
    const tableSizes = await manager.query(`
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
    const connectionStats = await manager.query(`
      SELECT
        COUNT(*) as total_connections,
        COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
        COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const status = manager.getStatus();
    return {
      tableSizes: tableSizes.rows,
      connectionStats: connectionStats.rows[0],
      poolStats: status.pool || {
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      },
    };
  } catch (error) {
    console.error('获取数据库统计信息失败:', error);
    throw error;
  }
};

/**
 * 获取增强的数据库连接管理器
 */
const getConnectionManager = async (): Promise<ConnectionManager> => {
  if (!connectionManager) {
    const manager = new DatabaseConnectionManager(dbConfig) as ConnectionManager;

    // 设置事件监听
    manager.on('connected', (data: { status?: string }) => {
      console.log('✅ 数据库连接管理器已连接', data);
    });

    manager.on('connectionError', (data: { error?: Error }) => {
      console.error('❌ 数据库连接错误', data.error?.message);
    });

    manager.on('reconnected', () => {});

    manager.on('healthCheck', (data: { status?: string; error?: Error }) => {
      if (data.status === 'unhealthy') {
        console.warn('⚠️ 数据库健康检查失败', data.error);
      }
    });

    await manager.initialize();
    connectionManager = manager;
  }
  return connectionManager;
};

/**
 * 执行优化的数据库查询
 */
const executeOptimizedQuery = async (
  sql: string,
  params: unknown[] = [],
  options: Record<string, unknown> = {}
) => {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isConnected: false,
      error: message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * 获取数据库配置
 */
const getDatabaseConfig = () => {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    username: dbConfig.user,
    password: dbConfig.password,
    dialect: 'postgres', // 添加dialect配置
  };
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
  getDatabaseConfig,
  // 兼容性导出
  db: { query },
  pool: () => getPool(),
  // Sequelize配置
  ...getDatabaseConfig(),
};

export {};
