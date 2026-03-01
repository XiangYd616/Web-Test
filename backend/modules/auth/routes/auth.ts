/**
 * 认证路由
 * 业务逻辑委托给 authController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import {
  emailVerificationRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
} from '../../middleware/rateLimiter';
import { validateEmail } from '../../middleware/validation';
import authController from '../controllers/authController';
import mfaRoutes from './mfa';

const router = express.Router();

// MFA路由
router.use('/mfa', mfaRoutes);

// 邮箱验证
router.post(
  '/resend-verification',
  resendVerificationRateLimiter,
  validateEmail,
  asyncHandler(authController.resendVerification)
);
router.post(
  '/verify-email',
  emailVerificationRateLimiter,
  asyncHandler(authController.verifyEmail)
);

// 注册、登录、登出
router.post('/register', registerRateLimiter, validateEmail, asyncHandler(authController.register));
router.post('/login', loginRateLimiter, asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', authMiddleware, asyncHandler(authController.logout));

// 本地模式自动登录（无需认证）
router.get('/local-token', asyncHandler(authController.localToken));

// 当前用户
router.get('/me', authMiddleware, asyncHandler(authController.me));

export default router;
