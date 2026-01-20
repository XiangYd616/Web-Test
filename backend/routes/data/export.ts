/**
 * 数据导出路由
 * 处理数据导出相关的API请求
 */

import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import winston from 'winston';
import DataExportService, {
  ExportJobRequest,
} from '../../services/dataManagement/dataExportService';
const { authMiddleware } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

type AuthRequest = express.Request & {
  user: {
    id: string;
  };
};

const formatResponse = (success: boolean, message: string, data: Record<string, unknown> = {}) => ({
  success,
  message,
  data,
});

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'logs/data-export.log' }),
    new winston.transports.Console(),
  ],
});

// 初始化数据导出服务
let exportService: DataExportService;

const router = express.Router();

/**
 * 初始化导出服务
 */
const initializeExportService = (): DataExportService => {
  if (!exportService) {
    exportService = new DataExportService({
      exportDir: path.join(process.cwd(), 'exports'),
      maxFileSize: 100 * 1024 * 1024, // 100MB
      supportedFormats: ['json', 'csv', 'excel', 'pdf'],
    });
  }
  return exportService;
};

/**
 * 获取导出状态
 * GET /api/data/export/status/:jobId
 */
router.get(
  '/status/:jobId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { jobId } = req.params;
    const service = initializeExportService();

    try {
      const status = await service.getExportStatus(jobId);

      return res.json(
        formatResponse(true, '获取导出状态成功', {
          jobId,
          ...status,
        })
      );
    } catch (error) {
      logger.error('获取导出状态失败', { jobId, error });

      return res.status(500).json(
        formatResponse(false, '获取导出状态失败', {
          jobId,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  })
);

/**
 * 创建导出任务
 * POST /api/data/export
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { dataType, format, filters, options } = req.body as {
      dataType?: string;
      format?: string;
      filters?: Record<string, unknown>;
      options?: Record<string, unknown>;
    };
    const userId = (req as AuthRequest).user.id;

    const allowedTypes: ExportJobRequest['dataType'][] = [
      'test_results',
      'analytics',
      'reports',
      'users',
      'logs',
    ];
    const allowedFormats: ExportJobRequest['format'][] = ['pdf', 'csv', 'json', 'excel', 'zip'];

    try {
      // 验证请求参数
      if (!dataType || !format) {
        return res.status(400).json(formatResponse(false, '数据类型和格式是必需的'));
      }

      if (!allowedTypes.includes(dataType as ExportJobRequest['dataType'])) {
        return res.status(400).json(formatResponse(false, '不支持的数据类型'));
      }

      if (!allowedFormats.includes(format as ExportJobRequest['format'])) {
        return res.status(400).json(formatResponse(false, '不支持的导出格式'));
      }

      const service = initializeExportService();

      // 创建导出任务
      const job = await service.createExportJob({
        userId,
        dataType: dataType as ExportJobRequest['dataType'],
        format: format as ExportJobRequest['format'],
        filters: filters || {},
        options: options || {},
      });

      logger.info('创建导出任务', { jobId: job.id, userId, dataType, format });

      return res.status(201).json(
        formatResponse(true, '导出任务创建成功', {
          jobId: job.id,
          status: job.status,
        })
      );
    } catch (error) {
      logger.error('创建导出任务失败', { userId, dataType, format, error });

      return res.status(500).json(
        formatResponse(false, '创建导出任务失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  })
);

/**
 * 下载导出文件
 * GET /api/data/export/download/:jobId
 */
router.get(
  '/download/:jobId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { jobId } = req.params;
    const userId = (req as AuthRequest).user.id;

    try {
      const service = initializeExportService();

      // 检查导出状态
      const status = await service.getExportStatus(jobId);

      if (status.status !== 'completed') {
        return res.status(400).json(
          formatResponse(false, '导出尚未完成', {
            jobId,
            status: status.status,
          })
        );
      }

      // 验证用户权限
      if (status.userId !== userId) {
        return res.status(403).json(formatResponse(false, '无权访问此导出文件'));
      }

      // 获取文件路径
      const filePath = await service.getExportFilePath(jobId);

      if (!filePath) {
        return res.status(404).json(formatResponse(false, '导出文件不存在'));
      }

      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json(formatResponse(false, '导出文件不存在'));
      }

      // 设置下载响应头
      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      logger.info('下载导出文件', { jobId, userId, fileName });

      // 发送文件
      return res.sendFile(filePath);
    } catch (error) {
      logger.error('下载导出文件失败', { jobId, userId, error });

      return res.status(500).json(
        formatResponse(false, '下载导出文件失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  })
);

/**
 * 取消导出任务
 * DELETE /api/data/export/:jobId
 */
router.delete(
  '/:jobId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { jobId } = req.params;
    const userId = (req as AuthRequest).user.id;

    try {
      const service = initializeExportService();

      // 检查导出状态和权限
      const status = await service.getExportStatus(jobId);

      if (status.userId !== userId) {
        return res.status(403).json(formatResponse(false, '无权取消此导出任务'));
      }

      if (status.status === 'completed') {
        return res.status(400).json(formatResponse(false, '无法取消已完成的导出任务'));
      }

      // 取消导出任务
      await service.cancelExportJob(jobId);

      logger.info('取消导出任务', { jobId, userId });

      return res.json(formatResponse(true, '导出任务已取消', { jobId }));
    } catch (error) {
      logger.error('取消导出任务失败', { jobId, userId, error });

      return res.status(500).json(
        formatResponse(false, '取消导出任务失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  })
);

/**
 * 获取用户导出历史
 * GET /api/data/export/history
 */
router.get(
  '/history',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as AuthRequest).user.id;
    const { page = 1, limit = 10, status } = req.query;

    try {
      const service = initializeExportService();

      const history = await service.getUserExportHistory(userId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
      });

      return res.json(formatResponse(true, '获取导出历史成功', history));
    } catch (error) {
      logger.error('获取导出历史失败', { userId, error });

      return res.status(500).json(
        formatResponse(false, '获取导出历史失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  })
);

/**
 * 获取支持的导出格式
 * GET /api/data/export/formats
 */
router.get(
  '/formats',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const service = initializeExportService();
      const formats = service.getSupportedFormats();

      return res.json(formatResponse(true, '获取支持的导出格式成功', { formats }));
    } catch (error) {
      logger.error('获取支持的导出格式失败', { error });

      return res.status(500).json(
        formatResponse(false, '获取支持的导出格式失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  })
);

/**
 * 清理过期的导出文件
 * DELETE /api/data/export/cleanup
 */
router.delete(
  '/cleanup',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as AuthRequest).user.id;
    const { olderThan = 7 } = req.query; // 默认清理7天前的文件

    try {
      const service = initializeExportService();

      const result = await service.cleanupExpiredExports(userId, {
        olderThan: parseInt(olderThan as string),
      });

      logger.info('清理过期导出文件', { userId, ...result });

      return res.json(formatResponse(true, '清理过期导出文件成功', result));
    } catch (error) {
      logger.error('清理过期导出文件失败', { userId, error });

      return res.status(500).json(
        formatResponse(false, '清理过期导出文件失败', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  })
);

export default router;
