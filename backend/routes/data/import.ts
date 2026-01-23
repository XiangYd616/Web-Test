/**
 * 数据导入路由
 * 处理数据导入相关的API请求
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import winston from 'winston';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import { asyncHandler } from '../../middleware/errorHandler';
import DataImportService, { ImportConfig } from '../../services/dataManagement/dataImportService';
const { authMiddleware } = require('../../middleware/auth');

const resolveFormat = (fileType: string): ImportConfig['format'] => {
  if (fileType === 'xlsx') {
    return 'excel';
  }
  if (fileType === 'csv' || fileType === 'json' || fileType === 'xml') {
    return fileType;
  }
  return 'csv';
};

interface ImportOptions {
  skipHeader?: boolean;
  delimiter?: string;
  encoding?: string;
  batchSize?: number;
  updateExisting?: boolean;
}

type ApiResponse = express.Response & {
  success: (
    data?: unknown,
    message?: string,
    statusCode?: number,
    meta?: unknown
  ) => express.Response;
  error: (
    code: string,
    message?: string,
    details?: unknown,
    statusCode?: number,
    meta?: unknown
  ) => express.Response;
  created: (data?: unknown, message?: string, meta?: unknown) => express.Response;
};

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/data-import.log' }),
    new winston.transports.Console(),
  ],
});

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/plain',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

const router = express.Router();

const getUserId = (req: express.Request): string => {
  const userId = (req as { user?: { id?: string } }).user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

// 初始化导入服务
let importService: DataImportService;

const initializeImportService = (): DataImportService => {
  if (!importService) {
    importService = new DataImportService({
      query: async () => Promise.resolve(null),
    });
  }
  return importService;
};

/**
 * 创建导入任务
 * POST /api/data/import
 */
