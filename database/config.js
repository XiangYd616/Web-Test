import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量 - 优先使用 server/.env
const envPaths = [
  path.join(__dirname, '..', 'server', '.env'),  // server/.env (主配置)
  path.join(__dirname, '.env'),                   // database/.env (备用)
  path.join(__dirname, '..', '.env')              // 根目录 .env (最后备用)
];

// 按优先级加载环境变量
envPaths.forEach(envPath => {
  dotenv.config({ path: envPath, override: false });
});

console.log('🔧 环境配置加载完成');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'testweb_dev', // 使用与server/.env一致的数据库名
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres', // 使用与server/.env一致的密码
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS) || 2000,
};

// 创建连接池
const pool = new Pool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ 数据库连接成功:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ 数据库连接失败:', err.message);
    return false;
  }
}

// 执行SQL文件
async function executeSqlFile(filePath) {
  const fs = await import('fs');
  const fullPath = path.resolve(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`SQL文件不存在: ${fullPath}`);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✅ 成功执行SQL文件: ${filePath}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ 执行SQL文件失败: ${filePath}`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// 检查表是否存在
async function tableExists(tableName) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } finally {
    client.release();
  }
}

// 获取数据库版本信息
async function getDatabaseInfo() {
  const client = await pool.connect();
  try {
    const versionResult = await client.query('SELECT version()');
    const sizeResult = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    const tablesResult = await client.query(`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    return {
      version: versionResult.rows[0].version,
      size: sizeResult.rows[0].size,
      tableCount: parseInt(tablesResult.rows[0].table_count)
    };
  } finally {
    client.release();
  }
}

// 备份数据库
async function backupDatabase(backupPath) {
  const { spawn } = await import('child_process');
  const fs = await import('fs');

  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.sql`;
    const fullPath = path.resolve(backupPath || __dirname, filename);

    const pgDump = spawn('pg_dump', [
      '-h', dbConfig.host,
      '-p', dbConfig.port,
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '-f', fullPath,
      '--verbose'
    ], {
      env: { ...process.env, PGPASSWORD: dbConfig.password }
    });

    pgDump.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ 数据库备份成功: ${fullPath}`);
        resolve(fullPath);
      } else {
        reject(new Error(`备份失败，退出码: ${code}`));
      }
    });

    pgDump.on('error', (err) => {
      reject(new Error(`备份命令执行失败: ${err.message}`));
    });
  });
}

// 清理所有表
async function dropAllTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 获取所有表名
    const result = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    // 删除所有表
    for (const row of result.rows) {
      await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
      console.log(`🗑️  删除表: ${row.tablename}`);
    }

    await client.query('COMMIT');
    console.log('✅ 所有表已删除');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 关闭连接池
async function closePool() {
  await pool.end();
  console.log('🔌 数据库连接池已关闭');
}

export {
  backupDatabase, closePool, dbConfig, dropAllTables, executeSqlFile, getDatabaseInfo, pool, tableExists, testConnection
};

