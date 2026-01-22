/**
 * 统一存储服务
 * 整合专门存储、归档和清理功能的统一接口
 */

import * as fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { query } from '../../config/database';
import DataArchiveManager from './DataArchiveManager';
import DataCleanupManager from './DataCleanupManager';

// 存储配置接口
export interface StorageServiceConfig {
  storage?: Record<string, unknown>;
  archive?: Record<string, unknown>;
  cleanup?: Record<string, unknown>;
  monitoring?: {
    enabled: boolean;
  };
}

// 存储统计接口
export interface StorageStatistics {
  totalOperations: number;
  storageOperations: number;
  archiveOperations: number;
  cleanupOperations: number;
  errors: number;
  lastOperation?: Date;
}

// 存储操作结果接口
export interface StorageOperationResult {
  success: boolean;
  operation: string;
  duration: number;
  affected: number;
  error?: string;
  jobId?: string;
}

class StorageService {
  private config: StorageServiceConfig;
  private archiveManager: DataArchiveManager;
  private cleanupManager: DataCleanupManager;
  private statistics: StorageStatistics;

  constructor(config: StorageServiceConfig = {}) {
    this.config = {
      storage: {},
      archive: {},
      cleanup: {},
      monitoring: { enabled: true },
      ...config,
    };

    // 初始化各个管理器
    this.archiveManager = new DataArchiveManager(this.config.archive);
    this.cleanupManager = new DataCleanupManager(this.config.cleanup);

    // 统计信息
    this.statistics = {
      totalOperations: 0,
      storageOperations: 0,
      archiveOperations: 0,
      cleanupOperations: 0,
      errors: 0,
    };
  }

  /**
   * 记录上传文件到数据库
   */
  async registerUploadedFile(
    file: {
      originalName: string;
      filename: string;
      mimetype: string;
      size: number;
      path: string;
    },
    userId: string
  ) {
    const result = await query(
      `INSERT INTO uploaded_files (
         user_id, original_name, filename, mimetype, size, upload_date, file_path
       ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id, user_id, original_name, filename, mimetype, size, upload_date, file_path`,
      [userId, file.originalName, file.filename, file.mimetype, file.size, file.path]
    );
    return result.rows[0] as Record<string, unknown>;
  }

  async getUploadedFile(fileId: string, userId?: string) {
    const params: Array<string> = [fileId];
    const filter = userId ? ` AND user_id = $2` : '';
    if (userId) {
      params.push(userId);
    }
    const result = await query(
      `SELECT id, user_id, original_name, filename, mimetype, size, upload_date, file_path
       FROM uploaded_files
       WHERE id = $1${filter}`,
      params
    );
    return result.rows[0] as Record<string, unknown> | undefined;
  }

  async deleteUploadedFile(fileId: string, userId?: string) {
    const params: Array<string> = [fileId];
    const filter = userId ? ` AND user_id = $2` : '';
    if (userId) {
      params.push(userId);
    }
    await query(`DELETE FROM uploaded_files WHERE id = $1${filter}`, params);
  }

  async updateUploadedFile(
    fileId: string,
    updates: { filename?: string; path?: string },
    userId?: string
  ) {
    const params: Array<string | number> = [];
    const fields: string[] = [];

    if (updates.filename) {
      params.push(updates.filename);
      fields.push(`filename = $${params.length}`);
    }
    if (updates.path) {
      params.push(updates.path);
      fields.push(`file_path = $${params.length}`);
    }

    if (!fields.length) {
      return;
    }

    params.push(fileId);
    const filter = userId ? ` AND user_id = $${params.length + 1}` : '';
    if (userId) {
      params.push(userId);
    }

    await query(
      `UPDATE uploaded_files SET ${fields.join(', ')} WHERE id = $${fields.length + 1}${filter}`,
      params
    );
  }

  async getArchiveJob(jobId: string) {
    return this.archiveManager.getArchiveJob(jobId);
  }

  async listArchiveJobs() {
    return this.archiveManager.getAllArchiveJobs();
  }

  async deleteArchiveJob(jobId: string) {
    return this.archiveManager.deleteArchiveJob(jobId);
  }

