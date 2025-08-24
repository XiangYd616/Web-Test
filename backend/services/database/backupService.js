/**
 * 数据库备份服务
 * 提供自动备份、备份验证和恢复功能
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const cron = require('node-cron');
const config = require('../../config/database');

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.maxBackups = 30; // 保留30个备份
    this.isScheduled = false;
    this.scheduledTask = null;
    this.init();
  }

  /**
   * 初始化备份服务
   */
  async init() {
    try {
      // 确保备份目录存在
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
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log('📁 创建备份目录:', this.backupDir);
    }
  }

  /**
   * 创建数据库备份
   */
  async createBackup(customName = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = customName || `backup_${timestamp}`;
    const backupFile = path.join(this.backupDir, `${backupName}.sql`);

    console.log('🔄 开始创建数据库备份...');

    try {
      await this.performBackup(backupFile);
      
      // 验证备份文件
      const isValid = await this.validateBackup(backupFile);
      if (!isValid) {
        throw new Error('备份文件验证失败');
      }

      // 清理旧备份
      await this.cleanupOldBackups();

      const stats = await fs.stat(backupFile);
      const result = {
        success: true,
        backupFile,
        backupName,
        size: stats.size,
        timestamp: new Date().toISOString(),
        message: '备份创建成功'
      };

      console.log('✅ 数据库备份完成:', {
        文件: backupName,
        大小: this.formatFileSize(stats.size),
        路径: backupFile
      });

      return result;

    } catch (error) {
      console.error('❌ 数据库备份失败:', error);
      
      // 清理失败的备份文件
      try {
        await fs.unlink(backupFile);
      } catch (cleanupError) {
        // 忽略清理错误
      }

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 执行备份操作
   */
  async performBackup(backupFile) {
    return new Promise((resolve, reject) => {
      const pgDump = spawn('pg_dump', [
        '-h', config.host,
        '-p', config.port.toString(),
        '-U', config.user || config.username,
        '-d', config.database,
        '--no-password',
        '--verbose',
        '--clean',
        '--if-exists',
        '--create',
        '-f', backupFile
      ], {
        env: {
          ...process.env,
          PGPASSWORD: config.password
        }
      });

      let errorOutput = '';

      pgDump.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump 退出码: ${code}, 错误: ${errorOutput}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(new Error(`pg_dump 执行失败: ${error.message}`));
      });
    });
  }

  /**
   * 验证备份文件
   */
  async validateBackup(backupFile) {
    try {
      const stats = await fs.stat(backupFile);
      
      // 检查文件大小
      if (stats.size < 1024) { // 小于1KB可能是空文件
        console.warn('⚠️ 备份文件过小，可能无效');
        return false;
      }

      // 检查文件内容
      const content = await fs.readFile(backupFile, 'utf8');
      
      // 检查是否包含PostgreSQL备份标识
      if (!content.includes('PostgreSQL database dump')) {
        console.warn('⚠️ 备份文件格式无效');
        return false;
      }

      // 检查是否包含数据库名称
      if (!content.includes(config.database)) {
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
          path: path.join(this.backupDir, file)
        }));

      if (backupFiles.length <= this.maxBackups) {
        return;
      }

      // 按修改时间排序
      const filesWithStats = await Promise.all(
        backupFiles.map(async (file) => {
          const stats = await fs.stat(file.path);
          return {
            ...file,
            mtime: stats.mtime
          };
        })
      );

      filesWithStats.sort((a, b) => b.mtime - a.mtime);

      // 删除多余的备份
      const filesToDelete = filesWithStats.slice(this.maxBackups);
      
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log('🗑️ 删除旧备份:', file.name);
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
  async restoreBackup(backupFile) {
    console.log('🔄 开始恢复数据库...');

    try {
      // 验证备份文件存在
      await fs.access(backupFile);

      // 验证备份文件有效性
      const isValid = await this.validateBackup(backupFile);
      if (!isValid) {
        throw new Error('备份文件无效');
      }

      await this.performRestore(backupFile);

      console.log('✅ 数据库恢复完成');
      
      return {
        success: true,
        message: '数据库恢复成功',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 数据库恢复失败:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 执行恢复操作
   */
  async performRestore(backupFile) {
    return new Promise((resolve, reject) => {
      const psql = spawn('psql', [
        '-h', config.host,
        '-p', config.port.toString(),
        '-U', config.user || config.username,
        '-d', config.database,
        '-f', backupFile
      ], {
        env: {
          ...process.env,
          PGPASSWORD: config.password
        }
      });

      let errorOutput = '';

      psql.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      psql.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql 退出码: ${code}, 错误: ${errorOutput}`));
        }
      });

      psql.on('error', (error) => {
        reject(new Error(`psql 执行失败: ${error.message}`));
      });
    });
  }

  /**
   * 启动自动备份调度
   */
  startScheduledBackup(cronExpression = '0 2 * * *') { // 默认每天凌晨2点
    if (this.isScheduled) {
      console.log('⚠️ 自动备份调度已在运行');
      return;
    }

    this.scheduledTask = cron.schedule(cronExpression, async () => {
      console.log('⏰ 执行定时备份任务');
      await this.createBackup();
    }, {
      scheduled: false
    });

    this.scheduledTask.start();
    this.isScheduled = true;

    console.log('📅 自动备份调度已启动:', cronExpression);
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
    console.log('🛑 自动备份调度已停止');
  }

  /**
   * 获取备份列表
   */
  async getBackupList() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.sql'));

      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
      );

      // 按修改时间倒序排列
      backups.sort((a, b) => b.modified - a.modified);

      return backups;

    } catch (error) {
      console.error('❌ 获取备份列表失败:', error);
      return [];
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 获取备份服务状态
   */
  getStatus() {
    return {
      isScheduled: this.isScheduled,
      backupDir: this.backupDir,
      maxBackups: this.maxBackups,
      scheduledTask: this.scheduledTask ? '运行中' : '未运行'
    };
  }
}

module.exports = BackupService;
