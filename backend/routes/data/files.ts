/**
 * 文件管理路由
 * 支持文件上传、下载、管理等功能
 */

import express from 'express';
import { promises as fs } from 'fs';
import multer from 'multer';
import path from 'path';
import { query } from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

interface FileInfo {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadDate: Date;
  userId: string;
  path: string;
}

type AuthenticatedRequest = express.Request & { user?: Express.User };
const auth = authMiddleware as unknown as express.RequestHandler;

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../runtime/uploads');
const ensureUploadDir = async (): Promise<void> => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// 配置multer存储
const storage = multer.diskStorage({
  destination: async (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    await ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// 配置multer
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // 允许的文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

/**
 * 上传文件
 * POST /api/data/files/upload
 */
router.post(
  '/upload',
  auth,
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: '没有上传文件',
      });
      return;
    }

    try {
      // 保存文件信息到数据库
      const sql = `
      INSERT INTO uploaded_files (
        user_id, original_name, filename, mimetype, size, upload_date, file_path
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING id
    `;

      const result = await query(sql, [
        userId,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size,
        file.path,
      ]);

      const fileInfo: FileInfo = {
        id: result.rows[0].id,
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        uploadDate: new Date(),
        userId,
        path: file.path,
      };

      logger.info('文件上传成功', { fileId: fileInfo.id, userId, filename: file.filename });

      res.status(201).json({
        success: true,
        message: '文件上传成功',
        data: fileInfo,
      });
    } catch (error) {
      logger.error('文件上传失败', { error, userId, filename: file?.filename });

      // 删除已上传的文件
      if (file && file.path) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.error('删除上传文件失败', { error: unlinkError, filePath: file.path });
        }
      }

      res.status(500).json({
        success: false,
        message: '文件上传失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取文件列表
 * GET /api/data/files
 */
router.get(
  '/',
  auth,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }
    const { page = 1, limit = 10, type } = req.query;

    try {
      let sql = `
      SELECT id, original_name, filename, mimetype, size, upload_date
      FROM uploaded_files
      WHERE user_id = $1
    `;
      const params: Array<string | number> = [userId];

      if (type) {
        sql += ' AND mimetype LIKE $2';
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

      // 获取总数
      const countSql = type
        ? 'SELECT COUNT(*) as total FROM uploaded_files WHERE user_id = $1 AND mimetype LIKE $2'
        : 'SELECT COUNT(*) as total FROM uploaded_files WHERE user_id = $1';

      const countParams = type ? [userId, `%${type}%`] : [userId];
      const countResult = await query(countSql, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
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
      logger.error('获取文件列表失败', { error, userId });

      res.status(500).json({
        success: false,
        message: '获取文件列表失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 下载文件
 * GET /api/data/files/:fileId/download
 */
router.get(
  '/:fileId/download',
  auth,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { fileId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    try {
      // 获取文件信息
      const sql = `
      SELECT id, original_name, filename, mimetype, file_path
      FROM uploaded_files
      WHERE id = $1 AND user_id = $2
    `;

      const result = await query(sql, [fileId, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: '文件不存在或无权访问',
        });
        return;
      }

      const file = result.rows[0];

      // 检查文件是否存在
      try {
        await fs.access(file.file_path);
      } catch {
        res.status(404).json({
          success: false,
          message: '文件不存在',
        });
        return;
      }

      // 设置下载响应头
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      res.setHeader('Content-Type', file.mimetype);

      // 发送文件
      res.sendFile(file.file_path);

      logger.info('文件下载', { fileId, userId, filename: file.original_name });
    } catch (error) {
      logger.error('文件下载失败', { error, fileId, userId });

      res.status(500).json({
        success: false,
        message: '文件下载失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 删除文件
 * DELETE /api/data/files/:fileId
 */
router.delete(
  '/:fileId',
  auth,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { fileId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    try {
      // 获取文件信息
      const sql = `
      SELECT id, filename, file_path
      FROM uploaded_files
      WHERE id = $1 AND user_id = $2
    `;

      const result = await query(sql, [fileId, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: '文件不存在或无权访问',
        });
        return;
      }

      const file = result.rows[0];

      // 删除物理文件
      try {
        await fs.unlink(file.file_path);
      } catch (unlinkError) {
        logger.error('删除物理文件失败', { error: unlinkError, filePath: file.file_path });
      }

      // 删除数据库记录
      await query('DELETE FROM uploaded_files WHERE id = $1', [fileId]);

      logger.info('文件删除成功', { fileId, userId, filename: file.filename });

      res.json({
        success: true,
        message: '文件删除成功',
      });
    } catch (error) {
      logger.error('文件删除失败', { error, fileId, userId });

      res.status(500).json({
        success: false,
        message: '文件删除失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取文件信息
 * GET /api/data/files/:fileId
 */
router.get(
  '/:fileId',
  auth,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { fileId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    try {
      const sql = `
      SELECT id, original_name, filename, mimetype, size, upload_date
      FROM uploaded_files
      WHERE id = $1 AND user_id = $2
    `;

      const result = await query(sql, [fileId, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: '文件不存在或无权访问',
        });
        return;
      }

      const file = result.rows[0];

      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      logger.error('获取文件信息失败', { error, fileId, userId });

      res.status(500).json({
        success: false,
        message: '获取文件信息失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

/**
 * 获取文件统计
 * GET /api/data/files/stats
 */
router.get(
  '/stats',
  auth,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未授权访问',
      });
      return;
    }

    try {
      const sql = `
      SELECT 
        COUNT(*) as total_files,
        SUM(size) as total_size,
        COUNT(CASE WHEN mimetype LIKE 'image/%' THEN 1 END) as image_files,
        COUNT(CASE WHEN mimetype LIKE 'application/pdf' THEN 1 END) as pdf_files,
        COUNT(CASE WHEN mimetype LIKE 'text/%' THEN 1 END) as text_files,
        COUNT(CASE WHEN upload_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_files
      FROM uploaded_files
      WHERE user_id = $1
    `;

      const result = await query(sql, [userId]);
      const stats = result.rows[0];

      res.json({
        success: true,
        data: {
          totalFiles: parseInt(stats.total_files),
          totalSize: parseInt(stats.total_size) || 0,
          imageFiles: parseInt(stats.image_files),
          pdfFiles: parseInt(stats.pdf_files),
          textFiles: parseInt(stats.text_files),
          recentFiles: parseInt(stats.recent_files),
        },
      });
    } catch (error) {
      logger.error('获取文件统计失败', { error, userId });

      res.status(500).json({
        success: false,
        message: '获取文件统计失败',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })
);

export default router;
