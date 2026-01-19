/**
 * 数据导入服务
 * 支持批量数据导入、格式验证和转换
 * 包含进度跟踪和错误处理功能
 */

import csvParser from 'csv-parser';
import { EventEmitter } from 'events';
import ExcelJS from 'exceljs';
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
    return this.tasks.get(taskId) || null;
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
      return true;
    }

    if (task.status === 'running') {
      task.status = 'cancelled';
      this.activeTasks.delete(taskId);
      this.emit('task_cancelled', task);
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

    this.tasks.delete(taskId);
    this.emit('task_deleted', { taskId });

    return true;
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

    try {
      const result = await this.performImport(task);

      task.result = result;
      task.status = 'completed';
      task.completedAt = new Date();
      task.progress.percentage = 100;

      this.emit('task_completed', task);
      this.logger.info('Import task completed', { taskId: task.id, imported: result.imported });
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();

      this.emit('task_failed', task);
      this.logger.error('Import task failed', { taskId: task.id, error: task.error });
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
    const data = await this.readFile(task.filePath, task.config);

    // 验证数据
    const { validatedData, errors } = await this.validateData(data, task.config.validation);

    // 转换数据
    const transformedData = await this.transformData(validatedData, task.config.mapping);

    // 导入数据
    const imported = await this.importData(transformedData, task.type);

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
    _limit?: number
  ): Promise<Record<string, unknown>[]> {
    const encoding: NodeJS.BufferEncoding = (config.encoding ?? 'utf8') as NodeJS.BufferEncoding;
    const _content = await fs.readFile(filePath, { encoding });

    // 简化的XML解析，实际项目中应该使用专门的XML解析库
    throw new Error('XML import not implemented yet');
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
  private async importData(data: Record<string, unknown>[], _type: string): Promise<number> {
    // 这里应该根据type导入到不同的数据源
    // 简化实现，只返回导入的记录数
    return data.length;
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
    }
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
}

export default DataImportService;
