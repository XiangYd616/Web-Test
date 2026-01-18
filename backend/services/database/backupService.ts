/**
 * 数据库备份服务
 * 提供自动备份、备份验证和恢复功能
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import cron from 'node-cron';
import path from 'path';

const config = require('../../config/database');

type DbConfig = {
  host: string;
  port: number;
  user?: string;
  username?: string;
  database: string;
  password: string;
};

type BackupResult = {
  success: boolean;
  backupFile?: string;
  backupName?: string;
  size?: number;
  timestamp: string;
  message?: string;
  error?: string;
};

type BackupFileInfo = {
  name: string;
  path: string;
  size: number;
  sizeFormatted: string;
  created: Date;
  modified: Date;
};

type ScheduledTask = {
  start: () => void;
  stop: () => void;
};

class BackupService {
  private backupDir = path.join(__dirname, '../../backups');
  private maxBackups = 30;
  private isScheduled = false;
  private scheduledTask: ScheduledTask | null = null;
  private dbConfig = config as DbConfig;

  constructor() {
    void this.init();
  }

  /**
   * 初始化备份服务
   */
  async init() {
    try {
      await this.ensureBackupDirectory();
      console.log('✅ 数据库备份服务初始化完成');
    } catch (error) {
      console.error('❌ 数据库备份服务初始化失败:', error);
    }
  }

  /**
   * 确保备份目录存在
   */
  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  /**
   * 创建数据库备份
   */
  async createBackup(customName: string | null = null): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = customName || `backup_${timestamp}`;
    const backupFile = path.join(this.backupDir, `${backupName}.sql`);

    try {
      await this.performBackup(backupFile);

      const isValid = await this.validateBackup(backupFile);
      if (!isValid) {
        throw new Error('备份文件验证失败');
      }

      await this.cleanupOldBackups();

      const stats = await fs.stat(backupFile);
      const result: BackupResult = {
        success: true,
        backupFile,
        backupName,
        size: stats.size,
        timestamp: new Date().toISOString(),
        message: '备份创建成功',
      };

      console.log('✅ 数据库备份完成:', {
        文件: backupName,
        大小: this.formatFileSize(stats.size),
        路径: backupFile,
      });

      return result;
    } catch (error) {
      console.error('❌ 数据库备份失败:', error);

      try {
        await fs.unlink(backupFile);
      } catch {
        // 忽略清理错误
      }

      return {
        success: false,
        error: this.getErrorMessage(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 执行备份操作
   */
  async performBackup(backupFile: string) {
    return new Promise<void>((resolve, reject) => {
      const dbConfig = this.dbConfig;
      const pgDump = spawn(
        'pg_dump',
        [
          '-h',
          dbConfig.host,
          '-p',
          dbConfig.port.toString(),
          '-U',
          dbConfig.user || dbConfig.username || '',
          '-d',
          dbConfig.database,
          '--no-password',
          '--verbose',
          '--clean',
          '--if-exists',
          '--create',
          '-f',
          backupFile,
        ],
        {
          env: {
            ...process.env,
            PGPASSWORD: dbConfig.password,
          },
        }
      );

      let errorOutput = '';

      pgDump.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      pgDump.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump 退出码: ${code}, 错误: ${errorOutput}`));
        }
      });

      pgDump.on('error', err => {
        reject(new Error(`pg_dump 执行失败: ${err.message}`));
      });
    });
  }

  /**
   * 验证备份文件
   */
  async validateBackup(backupFile: string) {
    try {
      const stats = await fs.stat(backupFile);

      if (stats.size < 1024) {
        console.warn('⚠️ 备份文件过小，可能无效');
        return false;
      }

      const content = await fs.readFile(backupFile, 'utf8');

      if (!content.includes('PostgreSQL database dump')) {
        console.warn('⚠️ 备份文件格式无效');
        return false;
      }

      if (!content.includes(this.dbConfig.database)) {
        console.warn('⚠️ 备份文件不包含目标数据库');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ 备份文件验证失败:', error);
      return false;
    }
  }

  /**
   * 清理旧备份
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.sql'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
        }));

      if (backupFiles.length <= this.maxBackups) {
        return;
      }

      const filesWithStats = await Promise.all(
        backupFiles.map(async file => {
          const stats = await fs.stat(file.path);
          return {
            ...file,
            mtime: stats.mtime,
          };
        })
      );

      filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      const filesToDelete = filesWithStats.slice(this.maxBackups);

      for (const file of filesToDelete) {
        await fs.unlink(file.path);
      }

      if (filesToDelete.length > 0) {
        console.log(`✅ 清理了 ${filesToDelete.length} 个旧备份文件`);
      }
    } catch (error) {
      console.error('❌ 清理旧备份失败:', error);
    }
  }

  /**
   * 恢复数据库
   */
  async restoreBackup(backupFile: string) {
    try {
      await fs.access(backupFile);

      const isValid = await this.validateBackup(backupFile);
      if (!isValid) {
        throw new Error('备份文件无效');
      }

      await this.performRestore(backupFile);

      console.log('✅ 数据库恢复完成');

      return {
        success: true,
        message: '数据库恢复成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ 数据库恢复失败:', error);

      return {
        success: false,
        error: this.getErrorMessage(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 执行恢复操作
   */
  async performRestore(backupFile: string) {
    return new Promise<void>((resolve, reject) => {
      const dbConfig = this.dbConfig;
      const psql = spawn(
        'psql',
        [
          '-h',
          dbConfig.host,
          '-p',
          dbConfig.port.toString(),
          '-U',
          dbConfig.user || dbConfig.username || '',
          '-d',
          dbConfig.database,
          '-f',
          backupFile,
        ],
        {
          env: {
            ...process.env,
            PGPASSWORD: dbConfig.password,
          },
        }
      );

      let errorOutput = '';

      psql.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      psql.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql 退出码: ${code}, 错误: ${errorOutput}`));
        }
      });

      psql.on('error', err => {
        reject(new Error(`psql 执行失败: ${err.message}`));
      });
    });
  }

  /**
   * 启动自动备份调度
   */
  startScheduledBackup(cronExpression = '0 2 * * *') {
    if (this.isScheduled) {
      console.log('⚠️ 自动备份调度已在运行');
      return;
    }

    const task = cron.schedule(
      cronExpression,
      async () => {
        await this.createBackup();
      },
      {
        scheduled: false,
      }
    );

    task.start();
    this.scheduledTask = task as ScheduledTask;
    this.isScheduled = true;
  }

  /**
   * 停止自动备份调度
   */
  stopScheduledBackup() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }

    this.isScheduled = false;
  }

  /**
   * 获取备份列表
   */
  async getBackupList(): Promise<BackupFileInfo[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sql'));

      const backups = await Promise.all(
        backupFiles.map(async file => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);

          return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
          };
        })
      );

      backups.sort((a, b) => b.modified.getTime() - a.modified.getTime());

      return backups;
    } catch (error) {
      console.error('❌ 获取备份列表失败:', error);
      return [];
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 获取备份服务状态
   */
  getStatus() {
    return {
      isScheduled: this.isScheduled,
      backupDir: this.backupDir,
      maxBackups: this.maxBackups,
      scheduledTask: this.scheduledTask ? '运行中' : '未运行',
    };
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

export { BackupService };

// 兼容 CommonJS require
module.exports = BackupService;
