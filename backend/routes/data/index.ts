/**
 * 数据管理API路由
 * 提供完整的数据CRUD操作、导入导出、统计分析、备份恢复等功能
 */

import express from 'express';
import multer from 'multer';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import dataManagementService from '../../services/data/DataManagementService';

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

// 应用认证中间件
router.use(authMiddleware);

/**
 * 获取数据概览
 * GET /api/data/overview
 */
router.get(
  '/overview',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;

    try {
      const overview = await dataManagementService.getDataOverview(userId);

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取数据概览失败',
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { period = '30d', type } = req.query;

    try {
      const statistics = await dataManagementService.getDataStatistics(userId, {
        period: period as string,
        type: type as string,
      });

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取数据统计失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 创建数据记录
 * POST /api/data
 */
router.post(
  '/',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const data = req.body;

    try {
      const result = await dataManagementService.createDataRecord(userId, data);

      res.status(201).json({
        success: true,
        message: '数据记录创建成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '创建数据记录失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取数据列表
 * GET /api/data
 */
router.get(
  '/',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, type, status, search } = req.query;

    try {
      const result = await dataManagementService.getDataList(userId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        type: type as string,
        status: status as string,
        search: search as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取数据列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取单个数据记录
 * GET /api/data/:id
 */
router.get(
  '/:id',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params;

    try {
      const record = await dataManagementService.getDataRecord(userId, id);

      if (!record) {
        return res.status(404).json({
          success: false,
          message: '数据记录不存在',
        });
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取数据记录失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 更新数据记录
 * PUT /api/data/:id
 */
router.put(
  '/:id',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const data = req.body;

    try {
      const result = await dataManagementService.updateDataRecord(userId, id, data);

      res.json({
        success: true,
        message: '数据记录更新成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '更新数据记录失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 删除数据记录
 * DELETE /api/data/:id
 */
router.delete(
  '/:id',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params;

    try {
      await dataManagementService.deleteDataRecord(userId, id);

      res.json({
        success: true,
        message: '数据记录删除成功',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '删除数据记录失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 批量操作
 * POST /api/data/batch
 */
router.post(
  '/batch',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { operation, ids, data } = req.body;

    try {
      const result = await dataManagementService.batchOperation(userId, {
        operation,
        ids,
        data,
      });

      res.json({
        success: true,
        message: '批量操作完成',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '批量操作失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 数据搜索
 * POST /api/data/search
 */
router.post(
  '/search',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { query, filters, options } = req.body;

    try {
      const result = await dataManagementService.searchData(userId, {
        query,
        filters: filters || {},
        options: options || {},
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '数据搜索失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { format, filters, options } = req.body;

    try {
      const result = await dataManagementService.exportData(userId, {
        format,
        filters: filters || {},
        options: options || {},
      });

      res.json({
        success: true,
        message: '数据导出任务创建成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '数据导出失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const file = req.file;
    const { options } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件',
      });
    }

    try {
      const result = await dataManagementService.importData(userId, {
        file,
        options: options || {},
      });

      res.json({
        success: true,
        message: '数据导入任务创建成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '数据导入失败',
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { type = 'full', options } = req.body;

    try {
      const result = await dataManagementService.createBackup(userId, {
        type,
        options: options || {},
      });

      res.json({
        success: true,
        message: '数据备份任务创建成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '数据备份失败',
        error: error instanceof Error ? error.message : String(error),
      });
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
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const file = req.file;
    const { options } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '没有上传备份文件',
      });
    }

    try {
      const result = await dataManagementService.restoreData(userId, {
        file,
        options: options || {},
      });

      res.json({
        success: true,
        message: '数据恢复任务创建成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '数据恢复失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取数据版本历史
 * GET /api/data/:id/versions
 */
router.get(
  '/:id/versions',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params;

    try {
      const versions = await dataManagementService.getDataVersions(userId, id);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取数据版本历史失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 数据验证
 * POST /api/data/validate
 */
router.post(
  '/validate',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;
    const { data, schema } = req.body;

    try {
      const result = await dataManagementService.validateData(userId, {
        data,
        schema,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '数据验证失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
