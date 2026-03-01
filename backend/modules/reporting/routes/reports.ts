/**
 * 报告路由
 * 业务逻辑委托给 reportController
 */

import express from 'express';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import reportController from '../controllers/reportController';

const router = express.Router();

// GET /api/system/reports/templates - 获取报告模板列表
router.get('/templates', authMiddleware, asyncHandler(reportController.getTemplates));

// POST /api/system/reports/templates - 创建报告模板
router.post('/templates', authMiddleware, asyncHandler(reportController.createTemplate));

// PUT /api/system/reports/templates/:templateId - 更新报告模板
router.put('/templates/:templateId', authMiddleware, asyncHandler(reportController.updateTemplate));

// DELETE /api/system/reports/templates/:templateId - 删除报告模板
router.delete(
  '/templates/:templateId',
  authMiddleware,
  asyncHandler(reportController.deleteTemplate)
);

// GET /api/system/reports/templates/:templateId/versions - 获取报告模板版本
router.get(
  '/templates/:templateId/versions',
  authMiddleware,
  asyncHandler(reportController.getTemplateVersions)
);

// POST /api/system/reports/templates/:templateId/preview - 预览报告模板
router.post(
  '/templates/:templateId/preview',
  authMiddleware,
  asyncHandler(reportController.previewTemplate)
);

// GET /api/system/reports/share-emails - 获取分享邮件记录
router.get('/share-emails', authMiddleware, asyncHandler(reportController.getShareEmails));

// DELETE /api/system/reports/share-emails/:id - 删除分享邮件记录
router.delete('/share-emails/:id', authMiddleware, asyncHandler(reportController.deleteShareEmail));

// POST /api/system/reports/share-emails/:id/retry - 手动重试分享邮件发送
router.post(
  '/share-emails/:id/retry',
  authMiddleware,
  asyncHandler(reportController.retryShareEmail)
);

// GET /api/system/reports/instances - 获取报告实例列表
router.get('/instances', authMiddleware, asyncHandler(reportController.getInstances));

// GET /api/system/reports/statistics - 获取报告统计
router.get('/statistics', authMiddleware, asyncHandler(reportController.getStatistics));

// GET /api/system/reports/access-logs - 获取报告访问日志
router.get('/access-logs', authMiddleware, asyncHandler(reportController.getAccessLogs));

// GET /api/system/reports/export - 导出报告数据
router.get('/export', authMiddleware, asyncHandler(reportController.exportReports));

// GET /api/system/reports/share/:token - 获取分享详情（无需认证）
router.get('/share/:token', asyncHandler(reportController.getShareDetail));

// GET /api/system/reports/share/:token/download - 分享下载（无需认证）
router.get('/share/:token/download', asyncHandler(reportController.downloadShare));

// POST /api/system/reports/:id/share - 创建报告分享
router.post('/:id/share', authMiddleware, asyncHandler(reportController.createShare));

// POST /api/system/reports/:id/schedule - 设置报告定时生成
router.post('/:id/schedule', authMiddleware, asyncHandler(reportController.scheduleReport));

// GET /api/system/reports/:id/download - 下载报告
router.get('/:id/download', authMiddleware, asyncHandler(reportController.downloadReport));

// GET /api/system/reports/:id - 获取单个报告详情
router.get('/:id', authMiddleware, asyncHandler(reportController.getReportById));

// DELETE /api/system/reports/:id - 删除报告
router.delete('/:id', authMiddleware, asyncHandler(reportController.deleteReport));

// POST /api/system/reports - 创建报告
router.post('/', authMiddleware, asyncHandler(reportController.createReport));

// GET /api/system/reports - 获取报告列表
router.get('/', authMiddleware, asyncHandler(reportController.getReports));

export default router;