router.post(
  '/',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: express.Request, res: ApiResponse) => {
    const userId = getUserId(req);
    const file = req.file;
    const { options = {} } = req.body;

    if (!file) {
      return res.error(StandardErrorCode.INVALID_INPUT, '没有上传文件');
    }

    try {
      const service = initializeImportService();

      // 解析导入选项
      const importOptions: ImportOptions = {
        skipHeader: options.skipHeader === 'true',
        delimiter: options.delimiter || ',',
        encoding: options.encoding || 'utf8',
        batchSize: parseInt(options.batchSize) || 1000,
        updateExisting: options.updateExisting === 'true',
      };

      const fileType = path.extname(file.originalname).substring(1);
      const format = resolveFormat(fileType);
      const taskId = await service.createImportTask(
        fileType,
        file.path || file.originalname,
        {
          format,
          encoding: importOptions.encoding,
          delimiter: importOptions.delimiter,
          options: {
            skipHeader: importOptions.skipHeader,
            batchSize: importOptions.batchSize,
            updateExisting: importOptions.updateExisting,
          },
        },
        userId
      );

      logger.info('创建导入任务', { jobId: taskId, userId, fileName: file.originalname });

      return res.created(
        {
          jobId: taskId,
          status: 'pending',
        },
        '导入任务创建成功'
      );
    } catch (error) {
      logger.error('创建导入任务失败', { userId, fileName: file?.originalname, error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '创建导入任务失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取导入任务状态
 * GET /api/data/import/:jobId/status
 */
router.get(
  '/:jobId/status',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: ApiResponse) => {
    const { jobId } = req.params;
    const userId = getUserId(req);

    try {
      const service = initializeImportService();
      const status = await service.getTaskStatus(jobId);

      // 验证用户权限
      if (!status) {
        return res.error(StandardErrorCode.NOT_FOUND, '导入任务不存在');
      }

      if (status.createdBy !== userId) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权访问此导入任务');
      }

      return res.success(status as unknown as Record<string, unknown>, '获取导入状态成功');
    } catch (error) {
      logger.error('获取导入状态失败', { jobId, userId, error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导入状态失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 取消导入任务
 * DELETE /api/data/import/:jobId
 */
router.delete(
  '/:jobId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { jobId } = req.params;
    const userId = getUserId(req);

    try {
      const service = initializeImportService();

      // 检查任务状态和权限
      const status = await service.getTaskStatus(jobId);

      if (!status) {
        return res.error(StandardErrorCode.NOT_FOUND, '导入任务不存在');
      }

      if (status.createdBy !== userId) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权取消此导入任务');
      }

      if (status.status === 'completed') {
        return res.error(StandardErrorCode.INVALID_INPUT, '无法取消已完成的导入任务');
      }

      // 取消导入任务
      await service.cancelTask(jobId);

      logger.info('取消导入任务', { jobId, userId });

      return res.success({ jobId }, '导入任务已取消');
    } catch (error) {
      logger.error('取消导入任务失败', { jobId, userId, error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '取消导入任务失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取导入历史
 * GET /api/data/import/history
 */
router.get(
  '/history',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: ApiResponse) => {
    const userId = getUserId(req);
    const { page = 1, limit = 10, status } = req.query;

    try {
      const service = initializeImportService();

      const allTasks = await service.getAllTasks();
      const userTasks = allTasks.filter(task => task.createdBy === userId);
      const filteredTasks = status ? userTasks.filter(task => task.status === status) : userTasks;
      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const startIndex = (pageNumber - 1) * limitNumber;
      const history = {
        tasks: filteredTasks.slice(startIndex, startIndex + limitNumber),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: filteredTasks.length,
          totalPages: Math.ceil(filteredTasks.length / limitNumber),
        },
      };

      return res.success(history, '获取导入历史成功');
    } catch (error) {
      logger.error('获取导入历史失败', { userId, error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导入历史失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取导入模板
 * GET /api/data/import/template/:type
 */
router.get(
  '/template/:type',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: ApiResponse) => {
    const { type } = req.params;

    try {
      const service = initializeImportService();
      const template = await service.getTemplate(type);

      if (!template) {
        return res.error(StandardErrorCode.INVALID_INPUT, '不支持的导入类型');
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);

      return res.send(template);
    } catch (error) {
      logger.error('获取导入模板失败', { type, error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导入模板失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 验证导入文件
 * POST /api/data/import/validate
 */
router.post(
  '/validate',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: express.Request, res: ApiResponse) => {
    const userId = getUserId(req);
    const file = req.file;
    const { options = {} } = req.body;

    if (!file) {
      return res.error(StandardErrorCode.INVALID_INPUT, '没有上传文件');
    }

    try {
      const service = initializeImportService();

      const importOptions: ImportOptions = {
        skipHeader: options.skipHeader === 'true',
        delimiter: options.delimiter || ',',
        encoding: options.encoding || 'utf8',
      };

      const fileType = path.extname(file.originalname).substring(1);
      const format = resolveFormat(fileType);
      const validation = await service.previewData(file.path || file.originalname, {
        format,
        encoding: importOptions.encoding,
        delimiter: importOptions.delimiter,
      });

      return res.success(validation as unknown as Record<string, unknown>, '文件验证完成');
    } catch (error) {
      logger.error('验证导入文件失败', { userId, fileName: file?.originalname, error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '验证导入文件失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取支持的导入格式
 * GET /api/data/import/formats
 */
router.get(
  '/formats',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: ApiResponse) => {
    try {
      const formats = ['csv', 'xlsx', 'json', 'xml'];

      return res.success({ formats }, '获取支持的导入格式成功');
    } catch (error) {
      logger.error('获取支持的导入格式失败', { error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取支持的导入格式失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取导入统计
 * GET /api/data/import/stats
 */
router.get(
  '/stats',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: ApiResponse) => {
    const userId = getUserId(req);

    try {
      const service = initializeImportService();
      const stats = await service.getStatistics();

      return res.success(stats as unknown as Record<string, unknown>, '获取导入统计成功');
    } catch (error) {
      logger.error('获取导入统计失败', { userId, error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导入统计失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 重试失败的导入任务
 * POST /api/data/import/:jobId/retry
 */
router.post(
  '/:jobId/retry',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { jobId } = req.params;
    const userId = getUserId(req);

    try {
      const service = initializeImportService();

      // 检查任务状态和权限
      const status = await service.getTaskStatus(jobId);

      if (!status) {
        return res.error(StandardErrorCode.NOT_FOUND, '导入任务不存在');
      }

      if (status.createdBy !== userId) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权重试此导入任务');
      }

      if (status.status !== 'failed') {
        return res.error(StandardErrorCode.INVALID_INPUT, '只能重试失败的导入任务');
      }

      const retried = await service.retryTask(jobId);

      logger.info('重试导入任务', { jobId, userId });

      return res.success(
        {
          jobId: retried.id,
          status: retried.status,
          progress: retried.progress,
        },
        '导入任务已重试'
      );
    } catch (error) {
      logger.error('重试导入任务失败', { jobId, userId, error });

      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '重试导入任务失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
