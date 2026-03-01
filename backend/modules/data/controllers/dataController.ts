/**
 * 数据管理控制器
 * 职责: 处理数据CRUD、导入导出、备份恢复等业务逻辑
 * 从 data/routes/index.ts 中提取
 */

import type { NextFunction } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import type { ApiResponse, AuthenticatedRequest } from '../../types';
import Logger from '../../utils/logger';
import { dataManagementService } from '../services/DataManagementService';
import DataExportService, { DataFilter } from '../services/dataManagement/dataExportService';
import DataImportService, { ImportConfig } from '../services/dataManagement/dataImportService';

// ==================== 类型定义 ====================

type ImportOptions = {
  skipHeader?: boolean;
  delimiter?: string;
  encoding?: string;
  batchSize?: number;
  updateExisting?: boolean;
};

// ==================== 内部工具函数 ====================

let exportService: DataExportService;
let importService: DataImportService;

const initializeExportService = (): DataExportService => {
  if (!exportService) {
    exportService = new DataExportService({
      exportDir: path.join(process.cwd(), 'exports'),
      maxFileSize: 100 * 1024 * 1024,
      supportedFormats: ['json', 'csv', 'excel', 'pdf', 'zip'],
    });
  }
  return exportService;
};

const initializeImportService = (): DataImportService => {
  if (!importService) {
    importService = new DataImportService({
      query: (sql: string, params?: unknown[]) => query(sql, params),
    });
  }
  return importService;
};

const resolveImportFormat = (fileType: string): ImportConfig['format'] => {
  if (fileType === 'xlsx') return 'excel';
  if (fileType === 'csv' || fileType === 'json' || fileType === 'xml') return fileType;
  return 'csv';
};

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) throw new Error('用户未认证');
  return userId;
};

const resolveWorkspaceId = (req: AuthenticatedRequest): string => {
  return (
    (req.params as { workspaceId?: string }).workspaceId ||
    (req.query as { workspaceId?: string }).workspaceId ||
    (req.body as { workspaceId?: string }).workspaceId ||
    'system'
  );
};

// ==================== 控制器方法 ====================

const getOverview = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  try {
    const overview = await dataManagementService.getDataOverview(userId, workspaceId);
    return res.success(overview);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取数据概览失败', error instanceof Error ? error.message : String(error), 500);
  }
};

// ---- 导出模板 ----

const getExportTemplates = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const service = initializeExportService();
    const templates = await service.getAllTemplates();
    return res.success(templates);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导出模板失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const createExportTemplate = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const service = initializeExportService();
    const payload = req.body as {
      name: string; description?: string; format: string; template: string;
      fields: Array<{ name: string; label: string; type: 'string' | 'number' | 'date' | 'boolean' }>;
      filters?: DataFilter[]; options?: Record<string, unknown>;
    };
    if (!payload.name || !payload.format || !payload.template) {
      return res.error(StandardErrorCode.INVALID_INPUT, '模板名称、格式和模板内容必填');
    }
    const templateId = await service.createTemplate({
      name: payload.name, description: payload.description || '', format: payload.format,
      template: payload.template, fields: payload.fields || [], filters: payload.filters, options: payload.options,
    });
    return res.created({ id: templateId }, '导出模板创建成功');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '创建导出模板失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const updateExportTemplate = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { templateId } = req.params as { templateId: string };
  try {
    const service = initializeExportService();
    const updated = await service.updateTemplate(templateId, req.body);
    if (!updated) return res.error(StandardErrorCode.NOT_FOUND, '导出模板不存在', undefined, 404);
    return res.success(updated, '导出模板已更新');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '更新导出模板失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const deleteExportTemplate = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { templateId } = req.params as { templateId: string };
  try {
    const service = initializeExportService();
    const removed = await service.deleteTemplate(templateId);
    if (!removed) return res.error(StandardErrorCode.NOT_FOUND, '导出模板不存在', undefined, 404);
    return res.success({ templateId }, '导出模板已删除');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '删除导出模板失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const applyExportTemplate = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { templateId } = req.params as { templateId: string };
  const { dataType, overrides } = req.body as { dataType: string; overrides?: Record<string, unknown> };
  try {
    if (!dataType) return res.error(StandardErrorCode.INVALID_INPUT, 'dataType 必填');
    const service = initializeExportService();
    const { template, config } = await service.applyTemplate(templateId, overrides || {});
    return res.success({ template, config, dataType });
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '应用导出模板失败', error instanceof Error ? error.message : String(error), 500);
  }
};

// ---- 导出操作 ----

