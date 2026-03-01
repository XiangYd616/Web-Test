/**
 * 存储管理控制器
 * 职责: 处理文件上传/下载、归档、清理、移动/复制等业务逻辑
 * 从 data/routes/storage.ts 中提取
 */

import type { NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { promises as fs } from 'fs';
import path from 'path';
import * as tar from 'tar';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import { storageService } from '../../storage/services/storageServiceSingleton';
import type { ApiResponse, AuthenticatedRequest } from '../../types';
import { validateMimeType, validateOwnerBinding } from '../../utils/fileOwnerValidation';
import logger from '../../utils/logger';

// ==================== 内部工具函数 ====================

const uploadDir = path.join(__dirname, '../../runtime/uploads');
const archiveDir = path.join(__dirname, '../../runtime/archives');

const ensureFileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveTargetDirectory = async (targetPath: string): Promise<string> => {
  const resolvedPath = path.isAbsolute(targetPath) ? targetPath : path.join(uploadDir, targetPath);
  await fs.mkdir(resolvedPath, { recursive: true });
  return resolvedPath;
};

const ensureUniqueFilename = async (targetDir: string, filename: string): Promise<string> => {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let candidate = filename;
  let counter = 1;
  while (true) {
    try {
      await fs.access(path.join(targetDir, candidate));
      candidate = `${base}_${Date.now()}_${counter}${ext}`;
      counter += 1;
    } catch {
      return candidate;
    }
  }
};

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  return userId ? String(userId) : '';
};

// ==================== 控制器方法 ====================

