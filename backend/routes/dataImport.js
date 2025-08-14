/**
 * 数据导入路由
 * 处理数据导入相关的API请求
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const DataImportService = require('../services/dataManagement/dataImportService');
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
        new winston.transports.File({ filename: 'logs/data-import.log' }),
        new winston.transports.Console()
    ]
});

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        // 检查文件类型
        const allowedTypes = [
            'text/csv',
            'application/json',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];

        const allowedExtensions = ['.csv', '.json', '.xlsx', '.xls'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'), false);
        }
    }
});

// 初始化数据导入服务
let importService;

// 导入服务初始化中间件
const initializeImportService = async (req, res, next) => {
    try {
        if (!importService) {
            const { getPool } = require('../config/database');
            const dbPool = await getPool();
            importService = new DataImportService(dbPool);
        }
        req.importService = importService;
        next();
    } catch (error) {
        logger.error('初始化导入服务失败:', error);
        res.status(500).json(formatResponse(false, null, '服务初始化失败'));
    }
};

// 验证导入请求的中间件
const validateImportRequest = (req, res, next) => {
    const { dataType } = req.body;
    const errors = [];

    // 验证必需字段
    if (!dataType) {
        errors.push('数据类型不能为空');
    }

    // 验证数据类型
    const supportedDataTypes = ['test-results', 'monitoring-data', 'user-data', 'test-configurations'];
    if (dataType && !supportedDataTypes.includes(dataType)) {
        errors.push(`不支持的数据类型: ${dataType}`);
    }

    // 验证文件
    if (!req.file) {
        errors.push('没有上传文件');
    }

    if (errors.length > 0) {
        return res.status(400).json(formatResponse(false, null, '请求验证失败', errors));
    }

    next();
};

// 上传文件并创建导入任务
router.post('/upload',
    authMiddleware,
    upload.single('file'),
    initializeImportService,
    validateImportRequest,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const file = req.file;
            const config = {
                dataType: req.body.dataType,
                mapping: req.body.mapping ? JSON.parse(req.body.mapping) : {},
                options: req.body.options ? JSON.parse(req.body.options) : {}
            };

            const result = await req.importService.createImportTask(userId, file, config);

            logger.info(`用户 ${userId} 创建导入任务`, {
                taskId: result.data.id,
                dataType: config.dataType,
                fileName: file.originalname,
                fileSize: file.size
            });

            res.status(201).json(formatResponse(true, result.data, '导入任务创建成功'));

        } catch (error) {
            logger.error('创建导入任务失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 获取任务状态和预览数据
router.get('/task/:taskId/status',
    authMiddleware,
    initializeImportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            const result = await req.importService.getTaskStatus(taskId, userId);

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

// 获取任务预览数据
router.get('/task/:taskId/preview',
    authMiddleware,
    initializeImportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            const result = await req.importService.getTaskStatus(taskId, userId);

            if (!result.success) {
                return res.status(404).json(formatResponse(false, null, result.error));
            }

            const previewData = result.data.previewData;
            if (!previewData) {
                return res.status(404).json(formatResponse(false, null, '预览数据不可用'));
            }

            res.json(formatResponse(true, previewData, '获取预览数据成功'));

        } catch (error) {
            logger.error('获取预览数据失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 开始导入处理
router.post('/task/:taskId/start',
    authMiddleware,
    initializeImportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            const result = await req.importService.startImport(taskId, userId);

            if (!result.success) {
                return res.status(400).json(formatResponse(false, null, result.error));
            }

            logger.info(`用户 ${userId} 开始导入任务 ${taskId}`);
            res.json(formatResponse(true, null, result.message));

        } catch (error) {
            logger.error('开始导入失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 获取用户的导入任务列表
router.get('/tasks',
    authMiddleware,
    initializeImportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                status: req.query.status,
                dataType: req.query.dataType
            };

            const result = await req.importService.getUserTasks(userId, options);

            res.json(formatResponse(true, result.data, '获取任务列表成功', null, result.pagination));

        } catch (error) {
            logger.error('获取任务列表失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 取消导入任务
router.post('/task/:taskId/cancel',
    authMiddleware,
    initializeImportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            const result = await req.importService.cancelTask(taskId, userId);

            if (!result.success) {
                return res.status(400).json(formatResponse(false, null, result.error));
            }

            logger.info(`用户 ${userId} 取消导入任务 ${taskId}`);
            res.json(formatResponse(true, null, result.message));

        } catch (error) {
            logger.error('取消导入任务失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 删除导入任务
router.delete('/task/:taskId',
    authMiddleware,
    initializeImportService,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const taskId = req.params.taskId;

            // 获取任务信息
            const taskResult = await req.importService.getTaskStatus(taskId, userId);

            if (!taskResult.success) {
                return res.status(404).json(formatResponse(false, null, '任务不存在或无权限访问'));
            }

            const task = taskResult.data;

            // 删除上传的文件（如果存在）
            if (task.filePath) {
                try {
                    const fs = require('fs').promises;
                    await fs.unlink(task.filePath);
                    logger.info(`删除导入文件: ${task.filePath}`);
                } catch (error) {
                    logger.warn('删除文件失败:', error);
                }
            }

            // 从数据库删除任务记录
            if (req.importService.dbPool) {
                await req.importService.dbPool.query(
                    'DELETE FROM import_tasks WHERE id = $1 AND user_id = $2',
                    [taskId, userId]
                );
            }

            logger.info(`用户 ${userId} 删除导入任务 ${taskId}`);
            res.json(formatResponse(true, null, '导入任务已删除'));

        } catch (error) {
            logger.error('删除导入任务失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 获取数据映射模板
router.get('/mapping-template/:dataType',
    authMiddleware,
    async (req, res) => {
        try {
            const dataType = req.params.dataType;

            const templates = {
                'test-results': {
                    requiredFields: [
                        { field: 'test_name', type: 'string', description: '测试名称' },
                        { field: 'test_type', type: 'string', description: '测试类型', options: ['seo', 'performance', 'security', 'accessibility', 'stress', 'api'] },
                        { field: 'url', type: 'url', description: '测试URL' },
                        { field: 'status', type: 'string', description: '测试状态', options: ['pending', 'running', 'completed', 'failed', 'cancelled'] }
                    ],
                    optionalFields: [
                        { field: 'start_time', type: 'datetime', description: '开始时间' },
                        { field: 'end_time', type: 'datetime', description: '结束时间' },
                        { field: 'duration', type: 'number', description: '持续时间（秒）' },
                        { field: 'results', type: 'json', description: '测试结果' },
                        { field: 'config', type: 'json', description: '测试配置' },
                        { field: 'created_at', type: 'datetime', description: '创建时间' }
                    ]
                },
                'monitoring-data': {
                    requiredFields: [
                        { field: 'target_name', type: 'string', description: '监控目标名称' },
                        { field: 'target_url', type: 'url', description: '监控目标URL' },
                        { field: 'status', type: 'string', description: '状态', options: ['up', 'down', 'warning', 'unknown'] }
                    ],
                    optionalFields: [
                        { field: 'response_time', type: 'number', description: '响应时间（毫秒）' },
                        { field: 'status_code', type: 'number', description: 'HTTP状态码' },
                        { field: 'error_message', type: 'string', description: '错误信息' },
                        { field: 'checked_at', type: 'datetime', description: '检查时间' },
                        { field: 'created_at', type: 'datetime', description: '创建时间' }
                    ]
                },
                'user-data': {
                    requiredFields: [
                        { field: 'username', type: 'string', description: '用户名' },
                        { field: 'email', type: 'email', description: '邮箱地址' }
                    ],
                    optionalFields: [
                        { field: 'role', type: 'string', description: '用户角色', options: ['admin', 'user', 'viewer'] },
                        { field: 'is_active', type: 'boolean', description: '是否激活' },
                        { field: 'created_at', type: 'datetime', description: '创建时间' }
                    ]
                },
                'test-configurations': {
                    requiredFields: [
                        { field: 'name', type: 'string', description: '配置名称' },
                        { field: 'test_type', type: 'string', description: '测试类型', options: ['seo', 'performance', 'security', 'accessibility', 'stress', 'api'] }
                    ],
                    optionalFields: [
                        { field: 'config', type: 'json', description: '配置内容' },
                        { field: 'is_active', type: 'boolean', description: '是否激活' },
                        { field: 'created_at', type: 'datetime', description: '创建时间' }
                    ]
                }
            };

            const template = templates[dataType];
            if (!template) {
                return res.status(404).json(formatResponse(false, null, '不支持的数据类型'));
            }

            res.json(formatResponse(true, template, '获取映射模板成功'));

        } catch (error) {
            logger.error('获取映射模板失败:', error);
            res.status(500).json(formatResponse(false, null, error.message));
        }
    }
);

// 验证导入数据
router.post('/validate',
    authMiddleware,
    upload.single('file'),
    initializeImportService,
    validateImportRequest,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const file = req.file;
            const config = {
                dataType: req.body.dataType,
                mapping: req.body.mapping ? JSON.parse(req.body.mapping) : {},
                options: req.body.options ? JSON.parse(req.body.options) : {}
            };

            // 创建临时任务进行验证
            const result = await req.importService.createImportTask(userId, file, config);
            const taskId = result.data.id;

            // 获取预览和验证结果
            const taskStatus = await req.importService.getTaskStatus(taskId, userId);

            // 清理临时任务
            await req.importService.cancelTask(taskId, userId);

            res.json(formatResponse(true, {
                previewData: taskStatus.data.previewData,
                validation: {
                    totalRecords: taskStatus.data.totalRecords,
                    isValid: true,
                    warnings: []
                }
            }, '数据验证完成'));

        } catch (error) {
            logger.error('数据验证失败:', error);
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
            { value: 'test-configurations', label: '测试配置' }
        ],
        supportedFormats: [
            { value: 'csv', label: 'CSV格式', extensions: ['.csv'] },
            { value: 'json', label: 'JSON格式', extensions: ['.json'] },
            { value: 'excel', label: 'Excel格式', extensions: ['.xlsx', '.xls'] }
        ],
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxFileSizeLabel: '50MB'
    };

    res.json(formatResponse(true, config, '获取配置成功'));
});

// WebSocket支持（用于实时进度更新）
const setupWebSocketSupport = (io) => {
    if (!importService) return;

    // 监听导入进度事件
    importService.on('taskProgress', (data) => {
        io.to(`user_${data.userId}`).emit('importProgress', data);
    });

    importService.on('importCompleted', (data) => {
        io.to(`user_${data.userId}`).emit('importCompleted', data);
    });

    importService.on('importFailed', (data) => {
        io.to(`user_${data.userId}`).emit('importFailed', data);
    });

    importService.on('taskCancelled', (data) => {
        io.to(`user_${data.userId}`).emit('importCancelled', data);
    });
};

module.exports = { router, setupWebSocketSupport };