const getExportProgress = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { jobId } = req.params;
  const userId = getUserId(req);
  const service = initializeExportService();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (status: Awaited<ReturnType<DataExportService['getExportStatus']>>) => {
    (res as unknown as { write: (data: string) => void }).write(`data: ${JSON.stringify(status)}\n\n`);
  };
  const sendError = (message: string) => {
    (res as unknown as { write: (data: string) => void }).write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
  };
  const closeStream = () => {
    (res as unknown as { end: () => void }).end();
  };

  try {
    const status = await service.getExportStatus(jobId);
    if (status.userId !== userId) { sendError('无权访问此导出任务'); return closeStream(); }
    sendEvent(status);
  } catch (error) {
    sendError(error instanceof Error ? error.message : String(error));
    return closeStream();
  }

  const onProgress = (task: { id: string }) => {
    if (task.id === jobId) void service.getExportStatus(jobId).then(sendEvent);
  };
  const onFinished = (task: { id: string }) => {
    if (task.id === jobId) { void service.getExportStatus(jobId).then(sendEvent); closeStream(); }
  };

  service.on('progress_updated', onProgress);
  service.on('task_completed', onFinished);
  service.on('task_failed', onFinished);
  service.on('task_cancelled', onFinished);

  req.on('close', () => {
    service.off('progress_updated', onProgress);
    service.off('task_completed', onFinished);
    service.off('task_failed', onFinished);
    service.off('task_cancelled', onFinished);
  });
};

