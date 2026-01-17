/**
 * 数据导出路由
 * 处理数据导出相关的API请求
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const DataExportService = require('../services/dataManagement/dataExportService');
const { authMiddleware } = require('../middleware/auth');
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
        new winston.transports.File({ filename: 'logs/data-export.log' }),
        new winston.transports.Console()
    ]
});

// 初始化数据导出服务
let exportService;

// 导出服务初始化中间件
const initializeExportService = async (req, res, next) => {
    try {
        if (!exportService) {
            const { getPool } = require('../config/database');
            const dbPool = await getPool();
            exportService = new DataExportService(dbPool);
        }
        req.exportService = exportService;
        next();
    } catch (error) {
        logger.error('初始化导出服务失败:', error);
        res.status(500).json(formatResponse(false, null, '服务初始化失败'));
    }
};

// 验证导出请求的中间件
const validateExportRequest = (req, res, next) => {
    const { dataType, format, dateRange, filters: _filters = {} } = req.body;

    const errors = [];

    // 验证必需字段
    if (!dataType) {
        errors.push('数据类型不能为空');
    }

    if (!format) {
        errors.push('导出格式不能为空');
    }

    // 验证数据类型
    const supportedDataTypes = ['test-results', 'monitoring-data', 'user-data', 'analytics', 'reports'];
    if (dataType && !supportedDataTypes.includes(dataType)) {
        errors.push(`不支持的数据类型: ${dataType}`);
    }

    // 验证格式
    const supportedFormats = ['pdf', 'csv', 'json', 'excel', 'xlsx'];
    if (format && !supportedFormats.includes(format.toLowerCase())) {
        errors.push(`不支持的导出格式: ${format}`);
    }

    // 验证日期范围
    if (dateRange) {
        if (dateRange.start && dateRange.end) {
            if (new Date(dateRange.start) > new Date(dateRange.end)) {
                errors.push('开始日期不能晚于结束日期');
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json(formatResponse(false, null, '请求验证失败', errors));
    }

    next();
};

// 获取支持的导出格式
router.get('/formats', authMiddleware, initializeExportService, (req, res) => {
    try {
        const formats = req.exportService.supportedFormats.map(format => ({
            format
        }));
        res.json(formatResponse(true, formats, '获取导出格式成功'));
    } catch (error) {
        logger.error('获取导出格式失败:', error);
        res.status(500).json(formatResponse(false, null, error.message));
    }
});

// 创建导出任务
router.post('/create',
    authMiddleware,
    initializeExportService,
    validateExportRequest,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const config = {
                dataType: req.body.dataType,
                format: req.body.format,
                dateRange: req.body.dateRange || {},
                filters: req.body.filters || {},
                options: req.body.options || {}
            };

            const result = await req.exportService.createExportTask(userId, config);

            logger.info(`用户 ${userId} 创建导出任务`, {
                taskId: result.data.id,
                dataType: config.dataType,
                format: config.format
            });

            res.status(201).json(formatResponse(true, result.data, '导出任务创建成功'));

        } catch (error) {
            logger.error('创建导出任务失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 获取任务状态
router.get('/task/:taskId/status',
    authMiddleware,
    initializeExportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            const result = await req.exportService.getTaskStatus(taskId, userId);

            if (!result.success) {
                return res.status(404).json(formatResponse(false, null, result.error));
            }

            res.json(formatResponse(true, result.data, '获取任务状态成功'));

        } catch (error) {
            logger.error('获取任务状态失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 获取用户的导出任务列表
router.get('/tasks',
    authMiddleware,
    initializeExportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                status: req.query.status,
                dataType: req.query.dataType
            };

            const result = await req.exportService.getUserTasks(userId, options);

            res.json(formatResponse(true, result.data, '获取任务列表成功', null, result.pagination));

        } catch (error) {
            logger.error('获取任务列表失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 取消导出任务
router.post('/task/:taskId/cancel',
    authMiddleware,
    initializeExportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            const result = await req.exportService.cancelTask(taskId, userId);

            if (!result.success) {
                return res.status(400).json(formatResponse(false, null, result.error));
            }

            logger.info(`用户 ${userId} 取消导出任务 ${taskId}`);
            res.json(formatResponse(true, null, result.message));

        } catch (error) {
            logger.error('取消导出任务失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 下载导出文件
router.get('/task/:taskId/download',
    authMiddleware,
    initializeExportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            // 获取任务信息
            const taskResult = await req.exportService.getTaskStatus(taskId, userId);

            if (!taskResult.success) {
                return res.status(404).json(formatResponse(false, null, '任务不存在或无权限访问'));
            }

            const task = taskResult.data;

            if (task.status !== 'completed') {
                return res.status(400).json(formatResponse(false, null, '任务未完成，无法下载'));
            }

            if (!task.filePath) {
                return res.status(404).json(formatResponse(false, null, '文件不存在'));
            }

            // 检查文件是否存在
            try {
                await fs.access(task.filePath);
            } catch (error) {
                logger.warn('导出文件访问失败:', error);
                return res.status(404).json(formatResponse(false, null, '文件已过期或不存在'));
            }

            // 设置下载响应头
            const filename = path.basename(task.filePath);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            res.setHeader('Content-Type', 'application/octet-stream');

            // 发送文件
            res.sendFile(path.resolve(task.filePath), (error) => {
                if (error) {
                    logger.error('文件下载失败:', error);
                    if (!res.headersSent) {
                        res.status(500).json(formatResponse(false, null, '文件下载失败'));
                    }
                } else {
                    logger.info(`用户 ${userId} 下载文件: ${filename}`);
                }
            });

        } catch (error) {
            logger.error('下载导出文件失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 删除导出任务和文件
router.delete('/task/:taskId',
    authMiddleware,
    initializeExportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            // 获取任务信息
            const taskResult = await req.exportService.getTaskStatus(taskId, userId);

            if (!taskResult.success) {
                
        return res.status(404).json(formatResponse(false, null, '任务不存在或无权限访问'));
      }

            const task = taskResult.data;

            // 删除文件（如果存在）
            if (task.filePath) {
                try {
                    await fs.unlink(task.filePath);
                    logger.info(`删除导出文件: ${task.filePath}`);
                } catch (error) {
                    logger.warn('删除文件失败:', error);
                }
            }

            // 从数据库删除任务记录
            if (req.exportService.dbPool) {
                await req.exportService.dbPool.query(
                    'DELETE FROM export_tasks WHERE id = $1 AND user_id = $2',
                    [taskId, userId]
                );
            }

            logger.info(`用户 ${userId} 删除导出任务 ${taskId}`);
            res.json(formatResponse(true, null, '导出任务已删除'));

        } catch (error) {
            logger.error('删除导出任务失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 清理过期文件
router.post('/cleanup',
    authMiddleware,
    initializeExportService,
    async (req, res) => {
        try {
            // 只允许管理员执行清理操作
            if (req.user.role !== 'admin') {
                
        return res.status(403).json(formatResponse(false, null, '权限不足'));
      }

            const retentionDays = parseInt(req.body.retentionDays) || 7;
            const result = await req.exportService.cleanupExpiredFiles(retentionDays);

            logger.info(`管理员 ${req.user.id} 执行文件清理`, { deletedCount: result.data.deletedCount });
            res.json(formatResponse(true, result.data, result.message));

        } catch (error) {
            logger.error('清理过期文件失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 导出测试历史（保持向后兼容）
router.post('/test-history',
    authMiddleware,
    initializeExportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const options = {
                format: req.body.format || 'json',
                dateFrom: req.body.dateFrom,
                dateTo: req.body.dateTo,
                testTypes: req.body.testTypes || [],
                includeResults: req.body.includeResults !== false,
                includeConfig: req.body.includeConfig !== false
            };

            const result = await req.exportService.exportTestHistory(userId, options);

            logger.info(`用户 ${userId} 导出测试历史`, { format: options.format });
            res.json(formatResponse(true, result.data, '测试历史导出成功'));

        } catch (error) {
            logger.error('导出测试历史失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 获取支持的数据类型和格式
router.get('/config', authMiddleware, (req, res) => {
    const config = {
        supportedDataTypes: [
            { value: 'test-results', label: '测试结果' },
            { value: 'monitoring-data', label: '监控数据' },
            { value: 'user-data', label: '用户数据' },
            { value: 'analytics', label: '分析数据' },
            { value: 'reports', label: '报告数据' }
        ],
        supportedFormats: [
            { value: 'json', label: 'JSON格式' },
            { value: 'csv', label: 'CSV格式' },
            { value: 'excel', label: 'Excel格式' },
            { value: 'pdf', label: 'PDF格式' }
        ],
        maxRetentionDays: 30,
        defaultRetentionDays: 7
    };

    res.json(formatResponse(true, config, '获取配置成功'));
});

// WebSocket支持（用于实时进度更新）
const setupWebSocketSupport = (io) => {
    if (!exportService) return;

    // 监听导出进度事件
    exportService.on('taskProgress', (data) => {
        io.to(`user_${data.userId}`).emit('exportProgress', data);
    });

    exportService.on('exportCompleted', (data) => {
        io.to(`user_${data.userId}`).emit('exportCompleted', data);
    });

    exportService.on('exportFailed', (data) => {
        io.to(`user_${data.userId}`).emit('exportFailed', data);
    });

    exportService.on('taskCancelled', (data) => {
        io.to(`user_${data.userId}`).emit('exportCancelled', data);
    });
};

module.exports = { router, setupWebSocketSupport };