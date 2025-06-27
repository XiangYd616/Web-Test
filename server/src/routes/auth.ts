import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validation';
import { loginSchema, registerSchema, changePasswordSchema } from '../schemas/authSchemas';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post('/register',
  registerRateLimiter,
  validateRequest(registerSchema),
  asyncHandler(AuthController.register)
);

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login',
  loginRateLimiter,
  validateRequest(loginSchema),
  asyncHandler(AuthController.login)
);

/**
 * @route POST /api/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post('/logout', asyncHandler(AuthController.logout));

/**
 * @route GET /api/auth/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/me', asyncHandler(AuthController.getCurrentUser));

/**
 * @route POST /api/auth/refresh
 * @desc 刷新访问令牌
 * @access Public
 */
router.post('/refresh', asyncHandler(AuthController.refreshToken));

/**
 * @route POST /api/auth/change-password
 * @desc 修改密码
 * @access Private
 */
router.post('/change-password',
  validateRequest(changePasswordSchema),
  asyncHandler(AuthController.changePassword)
);

/**
 * @route POST /api/auth/forgot-password
 * @desc 忘记密码
 * @access Public
 */
router.post('/forgot-password', asyncHandler(AuthController.forgotPassword));

/**
 * @route POST /api/auth/reset-password
 * @desc 重置密码
 * @access Public
 */
router.post('/reset-password', asyncHandler(AuthController.resetPassword));

/**
 * @route POST /api/auth/verify
 * @desc 验证访问令牌
 * @access Public
 */
router.post('/verify', asyncHandler(AuthController.verifyToken));

/**
 * @route POST /api/auth/verify-email
 * @desc 验证邮箱
 * @access Public
 */
router.post('/verify-email', asyncHandler(AuthController.verifyEmail));

/**
 * @route POST /api/auth/resend-verification
 * @desc 重新发送验证邮件
 * @access Public
 */
router.post('/resend-verification', asyncHandler(AuthController.resendVerification));

export default router;