const getExportStatus = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { jobId } = req.params;
  try {
    const service = initializeExportService();
    const status = await service.getExportStatus(jobId);
    return res.success({ jobId, ...status }, '获取导出状态成功');
  } catch (error) {
    Logger.error('获取导出状态失败', { jobId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导出状态失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const downloadExport = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { jobId } = req.params;
  const userId = getUserId(req);
  try {
    const service = initializeExportService();
    const status = await service.getExportStatus(jobId);
    if (status.status !== 'completed') return res.error(StandardErrorCode.INVALID_INPUT, '导出尚未完成', { jobId, status: status.status });
    if (status.userId !== userId) return res.error(StandardErrorCode.FORBIDDEN, '无权访问此导出文件');
    const filePath = await service.getExportFilePath(jobId);
    if (!filePath) return res.error(StandardErrorCode.NOT_FOUND, '导出文件不存在');
    try { await fs.access(filePath); } catch { return res.error(StandardErrorCode.NOT_FOUND, '导出文件不存在'); }
    const fileName = path.basename(filePath);
    (res as unknown as { setHeader: (k: string, v: string) => void }).setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    (res as unknown as { setHeader: (k: string, v: string) => void }).setHeader('Content-Type', 'application/octet-stream');
    return (res as unknown as { sendFile: (p: string) => unknown }).sendFile(filePath);
  } catch (error) {
    Logger.error('下载导出文件失败', { jobId, userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '下载导出文件失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const cancelExport = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { jobId } = req.params;
  const userId = getUserId(req);
  try {
    const service = initializeExportService();
    const status = await service.getExportStatus(jobId);
    if (status.userId !== userId) return res.error(StandardErrorCode.FORBIDDEN, '无权取消此导出任务');
    if (status.status === 'completed') return res.error(StandardErrorCode.INVALID_INPUT, '无法取消已完成的导出任务');
    await service.cancelExportJob(jobId);
    return res.success({ jobId }, '导出任务已取消');
  } catch (error) {
    Logger.error('取消导出任务失败', { jobId, userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '取消导出任务失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const getExportHistory = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { page = 1, limit = 10, status } = req.query;
  try {
    const service = initializeExportService();
    const history = await service.getUserExportHistory(userId, { page: parseInt(page as string), limit: parseInt(limit as string), status: status as string });
    return res.success({ items: history.items, pagination: { page: history.page, limit: history.limit, total: history.total, totalPages: Math.ceil(history.total / history.limit) } }, '获取导出历史成功');
  } catch (error) {
    Logger.error('获取导出历史失败', { userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导出历史失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const getExportFormats = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const service = initializeExportService();
    const formats = service.getSupportedFormats();
    return res.success({ formats }, '获取支持的导出格式成功');
  } catch (error) {
    Logger.error('获取支持的导出格式失败', { error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取支持的导出格式失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const cleanupExports = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { olderThan = 7 } = req.query;
  try {
    const service = initializeExportService();
    const result = await service.cleanupExpiredExports(userId, { olderThan: parseInt(olderThan as string) });
    return res.success(result, '清理过期导出文件成功');
  } catch (error) {
    Logger.error('清理过期导出文件失败', { userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '清理过期导出文件失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

// ---- 数据 CRUD ----

const getStatistics = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { period = '30d', type } = req.query;
  try {
    const statistics = await dataManagementService.getDataStatistics(userId, { period: period as string, type: type as string, workspaceId });
    return res.success(statistics);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取数据统计失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const createRecord = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  try {
    const result = await dataManagementService.createDataRecord(userId, req.body, workspaceId);
    return res.success(result, '数据记录创建成功', 201);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '创建数据记录失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getList = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { page = 1, limit = 10, type, status, search } = req.query;
  try {
    const result = await dataManagementService.getDataList(userId, { page: parseInt(page as string), limit: parseInt(limit as string), type: type as string, status: status as string, search: search as string }, workspaceId);
    return res.success(result);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取数据列表失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getRecord = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { id } = req.params;
  try {
    const record = await dataManagementService.getDataRecord(userId, id, workspaceId);
    if (!record) return res.error(StandardErrorCode.NOT_FOUND, '数据记录不存在', undefined, 404);
    return res.success(record);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取数据记录失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const updateRecord = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { id } = req.params;
  try {
    const result = await dataManagementService.updateDataRecord(userId, id, req.body, workspaceId);
    return res.success(result, '数据记录更新成功');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '更新数据记录失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const deleteRecord = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { id } = req.params;
  try {
    await dataManagementService.deleteDataRecord(userId, id, workspaceId);
    return res.success(null, '数据记录删除成功');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '删除数据记录失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const batchOperation = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { operation, ids, data } = req.body;
  try {
    const result = await dataManagementService.batchOperationForUser(userId, { operation, ids, data }, workspaceId);
    return res.success(result, '批量操作完成');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '批量操作失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const searchData = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { query: searchQuery, filters, options } = req.body;
  try {
    const result = await dataManagementService.searchData(userId, { query: searchQuery, filters: filters || {}, options: options || {} }, workspaceId);
    return res.success(result);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '数据搜索失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const exportData = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { format, filters, options } = req.body;
  try {
    const result = await dataManagementService.exportData(userId, { format, filters: filters || {}, options: options || {} }, workspaceId);
    return res.success(result, '数据导出任务创建成功');
  } catch (error) {
    if (error instanceof Error && (error as { statusCode?: number }).statusCode === 501) return res.error(StandardErrorCode.SERVICE_UNAVAILABLE, error.message, undefined, 501);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '数据导出失败', error instanceof Error ? error.message : String(error), 500);
  }
};

// ---- 导入操作 ----

const importData = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const file = req.file;
  const { options } = req.body;
  if (!file) return res.error(StandardErrorCode.INVALID_INPUT, '没有上传文件', undefined, 400);
  try {
    const result = await dataManagementService.importDataForUpload(userId, { file, options: options || {}, type: req.body.type as string | undefined, format: req.body.format as string | undefined, workspaceId });
    return res.success(result, '数据导入任务创建成功');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '数据导入失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getImportStatus = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { jobId } = req.params;
  const userId = getUserId(req);
  try {
    const service = initializeImportService();
    const status = await service.getImportStatus(jobId);
    if (status.userId !== userId) return res.error(StandardErrorCode.FORBIDDEN, '无权访问此导入任务');
    return res.success({ jobId, ...status }, '获取导入状态成功');
  } catch (error) {
    Logger.error('获取导入状态失败', { jobId, userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导入状态失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const cancelImport = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { jobId } = req.params;
  const userId = getUserId(req);
  try {
    const service = initializeImportService();
    const status = await service.getImportStatus(jobId);
    if (status.userId !== userId) return res.error(StandardErrorCode.FORBIDDEN, '无权取消此导入任务');
    if (status.status === 'completed') return res.error(StandardErrorCode.INVALID_INPUT, '无法取消已完成的导入任务');
    await service.cancelTask(jobId);
    return res.success({ jobId }, '导入任务已取消');
  } catch (error) {
    Logger.error('取消导入任务失败', { jobId, userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '取消导入任务失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const getImportHistory = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { page = 1, limit = 10, status } = req.query;
  try {
    const service = initializeImportService();
    const history = await service.getUserImportHistory(userId, { page: parseInt(page as string), limit: parseInt(limit as string), status: status as string | undefined });
    return res.success({ items: history.items, pagination: { page: history.page, limit: history.limit, total: history.total, totalPages: Math.ceil(history.total / history.limit) } }, '获取导入历史成功');
  } catch (error) {
    Logger.error('获取导入历史失败', { userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导入历史失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const getImportTemplate = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { type } = req.params;
  try {
    const service = initializeImportService();
    const template = await service.getTemplate(type);
    if (!template) return res.error(StandardErrorCode.INVALID_INPUT, '不支持的导入类型');
    return res.downloadResponse(template as unknown as string | Buffer, `${type}_template.csv`, 'application/octet-stream');
  } catch (error) {
    Logger.error('获取导入模板失败', { type, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导入模板失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const validateImport = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const file = req.file;
  const { options = {} } = req.body;
  if (!file) return res.error(StandardErrorCode.INVALID_INPUT, '没有上传文件');
  try {
    const service = initializeImportService();
    const importOptions: ImportOptions = { skipHeader: options.skipHeader === 'true', delimiter: options.delimiter || ',', encoding: options.encoding || 'utf8' };
    const fileType = path.extname(file.originalname).substring(1);
    const format = resolveImportFormat(fileType);
    const validation = await service.previewData(file.path || file.originalname, { format, encoding: importOptions.encoding, delimiter: importOptions.delimiter });
    return res.success(validation as unknown as Record<string, unknown>, '文件验证完成');
  } catch (error) {
    Logger.error('验证导入文件失败', { userId, fileName: file?.originalname, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '验证导入文件失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const getImportFormats = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    return res.success({ formats: ['csv', 'xlsx', 'json', 'xml'] }, '获取支持的导入格式成功');
  } catch (error) {
    Logger.error('获取支持的导入格式失败', { error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取支持的导入格式失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const getImportTypes = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    return res.success({ types: ['test_results', 'analytics', 'reports', 'users', 'logs', 'user_data', 'system_logs', 'configurations'] }, '获取支持的导入类型成功');
  } catch (error) {
    Logger.error('获取支持的导入类型失败', { error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取支持的导入类型失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const getImportStats = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  try {
    const service = initializeImportService();
    const stats = await service.getStatistics();
    return res.success(stats as unknown as Record<string, unknown>, '获取导入统计成功');
  } catch (error) {
    Logger.error('获取导入统计失败', { userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取导入统计失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

const retryImport = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { jobId } = req.params;
  const userId = getUserId(req);
  try {
    const service = initializeImportService();
    const status = await service.getTaskStatus(jobId);
    if (!status) return res.error(StandardErrorCode.NOT_FOUND, '导入任务不存在');
    if (status.createdBy !== userId) return res.error(StandardErrorCode.FORBIDDEN, '无权重试此导入任务');
    if (status.status !== 'failed') return res.error(StandardErrorCode.INVALID_INPUT, '只能重试失败的导入任务');
    const retried = await service.retryTask(jobId);
    return res.success({ jobId: retried.id, status: retried.status, progress: retried.progress }, '导入任务已重试');
  } catch (error) {
    Logger.error('重试导入任务失败', { jobId, userId, error });
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '重试导入任务失败', { error: error instanceof Error ? error.message : String(error) });
  }
};

// ---- 备份恢复 ----

const createBackup = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { type = 'full', options, format, expiresInDays } = req.body;
  try {
    const result = await dataManagementService.createBackup(type === 'full' ? null : [String(type)], { name: options?.name as string | undefined, userId, workspaceId, format: (format || options?.format) as 'json' | 'zip' | undefined, expiresInDays: Number(expiresInDays ?? options?.expiresInDays) });
    return res.success(result, '数据备份任务创建成功');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '数据备份失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const restoreData = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const file = req.file;
  const { options } = req.body;
  if (!file) return res.error(StandardErrorCode.INVALID_INPUT, '没有上传备份文件', undefined, 400);
  try {
    const result = await dataManagementService.restoreData(userId, { file, options: options || {}, workspaceId });
    return res.success(result, '数据恢复任务创建成功');
  } catch (error) {
    if (error instanceof Error && (error as { statusCode?: number }).statusCode === 501) return res.error(StandardErrorCode.SERVICE_UNAVAILABLE, error.message, undefined, 501);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '数据恢复失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getVersions = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { id } = req.params;
  try {
    const versions = await dataManagementService.getDataVersions(userId, id, workspaceId);
    return res.success(versions);
  } catch (error) {
    if (error instanceof Error && (error as { statusCode?: number }).statusCode === 501) return res.error(StandardErrorCode.SERVICE_UNAVAILABLE, error.message, undefined, 501);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取版本历史失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const validateData = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const workspaceId = resolveWorkspaceId(req);
  const { data, schema } = req.body;
  try {
    const result = await dataManagementService.validateDataRequest(userId, { data, schema, workspaceId });
    return res.success(result);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '数据验证失败', error instanceof Error ? error.message : String(error), 500);
  }
};

export default {
  getOverview,
  // 导出模板
  getExportTemplates, createExportTemplate, updateExportTemplate, deleteExportTemplate, applyExportTemplate,
  // 导出操作
  getExportProgress, getExportStatus, downloadExport, cancelExport, getExportHistory, getExportFormats, cleanupExports,
  // 数据 CRUD
  getStatistics, createRecord, getList, getRecord, updateRecord, deleteRecord, batchOperation, searchData, exportData,
  // 导入操作
  importData, getImportStatus, cancelImport, getImportHistory, getImportTemplate, validateImport, getImportFormats, getImportTypes, getImportStats, retryImport,
  // 备份恢复
  createBackup, restoreData, getVersions, validateData,
};
