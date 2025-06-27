/**
 * 报告路由
 * 处理报告生成和管理相关的API请求
 */

import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * 获取报告列表
 * GET /api/reports
 */
router.get('/', authMiddleware, asyncHandler(ReportController.getReports));

/**
 * 获取单个报告
 * GET /api/reports/:reportId
 */
router.get('/:reportId', authMiddleware, asyncHandler(ReportController.getReport));

/**
 * 生成新报告
 * POST /api/reports/generate
 */
router.post('/generate', authMiddleware, asyncHandler(ReportController.generateReport));

/**
 * 下载报告
 * GET /api/reports/:reportId/download
 */
router.get('/:reportId/download', authMiddleware, asyncHandler(ReportController.downloadReport));

/**
 * 删除报告
 * DELETE /api/reports/:reportId
 */
router.delete('/:reportId', authMiddleware, asyncHandler(ReportController.deleteReport));

/**
 * 获取报告任务列表
 * GET /api/reports/tasks
 */
router.get('/tasks', authMiddleware, asyncHandler(ReportController.getTasks));

/**
 * 获取单个报告任务
 * GET /api/reports/tasks/:taskId
 */
router.get('/tasks/:taskId', authMiddleware, asyncHandler(ReportController.getTask));

/**
 * 取消报告任务
 * POST /api/reports/tasks/:taskId/cancel
 */
router.post('/tasks/:taskId/cancel', authMiddleware, asyncHandler(ReportController.cancelTask));

/**
 * 重试报告任务
 * POST /api/reports/tasks/:taskId/retry
 */
router.post('/tasks/:taskId/retry', authMiddleware, asyncHandler(ReportController.retryTask));

/**
 * 获取报告模板
 * GET /api/reports/templates
 */
router.get('/templates', authMiddleware, asyncHandler(ReportController.getTemplates));

/**
 * 获取报告统计
 * GET /api/reports/stats
 */
router.get('/stats', authMiddleware, asyncHandler(ReportController.getStats));

export default router;
