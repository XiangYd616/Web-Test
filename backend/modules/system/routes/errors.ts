/**
 * 错误报告路由
 * 处理前端错误报告和错误统计
 * 业务逻辑委托给 errorController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import errorController from '../controllers/errorController';

const router = express.Router();

// GET /api/system/errors/trends - 获取错误趋势
router.get('/trends', authMiddleware, asyncHandler(errorController.getTrends));

// GET /api/system/errors/groups - 获取错误分组统计
router.get('/groups', authMiddleware, asyncHandler(errorController.getGroups));

// GET /api/system/errors/statistics - 获取错误统计
router.get('/statistics', authMiddleware, asyncHandler(errorController.getStatistics));

// GET /api/system/errors/types - 获取错误类型列表
router.get('/types', authMiddleware, asyncHandler(errorController.getErrorTypes));

// GET /api/system/errors/health - 错误监控健康检查
router.get('/health', authMiddleware, asyncHandler(errorController.getHealth));

// POST /api/system/errors/report - 前端错误报告（无需认证）
router.post('/report', asyncHandler(errorController.submitReport));

// POST /api/system/errors/batch/resolve - 批量标记错误为已解决
router.post('/batch/resolve', authMiddleware, asyncHandler(errorController.batchResolve));

// GET /api/system/errors/:id - 获取单个错误详情
router.get('/:id', authMiddleware, asyncHandler(errorController.getErrorById));

// POST /api/system/errors/:id/resolve - 标记错误为已解决
router.post('/:id/resolve', authMiddleware, asyncHandler(errorController.resolveError));

// DELETE /api/system/errors/:id - 删除错误报告
router.delete('/:id', authMiddleware, asyncHandler(errorController.deleteError));

// GET /api/system/errors - 获取错误列表
router.get('/', authMiddleware, asyncHandler(errorController.getErrors));

export default router;
