/**
 * PostgreSQL 适配器
 * 使用 pg 连接池，提供与 sqliteAdapter 兼容的 query() 接口
 */

import { Pool, type PoolClient, type PoolConfig } from 'pg';

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  fields?: Array<{ name: string }>;
  command?: string;
}

let pool: Pool | null = null;

/**
 * 获取 PG 连接配置
 */
const getPgConfig = (): PoolConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: parseInt(process.env.PG_POOL_MAX || '20', 10),
      idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '5000', 10),
    };
  }

  return {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DATABASE || 'testweb',
    user: process.env.PG_USER || 'testweb',
    password: process.env.PG_PASSWORD || '',
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '5000', 10),
  };
};

/**
 * 初始化 PostgreSQL 连接池
 */
export const initPg = (): Pool => {
  if (pool) return pool;

  const config = getPgConfig();
  pool = new Pool(config);

  pool.on('error', (err: Error) => {
    console.error('❌ PostgreSQL 连接池意外错误:', err.message);
  });

  console.log(`📦 PostgreSQL 连接池已创建 (max=${config.max})`);
  return pool;
};

/**
 * 执行 PG 查询（直接透传，无需 SQL 转换）
 */
export const pgQuery = async (text: string, params: unknown[] = []): Promise<QueryResult> => {
  if (!pool) {
    throw new Error('PostgreSQL 连接池未初始化');
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { rows: [], rowCount: 0 };
  }

  const result = await pool.query(trimmed, params);
  return {
    rows: result.rows,
    rowCount: result.rowCount ?? 0,
    command: result.command,
  };
};

/**
 * 获取 PG 客户端（用于事务）
 */
export const getPgClient = async (): Promise<PoolClient> => {
  if (!pool) {
    throw new Error('PostgreSQL 连接池未初始化');
  }
  return pool.connect();
};

/**
 * 获取 PG 连接池实例
 */
export const getPgPool = (): Pool | null => pool;

/**
 * 关闭 PG 连接池
 */
export const closePg = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL 连接池已关闭');
  }
};
