/**
 * 存储管理API路由
 * 业务逻辑委托给 storageController
 */

import express from 'express';
import { body } from 'express-validator';
import { promises as fs } from 'fs';
import multer from 'multer';
import path from 'path';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware, optionalAuth } from '../../middleware/auth';
import { getUploadMaxSize } from '../../utils/fileUploadConfig';
import storageController from '../controllers/storageController';

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../runtime/uploads');
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
  limits: { fileSize: getUploadMaxSize() },
});

const router = express.Router();

// 存储状态
router.get('/status', optionalAuth, asyncHandler(storageController.getStatus));

// 文件 CRUD
router.get('/files', authMiddleware, asyncHandler(storageController.getFiles));
router.get('/files/:fileId', authMiddleware, asyncHandler(storageController.getFileById));
router.delete('/files/:fileId', authMiddleware, asyncHandler(storageController.deleteFile));

// 上传下载
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  asyncHandler(storageController.uploadFile)
);
router.get('/download/:fileId', authMiddleware, asyncHandler(storageController.downloadFile));

// 归档
router.post(
  '/archive',
  authMiddleware,
  [
    body('fileIds').isArray().withMessage('文件ID列表必须是数组'),
    body('archiveName').notEmpty().withMessage('归档名称不能为空'),
  ],
  asyncHandler(storageController.createArchive)
);
router.get('/archives', authMiddleware, asyncHandler(storageController.getArchives));
router.post(
  '/archives/:archiveId/restore',
  authMiddleware,
  asyncHandler(storageController.restoreArchive)
);
router.delete(
  '/archives/:archiveId',
  authMiddleware,
  asyncHandler(storageController.deleteArchive)
);

// 清理与配额
router.post(
  '/cleanup',
  authMiddleware,
  [
    body('olderThan').isInt({ min: 1 }).withMessage('清理天数必须是正整数'),
    body('dryRun').optional().isBoolean().withMessage('dryRun必须是布尔值'),
  ],
  asyncHandler(storageController.cleanup)
);
router.get('/quotas', authMiddleware, asyncHandler(storageController.getQuotas));

// 移动与复制
router.post(
  '/move',
  authMiddleware,
  [
    body('fileId').notEmpty().withMessage('文件ID不能为空'),
    body('targetPath').notEmpty().withMessage('目标路径不能为空'),
  ],
  asyncHandler(storageController.moveFile)
);
router.post(
  '/copy',
  authMiddleware,
  [
    body('fileId').notEmpty().withMessage('文件ID不能为空'),
    body('targetPath').notEmpty().withMessage('目标路径不能为空'),
  ],
  asyncHandler(storageController.copyFile)
);

export default router;