  /**
   * 归档数据
   */
  async archive(
    criteria: Record<string, unknown>,
    options: Record<string, unknown> = {}
  ): Promise<StorageOperationResult> {
    const startTime = Date.now();

    try {
      const fileIds = Array.isArray(criteria.fileIds) ? criteria.fileIds : null;
      const createdBy = criteria.userId ? String(criteria.userId) : undefined;
      const targetPath = String(criteria.targetPath || options.targetPath || './archives');
      const name = String(criteria.archiveName || criteria.name || 'archive');
      const description = String(criteria.description || '');

      let sourcePath = String(criteria.sourcePath || '');
      let filesCount = 0;
      const metadataFiles: Array<Record<string, unknown>> = [];

      if (fileIds?.length) {
        const placeholders = fileIds.map((_: unknown, index: number) => `$${index + 1}`).join(',');
        const params = [...fileIds] as Array<string | number>;
        const userFilter = createdBy ? ` AND user_id = $${params.length + 1}` : '';
        if (createdBy) {
          params.push(createdBy);
        }
        const filesResult = await query(
          `SELECT id, original_name, filename, mimetype, size, file_path
           FROM uploaded_files
           WHERE id IN (${placeholders})${userFilter}`,
          params
        );
        if (!filesResult.rows.length) {
          throw new Error('未找到可归档文件');
        }

        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-archive-'));
        for (const file of filesResult.rows) {
          const storedName = String(file.filename);
          const sourceFilePath = String(file.file_path || '');
          const targetFilePath = path.join(tempDir, storedName);
          if (!sourceFilePath) {
            continue;
          }
          await fs.copyFile(sourceFilePath, targetFilePath);
          metadataFiles.push({
            originalName: file.original_name,
            storedName,
            mimetype: file.mimetype,
            size: file.size,
          });
        }
        filesCount = metadataFiles.length;
        sourcePath = tempDir;
      }

      if (!sourcePath) {
        throw new Error('归档缺少 sourcePath 或 fileIds');
      }

      const jobId = await this.archiveManager.createArchiveJob({
        name,
        description,
        sourcePath,
        targetPath,
        status: 'pending',
        size: 0,
        metadata: {
          options,
          criteria,
          createdBy,
          files: metadataFiles,
          cleanupSourcePath: fileIds?.length ? sourcePath : undefined,
        },
      });
      this.statistics.archiveOperations++;
      this.statistics.totalOperations++;
      this.statistics.lastOperation = new Date();

      return {
        success: true,
        operation: 'archive',
        duration: Date.now() - startTime,
        affected: filesCount,
        jobId,
      };
    } catch (error) {
      this.statistics.errors++;
      return {
        success: false,
        operation: 'archive',
        duration: Date.now() - startTime,
        affected: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 清理数据
   */
  async cleanup(
    criteria: Record<string, unknown>,
    _options: Record<string, unknown> = {}
  ): Promise<StorageOperationResult> {
    const startTime = Date.now();

    try {
      const olderThan = Number(criteria.olderThan || 0);
      const dryRun = Boolean(criteria.dryRun);
      if (!olderThan || Number.isNaN(olderThan)) {
        throw new Error('清理需要提供 olderThan(天)');
      }
      const rows = await query(
        `SELECT id, file_path
         FROM uploaded_files
         WHERE upload_date < NOW() - ($1::text || ' days')::interval`,
        [olderThan]
      );
      if (!dryRun) {
        for (const row of rows.rows) {
          const filePath = String(row.file_path || '');
          if (filePath) {
            await fs.unlink(filePath).catch(() => undefined);
          }
          await query('DELETE FROM uploaded_files WHERE id = $1', [row.id]);
        }
      }
      this.statistics.cleanupOperations++;
      this.statistics.totalOperations++;
      this.statistics.lastOperation = new Date();

      return {
        success: true,
        operation: 'cleanup',
        duration: Date.now() - startTime,
        affected: rows.rows.length,
      };
    } catch (error) {
      this.statistics.errors++;
      return {
        success: false,
        operation: 'cleanup',
        duration: Date.now() - startTime,
        affected: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(): StorageStatistics {
    return { ...this.statistics };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      totalOperations: 0,
      storageOperations: 0,
      archiveOperations: 0,
      cleanupOperations: 0,
      errors: 0,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    storage: boolean;
    archive: boolean;
    cleanup: boolean;
    overall: boolean;
  }> {
    try {
      await query('SELECT 1');
      const storage = true;
      const archive = await this.archiveManager.healthCheck();
      const cleanup = await this.cleanupManager.healthCheck();

      const overall = storage && archive && cleanup;

      return {
        storage,
        archive,
        cleanup,
        overall,
      };
    } catch {
      return {
        storage: false,
        archive: false,
        cleanup: false,
        overall: false,
      };
    }
  }
}

export default StorageService;
