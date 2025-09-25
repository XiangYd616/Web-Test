/**
 * 数据库迁移管理脚本
 * 管理数据库版本和结构变更
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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

console.log('📊 环境:', environment);

// 创建连接池
const pool = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user || config.username,
  password: config.password
});

// 迁移文件目录
const migrationsDir = path.join(__dirname, '../migrations');

/**
 * 创建迁移记录表
 */
async function createMigrationsTable() {
  const client = await pool.connect();

  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER DEFAULT 0,
        success BOOLEAN DEFAULT true
      )
    `;

    await client.query(sql);
    console.log('✅ 迁移记录表创建成功');

  } catch (error) {
    console.error('❌ 创建迁移记录表失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 获取迁移文件列表
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => {
        const version = file.split('_')[0];
        return {
          version,
          filename: file,
          filepath: path.join(migrationsDir, file)
        };
      });

    return migrationFiles;
  } catch (error) {
    console.error('❌ 读取迁移文件失败:', error);
    return [];
  }
}

/**
 * 获取已执行的迁移记录
 */
async function getExecutedMigrations() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT version, filename, checksum, executed_at, execution_time, success
      FROM schema_migrations
      ORDER BY executed_at
    `);

    return result.rows;
  } catch (error) {
    console.error('❌ 获取迁移记录失败:', error);
    return [];
  } finally {
    client.release();
  }
}

/**
 * 计算文件校验和
 */
async function calculateChecksum(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    console.error('❌ 计算文件校验和失败:', error);
    return null;
  }
}

/**
 * 执行单个迁移文件
 */
async function executeMigration(migration) {
  const client = await pool.connect();

  try {

    const startTime = Date.now();

    // 读取迁移文件内容
    const content = await fs.readFile(migration.filepath, 'utf8');
    const checksum = await calculateChecksum(migration.filepath);

    // 开始事务
    await client.query('BEGIN');

    // 执行迁移SQL
    await client.query(content);

    // 记录迁移执行
    const executionTime = Date.now() - startTime;
    await client.query(`
      INSERT INTO schema_migrations (version, filename, checksum, execution_time, success)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (version) DO UPDATE SET
        filename = EXCLUDED.filename,
        checksum = EXCLUDED.checksum,
        executed_at = CURRENT_TIMESTAMP,
        execution_time = EXCLUDED.execution_time,
        success = EXCLUDED.success
    `, [migration.version, migration.filename, checksum, executionTime, true]);

    await client.query('COMMIT');

    console.log(`✅ 迁移 ${migration.filename} 执行成功 (${executionTime}ms)`);

    return { success: true, executionTime };

  } catch (error) {
    await client.query('ROLLBACK');

    // 记录失败的迁移
    try {
      const checksum = await calculateChecksum(migration.filepath);
      await client.query(`
        INSERT INTO schema_migrations (version, filename, checksum, execution_time, success)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (version) DO UPDATE SET
          filename = EXCLUDED.filename,
          checksum = EXCLUDED.checksum,
          executed_at = CURRENT_TIMESTAMP,
          execution_time = EXCLUDED.execution_time,
          success = EXCLUDED.success
      `, [migration.version, migration.filename, checksum, 0, false]);
    } catch (recordError) {
      console.error('❌ 记录失败迁移失败:', recordError);
    }

    console.error(`❌ 迁移 ${migration.filename} 执行失败:`, error);
    throw error;

  } finally {
    client.release();
  }
}

/**
 * 执行所有待执行的迁移
 */
async function runMigrations() {
  try {

    // 确保迁移记录表存在
    await createMigrationsTable();

    // 获取迁移文件和已执行记录
    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();


    // 找出待执行的迁移
    const executedVersions = new Set(executedMigrations.map(m => m.version));
    const pendingMigrations = migrationFiles.filter(m => !executedVersions.has(m.version));

    if (pendingMigrations.length === 0) {
      console.log('✅ 所有迁移都已执行，数据库是最新的');
      return;
    }

    pendingMigrations.forEach(m => );

    // 执行待执行的迁移
    let successCount = 0;
    let totalTime = 0;

    for (const migration of pendingMigrations) {
      try {
        const result = await executeMigration(migration);
        successCount++;
        totalTime += result.executionTime;
      } catch (error) {
        console.error(`❌ 迁移执行中断于: ${migration.filename}`);
        break;
      }
    }


  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    throw error;
  }
}

