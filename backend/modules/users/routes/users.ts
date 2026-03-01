/**
 * 用户路由 (重构版)
 * 职责: 定义用户相关的路由
 */

import express from 'express';
import multer from 'multer';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import userController from '../controllers/userController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 用户个人信息
router.get(
  '/profile',
  authMiddleware,
  asyncHandler((req, res, next) =>
    userController.getProfile(
      req as Parameters<typeof userController.getProfile>[0],
      res as Parameters<typeof userController.getProfile>[1],
      next
    )
  )
);

// 删除账号
router.delete(
  '/account',
  authMiddleware,
  asyncHandler((req, res, next) =>
    userController.deleteAccount(
      req as Parameters<typeof userController.deleteAccount>[0],
      res as Parameters<typeof userController.deleteAccount>[1],
      next
    )
  )
);

// 头像上传与获取
router.post(
  '/avatar',
  authMiddleware,
  upload.single('avatar'),
  asyncHandler((req, res, next) =>
    userController.uploadAvatar(
      req as Parameters<typeof userController.uploadAvatar>[0],
      res as Parameters<typeof userController.uploadAvatar>[1],
      next
    )
  )
);
router.get(
  '/avatar/:fileId',
  authMiddleware,
  asyncHandler((req, res, next) =>
    userController.getAvatar(
      req as Parameters<typeof userController.getAvatar>[0],
      res as Parameters<typeof userController.getAvatar>[1],
      next
    )
  )
);
router.put(
  '/profile',
  authMiddleware,
  asyncHandler((req, res, next) =>
    userController.updateProfile(
      req as Parameters<typeof userController.updateProfile>[0],
      res as Parameters<typeof userController.updateProfile>[1],
      next
    )
  )
);

// 修改密码
router.post(
  '/change-password',
  authMiddleware,
  asyncHandler((req, res, next) =>
    userController.changePassword(
      req as Parameters<typeof userController.changePassword>[0],
      res as Parameters<typeof userController.changePassword>[1],
      next
    )
  )
);

// 用户统计
router.get(
  '/stats',
  authMiddleware,
  asyncHandler((req, res, next) =>
    userController.getStats(
      req as Parameters<typeof userController.getStats>[0],
      res as Parameters<typeof userController.getStats>[1],
      next
    )
  )
);

export default router;
