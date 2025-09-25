/**
 * 数据库迁移管理脚本
 * 支持数据库版本管理、迁移、回滚、备份等功能
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'testweb_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

// 迁移文件目录
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const BACKUPS_DIR = path.join(__dirname, '../backups');

// 确保目录存在
[MIGRATIONS_DIR, BACKUPS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * 数据库迁移管理器
 */
class DatabaseMigrator {
  constructor() {
    this.pool = new Pool(dbConfig);
  }

  /**
   * 初始化迁移表
   */
  async initMigrationTable() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time INTEGER,
          checksum VARCHAR(255)
        )
      `);
      console.log('✅ 迁移表初始化完成');
    } finally {
      client.release();
    }
  }

  /**
   * 获取已执行的迁移
   */
  async getExecutedMigrations() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      return result.rows.map(row => row.version);
    } finally {
      client.release();
    }
  }

  /**
   * 获取待执行的迁移文件
   */
  async getPendingMigrations() {
    const executedMigrations = await this.getExecutedMigrations();
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return migrationFiles.filter(file => {
      const version = file.replace('.sql', '');
      return !executedMigrations.includes(version);
    });
  }

  /**
   * 执行单个迁移
   */
  async executeMigration(filename) {
    const version = filename.replace('.sql', '');
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const client = await this.pool.connect();
    const startTime = Date.now();
    
    try {
      await client.query('BEGIN');
      
      // 执行迁移SQL
      await client.query(sql);
      
      // 记录迁移
      const executionTime = Date.now() - startTime;
      const checksum = require('crypto').createHash('md5').update(sql).digest('hex');
      
      await client.query(
        'INSERT INTO schema_migrations (version, name, execution_time, checksum) VALUES ($1, $2, $3, $4)',
        [version, filename, executionTime, checksum]
      );
      
      await client.query('COMMIT');
      console.log(`✅ 迁移 ${filename} 执行成功 (${executionTime}ms)`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ 迁移 ${filename} 执行失败:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 执行所有待执行的迁移
   */
  async migrate() {
    
    await this.initMigrationTable();
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      return;
    }
    
    pendingMigrations.forEach(file => );
    
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }
    
  }

  /**
   * 检查数据库状态
   */
  async checkStatus() {
    console.log('🔍 检查数据库状态...');
    
    try {
      await this.initMigrationTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const pendingMigrations = await this.getPendingMigrations();
      
      
      if (executedMigrations.length > 0) {
        executedMigrations.forEach(version => );
      }
      
      if (pendingMigrations.length > 0) {
        pendingMigrations.forEach(file => );
      }
      
    } catch (error) {
      console.error('❌ 检查数据库状态失败:', error.message);
    }
  }

  /**
   * 创建数据库备份
   */
  async backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUPS_DIR, `backup-${timestamp}.sql`);
    
    
    try {
      const command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f ${backupFile}`;
      
      // 设置密码环境变量
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      
      execSync(command, { env, stdio: 'inherit' });
      
      console.log(`✅ 备份创建成功: ${backupFile}`);
      return backupFile;
      
    } catch (error) {
      console.error('❌ 创建备份失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成新的迁移文件
   */
  generateMigration(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filePath = path.join(MIGRATIONS_DIR, filename);
    
    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: ${name}

-- Up migration
BEGIN;

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

COMMIT;

-- Down migration (for rollback - not implemented yet)
-- BEGIN;
-- DROP TABLE IF EXISTS example;
-- COMMIT;
`;
    
    fs.writeFileSync(filePath, template);
    console.log(`✅ 迁移文件创建成功: ${filename}`);
    
    return filePath;
  }

  /**
   * 关闭连接池
   */
  async close() {
    await this.pool.end();
  }
}

/**
 * 命令行接口
 */
async function main() {
  const command = process.argv[2];
  const migrator = new DatabaseMigrator();
  
  try {
    switch (command) {
      case 'migrate':
        await migrator.migrate();
        break;
        
      case 'check':
      case 'status':
        await migrator.checkStatus();
        break;
        
      case 'backup':
        await migrator.backup();
        break;
        
      case 'generate':
        const name = process.argv[3];
        if (!name) {
          console.error('❌ 请提供迁移名称: npm run db:generate "migration name"');
          process.exit(1);
        }
        migrator.generateMigration(name);
        break;
        
      default:
🗄️  数据库迁移工具

使用方法:
  npm run db:migrate     - 执行所有待执行的迁移
  npm run db:check       - 检查数据库迁移状态
  npm run db:backup      - 创建数据库备份
  npm run db:generate    - 生成新的迁移文件

示例:
  npm run db:generate "add user table"
  npm run db:migrate
  npm run db:check
        `);
        break;
    }
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

// 运行命令行接口
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseMigrator };
