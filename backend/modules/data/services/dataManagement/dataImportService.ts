/**
 * 数据导入服务
 * 支持批量数据导入、格式验证和转换
 * 包含进度跟踪和错误处理功能
 */

import csvParser from 'csv-parser';
import { EventEmitter } from 'events';
import ExcelJS from 'exceljs';
import { XMLParser } from 'fast-xml-parser';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as winston from 'winston';

// 导入配置接口
export interface ImportConfig {
  format: 'csv' | 'json' | 'excel' | 'xml';
  encoding?: string;
  delimiter?: string;
  skipRows?: number;
  maxRows?: number;
  validation?: ValidationConfig;
  mapping?: FieldMapping[];
  options?: Record<string, unknown>;
}

// 验证配置接口
export interface ValidationConfig {
  required: string[];
  types: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
  formats?: Record<string, RegExp>;
  ranges?: Record<string, { min?: number; max?: number }>;
  custom?: Record<string, (value: unknown) => boolean>;
}

// 字段映射接口
export interface FieldMapping {
  source: string;
  target: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  transform?: (value: unknown) => unknown;
  defaultValue?: unknown;
  required?: boolean;
}

// 导入任务接口
export interface ImportTask {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  config: ImportConfig;
  filePath: string;
  result?: {
    imported: number;
    failed: number;
    skipped: number;
    errors: ImportError[];
    data: Record<string, unknown>[];
  };
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
}

// 导入错误接口
export interface ImportError {
  row: number;
  field: string;
  value: unknown;
  error: string;
  severity: 'error' | 'warning';
}

// 导入结果接口
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  errors: ImportError[];
  data: Record<string, unknown>[];
}

export interface ImportJobStatus {
  id: string;
  userId: string;
  status: ImportTask['status'];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress?: ImportTask['progress'];
  result?: ImportTask['result'];
}

// 数据预览接口
export interface DataPreview {
  headers: string[];
  rows: Array<Array<unknown>>;
  totalRows: number;
  sampleSize: number;
  detectedTypes: Record<string, string>;
}

// 导入模板接口
export interface ImportTemplate {
  id: string;
  name: string;
  description: string;
  format: string;
  mapping: FieldMapping[];
  validation: ValidationConfig;
  options?: Record<string, unknown>;
}

// 导入统计接口
export interface ImportStatistics {
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  totalRecords: number;
  averageRecords: number;
  formats: Record<string, number>;
  types: Record<string, number>;
}

class DataImportService extends EventEmitter {
  private dbPool: { query: (sql: string, params?: unknown[]) => Promise<unknown> };
  private logger: winston.Logger;
  private tasks: Map<string, ImportTask> = new Map();
  private queue: ImportTask[] = [];
  private isProcessing: boolean = false;
  private maxConcurrentTasks: number = 3;
  private activeTasks: Set<string> = new Set();
  private templates: Map<string, ImportTemplate> = new Map();

