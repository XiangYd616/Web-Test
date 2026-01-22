/**
 * 存储管理API
 * 提供存储、归档和清理功能的HTTP接口
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { promises as fs } from 'fs';
import multer from 'multer';
import path from 'path';
import * as tar from 'tar';
import { query } from '../../config/database';
import { asyncHandler } from '../../middleware/errorHandler';
import StorageService from '../../services/storage/StorageService';
import logger from '../../utils/logger';
const { authMiddleware, optionalAuth } = require('../../middleware/auth');

const router = express.Router();
const storageService = new StorageService();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../runtime/uploads');
const archiveDir = path.join(__dirname, '../../runtime/archives');
const ensureUploadDir = async (): Promise<void> => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: async (
      _req: express.Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void
    ) => {
      await ensureUploadDir();
      cb(null, uploadDir);
    },
    filename: (
      _req: express.Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void
    ) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

const resolveTargetDirectory = async (targetPath: string): Promise<string> => {
  const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.join(uploadDir, targetPath);
  await fs.mkdir(resolvedPath, { recursive: true });
  return resolvedPath;
};

const ensureUniqueFilename = async (targetDir: string, filename: string): Promise<string> => {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let candidate = filename;
  let counter = 1;

  while (true) {
    try {
      await fs.access(path.join(targetDir, candidate));
      candidate = `${base}_${Date.now()}_${counter}${ext}`;
      counter += 1;
    } catch {
      return candidate;
    }
  }
};

/**
 * GET /api/storage/status
 * 获取存储系统状态
 */
