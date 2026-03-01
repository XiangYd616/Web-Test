/**
 * 数据管理API路由
 * 业务逻辑委托给 dataController
 */

import express from 'express';
import multer from 'multer';
import asyncHandler from '../../middleware/asyncHandler';
import { authMiddleware } from '../../middleware/auth';
import {
  getAllowedMimeTypes,
  getUploadDestination,
  getUploadMaxSize,
} from '../../utils/fileUploadConfig';
import dataController from '../controllers/dataController';

// 配置文件上传
const allowedMimeTypes = getAllowedMimeTypes();
const upload = multer({
  dest: getUploadDestination(),
  limits: { fileSize: getUploadMaxSize() },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimeTypes.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  },
});

const router = express.Router();
router.use(authMiddleware);

// ---- 数据概览与统计 ----
router.get('/overview', asyncHandler(dataController.getOverview));
router.get('/statistics', asyncHandler(dataController.getStatistics));

// ---- 导出模板 ----
router.get('/export/templates', asyncHandler(dataController.getExportTemplates));
router.post('/export/templates', asyncHandler(dataController.createExportTemplate));
router.put('/export/templates/:templateId', asyncHandler(dataController.updateExportTemplate));
router.delete('/export/templates/:templateId', asyncHandler(dataController.deleteExportTemplate));
router.post('/export/templates/:templateId/apply', asyncHandler(dataController.applyExportTemplate));

// ---- 导出操作 ----
router.get('/export/history', asyncHandler(dataController.getExportHistory));
router.get('/export/formats', asyncHandler(dataController.getExportFormats));
router.delete('/export/cleanup', asyncHandler(dataController.cleanupExports));
router.get('/export/status/:jobId', asyncHandler(dataController.getExportStatus));
router.get('/export/download/:jobId', asyncHandler(dataController.downloadExport));
router.get('/export/:jobId/progress', asyncHandler(dataController.getExportProgress));
router.delete('/export/:jobId', asyncHandler(dataController.cancelExport));
router.post('/export', upload.single('file'), asyncHandler(dataController.exportData));

// ---- 导入操作 ----
router.get('/import/history', asyncHandler(dataController.getImportHistory));
router.get('/import/formats', asyncHandler(dataController.getImportFormats));
router.get('/import/types', asyncHandler(dataController.getImportTypes));
router.get('/import/stats', asyncHandler(dataController.getImportStats));
router.get('/import/template/:type', asyncHandler(dataController.getImportTemplate));
router.post('/import/validate', upload.single('file'), asyncHandler(dataController.validateImport));
router.get('/import/:jobId/status', asyncHandler(dataController.getImportStatus));
router.post('/import/:jobId/retry', asyncHandler(dataController.retryImport));
router.delete('/import/:jobId', asyncHandler(dataController.cancelImport));
router.post('/import', upload.single('file'), asyncHandler(dataController.importData));

// ---- 批量与搜索 ----
router.post('/batch', asyncHandler(dataController.batchOperation));
router.post('/search', asyncHandler(dataController.searchData));
router.post('/validate', asyncHandler(dataController.validateData));

// ---- 备份恢复 ----
router.post('/backup', asyncHandler(dataController.createBackup));
router.post('/restore', upload.single('file'), asyncHandler(dataController.restoreData));

// ---- 数据 CRUD ----
router.get('/:id/versions', asyncHandler(dataController.getVersions));
router.get('/:id', asyncHandler(dataController.getRecord));
router.put('/:id', asyncHandler(dataController.updateRecord));
router.delete('/:id', asyncHandler(dataController.deleteRecord));
router.post('/', asyncHandler(dataController.createRecord));
router.get('/', asyncHandler(dataController.getList));

export default router;
