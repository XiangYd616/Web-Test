/**
 * 数据备份恢复服务
 * 实现数据库自动备份、版本控制和数据恢复功能
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const winston = require('winston');
const archiver = require('archiver');
const { EventEmitter } = require('events');
const cron = require('node-cron');

class BackupService extends EventEmitter {
    constructor(dbPool, dbConfig) {
        super();

        this.dbPool = dbPool;
        this.dbConfig = dbConfig;
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/backup.log' }),
                new winston.transports.Console()
            ]
        });

        this.backupDir = path.join(__dirname, '../../runtime/backups');
        this.tempDir = path.join(__dirname, '../../runtime/temp/backups');

        // 备份配置
        this.maxBackupRetention = 30; // 保留30天的备份
        this.maxBackupCount = 100; // 最多保留100个备份文件
        this.compressionLevel = 6; // 压缩级别 (1-9)

        // 备份任务状态
        this.activeBackups = new Map();
        this.scheduledTasks = new Map();

        this.ensureDirectories();
        this.initializeDatabase();
        this.setupScheduledBackups();
    }

    /**
     * 确保备份目录存在
     */
    async ensureDirectories() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            await fs.mkdir(this.tempDir, { recursive: true });
            this.logger.info('备份目录初始化完成');
        } catch (error) {
            this.logger.error('创建备份目录失败:', error);
            throw error;
        }
    }

    /**
     * 初始化数据库表
     */
    async initializeDatabase() {
        try {
            const createTableQuery = `
        CREATE TABLE IF NOT EXISTS backup_tasks (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          backup_path VARCHAR(500),
          file_size BIGINT,
          compressed_size BIGINT,
          tables_included TEXT[],
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          expires_at TIMESTAMP,
          error_message TEXT,
          INDEX idx_backup_tasks_type (type),
          INDEX idx_backup_tasks_status (status),
          INDEX idx_backup_tasks_created (created_at)
        )
      `;

            if (this.dbPool) {
                await this.dbPool.query(createTableQuery);
                this.logger.info('备份任务表初始化完成');
            }
        } catch (error) {
            this.logger.error('初始化数据库表失败:', error);
        }
    }

    /**
     * 设置定时备份任务
     */
    setupScheduledBackups() {
        try {
            // 每日凌晨2点执行全量备份
            const dailyBackup = cron.schedule('0 2 * * *', async () => {
                try {
                    await this.createFullBackup('scheduled_daily');
                    this.logger.info('定时全量备份完成');
                } catch (error) {
                    this.logger.error('定时全量备份失败:', error);
                }
            }, {
                scheduled: false,
                timezone: 'Asia/Shanghai'
            });

            // 每小时执行增量备份
            const hourlyBackup = cron.schedule('0 * * * *', async () => {
                try {
                    await this.createIncrementalBackup('scheduled_hourly');
                    this.logger.info('定时增量备份完成');
                } catch (error) {
                    this.logger.error('定时增量备份失败:', error);
                }
            }, {
                scheduled: false,
                timezone: 'Asia/Shanghai'
            });

            this.scheduledTasks.set('daily', dailyBackup);
            this.scheduledTasks.set('hourly', hourlyBackup);

            // 启动定时任务
            dailyBackup.start();
            hourlyBackup.start();

            this.logger.info('定时备份任务设置完成');

        } catch (error) {
            this.logger.error('设置定时备份任务失败:', error);
        }
    }

    /**
     * 创建全量备份
     */
    async createFullBackup(name = null, options = {}) {
        const backupId = this.generateBackupId();
        const backupName = name || `full_backup_${new Date().toISOString().split('T')[0]}`;

        try {
            this.logger.info(`开始创建全量备份: ${backupId}`);

            // 创建备份任务记录
            const task = {
                id: backupId,
                name: backupName,
                type: 'full',
                status: 'running',
                createdAt: new Date().toISOString(),
                startedAt: new Date().toISOString(),
                options
            };

            this.activeBackups.set(backupId, task);

            // 保存到数据库
            if (this.dbPool) {
                await this.dbPool.query(
                    `INSERT INTO backup_tasks (id, name, type, status, started_at, created_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                    [backupId, backupName, 'full', 'running']
                );
            }

            // 执行数据库备份
            const backupResult = await this.performDatabaseBackup(backupId, 'full', options);

            // 压缩备份文件
            const compressedPath = await this.compressBackup(backupResult.filePath, backupId);

            // 更新任务状态
            await this.updateBackupTask(backupId, {
                status: 'completed',
                backupPath: compressedPath,
                fileSize: backupResult.fileSize,
                compressedSize: await this.getFileSize(compressedPath),
                tablesIncluded: backupResult.tables,
                completedAt: new Date().toISOString(),
                expiresAt: this.calculateExpirationDate()
            });

            this.activeBackups.delete(backupId);

            // 发送完成事件
            this.emit('backupCompleted', {
                backupId,
                type: 'full',
                filePath: compressedPath
            });

            this.logger.info(`全量备份完成: ${backupId}`);

            return {
                success: true,
                backupId,
                filePath: compressedPath
            };

        } catch (error) {
            this.logger.error(`全量备份失败: ${backupId}`, error);

            await this.updateBackupTask(backupId, {
                status: 'failed',
                errorMessage: error.message,
                completedAt: new Date().toISOString()
            });

            this.activeBackups.delete(backupId);

            // 发送失败事件
            this.emit('backupFailed', {
                backupId,
                type: 'full',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * 创建增量备份
     */
    async createIncrementalBackup(name = null, options = {}) {
        const backupId = this.generateBackupId();
        const backupName = name || `incremental_backup_${new Date().toISOString().split('T')[0]}`;

        try {
            this.logger.info(`开始创建增量备份: ${backupId}`);

            // 获取最后一次备份时间
            const lastBackupTime = await this.getLastBackupTime();

            const task = {
                id: backupId,
                name: backupName,
                type: 'incremental',
                status: 'running',
                createdAt: new Date().toISOString(),
                startedAt: new Date().toISOString(),
                options: { ...options, since: lastBackupTime }
            };

            this.activeBackups.set(backupId, task);

            // 保存到数据库
            if (this.dbPool) {
                await this.dbPool.query(
                    `INSERT INTO backup_tasks (id, name, type, status, started_at, created_at, metadata)
           VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)`,
                    [backupId, backupName, 'incremental', 'running', JSON.stringify({ since: lastBackupTime })]
                );
            }

            // 执行增量备份
            const backupResult = await this.performIncrementalBackup(backupId, lastBackupTime, options);

            // 压缩备份文件
            const compressedPath = await this.compressBackup(backupResult.filePath, backupId);

            // 更新任务状态
            await this.updateBackupTask(backupId, {
                status: 'completed',
                backupPath: compressedPath,
                fileSize: backupResult.fileSize,
                compressedSize: await this.getFileSize(compressedPath),
                tablesIncluded: backupResult.tables,
                completedAt: new Date().toISOString(),
                expiresAt: this.calculateExpirationDate()
            });

            this.activeBackups.delete(backupId);

            // 发送完成事件
            this.emit('backupCompleted', {
                backupId,
                type: 'incremental',
                filePath: compressedPath
            });

            this.logger.info(`增量备份完成: ${backupId}`);

            return {
                success: true,
                backupId,
                filePath: compressedPath
            };

        } catch (error) {
            this.logger.error(`增量备份失败: ${backupId}`, error);

            await this.updateBackupTask(backupId, {
                status: 'failed',
                errorMessage: error.message,
                completedAt: new Date().toISOString()
            });

            this.activeBackups.delete(backupId);

            // 发送失败事件
            this.emit('backupFailed', {
                backupId,
                type: 'incremental',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * 执行数据库备份
     */
    async performDatabaseBackup(backupId, type, options = {}) {
        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${type}_backup_${timestamp}.sql`;
            const filePath = path.join(this.tempDir, fileName);

            // 构建pg_dump命令
            const pgDumpArgs = [
                '-h', this.dbConfig.host || 'localhost',
                '-p', (this.dbConfig.port || 5432).toString(),
                '-U', this.dbConfig.user || 'postgres',
                '-d', this.dbConfig.database,
                '-f', filePath,
                '--verbose',
                '--no-password'
            ];

            // 添加额外选项
            if (options.schemaOnly) {
                pgDumpArgs.push('--schema-only');
            }

            if (options.dataOnly) {
                pgDumpArgs.push('--data-only');
            }

            if (options.tables && options.tables.length > 0) {
                options.tables.forEach(table => {
                    pgDumpArgs.push('-t', table);
                });
            }

            // 设置环境变量
            const env = { ...process.env };
            if (this.dbConfig.password) {
                env.PGPASSWORD = this.dbConfig.password;
            }

            const pgDump = spawn('pg_dump', pgDumpArgs, { env });

            let stderr = '';

            pgDump.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pgDump.on('close', async (code) => {
                if (code === 0) {
                    try {
                        const fileSize = await this.getFileSize(filePath);
                        const tables = await this.extractTablesFromBackup(filePath);

                        resolve({
                            filePath,
                            fileSize,
                            tables
                        });
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
                }
            });

            pgDump.on('error', (error) => {
                reject(new Error(`Failed to start pg_dump: ${error.message}`));
            });
        });
    }

    /**
     * 执行增量备份
     */
    async performIncrementalBackup(backupId, since, options = {}) {
        try {
            // 获取自上次备份以来修改的数据
            const modifiedTables = await this.getModifiedTables(since);

            if (modifiedTables.length === 0) {
                this.logger.info('没有数据变更，跳过增量备份');

                // 创建空的备份文件
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const fileName = `incremental_backup_${timestamp}.sql`;
                const filePath = path.join(this.tempDir, fileName);

                await fs.writeFile(filePath, '-- No changes since last backup/n');

                return {
                    filePath,
                    fileSize: await this.getFileSize(filePath),
                    tables: []
                };
            }

            // 执行增量备份
            return await this.performDatabaseBackup(backupId, 'incremental', {
                ...options,
                tables: modifiedTables
            });

        } catch (error) {
            this.logger.error('增量备份执行失败:', error);
            throw error;
        }
    }

    /**
     * 获取修改的表
     */
    async getModifiedTables(since) {
        try {
            // 这里需要根据实际的数据库结构来实现
            // 可以通过检查表的最后修改时间或者使用WAL日志

            // 简化实现：检查主要表的更新时间
            const tables = [
                'users', 'test_sessions', 'monitoring_logs',
                'test_configurations', 'user_sessions'
            ];

            const modifiedTables = [];

            for (const table of tables) {
                try {
                    // 检查表是否有在指定时间之后的记录
                    const result = await this.dbPool.query(
                        `SELECT COUNT(*) as count FROM ${table} 
             WHERE updated_at > $1 OR created_at > $1`,
                        [since]
                    );

                    if (parseInt(result.rows[0].count) > 0) {
                        modifiedTables.push(table);
                    }
                } catch (error) {
                    // 如果表不存在updated_at字段，则包含在备份中
                    this.logger.warn(`检查表 ${table} 修改时间失败:`, error.message);
                    modifiedTables.push(table);
                }
            }

            return modifiedTables;

        } catch (error) {
            this.logger.error('获取修改表列表失败:', error);
            throw error;
        }
    }

    /**
     * 压缩备份文件
     */
    async compressBackup(filePath, backupId) {
        return new Promise((resolve, reject) => {
            const compressedPath = filePath + '.gz';
            const output = require('fs').createWriteStream(compressedPath);
            const archive = archiver('gzip', { level: this.compressionLevel });

            archive.pipe(output);
            archive.file(filePath, { name: path.basename(filePath) });

            output.on('close', async () => {
                try {
                    // 删除原始文件
                    await fs.unlink(filePath);
                    resolve(compressedPath);
                } catch (error) {
                    reject(error);
                }
            });

            archive.on('error', reject);
            archive.finalize();
        });
    }

    /**
     * 恢复数据库
     */
    async restoreDatabase(backupPath, options = {}) {
        const restoreId = this.generateBackupId();

        try {
            this.logger.info(`开始数据库恢复: ${restoreId}`, { backupPath });

            // 验证备份文件
            await this.validateBackupFile(backupPath);

            // 解压备份文件（如果需要）
            const sqlFilePath = await this.extractBackupFile(backupPath);

            // 执行恢复
            const restoreResult = await this.performDatabaseRestore(sqlFilePath, options);

            // 清理临时文件
            if (sqlFilePath !== backupPath) {
                await fs.unlink(sqlFilePath);
            }

            this.logger.info(`数据库恢复完成: ${restoreId}`);

            // 发送恢复完成事件
            this.emit('restoreCompleted', {
                restoreId,
                backupPath,
                result: restoreResult
            });

            return {
                success: true,
                restoreId,
                result: restoreResult
            };

        } catch (error) {
            this.logger.error(`数据库恢复失败: ${restoreId}`, error);

            // 发送恢复失败事件
            this.emit('restoreFailed', {
                restoreId,
                backupPath,
                error: error.message
            });

            throw error;
        }
    }

    /**
     * 执行数据库恢复
     */
    async performDatabaseRestore(sqlFilePath, options = {}) {
        return new Promise((resolve, reject) => {
            // 构建psql命令
            const psqlArgs = [
                '-h', this.dbConfig.host || 'localhost',
                '-p', (this.dbConfig.port || 5432).toString(),
                '-U', this.dbConfig.user || 'postgres',
                '-d', this.dbConfig.database,
                '-f', sqlFilePath,
                '--quiet'
            ];

            // 添加额外选项
            if (options.singleTransaction) {
                psqlArgs.push('--single-transaction');
            }

            if (options.noOwner) {
                psqlArgs.push('--no-owner');
            }

            // 设置环境变量
            const env = { ...process.env };
            if (this.dbConfig.password) {
                env.PGPASSWORD = this.dbConfig.password;
            }

            const psql = spawn('psql', psqlArgs, { env });

            let stdout = '';
            let stderr = '';

            psql.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            psql.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            psql.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        output: stdout,
                        warnings: stderr
                    });
                } else {
                    reject(new Error(`psql failed with code ${code}: ${stderr}`));
                }
            });

            psql.on('error', (error) => {
                reject(new Error(`Failed to start psql: ${error.message}`));
            });
        });
    }

    /**
     * 验证备份文件
     */
    async validateBackupFile(backupPath) {
        try {
            const stats = await fs.stat(backupPath);

            if (!stats.isFile()) {
                throw new Error('备份路径不是有效文件');
            }

            if (stats.size === 0) {
                throw new Error('备份文件为空');
            }

            // 检查文件扩展名
            const ext = path.extname(backupPath).toLowerCase();
            if (!['.sql', '.gz', '.zip'].includes(ext)) {
                throw new Error('不支持的备份文件格式');
            }

            return true;

        } catch (error) {
            throw new Error(`备份文件验证失败: ${error.message}`);
        }
    }

    /**
     * 解压备份文件
     */
    async extractBackupFile(backupPath) {
        const ext = path.extname(backupPath).toLowerCase();

        if (ext === '.sql') {
            
        return backupPath; // 已经是SQL文件，无需解压
      }

        if (ext === '.gz') {
            // 解压gzip文件
            const extractedPath = path.join(this.tempDir, `extracted_${Date.now()}.sql`);

            return new Promise((resolve, reject) => {
                const zlib = require('zlib');
                const input = require('fs').createReadStream(backupPath);
                const output = require('fs').createWriteStream(extractedPath);

                input.pipe(zlib.createGunzip()).pipe(output);

                output.on('finish', () => resolve(extractedPath));
                output.on('error', reject);
                input.on('error', reject);
            });
        }

        throw new Error(`不支持的压缩格式: ${ext}`);
    }

    /**
     * 获取备份列表
     */
    async getBackupList(options = {}) {
        try {
            const { page = 1, limit = 20, type, status } = options;
            const offset = (page - 1) * limit;

            if (!this.dbPool) {
                
        return {
                    success: true,
                    data: [],
                    pagination: { page, limit, total: 0, totalPages: 0
      }
                };
            }

            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (type) {
                whereClause += ` AND type = $${paramIndex}`;
                params.push(type);
                paramIndex++;
            }

            if (status) {
                whereClause += ` AND status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            // 获取总数
            const countQuery = `SELECT COUNT(*) as total FROM backup_tasks ${whereClause}`;
            const countResult = await this.dbPool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total);

            // 获取备份列表
            const backupsQuery = `
        SELECT id, name, type, status, backup_path, file_size, compressed_size,
               tables_included, created_at, started_at, completed_at, expires_at, error_message
        FROM backup_tasks 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            params.push(limit, offset);

            const backupsResult = await this.dbPool.query(backupsQuery, params);

            return {
                success: true,
                data: backupsResult.rows.map(backup => ({
                    id: backup.id,
                    name: backup.name,
                    type: backup.type,
                    status: backup.status,
                    backupPath: backup.backup_path,
                    fileSize: backup.file_size,
                    compressedSize: backup.compressed_size,
                    tablesIncluded: backup.tables_included,
                    createdAt: backup.created_at,
                    startedAt: backup.started_at,
                    completedAt: backup.completed_at,
                    expiresAt: backup.expires_at,
                    errorMessage: backup.error_message
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            this.logger.error('获取备份列表失败:', error);
            throw error;
        }
    }

    /**
     * 删除备份
     */
    async deleteBackup(backupId) {
        try {
            if (!this.dbPool) {
                throw new Error('数据库连接不可用');
            }

            // 获取备份信息
            const result = await this.dbPool.query(
                'SELECT backup_path FROM backup_tasks WHERE id = $1',
                [backupId]
            );

            if (result.rows.length === 0) {
                throw new Error('备份不存在');
            }

            const backupPath = result.rows[0].backup_path;

            // 删除备份文件
            if (backupPath) {
                try {
                    await fs.unlink(backupPath);
                    this.logger.info(`删除备份文件: ${backupPath}`);
                } catch (error) {
                    this.logger.warn('删除备份文件失败:', error);
                }
            }

            // 从数据库删除记录
            await this.dbPool.query('DELETE FROM backup_tasks WHERE id = $1', [backupId]);

            this.logger.info(`删除备份: ${backupId}`);

            return {
                success: true,
                message: '备份已删除'
            };

        } catch (error) {
            this.logger.error('删除备份失败:', error);
            throw error;
        }
    }

    /**
     * 清理过期备份
     */
    async cleanupExpiredBackups() {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.maxBackupRetention);

            if (!this.dbPool) {
                
        return { deletedCount: 0
      };
            }

            // 获取过期备份
            const expiredBackups = await this.dbPool.query(
                'SELECT id, backup_path FROM backup_tasks WHERE created_at < $1 OR expires_at < NOW()',
                [cutoffDate.toISOString()]
            );

            let deletedCount = 0;

            for (const backup of expiredBackups.rows) {
                try {
                    // 删除备份文件
                    if (backup.backup_path) {
                        await fs.unlink(backup.backup_path);
                    }

                    // 从数据库删除记录
                    await this.dbPool.query('DELETE FROM backup_tasks WHERE id = $1', [backup.id]);

                    deletedCount++;
                    this.logger.info(`清理过期备份: ${backup.id}`);

                } catch (error) {
                    this.logger.warn(`清理备份失败: ${backup.id}`, error);
                }
            }

            // 限制备份数量
            if (deletedCount === 0) {
                const totalBackups = await this.dbPool.query('SELECT COUNT(*) as count FROM backup_tasks');
                const count = parseInt(totalBackups.rows[0].count);

                if (count > this.maxBackupCount) {
                    const excessCount = count - this.maxBackupCount;
                    const oldestBackups = await this.dbPool.query(
                        'SELECT id, backup_path FROM backup_tasks ORDER BY created_at ASC LIMIT $1',
                        [excessCount]
                    );

                    for (const backup of oldestBackups.rows) {
                        try {
                            if (backup.backup_path) {
                                await fs.unlink(backup.backup_path);
                            }
                            await this.dbPool.query('DELETE FROM backup_tasks WHERE id = $1', [backup.id]);
                            deletedCount++;
                        } catch (error) {
                            this.logger.warn(`清理旧备份失败: ${backup.id}`, error);
                        }
                    }
                }
            }

            this.logger.info(`清理过期备份完成，删除了 ${deletedCount} 个备份`);

            return {
                success: true,
                deletedCount
            };

        } catch (error) {
            this.logger.error('清理过期备份失败:', error);
            throw error;
        }
    }

    /**
     * 更新备份任务
     */
    async updateBackupTask(backupId, updates) {
        try {
            if (!this.dbPool) return;

            const updateFields = [];
            const params = [backupId];
            let paramIndex = 2;

            Object.keys(updates).forEach(key => {
                const dbKey = this.camelToSnake(key);
                updateFields.push(`${dbKey} = $${paramIndex}`);

                if (key === 'tablesIncluded') {
                    params.push(updates[key]);
                } else if (typeof updates[key] === 'object') {
                    params.push(JSON.stringify(updates[key]));
                } else {
                    params.push(updates[key]);
                }
                paramIndex++;
            });

            if (updateFields.length > 0) {
                const updateQuery = `
          UPDATE backup_tasks 
          SET ${updateFields.join(', ')}
          WHERE id = $1
        `;

                await this.dbPool.query(updateQuery, params);
            }

        } catch (error) {
            this.logger.error(`更新备份任务失败: ${backupId}`, error);
        }
    }

    /**
     * 获取最后备份时间
     */
    async getLastBackupTime() {
        try {
            if (!this.dbPool) {
                
        return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 默认24小时前
      }

            const result = await this.dbPool.query(
                'SELECT MAX(completed_at) as last_backup FROM backup_tasks WHERE status = $1',
                ['completed']
            );

            if (result.rows[0].last_backup) {
                
        return result.rows[0].last_backup;
      }

            return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        } catch (error) {
            this.logger.error('获取最后备份时间失败:', error);
            return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        }
    }

    /**
     * 计算过期时间
     */
    calculateExpirationDate() {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + this.maxBackupRetention);
        return expirationDate.toISOString();
    }

    /**
     * 获取文件大小
     */
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 从备份文件提取表列表
     */
    async extractTablesFromBackup(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const tableMatches = content.match(/CREATE TABLE (/w +) / g) || [];
            return tableMatches.map(match => match.replace('CREATE TABLE ', ''));
        } catch (error) {
            this.logger.warn('提取表列表失败:', error);
            return [];
        }
    }

    /**
     * 驼峰转下划线
     */
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    /**
     * 生成备份ID
     */
    generateBackupId() {
        return `backup_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * 停止定时任务
     */
    stopScheduledBackups() {
        this.scheduledTasks.forEach((task, name) => {
            task.stop();
            this.logger.info(`停止定时备份任务: ${name}`);
        });
    }

    /**
     * 启动定时任务
     */
    startScheduledBackups() {
        this.scheduledTasks.forEach((task, name) => {
            task.start();
            this.logger.info(`启动定时备份任务: ${name}`);
        });
    }
}

module.exports = BackupService;