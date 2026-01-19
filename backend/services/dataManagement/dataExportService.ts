/**
 * 数据导出服务
 * 专门处理数据导出功能
 * 支持PDF、CSV、JSON、Excel等多种格式
 * 包含任务队列和进度跟踪功能
 */

import archiver from 'archiver';
import { EventEmitter } from 'events';
import ExcelJS from 'exceljs';
import { createReadStream, createWriteStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as winston from 'winston';
import { query as dbQuery } from '../../config/database';
const PDFDocument = require('pdfkit');

// 导出配置接口
export interface ExportConfig {
  format: 'pdf' | 'csv' | 'json' | 'excel' | 'zip';
  compression?: boolean;
  encryption?: {
    enabled: boolean;
    password?: string;
    algorithm: 'aes-256-cbc';
  };
  filters?: Record<string, unknown>;
  columns?: string[];
  options?: Record<string, unknown>;
}

export interface ExportJobRequest {
  userId: string;
  dataType: ExportData['type'];
  format: ExportConfig['format'];
  filters?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface ExportJobStatus {
  id: string;
  userId: string;
  status: ExportTask['status'];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  filePath?: string;
}

// 导出任务接口
export interface ExportTask {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  config: ExportConfig;
  data: ExportData;
  result?: {
    filePath: string;
    fileName: string;
    size: number;
    downloadUrl?: string;
  };
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
}

// 导出数据接口
export interface ExportData {
  type: 'test_results' | 'analytics' | 'reports' | 'users' | 'logs';
  data: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  totalCount: number;
}

// 导出结果接口
export interface ExportResult {
  success: boolean;
  filePath: string;
  fileName: string;
  size: number;
  duration: number;
  recordCount: number;
  error?: string;
}

// 数据过滤器接口
export interface DataFilter {
  field: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains'
    | 'startsWith'
    | 'endsWith';
  value: unknown;
}

// 数据源接口
export interface DataSource {
  type: string;
  query: string;
  params?: Record<string, unknown>;
  filters?: DataFilter[];
}

// 导出模板接口
export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: string;
  template: string;
  fields: ExportField[];
  filters?: DataFilter[];
  options?: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

type PDFDocumentType = InstanceType<typeof PDFDocument>;

// 导出字段接口
export interface ExportField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  width?: number;
  required?: boolean;
}

// 导出统计接口
export interface ExportStatistics {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  totalSize: number;
  averageSize: number;
  formats: Record<string, number>;
  types: Record<string, number>;
}

class DataExportService extends EventEmitter {
  private logger: winston.Logger;
  private tasks: Map<string, ExportTask> = new Map();
  private queue: ExportTask[] = [];
  private isProcessing: boolean = false;
  private maxConcurrentTasks: number = 3;
  private activeTasks: Set<string> = new Set();
  private templates: Map<string, ExportTemplate> = new Map();
  private exportDir: string;
  private maxFileSize: number;
  private supportedFormats: ExportConfig['format'][];

  constructor(config: {
    exportDir: string;
    maxFileSize: number;
    supportedFormats: ExportConfig['format'][];
  }) {
    super();

    this.exportDir = config.exportDir;
    this.maxFileSize = config.maxFileSize;
    this.supportedFormats = config.supportedFormats;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({ filename: 'logs/data-export.log' }),
        new winston.transports.Console(),
      ],
    });

    this.initializeTemplates();
    this.startTaskProcessor();
  }

  /**
   * 创建导出任务
   */
  async createExportTask(
    type: string,
    data: ExportData,
    config: ExportConfig,
    createdBy: string
  ): Promise<string> {
    const taskId = this.generateTaskId();

    const task: ExportTask = {
      id: taskId,
      type,
      status: 'pending',
      progress: {
        current: 0,
        total: data.totalCount,
        percentage: 0,
      },
      config,
      data,
      createdAt: new Date(),
      createdBy,
    };

    this.tasks.set(taskId, task);
    this.queue.push(task);

    this.logger.info('Export task created', { taskId, type, createdBy });
    this.emit('task_created', task);

    await this.saveExportTask(task);

    return taskId;
  }

  async createExportJob(request: ExportJobRequest): Promise<ExportTask> {
    if (!this.supportedFormats.includes(request.format)) {
      throw new Error(`不支持的导出格式: ${request.format}`);
    }

    const data = await this.collectExportData(request);
    const taskId = await this.createExportTask(
      request.dataType,
      data,
      {
        format: request.format,
        filters: request.filters,
        options: request.options,
      },
      request.userId
    );

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('导出任务创建失败');
    }

    return task;
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<ExportTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async getExportStatus(taskId: string): Promise<ExportJobStatus> {
    const task = this.tasks.get(taskId);
    if (task) {
      return {
        id: task.id,
        userId: task.createdBy,
        status: task.status,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        error: task.error,
        filePath: task.result?.filePath,
      };
    }

    const result = await dbQuery(
      `SELECT id, user_id, status, created_at, started_at, completed_at, file_path, error_message
       FROM export_tasks
       WHERE id = $1`,
      [taskId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('导出任务不存在');
    }

    return {
      id: String(row.id),
      userId: String(row.user_id),
      status: row.status,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      error: row.error_message || undefined,
      filePath: row.file_path || undefined,
    };
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<ExportTask[]> {
    return Array.from(this.tasks.values());
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.status === 'pending') {
      task.status = 'cancelled';
      this.emit('task_cancelled', task);
      await this.updateExportTask(task);
      return true;
    }

    if (task.status === 'running') {
      task.status = 'cancelled';
      this.activeTasks.delete(taskId);
      this.emit('task_cancelled', task);
      await this.updateExportTask(task);
      return true;
    }

    return false;
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // 删除文件
    if (task.result?.filePath) {
      try {
        await fs.unlink(task.result.filePath);
      } catch (error) {
        this.logger.warn('Failed to delete export file', { taskId, error });
      }
    }

    this.tasks.delete(taskId);
    this.emit('task_deleted', { taskId });

    await dbQuery('DELETE FROM export_tasks WHERE id = $1', [taskId]);

    return true;
  }

  async cancelExportJob(taskId: string): Promise<void> {
    const cancelled = await this.cancelTask(taskId);
    if (!cancelled) {
      throw new Error('导出任务无法取消');
    }
  }

  async getExportFilePath(taskId: string): Promise<string | null> {
    const task = this.tasks.get(taskId);
    if (task?.result?.filePath) {
      return task.result.filePath;
    }

    const result = await dbQuery('SELECT file_path FROM export_tasks WHERE id = $1', [taskId]);
    return result.rows[0]?.file_path ?? null;
  }

  async getUserExportHistory(
    userId: string,
    pagination: { page: number; limit: number; status?: string }
  ): Promise<{ items: ExportJobStatus[]; total: number; page: number; limit: number }> {
    const offset = (pagination.page - 1) * pagination.limit;
    const params: Array<string | number> = [userId];
    const conditions = ['user_id = $1'];
    if (pagination.status) {
      params.push(pagination.status);
      conditions.push(`status = $${params.length}`);
    }
    params.push(pagination.limit, offset);

    const listResult = await dbQuery(
      `SELECT id, user_id, status, created_at, started_at, completed_at, file_path, error_message
       FROM export_tasks
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await dbQuery(
      `SELECT COUNT(*)::int AS total FROM export_tasks WHERE ${conditions.join(' AND ')}`,
      params.slice(0, params.length - 2)
    );

    return {
      items: (listResult.rows || []).map(row => ({
        id: String(row.id),
        userId: String(row.user_id),
        status: row.status,
        createdAt: row.created_at,
        startedAt: row.started_at || undefined,
        completedAt: row.completed_at || undefined,
        error: row.error_message || undefined,
        filePath: row.file_path || undefined,
      })),
      total: Number(countResult.rows[0]?.total) || 0,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  getSupportedFormats(): ExportConfig['format'][] {
    return this.supportedFormats;
  }

  async cleanupExpiredExports(
    userId: string,
    options: { olderThan: number }
  ): Promise<{ deleted: number }> {
    const cutoff = new Date(Date.now() - options.olderThan * 24 * 60 * 60 * 1000);
    const tasks = await dbQuery(
      `SELECT id, file_path FROM export_tasks
       WHERE user_id = $1 AND created_at < $2`,
      [userId, cutoff]
    );

    let deleted = 0;
    for (const row of tasks.rows || []) {
      if (row.file_path) {
        await fs.unlink(row.file_path).catch(() => undefined);
      }
      await dbQuery('DELETE FROM export_tasks WHERE id = $1', [row.id]);
      deleted += 1;
    }

    return { deleted };
  }

  /**
   * 创建导出模板
   */
  async createTemplate(template: Omit<ExportTemplate, 'id'>): Promise<string> {
    const id = this.generateTemplateId();
    const fullTemplate: ExportTemplate = {
      ...template,
      id,
    };

    this.templates.set(id, fullTemplate);
    this.logger.info('Export template created', { id, name: template.name });

    return id;
  }

  /**
   * 获取模板
   */
  async getTemplate(id: string): Promise<ExportTemplate | null> {
    return this.templates.get(id) || null;
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(): Promise<ExportTemplate[]> {
    return Array.from(this.templates.values());
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  /**
   * 获取导出统计
   */
  async getStatistics(): Promise<ExportStatistics> {
    const tasks = Array.from(this.tasks.values());

    const successfulExports = tasks.filter(t => t.status === 'completed').length;
    const failedExports = tasks.filter(t => t.status === 'failed').length;
    const totalSize = tasks.reduce((sum, t) => sum + (t.result?.size || 0), 0);

    const formats: Record<string, number> = {};
    const types: Record<string, number> = {};

    tasks.forEach(task => {
      if (task.status === 'completed') {
        formats[task.config.format] = (formats[task.config.format] || 0) + 1;
        types[task.type] = (types[task.type] || 0) + 1;
      }
    });

    return {
      totalExports: tasks.length,
      successfulExports,
      failedExports,
      totalSize,
      averageSize: successfulExports > 0 ? totalSize / successfulExports : 0,
      formats,
      types,
    };
  }

  /**
   * 清理过期任务
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const expireTime = 7 * 24 * 60 * 60 * 1000; // 7天

    for (const [taskId, task] of this.tasks.entries()) {
      if (now.getTime() - task.createdAt.getTime() > expireTime) {
        // 删除文件
        if (task.result?.filePath) {
          try {
            await fs.unlink(task.result.filePath);
          } catch (error) {
            this.logger.warn('Failed to delete expired export file', { taskId, error });
          }
        }

        this.tasks.delete(taskId);
      }
    }

    this.logger.info('Export cleanup completed');
  }

  /**
   * 启动任务处理器
   */
  private startTaskProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeTasks.size < this.maxConcurrentTasks) {
      const task = this.queue.shift();
      if (task && task.status === 'pending') {
        this.processTask(task);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: ExportTask): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();
    this.activeTasks.add(task.id);

    await this.updateExportTask(task);

    this.emit('task_started', task);
    this.logger.info('Processing export task', { taskId: task.id, type: task.type });

    try {
      const result = await this.performExport(task);

      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress.percentage = 100;

      await this.updateExportTask(task);

      this.emit('task_completed', task);
      this.logger.info('Export task completed', { taskId: task.id, fileName: result.fileName });
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();

      await this.updateExportTask(task);

      this.emit('task_failed', task);
      this.logger.error('Export task failed', { taskId: task.id, error: task.error });
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * 执行导出
   */
  private async performExport(task: ExportTask): Promise<ExportResult> {
    const startTime = Date.now();

    // 更新进度
    this.updateProgress(task.id, 0, task.data.totalCount);

    let result: ExportResult;

    switch (task.config.format) {
      case 'csv':
        result = await this.exportToCSV(task);
        break;
      case 'json':
        result = await this.exportToJSON(task);
        break;
      case 'excel':
        result = await this.exportToExcel(task);
        break;
      case 'pdf':
        result = await this.exportToPDF(task);
        break;
      case 'zip':
        result = await this.exportToZIP(task);
        break;
      default:
        throw new Error(`Unsupported export format: ${task.config.format}`);
    }

    // 压缩处理
    if (task.config.compression) {
      result = await this.compressFile(result);
    }

    // 加密处理
    if (task.config.encryption?.enabled) {
      result = await this.encryptFile(result, task.config.encryption);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 导出为CSV
   */
  private async exportToCSV(task: ExportTask): Promise<ExportResult> {
    const fileName = `${task.type}_${task.id}.csv`;
    const filePath = path.join(this.exportDir, fileName);

    await fs.mkdir(this.exportDir, { recursive: true });

    const csvData = this.convertToCSV(task.data.data, task.config.columns);
    await fs.writeFile(filePath, csvData, 'utf8');

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filePath,
      fileName,
      size: stats.size,
      duration: 0,
      recordCount: task.data.data.length,
    };
  }

  /**
   * 导出为JSON
   */
  private async exportToJSON(task: ExportTask): Promise<ExportResult> {
    const fileName = `${task.type}_${task.id}.json`;
    const filePath = path.join(this.exportDir, fileName);

    await fs.mkdir(this.exportDir, { recursive: true });

    const jsonData = JSON.stringify(
      {
        type: task.type,
        metadata: task.data.metadata,
        totalCount: task.data.totalCount,
        exportedAt: new Date().toISOString(),
        data: task.data.data,
      },
      null,
      2
    );

    await fs.writeFile(filePath, jsonData, 'utf8');

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filePath,
      fileName,
      size: stats.size,
      duration: 0,
      recordCount: task.data.data.length,
    };
  }

  /**
   * 导出为Excel
   */
  private async exportToExcel(task: ExportTask): Promise<ExportResult> {
    const fileName = `${task.type}_${task.id}.xlsx`;
    const filePath = path.join(this.exportDir, fileName);

    await fs.mkdir(this.exportDir, { recursive: true });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(task.type);

    // 添加表头
    if (task.config.columns && task.data.data.length > 0) {
      const headers = task.config.columns;
      worksheet.addRow(headers);
    }

    // 添加数据
    for (let i = 0; i < task.data.data.length; i++) {
      const item = task.data.data[i];
      const row: unknown[] = [];

      if (task.config.columns) {
        task.config.columns.forEach(column => {
          if (isRecord(item)) {
            row.push(item[column] ?? '');
          } else {
            row.push('');
          }
        });
      } else {
        if (isRecord(item)) {
          Object.values(item).forEach(value => row.push(value));
        } else {
          row.push(String(item));
        }
      }

      worksheet.addRow(row);

      // 更新进度
      if (i % 100 === 0) {
        this.updateProgress(task.id, i + 1, task.data.totalCount);
      }
    }

    await workbook.xlsx.writeFile(filePath);

    const stats = await fs.stat(filePath);

    return {
      success: true,
      filePath,
      fileName,
      size: stats.size,
      duration: 0,
      recordCount: task.data.data.length,
    };
  }

  /**
   * 导出为PDF
   */
  private async exportToPDF(task: ExportTask): Promise<ExportResult> {
    const fileName = `${task.type}_${task.id}.pdf`;
    const filePath = path.join(this.exportDir, fileName);

    await fs.mkdir(this.exportDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();

      // 添加标题
      doc.fontSize(20).text(`${task.type} Report`, { align: 'center' });
      doc.moveDown();

      // 添加元数据
      doc.fontSize(12).text(`Total Records: ${task.data.totalCount}`, { align: 'left' });
      doc.text(`Exported At: ${new Date().toLocaleString()}`, { align: 'left' });
      doc.moveDown();

      // 添加数据表格
      if (task.config.columns && task.data.data.length > 0) {
        this.addPDFTable(doc, task.data.data, task.config.columns);
      }

      // 保存文件
      doc.pipe(createWriteStream(filePath));

      doc.on('end', async () => {
        try {
          const stats = await fs.stat(filePath);
          resolve({
            success: true,
            filePath,
            fileName,
            size: stats.size,
            duration: 0,
            recordCount: task.data.data.length,
          });
        } catch (error) {
          reject(error);
        }
      });

      doc.end();
    });
  }

  /**
   * 导出为ZIP
   */
  private async exportToZIP(task: ExportTask): Promise<ExportResult> {
    const fileName = `${task.type}_${task.id}.zip`;
    const filePath = path.join(this.exportDir, fileName);

    await fs.mkdir(this.exportDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const output = createWriteStream(filePath);

      archive.on('error', reject);
      output.on('close', async () => {
        try {
          const stats = await fs.stat(filePath);
          resolve({
            success: true,
            filePath,
            fileName,
            size: stats.size,
            duration: 0,
            recordCount: task.data.data.length,
          });
        } catch (error) {
          reject(error);
        }
      });

      // 添加JSON数据
      archive.append(JSON.stringify(task.data, null, 2), { name: `${task.type}.json` });

      archive.finalize();
    });
  }

  /**
   * 压缩文件
   */
  private async compressFile(result: ExportResult): Promise<ExportResult> {
    const compressedPath = result.filePath.replace(/(\.[^.]+)$/, '.zip');

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const output = createWriteStream(compressedPath);

      archive.on('error', reject);
      output.on('close', async () => {
        try {
          // 删除原文件
          await fs.unlink(result.filePath);

          const stats = await fs.stat(compressedPath);
          resolve({
            ...result,
            filePath: compressedPath,
            fileName: result.fileName.replace(/(\.[^.]+)$/, '.zip'),
            size: stats.size,
          });
        } catch (error) {
          reject(error);
        }
      });

      archive.file(result.fileName, createReadStream(result.filePath));
      archive.finalize();
    });
  }

  /**
   * 加密文件
   */
  private async encryptFile(
    result: ExportResult,
    encryption?: ExportConfig['encryption']
  ): Promise<ExportResult> {
    if (!encryption) {
      return result;
    }

    const crypto = require('crypto');
    const algorithm = encryption.algorithm;
    const password = encryption.password || 'default-password';

    // 创建加密器
    const cipher = crypto.createCipher(algorithm, password);
    cipher.setAutoPadding(true);

    const encryptedPath = result.filePath + '.enc';
    const input = createReadStream(result.filePath);
    const output = createWriteStream(encryptedPath);

    return new Promise((resolve, reject) => {
      output.on('finish', async () => {
        try {
          // 删除原文件
          await fs.unlink(result.filePath);

          const stats = await fs.stat(encryptedPath);
          resolve({
            ...result,
            filePath: encryptedPath,
            fileName: result.fileName + '.enc',
            size: stats.size,
          });
        } catch (error) {
          reject(error);
        }
      });

      input.pipe(cipher).pipe(output);
    });
  }

  /**
   * 转换为CSV格式
   */
  private convertToCSV(data: Array<Record<string, unknown>>, columns?: string[]): string {
    if (data.length === 0) return '';

    const firstRow = data[0];
    const headers = columns || (isRecord(firstRow) ? Object.keys(firstRow) : []);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const row = headers.map(header => {
        const value = isRecord(item) ? item[header] : undefined;
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * 添加PDF表格
   */
  private addPDFTable(
    doc: PDFDocumentType,
    data: Array<Record<string, unknown>>,
    columns: string[]
  ): void {
    // 简化的表格实现
    const tableTop = doc.y;
    const cellWidth = 100;
    const cellHeight = 20;
    const fontSize = 10;

    // 表头
    doc.fontSize(fontSize);
    columns.forEach((column, index) => {
      doc.text(column, 50 + index * cellWidth, tableTop);
    });
    doc.moveTo(50, tableTop + cellHeight);

    // 数据行
    data.slice(0, 10).forEach((row, rowIndex) => {
      columns.forEach((column, colIndex) => {
        const value = row && typeof row === 'object' ? row[column] : '';
        doc.text(String(value), 50 + colIndex * cellWidth, tableTop + (rowIndex + 1) * cellHeight);
      });
    });
  }

  /**
   * 更新进度
   */
  private updateProgress(taskId: string, current: number, total: number): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.progress.current = current;
      task.progress.total = total;
      task.progress.percentage = Math.round((current / total) * 100);

      this.emit('progress_updated', task);
    }
  }

  /**
   * 初始化模板
   */
  private initializeTemplates(): void {
    // 默认模板
    const defaultTemplates: ExportTemplate[] = [
      {
        id: 'test-results-default',
        name: '测试结果默认模板',
        description: '测试结果的标准导出模板',
        format: 'excel',
        template: 'default',
        fields: [
          { name: 'id', label: 'ID', type: 'string', required: true },
          { name: 'name', label: '名称', type: 'string', required: true },
          { name: 'status', label: '状态', type: 'string', required: true },
          { name: 'score', label: '分数', type: 'number', required: false },
          { name: 'createdAt', label: '创建时间', type: 'date', required: true },
        ],
      },
      {
        id: 'analytics-default',
        name: '分析数据默认模板',
        description: '分析数据的标准导出模板',
        format: 'csv',
        template: 'default',
        fields: [
          { name: 'date', label: '日期', type: 'date', required: true },
          { name: 'metric', label: '指标', type: 'string', required: true },
          { name: 'value', label: '值', type: 'number', required: true },
          { name: 'category', label: '分类', type: 'string', required: false },
        ],
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成模板ID
   */
  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async collectExportData(request: ExportJobRequest): Promise<ExportData> {
    const filters = this.normalizeFilters(request.filters);
    const { clause, params } = this.buildFilterClause(filters);
    const baseParams = [...params];
    const userClause = this.appendUserFilter(request.dataType, request.userId, clause, baseParams);

    switch (request.dataType) {
      case 'test_results': {
        const result = await dbQuery(
          `SELECT
             te.test_id,
             te.engine_type,
             te.status,
             te.created_at,
             te.completed_at,
             te.execution_time,
             tr.score,
             tr.grade,
             tr.passed,
             tr.summary
           FROM test_executions te
           LEFT JOIN test_results tr ON tr.execution_id = te.id
           ${userClause}`,
          baseParams
        );
        return {
          type: 'test_results',
          data: result.rows || [],
          metadata: { source: 'test_executions', filters },
          totalCount: result.rows?.length || 0,
        };
      }
      case 'reports': {
        const result = await dbQuery(
          `SELECT
             tr.id,
             tr.report_type,
             tr.format,
             tr.file_path,
             tr.file_size,
             tr.generated_at,
             te.test_id
           FROM test_reports tr
           LEFT JOIN test_executions te ON te.id = tr.execution_id
           ${userClause}`,
          baseParams
        );
        return {
          type: 'reports',
          data: result.rows || [],
          metadata: { source: 'test_reports', filters },
          totalCount: result.rows?.length || 0,
        };
      }
      case 'logs': {
        const result = await dbQuery(
          `SELECT
             tl.id,
             tl.level,
             tl.message,
             tl.context,
             tl.created_at,
             te.test_id
           FROM test_logs tl
           LEFT JOIN test_executions te ON te.id = tl.execution_id
           ${userClause}`,
          baseParams
        );
        return {
          type: 'logs',
          data: result.rows || [],
          metadata: { source: 'test_logs', filters },
          totalCount: result.rows?.length || 0,
        };
      }
      case 'users': {
        const result = await dbQuery(
          `SELECT id, username, email, created_at, last_login
           FROM users
           WHERE id = $1`,
          [request.userId]
        );
        return {
          type: 'users',
          data: result.rows || [],
          metadata: { source: 'users', filters },
          totalCount: result.rows?.length || 0,
        };
      }
      case 'analytics':
      default: {
        const result = await dbQuery(
          `SELECT
             tm.metric_name,
             tm.metric_value,
             tm.metric_type,
             tm.passed,
             tm.severity,
             tm.recommendation,
             tm.created_at,
             te.test_id
           FROM test_metrics tm
           JOIN test_results tr ON tr.id = tm.result_id
           JOIN test_executions te ON te.id = tr.execution_id
           ${userClause}`,
          baseParams
        );
        return {
          type: 'analytics',
          data: result.rows || [],
          metadata: { source: 'test_metrics', filters },
          totalCount: result.rows?.length || 0,
        };
      }
    }
  }

  private normalizeFilters(filters?: Record<string, unknown>): DataFilter[] {
    if (!filters) return [];
    return Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([field, value]) => ({ field, operator: 'eq', value }));
  }

  private buildFilterClause(filters: DataFilter[]): { clause: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const operatorMap: Record<DataFilter['operator'], string> = {
      eq: '=',
      ne: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      in: 'IN',
      nin: 'NOT IN',
      contains: 'ILIKE',
      startsWith: 'ILIKE',
      endsWith: 'ILIKE',
    };

    filters.forEach(filter => {
      const paramIndex = params.length + 1;
      const operator = operatorMap[filter.operator];
      if (!operator) return;

      if (filter.operator === 'in' || filter.operator === 'nin') {
        if (Array.isArray(filter.value) && filter.value.length > 0) {
          clauses.push(
            `${filter.field} ${operator} (${filter.value
              .map((_, idx) => `$${paramIndex + idx}`)
              .join(', ')})`
          );
          params.push(...filter.value);
        }
        return;
      }

      if (filter.operator === 'contains') {
        clauses.push(`${filter.field} ${operator} $${paramIndex}`);
        params.push(`%${filter.value}%`);
        return;
      }

      if (filter.operator === 'startsWith') {
        clauses.push(`${filter.field} ${operator} $${paramIndex}`);
        params.push(`${filter.value}%`);
        return;
      }

      if (filter.operator === 'endsWith') {
        clauses.push(`${filter.field} ${operator} $${paramIndex}`);
        params.push(`%${filter.value}`);
        return;
      }

      clauses.push(`${filter.field} ${operator} $${paramIndex}`);
      params.push(filter.value);
    });

    return { clause: clauses.join(' AND '), params };
  }

  private appendUserFilter(
    dataType: ExportData['type'],
    userId: string,
    clause: string,
    params: unknown[]
  ): string {
    if (dataType === 'users') {
      return clause ? `WHERE ${clause}` : '';
    }

    const userParamIndex = params.length + 1;
    params.push(userId);
    const userClause =
      dataType === 'reports' || dataType === 'logs' || dataType === 'analytics'
        ? `te.user_id = $${userParamIndex}`
        : `te.user_id = $${userParamIndex}`;

    if (clause) {
      return `WHERE ${clause} AND ${userClause}`;
    }
    return `WHERE ${userClause}`;
  }

  private async saveExportTask(task: ExportTask): Promise<void> {
    await dbQuery(
      `INSERT INTO export_tasks
         (id, user_id, type, filters, format, options, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        task.id,
        task.createdBy,
        task.type,
        JSON.stringify(task.config.filters || {}),
        task.config.format,
        JSON.stringify(task.config.options || {}),
        task.status,
        task.createdAt,
      ]
    );
  }

  private async updateExportTask(task: ExportTask): Promise<void> {
    await dbQuery(
      `UPDATE export_tasks
       SET status = $1,
           started_at = $2,
           completed_at = $3,
           file_path = $4,
           error_message = $5
       WHERE id = $6`,
      [
        task.status,
        task.startedAt || null,
        task.completedAt || null,
        task.result?.filePath || null,
        task.error || null,
        task.id,
      ]
    );
  }
}

export default DataExportService;