router.get(
  '/status',
  optionalAuth,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const healthStatus = await storageService.healthCheck();
      const statistics = storageService.getStatistics();

      return res.json({
        success: true,
        data: {
          health: healthStatus,
          statistics,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return res.status(500).json({
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
    const { page = 1, limit = 20, type, search: _search } = req.query;

    try {
      let sql = `
      SELECT id, original_name, filename, mimetype, size, upload_date
      FROM uploaded_files
    `;
      const params: Array<string | number> = [];

      if (type) {
        sql += ` WHERE mimetype LIKE $1`;
        params.push(`%${type}%`);
      }

      sql +=
        ' ORDER BY upload_date DESC LIMIT $' +
        (params.length + 1) +
        ' OFFSET $' +
        (params.length + 2);
      params.push(
        parseInt(limit as string),
        (parseInt(page as string) - 1) * parseInt(limit as string)
      );

      const result = await query(sql, params);

      const countSql = type
        ? 'SELECT COUNT(*) as total FROM uploaded_files WHERE mimetype LIKE $1'
        : 'SELECT COUNT(*) as total FROM uploaded_files';
      const countParams = type ? [`%${type}%`] : [];
      const countResult = await query(countSql, countParams);
      const total = parseInt(countResult.rows[0].total, 10);

      return res.json({
        success: true,
        data: {
          files: result.rows,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string)),
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
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
      const sql = `
      SELECT id, original_name, filename, mimetype, size, upload_date, file_path
      FROM uploaded_files
      WHERE id = $1
    `;
      const result = await query(sql, [fileId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      const file = result.rows[0];

      return res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      return res.status(500).json({
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
  upload.single('file'),
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { name, type, description, tags } = req.body;
    const userId = (req as { user?: { id?: string } }).user?.id;
    const ensuredUserId = userId ? String(userId) : '';

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

      if (!req.file || !ensuredUserId) {
        return res.status(400).json({
          success: false,
          message: '没有上传文件或用户未认证',
        });
      }

      const file = req.file;
      const result = await storageService.registerUploadedFile(
        {
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
        },
        ensuredUserId
      );

      const payload = {
        id: result.id,
        name: name || file.originalname,
        type: type || file.mimetype,
        description,
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        uploadDate: new Date(),
      };

      return res.status(201).json({
        success: true,
        message: '文件上传成功',
        data: payload,
      });
    } catch (error) {
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error('删除上传文件失败', { error: unlinkError, filePath: req.file.path });
        }
      }
      return res.status(500).json({
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
      const file = await storageService.getUploadedFile(fileId);
      if (!file) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      const filePath = String((file as Record<string, unknown>).file_path || '');
      if (!filePath) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${String((file as Record<string, unknown>).original_name || '')}"`
      );
      res.setHeader(
        'Content-Type',
        String((file as Record<string, unknown>).mimetype || 'application/octet-stream')
      );
      return res.sendFile(filePath);
    } catch (error) {
      return res.status(500).json({
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
      const file = await storageService.getUploadedFile(fileId);
      if (!file) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }
      const filePath = String((file as Record<string, unknown>).file_path || '');
      if (!filePath) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        logger.error('删除物理文件失败', { error: unlinkError, filePath });
      }

      await storageService.deleteUploadedFile(fileId);

      return res.json({
        success: true,
        message: '文件删除成功',
      });
    } catch (error) {
      return res.status(500).json({
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
    body('fileIds').isArray().withMessage('文件ID列表必须是数组'),
    body('archiveName').notEmpty().withMessage('归档名称不能为空'),
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
    const userId = (req as { user?: { id?: string } }).user?.id;
    const ensuredUserId = userId ? String(userId) : '';

    try {
      if (!ensuredUserId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      const result = await storageService.archive(
        {
          fileIds,
          archiveName,
          description,
          userId: ensuredUserId,
        },
        { targetPath: archiveDir }
      );

      return res.status(201).json({
        success: true,
        message: '归档创建成功',
        data: {
          jobId: result.jobId,
          filesCount: result.affected,
        },
      });
    } catch (error) {
      return res.status(500).json({
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
    const { page = 1, limit = 20, status: _status } = req.query;
    const userId = (req as { user?: { id?: string } }).user?.id;

    try {
      const pageNumber = parseInt(page as string);
      const pageLimit = parseInt(limit as string);
      const status = typeof _status === 'string' ? _status : undefined;
      const jobs = await storageService.listArchiveJobs();
      const filtered = jobs.filter(job => {
        if (status && job.status !== status) return false;
        if (userId) {
          const createdBy = job.metadata?.createdBy;
          if (!createdBy || createdBy !== userId) return false;
        }
        return true;
      });
      const total = filtered.length;
      const totalPages = Math.ceil(total / pageLimit) || 1;
      const start = (pageNumber - 1) * pageLimit;
      const archives = filtered.slice(start, start + pageLimit).map(job => ({
        id: job.id,
        name: job.name,
        description: job.description,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        size: job.size,
        compressedSize: job.compressedSize,
        compressionRatio: job.compressionRatio,
        filesCount: job.filesCount,
        archivedFilesCount: job.archivedFilesCount,
        archivePath: job.metadata?.archivePath,
        files: job.metadata?.files,
        createdBy: job.metadata?.createdBy,
      }));

      return res.json({
        success: true,
        data: {
          archives,
          pagination: {
            page: pageNumber,
            limit: pageLimit,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({
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
    const userId = (req as { user?: { id?: string } }).user?.id;
    const ensuredUserId = userId ? String(userId) : '';

    try {
      if (!ensuredUserId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      const archiveJob = await storageService.getArchiveJob(archiveId);
      if (!archiveJob) {
        return res.status(404).json({
          success: false,
          message: '归档任务不存在',
        });
      }

      const archiveData = archiveJob.metadata || {};
      if (archiveData.createdBy && archiveData.createdBy !== ensuredUserId) {
        return res.status(403).json({
          success: false,
          message: '无权恢复该归档',
        });
      }

      const archivePath = archiveData.archivePath as string | undefined;
      const files = (archiveData.files || []) as Array<{
        originalName: string;
        storedName: string;
        mimetype: string;
        size: number;
      }>;
      if (!archivePath) {
        return res.status(400).json({
          success: false,
          message: '归档文件不存在',
        });
      }

      const targetDir = destination
        ? await resolveTargetDirectory(destination)
        : await resolveTargetDirectory(uploadDir);

      await tar.x({ file: archivePath, cwd: targetDir });

      const restoredFiles = [] as Array<Record<string, unknown>>;
      for (const file of files) {
        const restoredPath = path.join(targetDir, String(file.storedName));
        const stats = await fs.stat(restoredPath);
        const insertResult = await storageService.registerUploadedFile(
          {
            originalName: String(file.originalName),
            filename: String(file.storedName),
            mimetype: String(file.mimetype || ''),
            size: Number(file.size || 0),
            path: restoredPath,
          },
          ensuredUserId
        );
        restoredFiles.push({
          id: insertResult.id,
          originalName: String(file.originalName),
          filename: String(file.storedName),
          size: stats.size,
        });
      }

      return res.json({
        success: true,
        message: '归档恢复成功',
        data: {
          archiveId,
          destination: targetDir,
          restoredFiles,
        },
      });
    } catch (error) {
      return res.status(500).json({
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
      const archiveJob = await storageService.getArchiveJob(archiveId);
      if (!archiveJob) {
        return res.status(404).json({
          success: false,
          message: '归档任务不存在',
        });
      }

      const archivePath = archiveJob.metadata?.archivePath as string | undefined;
      if (archivePath) {
        try {
          await fs.unlink(archivePath);
        } catch (unlinkError) {
          logger.error('删除归档文件失败', { archiveId, error: unlinkError });
        }
      }
      await storageService.deleteArchiveJob(archiveId);

      return res.json({
        success: true,
        message: '归档删除成功',
        data: { archiveId },
      });
    } catch (error) {
      return res.status(500).json({
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
    body('olderThan').isInt({ min: 1 }).withMessage('清理天数必须是正整数'),
    body('dryRun').optional().isBoolean().withMessage('dryRun必须是布尔值'),
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
      const result = await storageService.cleanup({
        olderThan: parseInt(olderThan),
        dryRun,
      });

      return res.json({
        success: true,
        message: dryRun ? '清理预览完成' : '清理完成',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
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
    const userId = (req as { user?: { id?: string } }).user?.id;

    try {
      const result = await query(
        'SELECT COUNT(*) as total_files, COALESCE(SUM(size), 0) as total_size FROM uploaded_files WHERE user_id = $1',
        [userId]
      );
      const row = result.rows[0];
      const quota = {
        totalFiles: parseInt(row.total_files, 10),
        totalSize: parseInt(row.total_size, 10),
      };

      return res.json({
        success: true,
        data: quota,
      });
    } catch (error) {
      return res.status(500).json({
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
    body('fileId').notEmpty().withMessage('文件ID不能为空'),
    body('targetPath').notEmpty().withMessage('目标路径不能为空'),
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
    const userId = (req as { user?: { id?: string } }).user?.id;
    const ensuredUserId = userId ? String(userId) : '';

    try {
      if (!ensuredUserId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }
      const fileResult = await query(
        'SELECT id, original_name, filename, mimetype, size, file_path FROM uploaded_files WHERE id = $1',
        [fileId]
      );
      if (fileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      const file = fileResult.rows[0] as Record<string, unknown>;
      const targetDir = await resolveTargetDirectory(targetPath);
      const sourcePath = String(file.file_path || '');
      if (!sourcePath) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }
      const targetFilename = await ensureUniqueFilename(targetDir, String(file.filename || ''));
      const targetFilePath = path.join(targetDir, targetFilename);

      await fs.rename(sourcePath, targetFilePath);

      await storageService.updateUploadedFile(fileId, {
        filename: targetFilename,
        path: targetFilePath,
      });

      return res.json({
        success: true,
        message: '文件移动成功',
        data: { fileId, targetPath: targetFilePath },
      });
    } catch (error) {
      return res.status(500).json({
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
    body('fileId').notEmpty().withMessage('文件ID不能为空'),
    body('targetPath').notEmpty().withMessage('目标路径不能为空'),
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
    const userId = (req as { user?: { id?: string } }).user?.id;
    const ensuredUserId = userId ? String(userId) : '';

    try {
      if (!ensuredUserId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }
      const fileResult = await query(
        'SELECT id, original_name, filename, mimetype, size, file_path FROM uploaded_files WHERE id = $1',
        [fileId]
      );
      if (fileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }

      const file = fileResult.rows[0] as Record<string, unknown>;
      const targetDir = await resolveTargetDirectory(targetPath);
      const sourcePath = String(file.file_path || '');
      if (!sourcePath) {
        return res.status(404).json({
          success: false,
          message: '文件不存在',
        });
      }
      const targetFilename = await ensureUniqueFilename(targetDir, String(file.filename || ''));
      const targetFilePath = path.join(targetDir, targetFilename);

      await fs.copyFile(sourcePath, targetFilePath);

      const insertResult = await storageService.registerUploadedFile(
        {
          originalName: String(file.original_name),
          filename: targetFilename,
          mimetype: String(file.mimetype || ''),
          size: Number(file.size || 0),
          path: targetFilePath,
        },
        userId
      );

      return res.status(201).json({
        success: true,
        message: '文件复制成功',
        data: { fileId: insertResult.id, filePath: targetFilePath },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
