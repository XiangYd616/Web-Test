import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validation';
import { updateUserRoleSchema } from '../schemas/userSchemas';

const router = Router();

// 所有用户路由都需要认证
router.use(authMiddleware);
router.use(userRateLimiter);

/**
 * @route GET /api/user/profile
 * @desc 获取用户个人资料
 * @access Private
 */
router.get('/profile', asyncHandler(UserController.getProfile));

/**
 * @route PUT /api/user/profile
 * @desc 更新用户个人资料
 * @access Private
 */
router.put('/profile',
  validateRequest(updateUserRoleSchema),
  asyncHandler(UserController.updateProfile)
);

/**
 * @route GET /api/user/settings
 * @desc 获取用户设置
 * @access Private
 */
router.get('/settings', asyncHandler(UserController.getSettings));

/**
 * @route PUT /api/user/settings
 * @desc 更新用户设置
 * @access Private
 */
router.put('/settings', asyncHandler(UserController.updateSettings));

/**
 * @route GET /api/user/tests
 * @desc 获取用户的测试历史
 * @access Private
 */
router.get('/tests', asyncHandler(UserController.getUserTests));

/**
 * @route GET /api/user/tests/:id
 * @desc 获取特定测试结果
 * @access Private
 */
router.get('/tests/:id', asyncHandler(UserController.getTestResult));

/**
 * @route DELETE /api/user/tests/:id
 * @desc 删除测试结果
 * @access Private
 */
router.delete('/tests/:id', asyncHandler(UserController.deleteTestResult));

/**
 * @route GET /api/user/stats
 * @desc 获取用户统计信息
 * @access Private
 */
router.get('/stats', asyncHandler(UserController.getUserStats));

/**
 * @route POST /api/user/avatar
 * @desc 上传用户头像
 * @access Private
 */
router.post('/avatar', asyncHandler(UserController.uploadAvatar));

/**
 * @route DELETE /api/user/avatar
 * @desc 删除用户头像
 * @access Private
 */
router.delete('/avatar', asyncHandler(UserController.deleteAvatar));

/**
 * @route GET /api/user/notifications
 * @desc 获取用户通知
 * @access Private
 */
router.get('/notifications', asyncHandler(UserController.getNotifications));

/**
 * @route PUT /api/user/notifications/:id/read
 * @desc 标记通知为已读
 * @access Private
 */
router.put('/notifications/:id/read', asyncHandler(UserController.markNotificationRead));

/**
 * @route DELETE /api/user/account
 * @desc 删除用户账户
 * @access Private
 */
router.delete('/account', asyncHandler(UserController.deleteAccount));

export default router;
