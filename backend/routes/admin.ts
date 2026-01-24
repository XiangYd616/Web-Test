/**
 * 管理后台路由 - MVP
 */

import express from 'express';
import asyncHandler from '../middleware/asyncHandler';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(authMiddleware, requireAdmin);

// 系统统计
router.get('/stats', asyncHandler(adminController.getSystemStats));
router.get('/monitor', asyncHandler(adminController.getSystemMonitor));
router.get('/test-history', asyncHandler(adminController.getTestHistory));

// 用户管理
router.get('/users', asyncHandler(adminController.getUsers));
router.post('/users', asyncHandler(adminController.createUser));
router.put('/users/:userId', asyncHandler(adminController.updateUser));
router.delete('/users/:userId', asyncHandler(adminController.deleteUser));
router.post('/users/bulk', asyncHandler(adminController.bulkUserAction));

// 测试管理
router.get('/tests', asyncHandler(adminController.getTests));
router.post('/tests/:testId/cancel', asyncHandler(adminController.cancelTest));

// 日志
router.get('/logs', asyncHandler(adminController.getLogs));

// 系统配置
router.get('/config', asyncHandler(adminController.getSystemConfig));
router.put('/config', asyncHandler(adminController.updateSystemConfig));

// 备份管理
router.get('/backups', asyncHandler(adminController.getBackups));
router.post('/backups', asyncHandler(adminController.createBackup));
router.delete('/backups/:backupId', asyncHandler(adminController.deleteBackup));
router.post('/backups/:backupId/restore', asyncHandler(adminController.restoreBackup));

// 权限管理
router.get('/permissions/groups', asyncHandler(adminController.getPermissionGroups));

// 数据库健康
router.get('/health', asyncHandler(adminController.getDatabaseHealth));

export default router;
