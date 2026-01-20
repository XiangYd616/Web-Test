/**
 * 数据管理服务
 * 提供完整的数据CRUD操作、导入导出、统计分析、备份恢复等功能
 */

import csv from 'csv-parser';
import { EventEmitter } from 'events';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const { createObjectCsvWriter } = require('csv-writer');

type DataRecordMetadata = {
  createdAt: string;
  updatedAt: string;
  version: number;
  tags: string[];
  source: string;
  userId?: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
};

type DataRecord = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  metadata: DataRecordMetadata;
};

type DataTypeMap = {
  TEST_RESULTS: string;
  USER_DATA: string;
  SYSTEM_LOGS: string;
  ANALYTICS: string;
  REPORTS: string;
  CONFIGURATIONS: string;
};

type CreateOptions = {
  tags?: string[];
  source?: string;
  userId?: string;
};

type ReadOptions = {
  fields?: string[];
};

type UpdateOptions = {
  userId?: string;
};

type DeleteOptions = {
  softDelete?: boolean;
  userId?: string;
};

type QueryFilters = Record<string, unknown>;

type QuerySort = {
  field: string;
  direction?: 'asc' | 'desc';
};

type QueryOptions = {
  filters?: QueryFilters;
  search?: string;
  sort?: QuerySort;
};

type PaginationOptions = {
  page?: number;
  limit?: number;
};

type BatchOperation = {
  type: 'create' | 'update' | 'delete';
  dataType: string;
  data?: Record<string, unknown>;
  id?: string;
  updates?: Record<string, unknown>;
  options?: CreateOptions | UpdateOptions | DeleteOptions;
};

type ImportOptions = {
  userId?: string;
  tags?: string[];
  source?: string;
};

type CustomStatDefinition = {
  type: 'count' | 'average';
  name: string;
  field: string;
  value?: unknown;
};

type StatisticsOptions = {
  customStats?: CustomStatDefinition[];
};

class DataManagementService extends EventEmitter {
  private dataStore = new Map<string, Map<string, DataRecord>>();
  private dataDir = path.join(process.cwd(), 'data', 'records');
  private backupDir = path.join(process.cwd(), 'data', 'backups');
  private exportDir = path.join(process.cwd(), 'data', 'exports');
  private isInitialized = false;
  private dataTypes: DataTypeMap = {
    TEST_RESULTS: 'test_results',
    USER_DATA: 'user_data',
    SYSTEM_LOGS: 'system_logs',
    ANALYTICS: 'analytics',
    REPORTS: 'reports',
    CONFIGURATIONS: 'configurations',
  };

  /**
   * 初始化数据管理服务
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    try {
      await this.ensureDirectories();
      await this.loadExistingData();
      this.setupPeriodicBackup();

      this.isInitialized = true;
      console.log('✅ 数据管理服务初始化完成');

      this.emit('initialized');
    } catch (error) {
      console.error('❌ 数据管理服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据记录
   */
  async createData(type: string, data: Record<string, unknown>, options: CreateOptions = {}) {
    try {
      const id = this.generateId();
      const timestamp = new Date().toISOString();

      const record: DataRecord = {
        id,
        type,
        data,
        metadata: {
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
          tags: options.tags || [],
          source: options.source || 'api',
          userId: options.userId,
        },
      };

      this.validateData(type, data);

      if (!this.dataStore.has(type)) {
        this.dataStore.set(type, new Map());
      }
      this.dataStore.get(type)?.set(id, record);
      await this.persistType(type);

      this.emit('dataCreated', { type, id, record });

      return { id, record };
    } catch (error) {
      console.error('创建数据失败:', error);
      throw error;
    }
  }

  /**
   * 读取数据记录
   */
  async readData(type: string, id: string, options: ReadOptions = {}) {
    try {
      if (!this.dataStore.has(type)) {
        throw new Error(`数据类型不存在: ${type}`);
      }

      const typeStore = this.dataStore.get(type);
      if (!typeStore?.has(id)) {
        throw new Error(`数据记录不存在: ${type}/${id}`);
      }

      const record = typeStore.get(id) as DataRecord;

      if (options.fields) {
        return this.filterFields(record, options.fields);
      }

      return record;
    } catch (error) {
      console.error('读取数据失败:', error);
      throw error;
    }
  }

  /**
   * 更新数据记录
   */
  async updateData(
    type: string,
    id: string,
    updates: Record<string, unknown>,
    options: UpdateOptions = {}
  ) {
    try {
      const existingRecord = (await this.readData(type, id)) as DataRecord;

      const updatedRecord: DataRecord = {
        ...existingRecord,
        data: { ...existingRecord.data, ...updates },
        metadata: {
          ...existingRecord.metadata,
          updatedAt: new Date().toISOString(),
          version: existingRecord.metadata.version + 1,
          updatedBy: options.userId,
        },
      };

      this.validateData(type, updatedRecord.data);

      this.dataStore.get(type)?.set(id, updatedRecord);
      await this.persistType(type);

      this.emit('dataUpdated', { type, id, record: updatedRecord, changes: updates });

      return updatedRecord;
    } catch (error) {
      console.error('更新数据失败:', error);
      throw error;
    }
  }

  /**
   * 删除数据记录
   */
  async deleteData(type: string, id: string, options: DeleteOptions = {}) {
    try {
      const record = await this.readData(type, id);

      if (options.softDelete) {
        const recordValue = record as DataRecord;
        const updatedRecord: DataRecord = {
          ...recordValue,
          metadata: {
            ...recordValue.metadata,
            deletedAt: new Date().toISOString(),
            deletedBy: options.userId,
            updatedAt: new Date().toISOString(),
            version: recordValue.metadata.version + 1,
          },
        };
        this.dataStore.get(type)?.set(id, updatedRecord);
        await this.persistType(type);
        this.emit('dataDeleted', { type, id, record: updatedRecord });
        return { success: true, deletedRecord: updatedRecord };
      }

      this.dataStore.get(type)?.delete(id);
      await this.persistType(type);

      this.emit('dataDeleted', { type, id, record });

      return { success: true, deletedRecord: record };
    } catch (error) {
      console.error('删除数据失败:', error);
      throw error;
    }
  }

  /**
   * 查询数据
   */
  async queryData(type: string, query: QueryOptions = {}, options: PaginationOptions = {}) {
    try {
      if (!this.dataStore.has(type)) {
        return { results: [], total: 0 };
      }

      const typeStore = this.dataStore.get(type) as Map<string, DataRecord>;
      let results = Array.from(typeStore.values());

      if (query.filters) {
        results = this.applyFilters(results, query.filters);
      }

      if (query.search) {
        results = this.applySearch(results, query.search);
      }

      if (query.sort) {
        results = this.applySort(results, query.sort);
      }

      const total = results.length;

      if (options.page && options.limit) {
        const start = (options.page - 1) * options.limit;
        results = results.slice(start, start + options.limit);
      }

      return {
        results,
        total,
        page: options.page || 1,
        limit: options.limit || total,
        totalPages: options.limit ? Math.ceil(total / options.limit) : 1,
      };
    } catch (error) {
      console.error('查询数据失败:', error);
      throw error;
    }
  }

