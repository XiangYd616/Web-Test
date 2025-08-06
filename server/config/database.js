/**
 * 数据库配置和连接管理
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库连接池
let pool = null;

// 根据环境自动选择数据库
const getDefaultDatabase = () => {
  return process.env.NODE_ENV === 'production' ? 'testweb_prod' : 'testweb_dev';
};

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || getDefaultDatabase(),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20, // 最大连接数
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // 空闲超时
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000, // 连接超时
  ssl: false
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
    });

    pool.on('error', (err, client) => {
      console.error('❌ 数据库连接池错误:', err);
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

    // 检查是否需要初始化
    const tablesResult = await dbPool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'test_sessions', 'monitoring_sites')
    `);

    const tableCount = parseInt(tablesResult.rows[0].count);

    if (tableCount >= 3) {
      console.log('✅ 数据库表已存在，跳过初始化');
      return;
    }

    console.log('🔧 开始数据库表初始化...');

    // 读取并执行表创建SQL脚本
    const fixDatabaseSqlPath = path.join(__dirname, '..', 'scripts', 'fix-database.sql');

    if (fs.existsSync(fixDatabaseSqlPath)) {
      const fixDatabaseSql = fs.readFileSync(fixDatabaseSqlPath, 'utf8');
      await dbPool.query(fixDatabaseSql);
      console.log('✅ 数据库表初始化完成');

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

module.exports = {
  connectDB,
  testConnection,
  getPool,
  query,
  closeConnection,
  transaction,
  batchInsert,
  // 兼容性导出
  db: { query },
  pool: () => getPool()
};
