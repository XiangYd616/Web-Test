/**
 * 存储管理API
 * 提供存储、归档和清理功能的HTTP接口
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, optionalAuth } from '../../middleware/auth';
import { storageService } from '../../services/storage/StorageService';

const router = express.Router();

/**
 * GET /api/storage/status
 * 获取存储系统状态
 */
router.get(
  '/status',
  optionalAuth,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const healthStatus = await storageService.getHealthStatus();
      const statistics = await storageService.getStorageStatistics();

      res.json({
        success: true,
        data: {
          health: healthStatus,
          statistics,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * GET /api/storage/files
 * 获取文件列表
 */
router.get(
  '/files',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { page = 1, limit = 20, type, search } = req.query;

    try {
      const result = await storageService.getFileList({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        type: type as string,
        search: search as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/storage/files/:fileId
 * 获取文件详情
 */
router.get(
  '/files/:fileId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { fileId } = req.params;

    try {
      const file = await storageService.getFileDetails(fileId);

      if (!file) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/storage/upload
 * 上传文件
 */
router.post(
  '/upload',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { name, type, description, tags } = req.body;
    const userId = (req as any).user.id;

    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array(),
        });
      }

      const result = await storageService.uploadFile({
        name,
        type,
        description,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        userId,
        file: req.file,
      });

      res.status(201).json({
        success: true,
        message: '文件上传成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/storage/download/:fileId
 * 下载文件
 */
router.get(
  '/download/:fileId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { fileId } = req.params;

    try {
      const fileStream = await storageService.downloadFile(fileId);

      if (!fileStream) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      fileStream.pipe(res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/storage/files/:fileId
 * 删除文件
 */
router.delete(
  '/files/:fileId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { fileId } = req.params;

    try {
      await storageService.deleteFile(fileId);

      res.json({
        success: true,
        message: '文件删除成功',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/storage/archive
 * 归档文件
 */
router.post(
  '/archive',
  authMiddleware,
  [
    body('fileIds').isArray({ message: '文件ID列表必须是数组' }),
    body('archiveName').notEmpty({ message: '归档名称不能为空' }),
  ],
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array(),
      });
    }

    const { fileIds, archiveName, description } = req.body;
    const userId = (req as any).user.id;

    try {
      const result = await storageService.createArchive({
        fileIds,
        archiveName,
        description,
        userId,
      });

      res.status(201).json({
        success: true,
        message: '归档创建成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/storage/archives
 * 获取归档列表
 */
router.get(
  '/archives',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { page = 1, limit = 20, status } = req.query;

    try {
      const result = await storageService.getArchiveList({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/storage/archives/:archiveId/restore
 * 恢复归档
 */
router.post(
  '/archives/:archiveId/restore',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { archiveId } = req.params;
    const { destination } = req.body;
    const userId = (req as any).user.id;

    try {
      const result = await storageService.restoreArchive({
        archiveId,
        destination,
        userId,
      });

      res.json({
        success: true,
        message: '归档恢复成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * DELETE /api/storage/archives/:archiveId
 * 删除归档
 */
router.delete(
  '/archives/:archiveId',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { archiveId } = req.params;

    try {
      await storageService.deleteArchive(archiveId);

      res.json({
        success: true,
        message: '归档删除成功',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/storage/cleanup
 * 清理过期文件
 */
router.post(
  '/cleanup',
  authMiddleware,
  [
    body('olderThan').isInt({ min: 1, message: '清理天数必须是正整数' }),
    body('dryRun').optional().isBoolean({ message: 'dryRun必须是布尔值' }),
  ],
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array(),
      });
    }

    const { olderThan, dryRun = false } = req.body;

    try {
      const result = await storageService.cleanupExpiredFiles({
        olderThan: parseInt(olderThan),
        dryRun,
      });

      res.json({
        success: true,
        message: dryRun ? '清理预览完成' : '清理完成',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * GET /api/storage/quotas
 * 获取存储配额信息
 */
router.get(
  '/quotas',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = (req as any).user.id;

    try {
      const quota = await storageService.getUserQuota(userId);

      res.json({
        success: true,
        data: quota,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/storage/move
 * 移动文件
 */
router.post(
  '/move',
  authMiddleware,
  [
    body('fileId').notEmpty({ message: '文件ID不能为空' }),
    body('targetPath').notEmpty({ message: '目标路径不能为空' }),
  ],
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array(),
      });
    }

    const { fileId, targetPath } = req.body;
    const userId = (req as any).user.id;

    try {
      const result = await storageService.moveFile({
        fileId,
        targetPath,
        userId,
      });

      res.json({
        success: true,
        message: '文件移动成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * POST /api/storage/copy
 * 复制文件
 */
router.post(
  '/copy',
  authMiddleware,
  [
    body('fileId').notEmpty({ message: '文件ID不能为空' }),
    body('targetPath').notEmpty({ message: '目标路径不能为空' }),
  ],
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array(),
      });
    }

    const { fileId, targetPath } = req.body;
    const userId = (req as any).user.id;

    try {
      const result = await storageService.copyFile({
        fileId,
        targetPath,
        userId,
      });

      res.json({
        success: true,
        message: '文件复制成功',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
