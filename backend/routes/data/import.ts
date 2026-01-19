/**
 * 数据导入路由
 * 处理数据导入相关的API请求
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import winston from 'winston';
import { authMiddleware } from '../../middleware/auth';
import { formatResponse } from '../../middleware/responseFormatter';
import DataImportService from '../../services/dataManagement/dataImportService';

interface ImportJob {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  errors: string[];
  createdAt: Date;
  completedAt?: Date;
}

interface ImportOptions {
  skipHeader?: boolean;
  delimiter?: string;
  encoding?: string;
  batchSize?: number;
  updateExisting?: boolean;
}

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

// 初始化导入服务
let importService: DataImportService;

const initializeImportService = (): DataImportService => {
  if (!importService) {
    importService = new DataImportService({
      maxFileSize: 100 * 1024 * 1024,
      supportedFormats: ['csv', 'xlsx', 'json'],
      tempDir: path.join(process.cwd(), 'temp'),
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const file = req.file;
    const { options = {} } = req.body;

    if (!file) {
      return res.status(400).json(formatResponse(false, '没有上传文件'));
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

      // 创建导入任务
      const job = await service.createImportJob({
        userId,
        fileName: file.originalname,
        fileType: path.extname(file.originalname).substring(1),
        fileBuffer: file.buffer,
        options: importOptions,
      });

      logger.info('创建导入任务', { jobId: job.id, userId, fileName: file.originalname });

      res.status(201).json(
        formatResponse(true, '导入任务创建成功', {
          jobId: job.id,
          status: job.status,
          estimatedTime: job.estimatedTime,
        })
      );
    } catch (error) {
      logger.error('创建导入任务失败', { userId, fileName: file?.originalname, error });

      res.status(500).json(
        formatResponse(false, '创建导入任务失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { jobId } = req.params;
    const userId = (req as any).user.id;

    try {
      const service = initializeImportService();
      const status = await service.getImportStatus(jobId);

      // 验证用户权限
      if (status.userId !== userId) {
        return res.status(403).json(formatResponse(false, '无权访问此导入任务'));
      }

      res.json(formatResponse(true, '获取导入状态成功', status));
    } catch (error) {
      logger.error('获取导入状态失败', { jobId, userId, error });

      res.status(500).json(
        formatResponse(false, '获取导入状态失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
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
    const userId = (req as any).user.id;

    try {
      const service = initializeImportService();

      // 检查任务状态和权限
      const status = await service.getImportStatus(jobId);

      if (status.userId !== userId) {
        return res.status(403).json(formatResponse(false, '无权取消此导入任务'));
      }

      if (status.status === 'completed') {
        return res.status(400).json(formatResponse(false, '无法取消已完成的导入任务'));
      }

      // 取消导入任务
      await service.cancelImportJob(jobId);

      logger.info('取消导入任务', { jobId, userId });

      res.json(formatResponse(true, '导入任务已取消', { jobId }));
    } catch (error) {
      logger.error('取消导入任务失败', { jobId, userId, error });

      res.status(500).json(
        formatResponse(false, '取消导入任务失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, status } = req.query;

    try {
      const service = initializeImportService();

      const history = await service.getUserImportHistory(userId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
      });

      res.json(formatResponse(true, '获取导入历史成功', history));
    } catch (error) {
      logger.error('获取导入历史失败', { userId, error });

      res.status(500).json(
        formatResponse(false, '获取导入历史失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { type } = req.params;

    try {
      const service = initializeImportService();
      const template = await service.getImportTemplate(type);

      if (!template) {
        return res.status(404).json(formatResponse(false, '不支持的导入类型'));
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);

      res.send(template);
    } catch (error) {
      logger.error('获取导入模板失败', { type, error });

      res.status(500).json(
        formatResponse(false, '获取导入模板失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const file = req.file;
    const { options = {} } = req.body;

    if (!file) {
      return res.status(400).json(formatResponse(false, '没有上传文件'));
    }

    try {
      const service = initializeImportService();

      const importOptions: ImportOptions = {
        skipHeader: options.skipHeader === 'true',
        delimiter: options.delimiter || ',',
        encoding: options.encoding || 'utf8',
      };

      const validation = await service.validateImportFile({
        fileName: file.originalname,
        fileType: path.extname(file.originalname).substring(1),
        fileBuffer: file.buffer,
        options: importOptions,
      });

      res.json(formatResponse(true, '文件验证完成', validation));
    } catch (error) {
      logger.error('验证导入文件失败', { userId, fileName: file?.originalname, error });

      res.status(500).json(
        formatResponse(false, '验证导入文件失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const service = initializeImportService();
      const formats = service.getSupportedFormats();

      res.json(formatResponse(true, '获取支持的导入格式成功', { formats }));
    } catch (error) {
      logger.error('获取支持的导入格式失败', { error });

      res.status(500).json(
        formatResponse(false, '获取支持的导入格式失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;

    try {
      const service = initializeImportService();
      const stats = await service.getUserImportStats(userId);

      res.json(formatResponse(true, '获取导入统计成功', stats));
    } catch (error) {
      logger.error('获取导入统计失败', { userId, error });

      res.status(500).json(
        formatResponse(false, '获取导入统计失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
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
    const userId = (req as any).user.id;

    try {
      const service = initializeImportService();

      // 检查任务状态和权限
      const status = await service.getImportStatus(jobId);

      if (status.userId !== userId) {
        return res.status(403).json(formatResponse(false, '无权重试此导入任务'));
      }

      if (status.status !== 'failed') {
        return res.status(400).json(formatResponse(false, '只能重试失败的导入任务'));
      }

      // 重试导入任务
      await service.retryImportJob(jobId);

      logger.info('重试导入任务', { jobId, userId });

      res.json(formatResponse(true, '导入任务重试中', { jobId }));
    } catch (error) {
      logger.error('重试导入任务失败', { jobId, userId, error });

      res.status(500).json(
        formatResponse(false, '重试导入任务失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  })
);

export default router;