const getStatus = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const healthStatus = await storageService.healthCheck();
    const statistics = storageService.getStatistics();
    return res.success({ health: healthStatus, statistics, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取存储状态失败',
      {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
};

const getFiles = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { page = 1, limit = 20, type, search: _search } = req.query;
  try {
    let sql = `SELECT id, user_id, original_name, filename, mimetype, size, upload_date, file_path, owner_type, owner_id, expires_at, created_at FROM uploaded_files`;
    const params: Array<string | number> = [];
    if (type) {
      sql += ` WHERE mimetype LIKE $1`;
      params.push(`%${type}%`);
    }
    sql +=
      ' ORDER BY upload_date DESC LIMIT $' +
      (params.length + 1) +
      ' OFFSET $' +
      (params.length + 2);
    params.push(
      parseInt(limit as string),
      (parseInt(page as string) - 1) * parseInt(limit as string)
    );
    const result = await query(sql, params);

    const countSql = type
      ? 'SELECT COUNT(*) as total FROM uploaded_files WHERE mimetype LIKE $1'
      : 'SELECT COUNT(*) as total FROM uploaded_files';
    const countParams = type ? [`%${type}%`] : [];
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    return res.success({
      files: result.rows.map(row => ({
        id: String(row.id),
        filename: String(row.filename),
        originalName: String(row.original_name),
        mimetype: String(row.mimetype),
        size: Number(row.size),
        path: String(row.file_path),
        userId: String(row.user_id),
        ownerType: row.owner_type ?? null,
        ownerId: row.owner_id ?? null,
        createdAt: row.created_at
          ? new Date(row.created_at as string)
          : new Date(row.upload_date as string),
        expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取文件列表失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const getFileById = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { fileId } = req.params;
  try {
    const sql = `SELECT id, user_id, original_name, filename, mimetype, size, upload_date, file_path, owner_type, owner_id, expires_at, created_at FROM uploaded_files WHERE id = $1`;
    const result = await query(sql, [fileId]);
    if (result.rows.length === 0)
      return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);
    const file = result.rows[0];
    return res.success({
      id: String(file.id),
      filename: String(file.filename),
      originalName: String(file.original_name),
      mimetype: String(file.mimetype),
      size: Number(file.size),
      path: String(file.file_path),
      userId: String(file.user_id),
      ownerType: file.owner_type ?? null,
      ownerId: file.owner_id ?? null,
      createdAt: file.created_at
        ? new Date(file.created_at as string)
        : new Date(file.upload_date as string),
      expiresAt: file.expires_at ? new Date(file.expires_at as string) : null,
    });
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取文件详情失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const uploadFile = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { ownerType, ownerId, expiresAt } = req.body as {
    ownerType?: string;
    ownerId?: string;
    expiresAt?: string;
  };
  const ensuredUserId = getUserId(req);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.error(StandardErrorCode.INVALID_INPUT, '输入验证失败', errors.array(), 400);
    if (!req.file || !ensuredUserId)
      return res.error(StandardErrorCode.INVALID_INPUT, '没有上传文件或用户未认证', undefined, 400);

    const file = req.file;
    if (!validateMimeType(file.mimetype))
      return res.error(StandardErrorCode.INVALID_INPUT, '不支持的文件类型', undefined, 400);
    if (!(await ensureFileExists(file.path)))
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '上传文件写入失败', undefined, 500);

    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
    if (parsedExpiresAt && Number.isNaN(parsedExpiresAt.getTime()))
      return res.error(StandardErrorCode.INVALID_INPUT, 'expiresAt 无效', undefined, 400);

    const ownerValidation = await validateOwnerBinding(ownerType, ownerId, ensuredUserId);
    if (!ownerValidation.ok)
      return res.error(
        StandardErrorCode.FORBIDDEN,
        (ownerValidation as { ok: false; error: string }).error,
        undefined,
        403
      );

    const result = await storageService.registerUploadedFile(
      {
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      },
      ensuredUserId,
      {
        ownerType: ownerType || undefined,
        ownerId: ownerId || undefined,
        expiresAt: parsedExpiresAt,
      }
    );

    const createdAtValue = result.created_at ? new Date(String(result.created_at)) : new Date();
    const expiresAtValue = result.expires_at
      ? new Date(String(result.expires_at))
      : parsedExpiresAt || null;

    return res.success(
      {
        id: String(result.id),
        filename: String(result.filename || file.filename),
        originalName: String(result.original_name || file.originalname),
        mimetype: String(result.mimetype || file.mimetype),
        size: Number(result.size || file.size),
        path: String(result.file_path || file.path),
        userId: String(result.user_id || ensuredUserId),
        ownerType: result.owner_type ?? ownerType ?? null,
        ownerId: result.owner_id ?? ownerId ?? null,
        createdAt: createdAtValue,
        expiresAt: expiresAtValue,
      },
      '文件上传成功',
      201
    );
  } catch (error) {
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('删除上传文件失败', { error: unlinkError, filePath: req.file.path });
      }
    }
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '文件上传失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const downloadFile = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { fileId } = req.params;
  try {
    const file = await storageService.getUploadedFile(fileId);
    if (!file) return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);
    const filePath = String((file as Record<string, unknown>).file_path || '');
    if (!filePath) return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);
    if (!(await ensureFileExists(filePath))) {
      await storageService.deleteUploadedFile(fileId);
      return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);
    }
    (res as unknown as { setHeader: (k: string, v: string) => void }).setHeader(
      'Content-Disposition',
      `attachment; filename="${String((file as Record<string, unknown>).original_name || '')}"`
    );
    (res as unknown as { setHeader: (k: string, v: string) => void }).setHeader(
      'Content-Type',
      String((file as Record<string, unknown>).mimetype || 'application/octet-stream')
    );
    return (res as unknown as { sendFile: (p: string) => unknown }).sendFile(filePath);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '下载文件失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const deleteFile = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { fileId } = req.params;
  try {
    const file = await storageService.getUploadedFile(fileId);
    if (!file) return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);
    const filePath = String((file as Record<string, unknown>).file_path || '');
    if (!filePath) return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);

    let unlinkError: unknown | null = null;
    try {
      await fs.unlink(filePath);
    } catch (error) {
      unlinkError = error;
    }
    if (unlinkError) {
      const stillExists = await ensureFileExists(filePath);
      if (stillExists) {
        logger.error('删除物理文件失败', { error: unlinkError, filePath });
        return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '文件删除失败', undefined, 500);
      }
    }
    await storageService.deleteUploadedFile(fileId);
    return res.success(null, '文件删除成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '文件删除失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const createArchive = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.error(StandardErrorCode.INVALID_INPUT, '输入验证失败', errors.array(), 400);

  const { fileIds, archiveName, description } = req.body;
  const ensuredUserId = getUserId(req);
  try {
    if (!ensuredUserId)
      return res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
    const result = await storageService.archive(
      { fileIds, archiveName, description, userId: ensuredUserId },
      { targetPath: archiveDir }
    );
    return res.success({ jobId: result.jobId, filesCount: result.affected }, '归档创建成功', 201);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '归档创建失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const getArchives = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { page = 1, limit = 20, status: _status } = req.query;
  const userId = getUserId(req);
  try {
    const pageNumber = parseInt(page as string);
    const pageLimit = parseInt(limit as string);
    const status = typeof _status === 'string' ? _status : undefined;
    const jobs = await storageService.listArchiveJobs();
    const filtered = jobs.filter(job => {
      if (status && job.status !== status) return false;
      if (userId) {
        const createdBy = job.metadata?.createdBy;
        if (!createdBy || createdBy !== userId) return false;
      }
      return true;
    });
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageLimit) || 1;
    const start = (pageNumber - 1) * pageLimit;
    const archives = filtered.slice(start, start + pageLimit).map(job => ({
      id: job.id,
      name: job.name,
      description: job.description,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      size: job.size,
      compressedSize: job.compressedSize,
      compressionRatio: job.compressionRatio,
      filesCount: job.filesCount,
      archivedFilesCount: job.archivedFilesCount,
      archivePath: job.metadata?.archivePath,
      files: job.metadata?.files,
      createdBy: job.metadata?.createdBy,
    }));
    return res.success({
      archives,
      pagination: { page: pageNumber, limit: pageLimit, total, totalPages },
    });
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取归档列表失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const restoreArchive = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { archiveId } = req.params;
  const { destination } = req.body;
  const ensuredUserId = getUserId(req);
  try {
    if (!ensuredUserId)
      return res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
    const archiveJob = await storageService.getArchiveJob(archiveId);
    if (!archiveJob)
      return res.error(StandardErrorCode.NOT_FOUND, '归档任务不存在', undefined, 404);

    const archiveData = archiveJob.metadata || {};
    if (archiveData.createdBy && archiveData.createdBy !== ensuredUserId)
      return res.error(StandardErrorCode.FORBIDDEN, '无权恢复该归档', undefined, 403);

    const archivePath = archiveData.archivePath as string | undefined;
    const files = (archiveData.files || []) as Array<{
      originalName: string;
      storedName: string;
      mimetype: string;
      size: number;
    }>;
    if (!archivePath)
      return res.error(StandardErrorCode.INVALID_INPUT, '归档文件不存在', undefined, 400);

    const targetDir = destination
      ? await resolveTargetDirectory(destination)
      : await resolveTargetDirectory(uploadDir);
    await tar.x({ file: archivePath, cwd: targetDir });

    const restoredFiles = [] as Array<Record<string, unknown>>;
    for (const file of files) {
      const restoredPath = path.join(targetDir, String(file.storedName));
      const stats = await fs.stat(restoredPath);
      const insertResult = await storageService.registerUploadedFile(
        {
          originalName: String(file.originalName),
          filename: String(file.storedName),
          mimetype: String(file.mimetype || ''),
          size: Number(file.size || 0),
          path: restoredPath,
        },
        ensuredUserId
      );
      restoredFiles.push({
        id: insertResult.id,
        originalName: String(file.originalName),
        filename: String(file.storedName),
        size: stats.size,
      });
    }
    return res.success({ archiveId, destination: targetDir, restoredFiles }, '归档恢复成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '归档恢复失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const deleteArchive = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { archiveId } = req.params;
  try {
    const archiveJob = await storageService.getArchiveJob(archiveId);
    if (!archiveJob)
      return res.error(StandardErrorCode.NOT_FOUND, '归档任务不存在', undefined, 404);
    const archivePath = archiveJob.metadata?.archivePath as string | undefined;
    if (archivePath) {
      try {
        await fs.unlink(archivePath);
      } catch (unlinkError) {
        logger.error('删除归档文件失败', { archiveId, error: unlinkError });
      }
    }
    await storageService.deleteArchiveJob(archiveId);
    return res.success({ archiveId }, '归档删除成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '归档删除失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const cleanup = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.error(StandardErrorCode.INVALID_INPUT, '输入验证失败', errors.array(), 400);
  const { olderThan, dryRun = false } = req.body;
  try {
    const result = await storageService.cleanup({ olderThan: parseInt(olderThan), dryRun });
    return res.success(result, dryRun ? '清理预览完成' : '清理完成');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '清理失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const getQuotas = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  try {
    const result = await query(
      'SELECT COUNT(*) as total_files, COALESCE(SUM(size), 0) as total_size FROM uploaded_files WHERE user_id = $1',
      [userId]
    );
    const row = result.rows[0];
    return res.success({
      totalFiles: parseInt(row.total_files, 10),
      totalSize: parseInt(row.total_size, 10),
    });
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取存储配额失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const moveFile = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.error(StandardErrorCode.INVALID_INPUT, '输入验证失败', errors.array(), 400);

  const { fileId, targetPath } = req.body;
  const ensuredUserId = getUserId(req);
  try {
    if (!ensuredUserId)
      return res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
    const fileResult = await query(
      'SELECT id, original_name, filename, mimetype, size, file_path FROM uploaded_files WHERE id = $1',
      [fileId]
    );
    if (fileResult.rows.length === 0)
      return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);

    const file = fileResult.rows[0] as Record<string, unknown>;
    const targetDir = await resolveTargetDirectory(targetPath);
    const sourcePath = String(file.file_path || '');
    if (!sourcePath) return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);
    const targetFilename = await ensureUniqueFilename(targetDir, String(file.filename || ''));
    const targetFilePath = path.join(targetDir, targetFilename);

    await fs.rename(sourcePath, targetFilePath);
    if (!(await ensureFileExists(targetFilePath))) {
      await fs
        .rename(targetFilePath, sourcePath)
        .catch(error => logger.error('文件移动补偿失败', { error, sourcePath, targetFilePath }));
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '文件移动失败', undefined, 500);
    }
    try {
      await storageService.updateUploadedFile(fileId, {
        filename: targetFilename,
        path: targetFilePath,
      });
    } catch (error) {
      await fs
        .rename(targetFilePath, sourcePath)
        .catch(rollbackError =>
          logger.error('文件移动回滚失败', { error: rollbackError, sourcePath, targetFilePath })
        );
      throw error;
    }
    return res.success({ fileId, targetPath: targetFilePath }, '文件移动成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '文件移动失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const copyFile = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.error(StandardErrorCode.INVALID_INPUT, '输入验证失败', errors.array(), 400);

  const { fileId, targetPath } = req.body;
  const ensuredUserId = getUserId(req);
  try {
    if (!ensuredUserId)
      return res.error(StandardErrorCode.UNAUTHORIZED, '用户未认证', undefined, 401);
    const fileResult = await query(
      'SELECT id, original_name, filename, mimetype, size, file_path FROM uploaded_files WHERE id = $1',
      [fileId]
    );
    if (fileResult.rows.length === 0)
      return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);

    const file = fileResult.rows[0] as Record<string, unknown>;
    const targetDir = await resolveTargetDirectory(targetPath);
    const sourcePath = String(file.file_path || '');
    if (!sourcePath) return res.error(StandardErrorCode.NOT_FOUND, '文件不存在', undefined, 404);
    const targetFilename = await ensureUniqueFilename(targetDir, String(file.filename || ''));
    const targetFilePath = path.join(targetDir, targetFilename);

    await fs.copyFile(sourcePath, targetFilePath);
    if (!(await ensureFileExists(targetFilePath)))
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '文件复制失败', undefined, 500);

    let insertResult: Record<string, unknown> | undefined;
    try {
      insertResult = await storageService.registerUploadedFile(
        {
          originalName: String(file.original_name),
          filename: targetFilename,
          mimetype: String(file.mimetype || ''),
          size: Number(file.size || 0),
          path: targetFilePath,
        },
        ensuredUserId
      );
    } catch (error) {
      await fs
        .unlink(targetFilePath)
        .catch(rollbackError =>
          logger.error('复制文件回滚失败', { error: rollbackError, targetFilePath })
        );
      throw error;
    }
    return res.success({ fileId: insertResult?.id, filePath: targetFilePath }, '文件复制成功', 201);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '文件复制失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

export default {
  getStatus,
  getFiles,
  getFileById,
  uploadFile,
  downloadFile,
  deleteFile,
  createArchive,
  getArchives,
  restoreArchive,
  deleteArchive,
  cleanup,
  getQuotas,
  moveFile,
  copyFile,
};
