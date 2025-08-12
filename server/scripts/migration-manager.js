/**
 * 数据库迁移管理器
 * 负责管理数据库版本升级和迁移
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

class MigrationManager {
  constructor(config = {}) {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'testweb',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ...config
    };
    
    this.pool = null;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  /**
   * 连接数据库
   */
  async connect() {
    if (!this.pool) {
      this.pool = new Pool(this.config);
      await this.pool.query('SELECT NOW()');
      console.log('✅ 数据库连接成功');
    }
  }

  /**
   * 断开数据库连接
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * 确保迁移表存在
   */
  async ensureMigrationTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS database_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        executed_at TIMESTAMP WITH TIME ZONE,
        rollback_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    await this.pool.query(createTableQuery);
  }

  /**
   * 获取所有迁移文件
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql') || file.endsWith('.js'))
        .sort()
        .map(file => ({
          name: path.basename(file, path.extname(file)),
          path: path.join(this.migrationsDir, file),
          type: path.extname(file).slice(1)
        }));
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📁 创建迁移目录...');
        await fs.mkdir(this.migrationsDir, { recursive: true });
        return [];
      }
      throw error;
    }
  }

  /**
   * 获取已执行的迁移
   */
  async getExecutedMigrations() {
    const result = await this.pool.query(
      'SELECT migration_name, status, executed_at FROM database_migrations ORDER BY executed_at'
    );
    return result.rows;
  }

  /**
   * 获取待执行的迁移
   */
  async getPendingMigrations() {
    const allMigrations = await this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    const executedNames = new Set(
      executedMigrations
        .filter(m => m.status === 'completed')
        .map(m => m.migration_name)
    );

    return allMigrations.filter(migration => !executedNames.has(migration.name));
  }

  /**
   * 执行单个迁移
   */
  async executeMigration(migration) {
    console.log(`🔄 执行迁移: ${migration.name}`);

    // 记录迁移开始
    await this.pool.query(
      'INSERT INTO database_migrations (migration_name, status) VALUES ($1, $2) ON CONFLICT (migration_name) DO UPDATE SET status = $2',
      [migration.name, 'running']
    );

    try {
      if (migration.type === 'sql') {
        // 执行SQL迁移
        const sql = await fs.readFile(migration.path, 'utf8');
        await this.executeSqlMigration(sql);
      } else if (migration.type === 'js') {
        // 执行JavaScript迁移
        await this.executeJsMigration(migration.path);
      }

      // 标记迁移完成
      await this.pool.query(
        'UPDATE database_migrations SET status = $1, executed_at = NOW() WHERE migration_name = $2',
        ['completed', migration.name]
      );

      console.log(`✅ 迁移完成: ${migration.name}`);
      return { success: true };

    } catch (error) {
      // 记录迁移失败
      await this.pool.query(
        'UPDATE database_migrations SET status = $1, error_message = $2 WHERE migration_name = $3',
        ['failed', error.message, migration.name]
      );

      console.error(`❌ 迁移失败: ${migration.name}`, error.message);
      throw error;
    }
  }

  /**
   * 执行SQL迁移
   */
  async executeSqlMigration(sql) {
    // 分割SQL语句
    const statements = this.splitSqlStatements(sql);
    
    for (const statement of statements) {
      if (statement.trim()) {
        await this.pool.query(statement);
      }
    }
  }

  /**
   * 执行JavaScript迁移
   */
  async executeJsMigration(migrationPath) {
    const migration = require(migrationPath);
    
    if (typeof migration.up === 'function') {
      await migration.up(this.pool);
    } else {
      throw new Error('迁移文件必须导出 up 函数');
    }
  }

  /**
   * 执行所有待执行的迁移
   */
  async migrate() {
    await this.connect();
    await this.ensureMigrationTable();

    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('✅ 没有待执行的迁移');
      return { success: true, executed: 0 };
    }

    console.log(`📋 发现 ${pendingMigrations.length} 个待执行的迁移`);

    let executed = 0;
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
      executed++;
    }

    console.log(`✅ 成功执行 ${executed} 个迁移`);
    return { success: true, executed };
  }

  /**
   * 回滚迁移
   */
  async rollback(migrationName) {
    await this.connect();
    await this.ensureMigrationTable();

    console.log(`🔄 回滚迁移: ${migrationName}`);

    // 查找迁移文件
    const migrationFiles = await this.getMigrationFiles();
    const migration = migrationFiles.find(m => m.name === migrationName);

    if (!migration) {
      throw new Error(`迁移文件不存在: ${migrationName}`);
    }

    try {
      if (migration.type === 'js') {
        const migrationModule = require(migration.path);
        if (typeof migrationModule.down === 'function') {
          await migrationModule.down(this.pool);
        } else {
          throw new Error('迁移文件必须导出 down 函数以支持回滚');
        }
      } else {
        throw new Error('SQL迁移不支持自动回滚');
      }

      // 标记迁移已回滚
      await this.pool.query(
        'UPDATE database_migrations SET status = $1, rollback_at = NOW() WHERE migration_name = $2',
        ['rolled_back', migrationName]
      );

      console.log(`✅ 迁移回滚完成: ${migrationName}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ 迁移回滚失败: ${migrationName}`, error.message);
      throw error;
    }
  }

  /**
   * 获取迁移状态
   */
  async getStatus() {
    await this.connect();
    await this.ensureMigrationTable();

    const allMigrations = await this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = await this.getPendingMigrations();

    return {
      total: allMigrations.length,
      executed: executedMigrations.filter(m => m.status === 'completed').length,
      pending: pendingMigrations.length,
      failed: executedMigrations.filter(m => m.status === 'failed').length,
      migrations: {
        all: allMigrations,
        executed: executedMigrations,
        pending: pendingMigrations
      }
    };
  }

  /**
   * 创建新的迁移文件
   */
  async createMigration(name, type = 'sql') {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const filename = `${timestamp}_${name}.${type}`;
    const filepath = path.join(this.migrationsDir, filename);

    // 确保迁移目录存在
    await fs.mkdir(this.migrationsDir, { recursive: true });

    let content = '';
    if (type === 'sql') {
      content = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL statements here
-- Example:
-- CREATE TABLE example (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL
-- );
`;
    } else if (type === 'js') {
      content = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

module.exports = {
  /**
   * 执行迁移
   * @param {Pool} pool - 数据库连接池
   */
  async up(pool) {
    // 添加你的迁移逻辑
    // 例如:
    // await pool.query('CREATE TABLE example (id SERIAL PRIMARY KEY, name VARCHAR(255))');
  },

  /**
   * 回滚迁移
   * @param {Pool} pool - 数据库连接池
   */
  async down(pool) {
    // 添加你的回滚逻辑
    // 例如:
    // await pool.query('DROP TABLE IF EXISTS example');
  }
};
`;
    }

    await fs.writeFile(filepath, content);
    console.log(`✅ 迁移文件已创建: ${filename}`);
    return { filename, filepath };
  }

  /**
   * 分割SQL语句
   */
  splitSqlStatements(sql) {
    return sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
  }
}

module.exports = MigrationManager;
