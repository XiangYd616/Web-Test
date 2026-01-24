/**
 * 数据管理API路由
 * 提供完整的数据CRUD操作、导入导出、统计分析、备份恢复等功能
 */

import express from 'express';
import { promises as fs } from 'fs';
import multer from 'multer';
import path from 'path';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import { dataManagementService } from '../../services/data/DataManagementService';
import DataExportService from '../../services/dataManagement/dataExportService';
import DataImportService, { ImportConfig } from '../../services/dataManagement/dataImportService';
import Logger from '../../utils/logger';

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['application/json', 'text/csv', 'application/vnd.ms-excel'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

const router = express.Router();

interface AuthenticatedRequest extends express.Request {
  user?: Express.User;
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

type ImportOptions = {
  skipHeader?: boolean;
  delimiter?: string;
  encoding?: string;
  batchSize?: number;
  updateExisting?: boolean;
};

const resolveImportFormat = (fileType: string): ImportConfig['format'] => {
  if (fileType === 'xlsx') {
    return 'excel';
  }
  if (fileType === 'csv' || fileType === 'json' || fileType === 'xml') {
    return fileType;
  }
  return 'csv';
};

let exportService: DataExportService;
let importService: DataImportService;

const initializeExportService = (): DataExportService => {
  if (!exportService) {
    exportService = new DataExportService({
      exportDir: path.join(process.cwd(), 'exports'),
      maxFileSize: 100 * 1024 * 1024,
      supportedFormats: ['json', 'csv', 'excel', 'pdf', 'zip'],
    });
  }
  return exportService;
};

const initializeImportService = (): DataImportService => {
  if (!importService) {
    importService = new DataImportService({
      query: (sql: string, params?: unknown[]) => query(sql, params),
    });
  }
  return importService;
};

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

const resolveWorkspaceId = (req: AuthenticatedRequest): string => {
  return (
    (req.params as { workspaceId?: string }).workspaceId ||
    (req.query as { workspaceId?: string }).workspaceId ||
    (req.body as { workspaceId?: string }).workspaceId ||
    'system'
  );
};

// 应用认证中间件
router.use(authMiddleware);

/**
 * 获取数据概览
 * GET /api/data/overview
 */
router.get(
  '/overview',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);

    try {
      const overview = await dataManagementService.getDataOverview(userId, workspaceId);

      return res.success(overview);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取数据概览失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 获取导出状态
 * GET /api/data/export/status/:jobId
 */
router.get(
  '/export/status/:jobId',
  asyncHandler(async (req: AuthenticatedRequest, res: ApiResponse) => {
    const { jobId } = req.params;

    try {
      const service = initializeExportService();
      const status = await service.getExportStatus(jobId);

      return res.success({ jobId, ...status }, '获取导出状态成功');
    } catch (error) {
      Logger.error('获取导出状态失败', { jobId, error });
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导出状态失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 下载导出文件
 * GET /api/data/export/download/:jobId
 */
router.get(
  '/export/download/:jobId',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { jobId } = req.params;
    const userId = getUserId(req);

    try {
      const service = initializeExportService();
      const status = await service.getExportStatus(jobId);

      if (status.status !== 'completed') {
        return res.error(StandardErrorCode.INVALID_INPUT, '导出尚未完成', {
          jobId,
          status: status.status,
        });
      }

      if (status.userId !== userId) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权访问此导出文件');
      }

      const filePath = await service.getExportFilePath(jobId);
      if (!filePath) {
        return res.error(StandardErrorCode.NOT_FOUND, '导出文件不存在');
      }

      try {
        await fs.access(filePath);
      } catch {
        return res.error(StandardErrorCode.NOT_FOUND, '导出文件不存在');
      }

      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      return res.sendFile(filePath);
    } catch (error) {
      Logger.error('下载导出文件失败', { jobId, userId, error });
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '下载导出文件失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 取消导出任务
 * DELETE /api/data/export/:jobId
 */
router.delete(
  '/export/:jobId',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { jobId } = req.params;
    const userId = getUserId(req);

    try {
      const service = initializeExportService();
      const status = await service.getExportStatus(jobId);

      if (status.userId !== userId) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权取消此导出任务');
      }

      if (status.status === 'completed') {
        return res.error(StandardErrorCode.INVALID_INPUT, '无法取消已完成的导出任务');
      }

      await service.cancelExportJob(jobId);
      return res.success({ jobId }, '导出任务已取消');
    } catch (error) {
      Logger.error('取消导出任务失败', { jobId, userId, error });
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '取消导出任务失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取导出历史
 * GET /api/data/export/history
 */
router.get(
  '/export/history',
  asyncHandler(async (req: AuthenticatedRequest, res: ApiResponse) => {
    const userId = getUserId(req);
    const { page = 1, limit = 10, status } = req.query;

    try {
      const service = initializeExportService();
      const history = await service.getUserExportHistory(userId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
      });

      return res.success(history, '获取导出历史成功');
    } catch (error) {
      Logger.error('获取导出历史失败', { userId, error });
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导出历史失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取支持的导出格式
 * GET /api/data/export/formats
 */
router.get(
  '/export/formats',
  asyncHandler(async (_req: AuthenticatedRequest, res: ApiResponse) => {
    try {
      const service = initializeExportService();
      const formats = service.getSupportedFormats();
      return res.success({ formats }, '获取支持的导出格式成功');
    } catch (error) {
      Logger.error('获取支持的导出格式失败', { error });
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取支持的导出格式失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 清理过期导出文件
 * DELETE /api/data/export/cleanup
 */
router.delete(
  '/export/cleanup',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const { olderThan = 7 } = req.query;

    try {
      const service = initializeExportService();
      const result = await service.cleanupExpiredExports(userId, {
        olderThan: parseInt(olderThan as string),
      });

      return res.success(result, '清理过期导出文件成功');
    } catch (error) {
      Logger.error('清理过期导出文件失败', { userId, error });
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '清理过期导出文件失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取数据统计
 * GET /api/data/statistics
 */
router.get(
  '/statistics',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { period = '30d', type } = req.query;

    try {
      const statistics = await dataManagementService.getDataStatistics(userId, {
        period: period as string,
        type: type as string,
        workspaceId,
      });

      return res.success(statistics);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取数据统计失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 创建数据记录
 * POST /api/data
 */
router.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const data = req.body;

    try {
      const result = await dataManagementService.createDataRecord(userId, data, workspaceId);

      return res.success(result, '数据记录创建成功', 201);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '创建数据记录失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 获取数据列表
 * GET /api/data
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { page = 1, limit = 10, type, status, search } = req.query;

    try {
      const result = await dataManagementService.getDataList(
        userId,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          type: type as string,
          status: status as string,
          search: search as string,
        },
        workspaceId
      );

      return res.success(result);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取数据列表失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 获取单个数据记录
 * GET /api/data/:id
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { id } = req.params;

    try {
      const record = await dataManagementService.getDataRecord(userId, id, workspaceId);

      if (!record) {
        return res.error(StandardErrorCode.NOT_FOUND, '数据记录不存在', undefined, 404);
      }

      return res.success(record);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取数据记录失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 更新数据记录
 * PUT /api/data/:id
 */
router.put(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { id } = req.params;
    const data = req.body;

    try {
      const result = await dataManagementService.updateDataRecord(userId, id, data, workspaceId);

      return res.success(result, '数据记录更新成功');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '更新数据记录失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 删除数据记录
 * DELETE /api/data/:id
 */
router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { id } = req.params;

    try {
      await dataManagementService.deleteDataRecord(userId, id, workspaceId);

      return res.success(null, '数据记录删除成功');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '删除数据记录失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 批量操作
 * POST /api/data/batch
 */
router.post(
  '/batch',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { operation, ids, data } = req.body;

    try {
      const result = await dataManagementService.batchOperationForUser(
        userId,
        {
          operation,
          ids,
          data,
        },
        workspaceId
      );

      return res.success(result, '批量操作完成');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '批量操作失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 数据搜索
 * POST /api/data/search
 */
router.post(
  '/search',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { query, filters, options } = req.body;

    try {
      const result = await dataManagementService.searchData(
        userId,
        {
          query,
          filters: filters || {},
          options: options || {},
        },
        workspaceId
      );

      return res.success(result);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '数据搜索失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 数据导出
 * POST /api/data/export
 */
router.post(
  '/export',
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { format, filters, options } = req.body;

    try {
      const result = await dataManagementService.exportData(
        userId,
        {
          format,
          filters: filters || {},
          options: options || {},
        },
        workspaceId
      );

      return res.success(result, '数据导出任务创建成功');
    } catch (error) {
      if (error instanceof Error && (error as { statusCode?: number }).statusCode === 501) {
        return res.error(StandardErrorCode.SERVICE_UNAVAILABLE, error.message, undefined, 501);
      }

      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '数据导出失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 数据导入
 * POST /api/data/import
 */
router.post(
  '/import',
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const file = req.file;
    const { options } = req.body;

    if (!file) {
      return res.error(StandardErrorCode.INVALID_INPUT, '没有上传文件', undefined, 400);
    }

    try {
      const result = await dataManagementService.importDataForUpload(userId, {
        file,
        options: options || {},
        type: req.body.type as string | undefined,
        format: req.body.format as string | undefined,
        workspaceId,
      });

      return res.success(result, '数据导入任务创建成功');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '数据导入失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 获取导入任务状态
 * GET /api/data/import/:jobId/status
 */
router.get(
  '/import/:jobId/status',
  asyncHandler(async (req: AuthenticatedRequest, res: ApiResponse) => {
    const { jobId } = req.params;
    const userId = getUserId(req);

    try {
      const service = initializeImportService();
      const status = await service.getTaskStatus(jobId);

      if (!status) {
        return res.error(StandardErrorCode.NOT_FOUND, '导入任务不存在');
      }

      if (status.createdBy !== userId) {
        return res.error(StandardErrorCode.FORBIDDEN, '无权访问此导入任务');
      }

      return res.success(status as unknown as Record<string, unknown>, '获取导入状态成功');
    } catch (error) {
      Logger.error('获取导入状态失败', { jobId, userId, error });
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
  '/import/:jobId',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { jobId } = req.params;
    const userId = getUserId(req);

    try {
      const service = initializeImportService();
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

      await service.cancelTask(jobId);
      return res.success({ jobId }, '导入任务已取消');
    } catch (error) {
      Logger.error('取消导入任务失败', { jobId, userId, error });
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
  '/import/history',
  asyncHandler(async (req: AuthenticatedRequest, res: ApiResponse) => {
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
      Logger.error('获取导入历史失败', { userId, error });
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
  '/import/template/:type',
  asyncHandler(async (req: AuthenticatedRequest, res: ApiResponse) => {
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
      Logger.error('获取导入模板失败', { type, error });
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
  '/import/validate',
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: ApiResponse) => {
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
      const format = resolveImportFormat(fileType);
      const validation = await service.previewData(file.path || file.originalname, {
        format,
        encoding: importOptions.encoding,
        delimiter: importOptions.delimiter,
      });

      return res.success(validation as unknown as Record<string, unknown>, '文件验证完成');
    } catch (error) {
      Logger.error('验证导入文件失败', { userId, fileName: file?.originalname, error });
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
  '/import/formats',
  asyncHandler(async (_req: AuthenticatedRequest, res: ApiResponse) => {
    try {
      const formats = ['csv', 'xlsx', 'json', 'xml'];
      return res.success({ formats }, '获取支持的导入格式成功');
    } catch (error) {
      Logger.error('获取支持的导入格式失败', { error });
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
  '/import/stats',
  asyncHandler(async (req: AuthenticatedRequest, res: ApiResponse) => {
    const userId = getUserId(req);

    try {
      const service = initializeImportService();
      const stats = await service.getStatistics();
      return res.success(stats as unknown as Record<string, unknown>, '获取导入统计成功');
    } catch (error) {
      Logger.error('获取导入统计失败', { userId, error });
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
  '/import/:jobId/retry',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { jobId } = req.params;
    const userId = getUserId(req);

    try {
      const service = initializeImportService();
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

      return res.success(
        {
          jobId: retried.id,
          status: retried.status,
          progress: retried.progress,
        },
        '导入任务已重试'
      );
    } catch (error) {
      Logger.error('重试导入任务失败', { jobId, userId, error });
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '重试导入任务失败', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 数据备份
 * POST /api/data/backup
 */
router.post(
  '/backup',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    void getUserId(req);
    const { type = 'full', options } = req.body;

    try {
      const result = await dataManagementService.createBackup(
        type === 'full' ? null : [String(type)],
        { name: options?.name as string | undefined }
      );

      return res.success(result, '数据备份任务创建成功');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '数据备份失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 数据恢复
 * POST /api/data/restore
 */
router.post(
  '/restore',
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const file = req.file;
    const { options } = req.body;

    if (!file) {
      return res.error(StandardErrorCode.INVALID_INPUT, '没有上传备份文件', undefined, 400);
    }

    try {
      const result = await dataManagementService.restoreData(userId, {
        file,
        options: options || {},
        workspaceId,
      });

      return res.success(result, '数据恢复任务创建成功');
    } catch (error) {
      if (error instanceof Error && (error as { statusCode?: number }).statusCode === 501) {
        return res.error(StandardErrorCode.SERVICE_UNAVAILABLE, error.message, undefined, 501);
      }

      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '数据恢复失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 获取数据版本历史
 * GET /api/data/:id/versions
 */
router.get(
  '/:id/versions',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { id } = req.params;

    try {
      const versions = await dataManagementService.getDataVersions(userId, id, workspaceId);

      return res.success(versions);
    } catch (error) {
      if (error instanceof Error && (error as { statusCode?: number }).statusCode === 501) {
        return res.error(StandardErrorCode.SERVICE_UNAVAILABLE, error.message, undefined, 501);
      }

      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取版本历史失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * 数据验证
 * POST /api/data/validate
 */
router.post(
  '/validate',
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const workspaceId = resolveWorkspaceId(req);
    const { data, schema } = req.body;

    try {
      const result = await dataManagementService.validateDataRequest(userId, {
        data,
        schema,
        workspaceId,
      });

      return res.success(result);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '数据验证失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

export default router;
