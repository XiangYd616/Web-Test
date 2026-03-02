/**
 * 数据库配置和连接管理
 * 双模式支持：通过 DB_MODE 环境变量切换
 *   - DB_MODE=pg    → PostgreSQL（云端/生产服务器）
 *   - DB_MODE=sqlite → SQLite（本地/桌面端，默认）
 */

import { closePg, getPgClient, getPgPool, initPg, pgQuery } from './pgAdapter';
import { closeSQLite, initSQLite, sqliteQuery } from './sqliteAdapter';

/** 当前数据库模式 */
const DB_MODE = (process.env.DB_MODE || 'sqlite').toLowerCase();
const isPg = DB_MODE === 'pg' || DB_MODE === 'postgres' || DB_MODE === 'postgresql';

/** 获取当前数据库模式标识 */
export const getDbMode = () => (isPg ? 'pg' : 'sqlite');

/**
 * 连接数据库
 */
const connectDB = async () => {
  if (isPg) {
    console.log('📦 初始化 PostgreSQL 数据库连接...');
    const pool = initPg();
    // 验证连接
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as current_time, version() as version');
      console.log(
        `✅ PostgreSQL 连接成功: ${((res.rows[0]?.version as string) || '').split(',')[0]}`
      );
      // 自动迁移：execution_time 从 INTEGER 改为 REAL（支持小数秒）
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'test_executions'
              AND column_name = 'execution_time'
              AND data_type = 'integer'
          ) THEN
            ALTER TABLE test_executions ALTER COLUMN execution_time TYPE REAL;
          END IF;
        END $$;
      `);

      // 自动迁移：邮箱验证相关表和字段
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

        CREATE TABLE IF NOT EXISTS email_verification_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_email_verification_user UNIQUE (user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id);

        CREATE TABLE IF NOT EXISTS system_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          config_key VARCHAR(255) NOT NULL UNIQUE,
          config_value JSONB DEFAULT '{}',
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO system_configs (config_key, config_value, description)
        VALUES ('email_verification_required', '{"value": false}', '是否要求邮箱验证后才能登录')
        ON CONFLICT (config_key) DO NOTHING;
        INSERT INTO system_configs (config_key, config_value, description)
        VALUES ('web_heavy_test_enabled', '{"value": true}', '是否启用Web端重型测试(Puppeteer类:性能/安全/SEO等)')
        ON CONFLICT (config_key) DO NOTHING;
      `);

      // 补丁（单独执行）：如果表已存在但缺少 user_id 唯一约束，则添加
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'uq_email_verification_user'
              AND conrelid = 'email_verification_tokens'::regclass
          ) THEN
            ALTER TABLE email_verification_tokens
              ADD CONSTRAINT uq_email_verification_user UNIQUE (user_id);
          END IF;
        END $$;
      `);

      // ── 双向同步基础设施迁移（幂等） ──
      const syncTables = ['workspaces', 'collections', 'environments', 'test_templates'];
      for (const table of syncTables) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS sync_id UUID UNIQUE`);
        await client.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1`
        );
        await client.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS sync_updated_at TIMESTAMPTZ`
        );
        await client.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS sync_device_id VARCHAR(64)`
        );
      }
      // 回填 sync_id / sync_updated_at
      for (const table of syncTables) {
        await client.query(`UPDATE ${table} SET sync_id = id WHERE sync_id IS NULL`);
        await client.query(
          `UPDATE ${table} SET sync_updated_at = COALESCE(updated_at, created_at, NOW()) WHERE sync_updated_at IS NULL`
        );
      }

      // 同步日志表
      await client.query(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id SERIAL PRIMARY KEY,
          user_id UUID NOT NULL,
          device_id VARCHAR(64) NOT NULL,
          direction VARCHAR(10) NOT NULL CHECK (direction IN ('pull', 'push')),
          tables_synced TEXT[],
          records_pulled INTEGER DEFAULT 0,
          records_pushed INTEGER DEFAULT 0,
          conflicts_count INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
          error_message TEXT,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          duration_ms INTEGER
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_sync_log_user ON sync_log(user_id)`);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at DESC)`
      );

      // 同步冲突表
      await client.query(`
        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          table_name VARCHAR(64) NOT NULL,
          record_sync_id UUID NOT NULL,
          local_version INTEGER,
          remote_version INTEGER,
          local_data JSONB,
          remote_data JSONB,
          resolution VARCHAR(20) DEFAULT 'pending' CHECK (resolution IN ('pending', 'local', 'remote', 'merged')),
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user ON sync_conflicts(user_id)`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sync_conflicts_pending ON sync_conflicts(resolution) WHERE resolution = 'pending'`
      );

      // 设备注册表
      await client.query(`
        CREATE TABLE IF NOT EXISTS sync_devices (
          id VARCHAR(64) PRIMARY KEY,
          user_id UUID NOT NULL,
          device_name VARCHAR(128),
          device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('desktop', 'web')),
          platform VARCHAR(20),
          last_sync_at TIMESTAMPTZ,
          last_pull_at TIMESTAMPTZ,
          last_push_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sync_devices_user ON sync_devices(user_id)`
      );

      // 数据备份表（确保存在）
      await client.query(`
        CREATE TABLE IF NOT EXISTS data_backups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          data_types JSONB DEFAULT '[]',
          summary JSONB DEFAULT '{}',
          records JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      console.log('✅ 同步基础设施迁移完成');
    } finally {
      client.release();
    }
    return pool;
  }

  console.log('📦 初始化 SQLite 本地数据库...');
  initSQLite();
  console.log('✅ SQLite 数据库连接成功');
  return null;
};

/**
 * 执行查询（自动路由到 PG 或 SQLite）
 */

export const query = async (
  text: string,
  params: unknown[] = []
): Promise<{ rows: any[]; rowCount: number }> => {
  const start = Date.now();
  try {
    const result = isPg ? await pgQuery(text, params) : await sqliteQuery(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && process.env.DB_LOG_QUERIES === 'true') {
      console.log('📊 SQL查询:', {
        text: text.substring(0, 120),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ SQL查询错误:', { text: text.substring(0, 200), error: message });
    throw error;
  }
};

/**
 * 关闭数据库连接
 */
const closeConnection = async () => {
  if (isPg) {
    await closePg();
  } else {
    closeSQLite();
  }
};

/**
 * 事务处理
 */
export const transaction = async <T>(
  callback: (client: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<T>
) => {
  if (isPg) {
    const pgClient = await getPgClient();
    try {
      await pgClient.query('BEGIN');
      const wrappedClient = {
        query: async (sql: string, params?: unknown[]) => pgClient.query(sql, params || []),
      };
      const result = await callback(wrappedClient);
      await pgClient.query('COMMIT');
      return result;
    } catch (error) {
      await pgClient.query('ROLLBACK');
      throw error;
    } finally {
      pgClient.release();
    }
  }

  const client = {
    query: async (sql: string, params?: unknown[]) => sqliteQuery(sql, params || []),
  };
  await sqliteQuery('BEGIN', []);
  try {
    const result = await callback(client);
    await sqliteQuery('COMMIT', []);
    return result;
  } catch (error) {
    await sqliteQuery('ROLLBACK', []);
    throw error;
  }
};

/**
 * 批量插入
 */
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

const batchInsert = async (tableName: string, columns: string[], values: unknown[][]) => {
  if (!values || values.length === 0) {
    return { rowCount: 0 };
  }

  if (!SAFE_IDENTIFIER.test(tableName)) {
    throw new Error(`batchInsert: 非法表名 "${tableName}"`);
  }
  for (const col of columns) {
    if (!SAFE_IDENTIFIER.test(col)) {
      throw new Error(`batchInsert: 非法列名 "${col}"`);
    }
  }

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
    const result = await query(sql, flatValues);
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
  const start = Date.now();
  const mode = getDbMode();
  try {
    const result = isPg
      ? await pgQuery('SELECT NOW() as current_time, version() as version', [])
      : await sqliteQuery("SELECT datetime('now') as current_time, 'SQLite' as version", []);
    const connectionTime = Date.now() - start;
    const pgPool = isPg ? getPgPool() : null;
    return {
      status: 'healthy',
      mode,
      connectionTime: `${connectionTime}ms`,
      database: result.rows[0],
      poolStats: pgPool
        ? {
            totalCount: pgPool.totalCount,
            idleCount: pgPool.idleCount,
            waitingCount: pgPool.waitingCount,
          }
        : { totalCount: 1, idleCount: 1, waitingCount: 0 },
      coreTablesExist: true,
      engineStatus: [] as string[],
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'unhealthy',
      mode,
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
    if (isPg) {
      const tables = await pgQuery(
        "SELECT tablename, pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size, pg_total_relation_size(quote_ident(tablename)) as size_bytes FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
        []
      );
      const pgPool = getPgPool();
      return {
        tableSizes: tables.rows,
        connectionStats: {
          total_connections: pgPool?.totalCount || 0,
          active_connections: (pgPool?.totalCount || 0) - (pgPool?.idleCount || 0),
          idle_connections: pgPool?.idleCount || 0,
        },
        poolStats: {
          totalCount: pgPool?.totalCount || 0,
          idleCount: pgPool?.idleCount || 0,
          waitingCount: pgPool?.waitingCount || 0,
        },
      };
    }
    const tables = await sqliteQuery(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      []
    );
    return {
      tableSizes: tables.rows.map((r: Record<string, unknown>) => ({
        tablename: r.name,
        size: 'N/A',
        size_bytes: 0,
      })),
      connectionStats: { total_connections: 1, active_connections: 1, idle_connections: 0 },
      poolStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    };
  } catch (error) {
    console.error('获取数据库统计信息失败:', error);
    throw error;
  }
};

/**
 * 测试数据库连接
 */
const testConnection = async () => {
  try {
    const result = isPg
      ? await pgQuery('SELECT NOW() as current_time, version() as version', [])
      : await sqliteQuery("SELECT datetime('now') as current_time, 'SQLite' as version", []);
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
  if (isPg) {
    const pgPool = getPgPool();
    if (pgPool) return pgPool;
  }
  return {
    query: async (text: string, params?: unknown[]) => sqliteQuery(text, params || []),
    connect: async () => ({
      query: async (text: string, params?: unknown[]) => sqliteQuery(text, params || []),
      release: () => {},
    }),
    end: async () => closeSQLite(),
    on: () => {},
    totalCount: 1,
    idleCount: 1,
    waitingCount: 0,
  };
};

/**
 * 执行优化的数据库查询（兼容接口）
 */
const executeOptimizedQuery = async (
  sql: string,
  params: unknown[] = [],
  _options: Record<string, unknown> = {}
) => {
  return query(sql, params);
};

/**
 * 获取数据库连接管理器（兼容接口）
 */
const getConnectionManager = async () => {
  return {
    on: () => {},
    initialize: async () => {},
    query: async (sql: string, params?: unknown[]) => sqliteQuery(sql, params || []),
    getStatus: () => ({ pool: { totalCount: 1, idleCount: 1, waitingCount: 0 } }),
  };
};

/**
 * 获取数据库连接状态（兼容接口）
 */
const getDatabaseStatus = async () => {
  return {
    isConnected: true,
    pool: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    timestamp: new Date().toISOString(),
  };
};

/**
 * 获取数据库配置
 */
const getDatabaseConfig = () => {
  return {
    host: 'localhost',
    port: 0,
    database: 'testweb.db',
    username: '',
    password: '',
    dialect: 'sqlite',
  };
};

export {
  batchInsert,
  closeConnection,
  connectDB,
  executeOptimizedQuery,
  getConnectionManager,
  getDatabaseConfig,
  getDatabaseStatus,
  getStats,
  healthCheck,
  testConnection,
};
