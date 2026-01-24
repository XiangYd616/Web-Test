/**
 * MFA 路由
 * 职责: 处理多因素认证相关接口
 */

import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';

const mfaController = require('../controllers/mfaController');

const router = express.Router();

// 初始化MFA设置(TOTP)
router.post('/setup', authMiddleware, asyncHandler(mfaController.setup));

// 验证并启用TOTP
router.post('/verify-setup', authMiddleware, asyncHandler(mfaController.verifySetup));

// 获取MFA状态
router.get('/status', authMiddleware, asyncHandler(mfaController.status));

// 禁用MFA
router.post('/disable', authMiddleware, asyncHandler(mfaController.disable));

// 重新生成备用码
router.post(
  '/regenerate-backup-codes',
  authMiddleware,
  asyncHandler(mfaController.regenerateBackupCodes)
);

// 登录流程中的MFA校验(无需Bearer)
router.post('/verify', asyncHandler(mfaController.verify));

// 登录流程中的备用码校验(无需Bearer)
router.post('/verify-backup', asyncHandler(mfaController.verifyBackup));

export default router;