/**
 * 显示迁移状态
 */
async function showMigrationStatus() {
  try {
    console.log('📊 数据库迁移状态:');

    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();

    console.log(`✅ 已执行迁移: ${executedMigrations.length}`);

    if (executedMigrations.length > 0) {
      executedMigrations.forEach(m => {
        const status = m.success ? '✅' : '❌';
        const time = m.execution_time ? `(${m.execution_time}ms)` : '';
      });
    }

    const executedVersions = new Set(executedMigrations.map(m => m.version));
    const pendingMigrations = migrationFiles.filter(m => !executedVersions.has(m.version));

    if (pendingMigrations.length > 0) {
      pendingMigrations.forEach(m => {
      });
    }

  } catch (error) {
    console.error('❌ 获取迁移状态失败:', error);
  }
}

/**
 * 验证迁移文件完整性
 */
async function validateMigrations() {
  try {
    console.log('🔍 验证迁移文件完整性...');

    const migrationFiles = await getMigrationFiles();
    const executedMigrations = await getExecutedMigrations();

    let validationErrors = 0;

    // 检查已执行迁移的文件是否存在且未被修改
    for (const executed of executedMigrations) {
      const migrationFile = migrationFiles.find(f => f.version === executed.version);

      if (!migrationFile) {
        console.error(`❌ 已执行的迁移文件不存在: ${executed.filename}`);
        validationErrors++;
        continue;
      }

      const currentChecksum = await calculateChecksum(migrationFile.filepath);
      if (currentChecksum !== executed.checksum) {
        console.error(`❌ 迁移文件已被修改: ${executed.filename}`);
        console.error(`   期望校验和: ${executed.checksum}`);
        console.error(`   当前校验和: ${currentChecksum}`);
        validationErrors++;
      }
    }

    if (validationErrors === 0) {
      console.log('✅ 所有迁移文件验证通过');
    } else {
      console.error(`❌ 发现 ${validationErrors} 个验证错误`);
    }

    return validationErrors === 0;

  } catch (error) {
    console.error('❌ 迁移验证失败:', error);
    return false;
  }
}

/**
 * 创建新的迁移文件
 */
async function createMigration(name) {
  try {
    if (!name) {
      throw new Error('迁移名称不能为空');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
      new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filepath = path.join(migrationsDir, filename);

    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: ${name}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Remember to:
-- 1. Use transactions for complex operations
-- 2. Add appropriate indexes
-- 3. Consider data migration if needed
-- 4. Test the migration thoroughly
`;

    await fs.writeFile(filepath, template);
    console.log(`✅ 迁移文件创建成功: ${filename}`);

  } catch (error) {
    console.error('❌ 创建迁移文件失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {

      const args = process.argv.slice(2);
      const command = args[0] || 'migrate';

      switch (command) {
        case 'migrate':
        case 'up':
          await runMigrations();
          break;

        case 'status':
          await showMigrationStatus();
          break;

        case 'validate':
          const isValid = await validateMigrations();
          process.exit(isValid ? 0 : 1);
          break;

        case 'create':
          const migrationName = args[1];
          if (!migrationName) {
            console.error('❌ 请提供迁移名称: npm run migrate create "migration_name"');
            process.exit(1);
          }
          await createMigration(migrationName);
          break;

        default:
          console.log('❌ 未知命令:', command);
          process.exit(1);
      }

      console.log('✅ 迁移脚本执行完成');

    } catch (error) {
      console.error('❌ 迁移脚本执行失败:', error);
      process.exit(1);
    } finally {
      await pool.end();
      process.exit(0);
    }
  })();
}

module.exports = {
  runMigrations,
  showMigrationStatus,
  validateMigrations,
  createMigration,
  createMigrationsTable
};