  /**
   * 批量操作
   */
  async batchOperation(operations: BatchOperation[]) {
    const results: Array<Record<string, unknown>> = [];
    const errors: Array<Record<string, unknown>> = [];

    try {
      for (const operation of operations) {
        try {
          let result: unknown;

          switch (operation.type) {
            case 'create':
              result = await this.createData(
                operation.dataType,
                operation.data || {},
                (operation.options as CreateOptions) || {}
              );
              break;
            case 'update':
              result = await this.updateData(
                operation.dataType,
                operation.id || '',
                operation.updates || {},
                (operation.options as UpdateOptions) || {}
              );
              break;
            case 'delete':
              result = await this.deleteData(
                operation.dataType,
                operation.id || '',
                (operation.options as DeleteOptions) || {}
              );
              break;
            default:
              throw new Error(`不支持的操作类型: ${String(operation.type)}`);
          }

          results.push({ operation, result, success: true });
        } catch (error) {
          errors.push({ operation, error: this.getErrorMessage(error), success: false });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        summary: {
          total: operations.length,
          successful: results.length,
          failed: errors.length,
        },
      };
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error;
    }
  }

  /**
   * 数据导入
   */
  async importData(type: string, filepath: string, format = 'json', options: ImportOptions = {}) {
    try {
      let data: Array<Record<string, unknown>>;

      switch (format) {
        case 'json':
          data = await this.importFromJson(filepath);
          break;
        case 'csv':
          data = await this.importFromCsv(filepath);
          break;
        default:
          throw new Error(`不支持的导入格式: ${format}`);
      }

      const results: Array<Record<string, unknown>> = [];
      const errors: Array<Record<string, unknown>> = [];

      for (const item of data) {
        try {
          const result = await this.createData(type, item, options);
          results.push(result);
        } catch (error) {
          errors.push({ item, error: this.getErrorMessage(error) });
        }
      }

      return {
        success: errors.length === 0,
        imported: results.length,
        failed: errors.length,
        errors,
      };
    } catch (error) {
      console.error('数据导入失败:', error);
      throw error;
    }
  }

  /**
   * 数据统计
   */
  async getStatistics(type: string, options: StatisticsOptions = {}) {
    try {
      if (!this.dataStore.has(type)) {
        return { total: 0, statistics: {} };
      }

      const typeStore = this.dataStore.get(type) as Map<string, DataRecord>;
      const records = Array.from(typeStore.values());

      const statistics: Record<string, unknown> = {
        total: records.length,
        createdToday: this.countRecordsToday(records),
        createdThisWeek: this.countRecordsThisWeek(records),
        createdThisMonth: this.countRecordsThisMonth(records),
        averageSize: this.calculateAverageSize(records),
        latestRecord: this.getLatestRecord(records),
        oldestRecord: this.getOldestRecord(records),
      };

      if (options.customStats) {
        statistics.custom = this.calculateCustomStats(records, options.customStats);
      }

      return statistics;
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 数据备份
   */
  async createBackup(types: string[] | null = null, options: { name?: string } = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = options.name || `backup_${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      await fs.mkdir(backupPath, { recursive: true });

      const typesToBackup = types || Array.from(this.dataStore.keys());
      const backupInfo: Record<string, unknown> = {
        name: backupName,
        timestamp,
        types: typesToBackup,
        records: {},
      };

      for (const dataType of typesToBackup) {
        if (this.dataStore.has(dataType)) {
          const typeData = Array.from(
            (this.dataStore.get(dataType) as Map<string, DataRecord>).values()
          );
          const typeFile = path.join(backupPath, `${dataType}.json`);

          await fs.writeFile(typeFile, JSON.stringify(typeData, null, 2));
          (backupInfo.records as Record<string, unknown>)[dataType] = typeData.length;
        }
      }

      const infoFile = path.join(backupPath, 'backup-info.json');
      await fs.writeFile(infoFile, JSON.stringify(backupInfo, null, 2));

      return backupInfo;
    } catch (error) {
      console.error('数据备份失败:', error);
      throw error;
    }
  }

  /**
   * 辅助方法
   */
  generateId() {
    return `data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  validateData(type: string, data: Record<string, unknown>) {
    if (!data || typeof data !== 'object') {
      throw new Error('数据必须是有效的对象');
    }

    switch (type) {
      case this.dataTypes.TEST_RESULTS:
        if (!data.url || !data.testType) {
          throw new Error('测试结果必须包含URL和测试类型');
        }
        break;
      case this.dataTypes.USER_DATA:
        if (!data.userId) {
          throw new Error('用户数据必须包含用户ID');
        }
        break;
      default:
        break;
    }
  }

  async ensureDirectories() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.backupDir, { recursive: true });
    await fs.mkdir(this.exportDir, { recursive: true });
  }

  async loadExistingData() {
    try {
      const entries = await fs.readdir(this.dataDir);
      await Promise.all(
        entries
          .filter(entry => entry.endsWith('.json'))
          .map(async entry => {
            const type = entry.replace(/\.json$/, '');
            const filePath = path.join(this.dataDir, entry);
            const content = await fs.readFile(filePath, 'utf8');
            const records = JSON.parse(content) as DataRecord[];
            const map = new Map<string, DataRecord>();
            records.forEach(record => {
              map.set(record.id, record);
            });
            this.dataStore.set(type, map);
          })
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('加载数据失败:', error);
      }
    }
  }

  setupPeriodicBackup() {
    const backupInterval = 24 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        await this.createBackup(null, { name: `auto_backup_${Date.now()}` });
      } catch (error) {
        console.error('自动备份失败:', error);
      }
    }, backupInterval);
  }

  private getTypeFilePath(type: string): string {
    return path.join(this.dataDir, `${type}.json`);
  }

  private async persistType(type: string): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    const records = Array.from(this.dataStore.get(type)?.values() || []);
    await fs.writeFile(this.getTypeFilePath(type), JSON.stringify(records, null, 2));
  }

  filterFields(record: DataRecord, fields: string[]) {
    const filtered: Record<string, unknown> = {};
    for (const field of fields) {
      if ((record as Record<string, unknown>)[field] !== undefined) {
        filtered[field] = (record as Record<string, unknown>)[field];
      }
    }
    return filtered;
  }

  applyFilters(records: DataRecord[], filters: QueryFilters) {
    return records.filter(record => {
      for (const [key, value] of Object.entries(filters)) {
        if ((record.data as Record<string, unknown>)[key] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  applySearch(records: DataRecord[], searchTerm: string) {
    const term = searchTerm.toLowerCase();
    return records.filter(record => {
      const searchableText = JSON.stringify(record.data).toLowerCase();
      return searchableText.includes(term);
    });
  }

  applySort(records: DataRecord[], sortConfig: QuerySort) {
    return records.sort((a, b) => {
      const aValue =
        (a.data as Record<string, unknown>)[sortConfig.field] ??
        (a.metadata as Record<string, unknown>)[sortConfig.field];
      const bValue =
        (b.data as Record<string, unknown>)[sortConfig.field] ??
        (b.metadata as Record<string, unknown>)[sortConfig.field];

      if (sortConfig.direction === 'desc') {
        return aValue === bValue ? 0 : aValue < bValue ? 1 : -1;
      }
      return aValue === bValue ? 0 : aValue > bValue ? 1 : -1;
    });
  }

  async exportToJson(data: DataRecord[], filepath: string) {
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
  }

  async exportToCsv(data: DataRecord[], filepath: string) {
    if (data.length === 0) return;

    const headers = Object.keys(data[0].data);
    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: headers.map(header => ({ id: header, title: header })),
    });

    const csvData = data.map(record => record.data);
    await csvWriter.writeRecords(csvData);
  }

  async exportToExcel(data: DataRecord[], filepath: string) {
    await this.exportToJson(data, filepath.replace('.excel', '.json'));
  }

  async exportToXml(data: DataRecord[], filepath: string) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${data
      .map(record => `  <record>${JSON.stringify(record.data)}</record>`)
      .join('\n')}\n</data>`;
    await fs.writeFile(filepath, xml);
  }

  async importFromJson(filepath: string): Promise<Array<Record<string, unknown>>> {
    const content = await fs.readFile(filepath, 'utf8');
    return JSON.parse(content) as Array<Record<string, unknown>>;
  }

  async importFromCsv(filepath: string): Promise<Array<Record<string, unknown>>> {
    return new Promise((resolve, reject) => {
      const results: Array<Record<string, unknown>> = [];
      createReadStream(filepath)
        .pipe(csv())
        .on('data', data => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  countRecordsToday(records: DataRecord[]) {
    const today = new Date().toDateString();
    return records.filter(record => new Date(record.metadata.createdAt).toDateString() === today)
      .length;
  }

  countRecordsThisWeek(records: DataRecord[]) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return records.filter(record => new Date(record.metadata.createdAt) > weekAgo).length;
  }

  countRecordsThisMonth(records: DataRecord[]) {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return records.filter(record => new Date(record.metadata.createdAt) > monthAgo).length;
  }

  calculateAverageSize(records: DataRecord[]) {
    if (records.length === 0) return 0;
    const totalSize = records.reduce((sum, record) => sum + JSON.stringify(record).length, 0);
    return Math.round(totalSize / records.length);
  }

  getLatestRecord(records: DataRecord[]) {
    if (records.length === 0) return null;
    return records.reduce((latest, record) =>
      new Date(record.metadata.createdAt) > new Date(latest.metadata.createdAt) ? record : latest
    );
  }

  getOldestRecord(records: DataRecord[]) {
    if (records.length === 0) return null;
    return records.reduce((oldest, record) =>
      new Date(record.metadata.createdAt) < new Date(oldest.metadata.createdAt) ? record : oldest
    );
  }

  calculateCustomStats(records: DataRecord[], customStats: CustomStatDefinition[]) {
    const stats: Record<string, unknown> = {};
    for (const stat of customStats) {
      switch (stat.type) {
        case 'count':
          stats[stat.name] = records.filter(
            record => record.data[stat.field] === stat.value
          ).length;
          break;
        case 'average': {
          const values = records
            .map(record => record.data[stat.field])
            .filter(value => typeof value === 'number') as number[];
          stats[stat.name] =
            values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        }
        default:
          break;
      }
    }
    return stats;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

const dataManagementService = new DataManagementService();

export { DataManagementService, dataManagementService };

// 兼容 CommonJS require
module.exports = {
  DataManagementService,
  dataManagementService,
};
