/**
 * 备份恢复路由
 * 处理数据库备份和恢复相关的API请求
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const BackupService = require('../services/dataManagement/backupService');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { formatResponse } = require('../middleware/responseFormatter');
const winston = require('winston');

// 创建日志记录器
const logger = winston.createLogger({
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

// 初始化备份服务
let backupService;

// 备份服务初始化中间件
const initializeBackupService = async (req, res, next) => {
    try {
        if (!backupService) {
            const { getPool, getDatabaseConfig } = require('../config/database');
            const dbPool = await getPool();
            const dbConfig = getDatabaseConfig();
            backupService = new BackupService(dbPool, dbConfig);
        }
        req.backupService = backupService;
        next();
    } catch (error) {
        logger.error('初始化备份服务失败:', error);
        res.status(500).json(formatResponse(false, null, '服务初始化失败'));
    }
};

// 管理员权限中间件（备份操作需要管理员权限）
const requireAdmin = requireRole(['admin']);

// 创建全量备份
router.post('/create/full',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const { name, options = {} } = req.body;

            const result = await req.backupService.createFullBackup(name, options);

            logger.info(`管理员 ${req.user.id} 创建全量备份`, { backupId: result.backupId });
            res.status(201).json(formatResponse(true, result, '全量备份创建成功'));

        } catch (error) {
            logger.error('创建全量备份失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 创建增量备份
router.post('/create/incremental',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const { name, options = {} } = req.body;

            const result = await req.backupService.createIncrementalBackup(name, options);

            logger.info(`管理员 ${req.user.id} 创建增量备份`, { backupId: result.backupId });
            res.status(201).json(formatResponse(true, result, '增量备份创建成功'));

        } catch (error) {
            logger.error('创建增量备份失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 获取备份列表
router.get('/list',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                type: req.query.type,
                status: req.query.status
            };

            const result = await req.backupService.getBackupList(options);

            res.json(formatResponse(true, result.data, '获取备份列表成功', null, result.pagination));

        } catch (error) {
            logger.error('获取备份列表失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 恢复数据库
router.post('/restore/:backupId',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const backupId = req.params.backupId;
            const options = req.body.options || {};

            // 获取备份信息
            const backupList = await req.backupService.getBackupList({ limit: 1000 });
            const backup = backupList.data.find(b => b.id === backupId);

            if (!backup) {
                return res.status(404).json(formatResponse(false, null, '备份不存在'));
            }

            if (backup.status !== 'completed') {
                return res.status(400).json(formatResponse(false, null, '备份未完成，无法恢复'));
            }

            if (!backup.backupPath) {
                return res.status(404).json(formatResponse(false, null, '备份文件不存在'));
            }

            const result = await req.backupService.restoreDatabase(backup.backupPath, options);

            logger.info(`管理员 ${req.user.id} 恢复数据库`, {
                backupId,
                restoreId: result.restoreId
            });

            res.json(formatResponse(true, result, '数据库恢复成功'));

        } catch (error) {
            logger.error('数据库恢复失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 下载备份文件
router.get('/download/:backupId',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const backupId = req.params.backupId;

            // 获取备份信息
            const backupList = await req.backupService.getBackupList({ limit: 1000 });
            const backup = backupList.data.find(b => b.id === backupId);

            if (!backup) {
                return res.status(404).json(formatResponse(false, null, '备份不存在'));
            }

            if (!backup.backupPath) {
                return res.status(404).json(formatResponse(false, null, '备份文件不存在'));
            }

            // 检查文件是否存在
            const fs = require('fs').promises;
            try {
                await fs.access(backup.backupPath);
            } catch (error) {
                return res.status(404).json(formatResponse(false, null, '备份文件已过期或不存在'));
            }

            // 设置下载响应头
            const filename = path.basename(backup.backupPath);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            res.setHeader('Content-Type', 'application/octet-stream');

            // 发送文件
            res.sendFile(path.resolve(backup.backupPath), (error) => {
                if (error) {
                    logger.error('备份文件下载失败:', error);
                    if (!res.headersSent) {
                        res.status(500).json(formatResponse(false, null, '文件下载失败'));
                    }
                } else {
                    logger.info(`管理员 ${req.user.id} 下载备份文件: ${filename}`);
                }
            });

        } catch (error) {
            logger.error('下载备份文件失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 删除备份
router.delete('/:backupId',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const backupId = req.params.backupId;

            const result = await req.backupService.deleteBackup(backupId);

            logger.info(`管理员 ${req.user.id} 删除备份 ${backupId}`);
            res.json(formatResponse(true, null, result.message));

        } catch (error) {
            logger.error('删除备份失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 清理过期备份
router.post('/cleanup',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const result = await req.backupService.cleanupExpiredBackups();

            logger.info(`管理员 ${req.user.id} 执行备份清理`, { deletedCount: result.deletedCount });
            res.json(formatResponse(true, result, `已清理 ${result.deletedCount} 个过期备份`));

        } catch (error) {
            logger.error('清理过期备份失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 获取备份统计信息
router.get('/stats',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const backupList = await req.backupService.getBackupList({ limit: 1000 });
            const backups = backupList.data;

            const stats = {
                total: backups.length,
                completed: backups.filter(b => b.status === 'completed').length,
                failed: backups.filter(b => b.status === 'failed').length,
                running: backups.filter(b => b.status === 'running').length,
                totalSize: backups.reduce((sum, b) => sum + (b.compressedSize || 0), 0),
                byType: {
                    full: backups.filter(b => b.type === 'full').length,
                    incremental: backups.filter(b => b.type === 'incremental').length
                },
                recent: backups
                    .filter(b => b.status === 'completed')
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                    .slice(0, 5)
                    .map(b => ({
                        id: b.id,
                        name: b.name,
                        type: b.type,
                        completedAt: b.completedAt,
                        fileSize: b.compressedSize
                    }))
            };

            res.json(formatResponse(true, stats, '获取备份统计成功'));

        } catch (error) {
            logger.error('获取备份统计失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 控制定时备份
router.post('/schedule/start',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            req.backupService.startScheduledBackups();

            logger.info(`管理员 ${req.user.id} 启动定时备份`);
            res.json(formatResponse(true, null, '定时备份已启动'));

        } catch (error) {
            logger.error('启动定时备份失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

router.post('/schedule/stop',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            req.backupService.stopScheduledBackups();

            logger.info(`管理员 ${req.user.id} 停止定时备份`);
            res.json(formatResponse(true, null, '定时备份已停止'));

        } catch (error) {
            logger.error('停止定时备份失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 验证备份完整性
router.post('/verify/:backupId',
    authMiddleware,
    requireAdmin,
    initializeBackupService,
    async (req, res) => {
        try {
            const backupId = req.params.backupId;

            // 获取备份信息
            const backupList = await req.backupService.getBackupList({ limit: 1000 });
            const backup = backupList.data.find(b => b.id === backupId);

            if (!backup) {
                return res.status(404).json(formatResponse(false, null, '备份不存在'));
            }

            if (!backup.backupPath) {
                return res.status(404).json(formatResponse(false, null, '备份文件不存在'));
            }

            // 验证文件完整性
            const fs = require('fs').promises;
            const crypto = require('crypto');

            try {
                const fileBuffer = await fs.readFile(backup.backupPath);
                const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                const fileSize = fileBuffer.length;

                const verification = {
                    backupId,
                    filePath: backup.backupPath,
                    fileSize,
                    hash,
                    isValid: fileSize > 0,
                    verifiedAt: new Date().toISOString()
                };

                logger.info(`管理员 ${req.user.id} 验证备份 ${backupId}`, verification);
                res.json(formatResponse(true, verification, '备份验证完成'));

            } catch (error) {
                res.status(404).json(formatResponse(false, null, '备份文件无法访问'));
            }

        } catch (error) {
            logger.error('验证备份失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// WebSocket支持（用于实时备份进度更新）
const setupWebSocketSupport = (io) => {
    if (!backupService) return;

    // 监听备份事件
    backupService.on('backupCompleted', (data) => {
        io.emit('backupCompleted', data);
    });

    backupService.on('backupFailed', (data) => {
        io.emit('backupFailed', data);
    });

    backupService.on('restoreCompleted', (data) => {
        io.emit('restoreCompleted', data);
    });

    backupService.on('restoreFailed', (data) => {
        io.emit('restoreFailed', data);
    });
};

module.exports = { router, setupWebSocketSupport };