  constructor(dbPool: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) {
    super();

    this.dbPool = dbPool;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({ filename: 'logs/data-import.log' }),
        new winston.transports.Console(),
      ],
    });

    this.initializeTemplates();
    this.startTaskProcessor();
  }

  /**
   * 创建导入任务
   */
  async createImportTask(
    type: string,
    filePath: string,
    config: ImportConfig,
    createdBy: string
  ): Promise<string> {
    const taskId = this.generateTaskId();

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      throw new Error('File not found or not accessible');
    }

    // 获取文件总行数
    const totalRows = await this.getFileRowCount(filePath, config);

    const task: ImportTask = {
      id: taskId,
      type,
      status: 'pending',
      progress: {
        current: 0,
        total: totalRows,
        percentage: 0,
      },
      config,
      filePath,
      createdAt: new Date(),
      createdBy,
    };

    this.tasks.set(taskId, task);
    this.queue.push(task);

    this.logger.info('Import task created', { taskId, type, filePath, createdBy });
    this.emit('task_created', task);

    await this.saveImportTask(task);

    return taskId;
  }

  /**
   * 预览数据
   */
  async previewData(
    filePath: string,
    config: ImportConfig,
    sampleSize: number = 10
  ): Promise<DataPreview> {
    const data = await this.readFile(filePath, config, sampleSize);
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const rows = data.map(row => headers.map(header => row[header]));

    // 检测数据类型
    const detectedTypes: Record<string, string> = {};
    headers.forEach(header => {
      const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
      detectedTypes[header] = this.detectDataType(values);
    });

    return {
      headers,
      rows,
      totalRows: await this.getFileRowCount(filePath, config),
      sampleSize: data.length,
      detectedTypes,
    };
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<ImportTask | null> {
    const memoryTask = this.tasks.get(taskId);
    if (memoryTask) {
      return memoryTask;
    }
    const stored = await this.getImportTaskById(taskId);
    return stored;
  }

  async getImportStatus(taskId: string): Promise<ImportJobStatus> {
    const task = await this.getTaskStatus(taskId);
    if (task) {
      return this.toJobStatus(task);
    }

    const result = await this.dbPool.query(
      `SELECT id, user_id, status, created_at, started_at, completed_at, error_message, progress, result
       FROM import_tasks
       WHERE id = $1`,
      [taskId]
    );
    const rows = (result as { rows?: Array<Record<string, unknown>> }).rows || [];
    const row = rows[0];
    if (!row) {
      throw new Error('导入任务不存在');
    }
    return {
      id: String(row.id),
      userId: String(row.user_id),
      status: row.status as ImportTask['status'],
      createdAt: new Date(String(row.created_at)),
      startedAt: row.started_at ? new Date(String(row.started_at)) : undefined,
      completedAt: row.completed_at ? new Date(String(row.completed_at)) : undefined,
      error: (row.error_message as string) || undefined,
      progress: (row.progress as ImportTask['progress']) || undefined,
      result: (row.result as ImportTask['result']) || undefined,
    };
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<ImportTask[]> {
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
      await this.updateImportTask(task);
      return true;
    }

    if (task.status === 'running') {
      task.status = 'cancelled';
      this.activeTasks.delete(taskId);
      this.emit('task_cancelled', task);
      await this.updateImportTask(task);
      return true;
    }

    return false;
  }

  /**
   * 重试失败任务
   */
  async retryTask(taskId: string): Promise<ImportTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('导入任务不存在');
    }

    if (task.status !== 'failed') {
      throw new Error('只能重试失败的导入任务');
    }

    await fs.access(task.filePath);

    const totalRows = await this.getFileRowCount(task.filePath, task.config);
    task.status = 'pending';
    task.error = undefined;
    task.result = undefined;
    task.startedAt = undefined;
    task.completedAt = undefined;
    task.progress = {
      current: 0,
      total: totalRows,
      percentage: 0,
    };

    this.queue.push(task);
    this.emit('task_retried', task);
    this.logger.info('Import task retried', { taskId });

    await this.updateImportTask(task);

    return task;
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    this.tasks.delete(taskId);
    this.emit('task_deleted', { taskId });

    await this.dbPool.query('DELETE FROM import_tasks WHERE id = $1', [taskId]);

    return true;
  }

  async getUserImportHistory(
    userId: string,
    pagination: { page: number; limit: number; status?: string }
  ): Promise<{ items: ImportJobStatus[]; total: number; page: number; limit: number }> {
    const offset = (pagination.page - 1) * pagination.limit;
    const params: Array<string | number> = [userId];
    const conditions = ['user_id = $1'];
    if (pagination.status) {
      params.push(pagination.status);
      conditions.push(`status = $${params.length}`);
    }
    params.push(pagination.limit, offset);

    const listResult = await this.dbPool.query(
      `SELECT id, user_id, status, created_at, started_at, completed_at, error_message, progress, result
       FROM import_tasks
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const rows = (listResult as { rows?: Array<Record<string, unknown>> }).rows || [];
    const countResult = await this.dbPool.query(
      `SELECT COUNT(1)::int AS total
       FROM import_tasks
       WHERE ${conditions.join(' AND ')}`,
      params.slice(0, params.length - 2)
    );
    const total = Number(
      (countResult as { rows?: Array<{ total: number }> }).rows?.[0]?.total || 0
    );

    return {
      items: rows.map(row => ({
        id: String(row.id),
        userId: String(row.user_id),
        status: row.status as ImportTask['status'],
        createdAt: new Date(String(row.created_at)),
        startedAt: row.started_at ? new Date(String(row.started_at)) : undefined,
        completedAt: row.completed_at ? new Date(String(row.completed_at)) : undefined,
        error: (row.error_message as string) || undefined,
        progress: (row.progress as ImportTask['progress']) || undefined,
        result: (row.result as ImportTask['result']) || undefined,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  /**
   * 创建导入模板
   */
  async createTemplate(template: Omit<ImportTemplate, 'id'>): Promise<string> {
    const id = this.generateTemplateId();
    const fullTemplate: ImportTemplate = {
      ...template,
      id,
    };

    this.templates.set(id, fullTemplate);
    this.logger.info('Import template created', { id, name: template.name });

    return id;
  }

  /**
   * 获取模板
   */
  async getTemplate(id: string): Promise<ImportTemplate | null> {
    return this.templates.get(id) || null;
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(): Promise<ImportTemplate[]> {
    return Array.from(this.templates.values());
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string): Promise<boolean> {
    return this.templates.delete(id);
  }

  /**
   * 获取导入统计
   */
  async getStatistics(): Promise<ImportStatistics> {
    const tasks = Array.from(this.tasks.values());

    const successfulImports = tasks.filter(t => t.status === 'completed').length;
    const failedImports = tasks.filter(t => t.status === 'failed').length;
    const totalRecords = tasks.reduce((sum, t) => sum + (t.result?.imported || 0), 0);

    const formats: Record<string, number> = {};
    const types: Record<string, number> = {};

    tasks.forEach(task => {
      if (task.status === 'completed') {
        formats[task.config.format] = (formats[task.config.format] || 0) + 1;
        types[task.type] = (types[task.type] || 0) + 1;
      }
    });

    return {
      totalImports: tasks.length,
      successfulImports,
      failedImports,
      totalRecords,
      averageRecords: successfulImports > 0 ? totalRecords / successfulImports : 0,
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
        this.tasks.delete(taskId);
      }
    }

    this.logger.info('Import cleanup completed');
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
  private async processTask(task: ImportTask): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();
    this.activeTasks.add(task.id);

    this.emit('task_started', task);
    this.logger.info('Processing import task', { taskId: task.id, type: task.type });

    await this.updateImportTask(task);

    try {
      const result = await this.performImport(task);

      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress.percentage = 100;

      this.emit('task_completed', task);
      this.logger.info('Import task completed', { taskId: task.id, imported: result.imported });
      await this.updateImportTask(task);
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();

      this.emit('task_failed', task);
      this.logger.error('Import task failed', { taskId: task.id, error: task.error });
      await this.updateImportTask(task);
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * 执行导入
   */
  private async performImport(task: ImportTask): Promise<ImportResult> {
    const startTime = Date.now();

    // 读取文件数据
    this.updateProgress(task.id, 0, 4);
    const data = await this.readFile(task.filePath, task.config);

    // 验证数据
    this.updateProgress(task.id, 1, 4);
    const { validatedData, errors } = await this.validateData(data, task.config.validation);

    // 转换数据
    this.updateProgress(task.id, 2, 4);
    const transformedData = await this.transformData(validatedData, task.config.mapping);

    // 导入数据
    this.updateProgress(task.id, 3, 4);
    const imported = await this.importData(transformedData, task.type, task.config.options);

    const result: ImportResult = {
      success: true,
      imported,
      failed: errors.filter(e => e.severity === 'error').length,
      skipped: errors.filter(e => e.severity === 'warning').length,
      total: data.length,
      duration: Date.now() - startTime,
      errors,
      data: transformedData,
    };

    return result;
  }

  /**
   * 读取文件
   */
  private async readFile(
    filePath: string,
    config: ImportConfig,
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    switch (config.format) {
      case 'csv':
        return this.readCSVFile(filePath, config, limit);
      case 'json':
        return this.readJSONFile(filePath, config, limit);
      case 'excel':
        return this.readExcelFile(filePath, config, limit);
      case 'xml':
        return this.readXMLFile(filePath, config, limit);
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  }

  /**
   * 读取CSV文件
   */
  private async readCSVFile(
    filePath: string,
    config: ImportConfig,
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const results: Record<string, unknown>[] = [];
      const encoding: NodeJS.BufferEncoding = (config.encoding ?? 'utf8') as NodeJS.BufferEncoding;
      const stream = createReadStream(filePath, { encoding });
      const parser = csvParser as unknown as (options?: unknown) => NodeJS.ReadWriteStream;

      stream
        .pipe(
          parser({
            separator: config.delimiter || ',',
            skipLines: config.skipRows || 0,
          })
        )
        .on('data', (data: Record<string, unknown>) => {
          if (limit && results.length >= limit) {
            stream.destroy();
            return;
          }
          results.push(data);
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * 读取JSON文件
   */
  private async readJSONFile(
    filePath: string,
    config: ImportConfig,
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    const encoding: NodeJS.BufferEncoding = (config.encoding ?? 'utf8') as NodeJS.BufferEncoding;
    const content = await fs.readFile(filePath, { encoding });
    const data = JSON.parse(content.toString()) as unknown;

    if (Array.isArray(data)) {
      return limit
        ? (data.slice(0, limit) as Record<string, unknown>[])
        : (data as Record<string, unknown>[]);
    } else if (
      typeof data === 'object' &&
      data !== null &&
      'data' in data &&
      Array.isArray((data as Record<string, unknown>).data)
    ) {
      const payload = (data as Record<string, unknown>).data as Record<string, unknown>[];
      return limit ? payload.slice(0, limit) : payload;
    } else {
      throw new Error('Invalid JSON format, expected array');
    }
  }

  /**
   * 读取Excel文件
   */
  private async readExcelFile(
    filePath: string,
    config: ImportConfig,
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const data: Record<string, unknown>[] = [];
    const headers: string[] = [];

    // 读取表头
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    // 读取数据行
    const startRow = (config.skipRows || 0) + 2; // +2 to skip header and skipRows
    for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber++) {
      if (limit && data.length >= limit) break;

      const row = worksheet.getRow(rowNumber);
      const rowData: Record<string, unknown> = {};

      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });

      data.push(rowData);
    }

    return data;
  }

  /**
   * 读取XML文件
   */
  private async readXMLFile(
    filePath: string,
    config: ImportConfig,
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    const encoding: NodeJS.BufferEncoding = (config.encoding ?? 'utf8') as NodeJS.BufferEncoding;
    const content = await fs.readFile(filePath, { encoding });
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
      trimValues: true,
    });

    const parsed = parser.parse(content.toString());
    const recordPath = (config.options?.recordPath as string | undefined) || undefined;
    let payload: unknown = parsed;

    if (recordPath) {
      const segments = recordPath
        .split('.')
        .map(segment => segment.trim())
        .filter(Boolean);
      for (const segment of segments) {
        if (
          payload &&
          typeof payload === 'object' &&
          segment in (payload as Record<string, unknown>)
        ) {
          payload = (payload as Record<string, unknown>)[segment];
        } else {
          payload = [];
          break;
        }
      }
    }

    let records = this.extractXmlRecords(payload);

    if (config.skipRows && config.skipRows > 0) {
      records = records.slice(config.skipRows);
    }

    if (limit && records.length > limit) {
      records = records.slice(0, limit);
    }

    return records;
  }

  private extractXmlRecords(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
      return payload.filter(item => this.isRecord(item)) as Record<string, unknown>[];
    }

    if (!this.isRecord(payload)) {
      return [];
    }

    const candidates: unknown[] = [];
    const knownKeys = ['data', 'items', 'records', 'rows', 'row', 'item'];

    for (const key of knownKeys) {
      if (key in payload) {
        candidates.push(payload[key]);
      }
    }

    for (const value of candidates) {
      if (Array.isArray(value)) {
        return value.filter(item => this.isRecord(item)) as Record<string, unknown>[];
      }
    }

    const directArray = Object.values(payload).find(value => Array.isArray(value));
    if (Array.isArray(directArray)) {
      return directArray.filter(item => this.isRecord(item)) as Record<string, unknown>[];
    }

    if (Object.keys(payload).length === 1) {
      const single = Object.values(payload)[0];
      return this.extractXmlRecords(single);
    }

    return [payload];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * 验证数据
   */
  private async validateData(
    data: Record<string, unknown>[],
    validation?: ValidationConfig
  ): Promise<{
    validatedData: Record<string, unknown>[];
    errors: ImportError[];
  }> {
    if (!validation) {
      return { validatedData: data, errors: [] };
    }

    const validatedData: Record<string, unknown>[] = [];
    const errors: ImportError[] = [];

    data.forEach((row, rowIndex) => {
      const rowErrors: ImportError[] = [];
      const validatedRow: Record<string, unknown> = {};

      // 检查必填字段
      validation.required.forEach(field => {
        if (row[field] === null || row[field] === undefined || row[field] === '') {
          rowErrors.push({
            row: rowIndex + 1,
            field,
            value: row[field],
            error: 'Required field is missing',
            severity: 'error',
          });
        }
      });

      // 检查数据类型
      Object.entries(validation.types).forEach(([field, expectedType]) => {
        const value = row[field];
        if (value !== null && value !== undefined) {
          const actualType = this.detectDataType([value]);
          if (actualType !== expectedType) {
            rowErrors.push({
              row: rowIndex + 1,
              field,
              value,
              error: `Expected ${expectedType}, got ${actualType}`,
              severity: 'warning',
            });
          }
        }
      });

      // 检查格式
      Object.entries(validation.formats || {}).forEach(([field, pattern]) => {
        const value = row[field];
        if (value && !pattern.test(String(value))) {
          rowErrors.push({
            row: rowIndex + 1,
            field,
            value,
            error: 'Invalid format',
            severity: 'warning',
          });
        }
      });

      // 检查范围
      Object.entries(validation.ranges || {}).forEach(([field, range]) => {
        const value = row[field];
        if (typeof value === 'number') {
          if (range.min !== undefined && value < range.min) {
            rowErrors.push({
              row: rowIndex + 1,
              field,
              value,
              error: `Value below minimum ${range.min}`,
              severity: 'warning',
            });
          }
          if (range.max !== undefined && value > range.max) {
            rowErrors.push({
              row: rowIndex + 1,
              field,
              value,
              error: `Value above maximum ${range.max}`,
              severity: 'warning',
            });
          }
        }
      });

      // 自定义验证
      Object.entries(validation.custom || {}).forEach(([field, validator]) => {
        const value = row[field];
        if (!validator(value)) {
          rowErrors.push({
            row: rowIndex + 1,
            field,
            value,
            error: 'Custom validation failed',
            severity: 'error',
          });
        }
      });

      // 如果没有错误，添加到验证后的数据
      if (rowErrors.filter(e => e.severity === 'error').length === 0) {
        Object.assign(validatedRow, row);
        validatedData.push(validatedRow);
      }

      errors.push(...rowErrors);
    });

    return { validatedData, errors };
  }

  /**
   * 转换数据
   */
  private async transformData(
    data: Record<string, unknown>[],
    mapping?: FieldMapping[]
  ): Promise<Record<string, unknown>[]> {
    if (!mapping || mapping.length === 0) {
      return data;
    }

    return data.map(row => {
      const transformedRow: Record<string, unknown> = {};

      mapping.forEach(fieldMap => {
        const sourceValue = row[fieldMap.source];
        let transformedValue = sourceValue;

        // 应用转换函数
        if (fieldMap.transform) {
          transformedValue = fieldMap.transform(sourceValue);
        }

        // 类型转换
        switch (fieldMap.type) {
          case 'number':
            transformedValue = Number(transformedValue);
            break;
          case 'boolean':
            transformedValue = Boolean(transformedValue);
            break;
          case 'date':
            transformedValue = new Date(String(transformedValue));
            break;
          default:
            transformedValue = String(transformedValue);
        }

        // 使用默认值
        if (
          transformedValue === null ||
          transformedValue === undefined ||
          transformedValue === ''
        ) {
          transformedValue = fieldMap.defaultValue;
        }

        transformedRow[fieldMap.target] = transformedValue;
      });

      return transformedRow;
    });
  }

  /**
   * 导入数据
   */
  private async importData(
    data: Record<string, unknown>[],
    _type: string,
    options?: Record<string, unknown>
  ): Promise<number> {
    const now = new Date().toISOString();
    const userId = this.isRecord(options) ? options.userId : undefined;
    const workspaceId = this.isRecord(options) ? options.workspaceId : undefined;
    const normalizedType = String(_type || '').toLowerCase();
    let imported = 0;

    for (const record of data) {
      let handled = false;

      switch (normalizedType) {
        case 'users':
          handled = await this.insertUserRecord(record);
          break;
        case 'test_results':
          handled = await this.insertTestResultRecord(record, userId, workspaceId);
          break;
        case 'logs':
          handled = await this.insertTestLogRecord(record, userId, workspaceId);
          break;
        case 'reports':
          handled = await this.insertTestReportRecord(record, userId, workspaceId);
          break;
        case 'analytics':
          handled = await this.insertTestMetricRecord(record);
          break;
        default:
          handled = false;
          break;
      }

      if (!handled) {
        await this.insertDataRecord(record, _type, userId, workspaceId, now);
      }

      imported += 1;
    }

    return imported;
  }

  /**
   * 获取文件行数
   */
  private async getFileRowCount(filePath: string, config: ImportConfig): Promise<number> {
    try {
      const preview = await this.previewData(filePath, config, 100);
      return preview.totalRows;
    } catch {
      return 0;
    }
  }

  /**
   * 检测数据类型
   */
  private detectDataType(values: unknown[]): string {
    if (values.length === 0) return 'string';

    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNullValues.length === 0) return 'string';

    // 检查是否为数字
    const numericValues = nonNullValues.filter(v => !isNaN(Number(v)));
    if (numericValues.length === nonNullValues.length) {
      return 'number';
    }

    // 检查是否为日期
    const dateValues = nonNullValues.filter(v => !isNaN(Date.parse(String(v))));
    if (dateValues.length === nonNullValues.length) {
      return 'date';
    }

    // 检查是否为布尔值
    const booleanValues = nonNullValues.filter(v =>
      ['true', 'false', '1', '0', 'yes', 'no'].includes(String(v).toLowerCase())
    );
    if (booleanValues.length === nonNullValues.length) {
      return 'boolean';
    }

    return 'string';
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
      void this.updateImportTask(task).catch(error => {
        this.logger.warn('Failed to persist import progress', { taskId, error });
      });
    }
  }

  private toJobStatus(task: ImportTask): ImportJobStatus {
    return {
      id: task.id,
      userId: task.createdBy,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      error: task.error,
      progress: task.progress,
      result: task.result,
    };
  }

  private async saveImportTask(task: ImportTask): Promise<void> {
    await this.dbPool.query(
      `INSERT INTO import_tasks
       (id, user_id, type, format, config, status, progress, created_at, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        task.id,
        task.createdBy,
        task.type,
        task.config.format,
        JSON.stringify(task.config || {}),
        task.status,
        JSON.stringify(task.progress || {}),
        task.createdAt,
        task.filePath,
      ]
    );
  }

  private async updateImportTask(task: ImportTask): Promise<void> {
    await this.dbPool.query(
      `UPDATE import_tasks
       SET status = $1,
           progress = $2,
           result = $3,
           started_at = $4,
           completed_at = $5,
           file_path = $6,
           error_message = $7
       WHERE id = $8`,
      [
        task.status,
        JSON.stringify(task.progress || {}),
        task.result ? JSON.stringify(task.result) : null,
        task.startedAt || null,
        task.completedAt || null,
        task.filePath,
        task.error || null,
        task.id,
      ]
    );
  }

  private async getImportTaskById(taskId: string): Promise<ImportTask | null> {
    const result = await this.dbPool.query(
      `SELECT id, user_id, type, format, config, status, progress, result, created_at, started_at,
              completed_at, file_path, error_message
       FROM import_tasks
       WHERE id = $1`,
      [taskId]
    );
    const rows = (result as { rows?: Array<Record<string, unknown>> }).rows || [];
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      id: String(row.id),
      type: String(row.type),
      status: row.status as ImportTask['status'],
      progress: (row.progress as ImportTask['progress']) || {
        current: 0,
        total: 0,
        percentage: 0,
      },
      config: (row.config as ImportConfig) || { format: 'csv' },
      filePath: String(row.file_path || ''),
      result: (row.result as ImportTask['result']) || undefined,
      error: (row.error_message as string) || undefined,
      createdAt: new Date(String(row.created_at)),
      startedAt: row.started_at ? new Date(String(row.started_at)) : undefined,
      completedAt: row.completed_at ? new Date(String(row.completed_at)) : undefined,
      createdBy: String(row.user_id),
    };
  }

  /**
   * 初始化模板
   */
  private initializeTemplates(): void {
    // 默认模板
    const defaultTemplates: ImportTemplate[] = [
      {
        id: 'users-default',
        name: '用户导入默认模板',
        description: '用户数据的标准导入模板',
        format: 'csv',
        mapping: [
          { source: 'name', target: 'name', type: 'string', required: true },
          { source: 'email', target: 'email', type: 'string', required: true },
          { source: 'age', target: 'age', type: 'number' },
          { source: 'active', target: 'active', type: 'boolean' },
          { source: 'created_at', target: 'createdAt', type: 'date' },
        ],
        validation: {
          required: ['name', 'email'],
          types: {
            name: 'string',
            email: 'string',
            age: 'number',
            active: 'boolean',
            created_at: 'date',
          },
          formats: {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          },
          ranges: {
            age: { min: 0, max: 150 },
          },
        },
      },
      {
        id: 'products-default',
        name: '产品导入默认模板',
        description: '产品数据的标准导入模板',
        format: 'excel',
        mapping: [
          { source: 'product_name', target: 'name', type: 'string', required: true },
          { source: 'price', target: 'price', type: 'number', required: true },
          { source: 'quantity', target: 'quantity', type: 'number' },
          { source: 'category', target: 'category', type: 'string' },
          { source: 'available', target: 'available', type: 'boolean' },
        ],
        validation: {
          required: ['product_name', 'price'],
          types: {
            product_name: 'string',
            price: 'number',
            quantity: 'number',
            category: 'string',
            available: 'boolean',
          },
          ranges: {
            price: { min: 0 },
            quantity: { min: 0 },
          },
        },
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
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成模板ID
   */
  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecordId(): string {
    return `data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async insertDataRecord(
    record: Record<string, unknown>,
    type: string,
    userId: unknown,
    workspaceId: unknown,
    now: string
  ): Promise<void> {
    const id = this.generateRecordId();
    const metadata = {
      createdAt: now,
      updatedAt: now,
      version: 1,
      tags: [] as string[],
      source: 'import',
      userId: typeof userId === 'string' ? userId : undefined,
    };
    await this.dbPool.query(
      `INSERT INTO data_records (id, type, workspace_id, data, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        id,
        type,
        workspaceId ? String(workspaceId) : null,
        JSON.stringify(record),
        JSON.stringify(metadata),
      ]
    );
  }

  private async insertUserRecord(record: Record<string, unknown>): Promise<boolean> {
    const username = record.username;
    const email = record.email;
    const passwordHash = record.password_hash || record.passwordHash;
    if (
      typeof username !== 'string' ||
      typeof email !== 'string' ||
      typeof passwordHash !== 'string'
    ) {
      return false;
    }

    await this.dbPool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, avatar_url, role, plan, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      [
        username,
        email,
        passwordHash,
        typeof record.first_name === 'string' ? record.first_name : null,
        typeof record.last_name === 'string' ? record.last_name : null,
        typeof record.avatar_url === 'string' ? record.avatar_url : null,
        typeof record.role === 'string' ? record.role : 'user',
        typeof record.plan === 'string' ? record.plan : 'free',
        typeof record.status === 'string' ? record.status : 'active',
      ]
    );
    return true;
  }

  private async insertTestResultRecord(
    record: Record<string, unknown>,
    userId: unknown,
    workspaceId: unknown
  ): Promise<boolean> {
    const testId = record.test_id ?? record.testId;
    const engineType = record.engine_type ?? record.engineType;
    const engineName = record.engine_name ?? record.engineName;
    const testName = record.test_name ?? record.testName;
    if (
      typeof testId !== 'string' ||
      typeof engineType !== 'string' ||
      typeof engineName !== 'string' ||
      typeof testName !== 'string'
    ) {
      return false;
    }

    const executionId = await this.ensureTestExecution(
      testId,
      engineType,
      engineName,
      testName,
      userId,
      workspaceId,
      record
    );
    if (!executionId) {
      return false;
    }

    await this.dbPool.query(
      `INSERT INTO test_results (execution_id, summary, score, grade, passed, warnings, errors)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        executionId,
        JSON.stringify(record.summary ?? record),
        typeof record.score === 'number' ? record.score : null,
        typeof record.grade === 'string' ? record.grade : null,
        typeof record.passed === 'boolean' ? record.passed : null,
        JSON.stringify(record.warnings ?? []),
        JSON.stringify(record.errors ?? []),
      ]
    );
    return true;
  }

  private async insertTestLogRecord(
    record: Record<string, unknown>,
    userId: unknown,
    workspaceId: unknown
  ): Promise<boolean> {
    const executionId = await this.resolveExecutionId(record, userId, workspaceId);
    if (!executionId) {
      return false;
    }

    const level = typeof record.level === 'string' ? record.level : 'info';
    const message = typeof record.message === 'string' ? record.message : 'imported log';
    await this.dbPool.query(
      `INSERT INTO test_logs (execution_id, level, message, context)
       VALUES ($1, $2, $3, $4)`,
      [executionId, level, message, JSON.stringify(record.context ?? {})]
    );
    return true;
  }

  private async insertTestReportRecord(
    record: Record<string, unknown>,
    userId: unknown,
    workspaceId: unknown
  ): Promise<boolean> {
    const reportType = record.report_type ?? record.reportType;
    const format = record.format;
    if (typeof reportType !== 'string' || typeof format !== 'string') {
      return false;
    }

    const executionId = await this.resolveExecutionId(record, userId, workspaceId, false);
    await this.dbPool.query(
      `INSERT INTO test_reports
         (execution_id, user_id, workspace_id, report_type, format, report_data, file_path, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        executionId,
        typeof userId === 'string' ? userId : null,
        typeof workspaceId === 'string' ? workspaceId : null,
        reportType,
        format,
        JSON.stringify(record.report_data ?? record.reportData ?? {}),
        typeof record.file_path === 'string' ? record.file_path : null,
        typeof record.file_size === 'number' ? record.file_size : null,
      ]
    );
    return true;
  }

  private async insertTestMetricRecord(record: Record<string, unknown>): Promise<boolean> {
    const resultId = record.result_id ?? record.resultId;
    if (typeof resultId !== 'number') {
      return false;
    }

    const metricName = record.metric_name ?? record.metricName;
    if (typeof metricName !== 'string') {
      return false;
    }

    await this.dbPool.query(
      `INSERT INTO test_metrics
         (result_id, metric_name, metric_value, metric_unit, metric_type, threshold_min, threshold_max,
          passed, severity, recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        resultId,
        metricName,
        JSON.stringify(record.metric_value ?? record.metricValue ?? {}),
        typeof record.metric_unit === 'string' ? record.metric_unit : null,
        typeof record.metric_type === 'string' ? record.metric_type : null,
        typeof record.threshold_min === 'number' ? record.threshold_min : null,
        typeof record.threshold_max === 'number' ? record.threshold_max : null,
        typeof record.passed === 'boolean' ? record.passed : null,
        typeof record.severity === 'string' ? record.severity : null,
        typeof record.recommendation === 'string' ? record.recommendation : null,
      ]
    );
    return true;
  }

  private async resolveExecutionId(
    record: Record<string, unknown>,
    userId: unknown,
    workspaceId: unknown,
    ensure: boolean = true
  ): Promise<number | null> {
    const executionId = record.execution_id ?? record.executionId;
    if (typeof executionId === 'number') {
      return executionId;
    }
    const testId = record.test_id ?? record.testId;
    if (typeof testId !== 'string') {
      return null;
    }

    const lookup = await this.dbPool.query('SELECT id FROM test_executions WHERE test_id = $1', [
      testId,
    ]);
    const row = (lookup as { rows?: Array<{ id?: number }> }).rows?.[0];
    if (row?.id) {
      return row.id;
    }

    if (!ensure) {
      return null;
    }

    const engineType = record.engine_type ?? record.engineType;
    const engineName = record.engine_name ?? record.engineName;
    const testName = record.test_name ?? record.testName;
    if (
      typeof engineType !== 'string' ||
      typeof engineName !== 'string' ||
      typeof testName !== 'string'
    ) {
      return null;
    }

    return this.ensureTestExecution(
      String(testId),
      String(engineType),
      String(engineName),
      String(testName),
      userId,
      workspaceId,
      record
    );
  }

  private async ensureTestExecution(
    testId: string,
    engineType: string,
    engineName: string,
    testName: string,
    userId: unknown,
    workspaceId: unknown,
    record: Record<string, unknown>
  ): Promise<number | null> {
    const existing = await this.dbPool.query('SELECT id FROM test_executions WHERE test_id = $1', [
      testId,
    ]);
    const existingRow = (existing as { rows?: Array<{ id?: number }> }).rows?.[0];
    if (existingRow?.id) {
      return existingRow.id;
    }

    const result = await this.dbPool.query(
      `INSERT INTO test_executions
         (test_id, user_id, workspace_id, engine_type, engine_name, test_name, status, created_at,
          completed_at, execution_time, results, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11)
       RETURNING id`,
      [
        testId,
        typeof userId === 'string' ? userId : null,
        typeof workspaceId === 'string' ? workspaceId : null,
        engineType,
        engineName,
        testName,
        typeof record.status === 'string' ? record.status : 'completed',
        record.completed_at ? new Date(String(record.completed_at)) : null,
        typeof record.execution_time === 'number' ? record.execution_time : null,
        JSON.stringify(record.summary ?? record.results ?? {}),
        JSON.stringify(record.metadata ?? {}),
      ]
    );
    const row = (result as { rows?: Array<{ id?: number }> }).rows?.[0];
    return row?.id ?? null;
  }
}

export default DataImportService;
