import fs from 'fs';
import path from 'path';
import { db } from '../config/database';
import { logger } from '../utils/logger';

interface Migration {
  id: number;
  filename: string;
  executed_at?: string;
}

export class MigrationManager {
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  // 初始化迁移表
  async initializeMigrationTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      await db.query(createTableQuery);
      logger.info('迁移表初始化成功');
    } catch (error) {
      logger.error('迁移表初始化失败', error);
      throw error;
    }
  }

  // 获取所有迁移文件
  getMigrationFiles(): string[] {
    try {
      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      return files;
    } catch (error) {
      logger.error('读取迁移文件失败', error);
      return [];
    }
  }

  // 获取已执行的迁移
  async getExecutedMigrations(): Promise<Migration[]> {
    try {
      const result = await db.query(
        'SELECT * FROM migrations ORDER BY id ASC'
      );
      return result.rows;
    } catch (error) {
      logger.error('获取已执行迁移失败', error);
      return [];
    }
  }

  // 获取待执行的迁移
  async getPendingMigrations(): Promise<string[]> {
    const allFiles = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const executedFilenames = executed.map(m => m.filename);

    return allFiles.filter(file => !executedFilenames.includes(file));
  }

  // 执行单个迁移
  async executeMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      await db.transaction(async (client) => {
        // 执行迁移SQL
        await client.query(sql);
        
        // 记录迁移执行
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
      });

      logger.info(`迁移执行成功: ${filename}`);
    } catch (error) {
      // 检查是否是触发器已存在的错误，如果是则忽略
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('触发器已经存在') || errorMessage.includes('already exists')) {
        logger.warn(`迁移警告 (已忽略): ${filename} - ${errorMessage}`);

        // 仍然记录迁移为已执行
        try {
          await db.query(
            'INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
            [filename]
          );
        } catch (insertError) {
          // 忽略插入错误
        }

        return;
      }

      logger.error(`迁移执行失败: ${filename}`, error);
      throw error;
    }
  }

  // 执行所有待执行的迁移
  async runMigrations(): Promise<void> {
    await this.initializeMigrationTable();
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      logger.info('没有待执行的迁移');
      return;
    }

    logger.info(`发现 ${pendingMigrations.length} 个待执行的迁移`);

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    logger.info('所有迁移执行完成');
  }

  // 获取迁移状态
  async getMigrationStatus(): Promise<{
    total: number;
    executed: number;
    pending: string[];
    lastMigration?: Migration | undefined;
  }> {
    const allFiles = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      total: allFiles.length,
      executed: executed.length,
      pending,
      lastMigration: executed.length > 0 ? executed[executed.length - 1] : undefined,
    };
  }

  // 回滚迁移（危险操作，仅用于开发环境）
  async rollbackMigration(filename: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境不允许回滚迁移');
    }

    try {
      await db.transaction(async (client) => {
        // 删除迁移记录
        await client.query(
          'DELETE FROM migrations WHERE filename = $1',
          [filename]
        );
      });

      logger.warn(`迁移回滚成功: ${filename}`);
    } catch (error) {
      logger.error(`迁移回滚失败: ${filename}`, error);
      throw error;
    }
  }

  // 创建新的迁移文件
  createMigration(name: string): string {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_');
    
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filePath = path.join(this.migrationsDir, filename);

    const template = `-- ${name}
-- 创建时间: ${new Date().toISOString().split('T')[0]}

-- 在这里添加你的 SQL 语句

-- 示例:
-- CREATE TABLE example (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(100) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );
`;

    fs.writeFileSync(filePath, template);
    logger.info(`新迁移文件已创建: ${filename}`);
    
    return filename;
  }

  // 验证迁移完整性
  async validateMigrations(): Promise<boolean> {
    try {
      const allFiles = this.getMigrationFiles();
      const executed = await this.getExecutedMigrations();

      // 检查是否有缺失的迁移文件
      for (const migration of executed) {
        if (!allFiles.includes(migration.filename)) {
          logger.error(`迁移文件缺失: ${migration.filename}`);
          return false;
        }
      }

      // 检查迁移顺序
      const executedFilenames = executed.map(m => m.filename).sort();
      const expectedOrder = allFiles.slice(0, executed.length).sort();

      for (let i = 0; i < executedFilenames.length; i++) {
        if (executedFilenames[i] !== expectedOrder[i]) {
          logger.error('迁移执行顺序不正确');
          return false;
        }
      }

      logger.info('迁移完整性验证通过');
      return true;
    } catch (error) {
      logger.error('迁移完整性验证失败', error);
      return false;
    }
  }
}

// 创建全局迁移管理器实例
export const migrationManager = new MigrationManager();

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  (async () => {
    try {
      await db.initialize();
      await migrationManager.runMigrations();
      process.exit(0);
    } catch (error) {
      logger.error('迁移执行失败', error);
      process.exit(1);
    }
  })();
}
