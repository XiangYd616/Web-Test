/**
 * 数据管理服务
 * 提供完整的数据CRUD操作、导入导出、统计分析、备份恢复等功能
 */

import csv from 'csv-parser';
import { EventEmitter } from 'events';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { query } from '../../config/database';
import { toDate } from '../../utils/dateUtils';
import Logger from '../../utils/logger';
import DataExportService, { ExportJobRequest } from '../dataManagement/dataExportService';

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
  workspaceId?: string;
};

type ReadOptions = {
  fields?: string[];
  userId?: string;
  workspaceId?: string;
};

type UpdateOptions = {
  userId?: string;
  workspaceId?: string;
};

type DeleteOptions = {
  softDelete?: boolean;
  userId?: string;
  workspaceId?: string;
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
  userId?: string;
  workspaceId?: string;
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
  workspaceId?: string;
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
  userId?: string;
  workspaceId?: string;
};

class DataManagementService extends EventEmitter {
  private isInitialized = false;
  private dataTypes: DataTypeMap = {
    TEST_RESULTS: 'test_results',
    USER_DATA: 'user_data',
    SYSTEM_LOGS: 'system_logs',
    ANALYTICS: 'analytics',
    REPORTS: 'reports',
    CONFIGURATIONS: 'configurations',
  };
  private exportService?: DataExportService;

  /**
   * 初始化数据管理服务
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    try {
      await this.ensureTables();
      this.setupPeriodicBackup();

      this.isInitialized = true;
      Logger.system('data_management_initialized', '数据管理服务初始化完成');

      this.emit('initialized');
    } catch (error) {
      Logger.error('数据管理服务初始化失败', error);
      throw error;
    }
  }

  private async getRecordTypeById(id: string, options: ReadOptions = {}): Promise<string | null> {
    this.ensureIsolationContext(options, '获取数据类型');
    const params: Array<string | number> = [id];
    let userClause = '';
    let workspaceClause = '';

    if (options.userId) {
      params.push(options.userId);
      userClause = ` AND metadata->>'userId' = $${params.length}`;
    }
    if (options.workspaceId) {
      params.push(options.workspaceId);
      workspaceClause = ` AND workspace_id = $${params.length}`;
    }

    const result = await query(
      `SELECT type FROM data_records WHERE id = $1${userClause}${workspaceClause}`,
      params
    );
    const row = result.rows[0] as { type?: string } | undefined;
    return row?.type || null;
  }

  async getDataOverview(userId: string, workspaceId?: string) {
    this.ensureIsolationContext({ userId, workspaceId }, '获取数据概览');
    const params: Array<string | number> = [];
    const clauses: string[] = ['deleted_at IS NULL'];

    if (userId) {
      params.push(userId);
      clauses.push(`metadata->>'userId' = $${params.length}`);
    }
    if (workspaceId) {
      params.push(workspaceId);
      clauses.push(`workspace_id = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await query(
      `SELECT type, COUNT(*)::int AS count
       FROM data_records
       ${whereClause}
       GROUP BY type`,
      params
    );
    const summary = result.rows.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.type)] = Number(row.count) || 0;
      return acc;
    }, {});
    return {
      totalTypes: Object.keys(summary).length,
      summary,
    };
  }

  async getDataStatistics(
    userId: string,
    options: { period?: string; type?: string; workspaceId?: string } = {}
  ) {
    const type = options.type || this.dataTypes.TEST_RESULTS;
    const stats = await this.getStatistics(type, { userId, workspaceId: options.workspaceId });
    return {
      userId,
      workspaceId: options.workspaceId,
      type,
      period: options.period || 'all',
      stats,
    };
  }

  async createDataRecord(userId: string, data: Record<string, unknown>, workspaceId?: string) {
    const type = String(data.type || data.dataType || this.dataTypes.TEST_RESULTS);
    return this.createData(type, data, { userId, workspaceId });
  }

  async getDataList(
    _userId: string,
    options: { page?: number; limit?: number; type?: string; status?: string; search?: string },
    workspaceId?: string
  ) {
    const type = options.type || this.dataTypes.TEST_RESULTS;
    const filters: Record<string, unknown> = {};
    if (options.status) {
      filters.status = options.status;
    }
    return this.queryData(
      type,
      { filters, search: options.search, userId: _userId, workspaceId },
      options
    );
  }

  async getDataRecord(_userId: string, id: string, workspaceId?: string) {
    const type = await this.getRecordTypeById(id, { userId: _userId, workspaceId });
    if (!type) return null;
    return this.readData(type, id, { userId: _userId, workspaceId });
  }

  async updateDataRecord(
    userId: string,
    id: string,
    updates: Record<string, unknown>,
    workspaceId?: string
  ) {
    const type = String(
      updates.type ||
        updates.dataType ||
        (await this.getRecordTypeById(id, { userId, workspaceId })) ||
        ''
    );
    if (!type) {
      throw new Error('无法确定数据类型');
    }
    return this.updateData(type, id, updates, { userId, workspaceId });
  }

  async deleteDataRecord(userId: string, id: string, workspaceId?: string) {
    const type = await this.getRecordTypeById(id, { userId, workspaceId });
    if (!type) {
      throw new Error('数据记录不存在');
    }
    return this.deleteData(type, id, { userId, workspaceId, softDelete: true });
  }

  async batchOperationForUser(
    userId: string,
    payload: { operation: string; ids?: string[]; data?: Record<string, unknown> },
    workspaceId?: string
  ) {
    const operations: BatchOperation[] = [];
    const dataType = String(
      payload.data?.type || payload.data?.dataType || this.dataTypes.TEST_RESULTS
    );

    if (payload.operation === 'create' && payload.data) {
      operations.push({
        type: 'create',
        dataType,
        data: payload.data,
        options: { userId, workspaceId },
      });
    } else if (payload.operation === 'update' && payload.ids?.length) {
      payload.ids.forEach(id => {
        operations.push({
          type: 'update',
          dataType,
          id,
          updates: payload.data || {},
          options: { userId, workspaceId },
        });
      });
    } else if (payload.operation === 'delete' && payload.ids?.length) {
      payload.ids.forEach(id => {
        operations.push({
          type: 'delete',
          dataType,
          id,
          options: { userId, workspaceId, softDelete: true },
        });
      });
    }

    return this.batchOperation(operations);
  }

  async searchData(
    _userId: string,
    payload: { query?: string; filters?: Record<string, unknown>; options?: PaginationOptions },
    workspaceId?: string
  ) {
    const filters = payload.filters || {};
    const type = String(filters.type || this.dataTypes.TEST_RESULTS);
    const { type: _type, ...restFilters } = filters;
    return this.queryData(
      type,
      { filters: restFilters, search: payload.query, userId: _userId, workspaceId },
      payload.options
    );
  }

  async exportData(
    userId: string,
    payload: {
      format?: string;
      filters?: Record<string, unknown>;
      options?: Record<string, unknown>;
    },
    workspaceId?: string
  ) {
    this.ensureIsolationContext({ userId, workspaceId }, '数据导出');
    const format = (payload.format || 'json') as ExportJobRequest['format'];
    const filters = payload.filters || {};
    const options = payload.options || {};
    const dataType = this.resolveExportDataType(
      (options.dataType as string | undefined) ||
        (options.type as string | undefined) ||
        (filters.type as string | undefined) ||
        this.dataTypes.TEST_RESULTS
    );

    const allowedFormats: ExportJobRequest['format'][] = ['pdf', 'csv', 'json', 'excel', 'zip'];
    if (!allowedFormats.includes(format)) {
      throw new Error(`不支持的导出格式: ${format}`);
    }

    const service = this.getExportService();
    const mergedFilters = {
      ...filters,
      ...(workspaceId ? { workspaceId } : {}),
    } as Record<string, unknown>;

    const job = await service.createExportJob({
      userId,
      dataType,
      format,
      filters: mergedFilters,
      options,
    });

    return {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    };
  }

  async importDataForUpload(
    userId: string,
    payload: {
      file: Express.Multer.File;
      options?: Record<string, unknown>;
      type?: string;
      format?: string;
      workspaceId?: string;
    }
  ) {
    const type = payload.type || this.dataTypes.TEST_RESULTS;
    const format = payload.format || 'json';
    return this.importData(type, payload.file.path, format, {
      ...(payload.options || {}),
      userId,
      workspaceId: payload.workspaceId,
    });
  }

  async restoreData(
    userId: string,
    payload: { file: Express.Multer.File; options?: unknown; workspaceId?: string }
  ) {
    this.ensureIsolationContext({ userId, workspaceId: payload.workspaceId }, '数据恢复');
    const options = (payload.options || {}) as { format?: string; mode?: 'merge' | 'overwrite' };
    const mode = options.mode || 'merge';
    const filePath = payload.file.path;
    const extension = path.extname(payload.file.originalname || '').toLowerCase();
    const format = options.format || (extension === '.csv' ? 'csv' : 'json');

    const rawData =
      format === 'csv' ? await this.importFromCsv(filePath) : await this.importFromJson(filePath);
    const records = Array.isArray(rawData)
      ? rawData
      : (rawData as { data?: Array<Record<string, unknown>> }).data || [];

    let restored = 0;
    let failed = 0;
    const errors: Array<Record<string, unknown>> = [];

    for (const item of records) {
      try {
        const record = item as Record<string, unknown>;
        const recordData = (record.data as Record<string, unknown> | undefined) || record;
        const recordType = this.resolveRecordType(record, recordData);
        const recordId = (record.id as string | undefined) || this.generateId();

        if (mode === 'merge' && record.id) {
          await this.updateData(recordType, recordId, recordData, {
            userId,
            workspaceId: payload.workspaceId,
          });
        } else {
          await this.upsertRestoredRecord({
            id: recordId,
            type: recordType,
            data: recordData,
            metadata: (record.metadata as Record<string, unknown> | undefined) || {},
            userId,
            workspaceId: payload.workspaceId,
            mode,
          });
        }

        restored += 1;
      } catch (error) {
        failed += 1;
        errors.push({ item, error: this.getErrorMessage(error) });
      }
    }

    return {
      success: failed === 0,
      restored,
      failed,
      mode,
      errors,
    };
  }

  async getDataVersions(_userId: string, _id: string, _workspaceId?: string) {
    this.ensureIsolationContext({ userId: _userId, workspaceId: _workspaceId }, '获取版本历史');
    const params: Array<string | number> = [_id];
    const clauses: string[] = ['record_id = $1'];

    if (_workspaceId) {
      params.push(_workspaceId);
      clauses.push(`workspace_id = $${params.length}`);
    }
    if (_userId) {
      params.push(_userId);
      clauses.push(`created_by = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await query(
      `SELECT id, record_id, type, data, metadata, version, action, created_at, created_by
       FROM data_record_versions
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      recordId: row.record_id,
      type: row.type,
      data: row.data || {},
      metadata: row.metadata || {},
      version: Number(row.version) || 1,
      action: row.action,
      createdAt: toDate(row.created_at),
      createdBy: row.created_by,
    }));
  }

  async validateDataRequest(
    _userId: string,
    payload: { data: Record<string, unknown>; schema?: { type?: string }; workspaceId?: string }
  ) {
    const type = payload.schema?.type || String(payload.data.type || this.dataTypes.TEST_RESULTS);
    this.validateData(type, payload.data);
    return { valid: true, workspaceId: payload.workspaceId };
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

      await query(
        `INSERT INTO data_records (id, type, workspace_id, data, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          id,
          type,
          options.workspaceId || null,
          JSON.stringify(record.data),
          JSON.stringify(record.metadata),
        ]
      );

      this.emit('dataCreated', { type, id, record });

      return { id, record };
    } catch (error) {
      Logger.error('创建数据失败', error);
      throw error;
    }
  }

  /**
   * 读取数据记录
   */
  async readData(type: string, id: string, options: ReadOptions = {}) {
    try {
      this.ensureIsolationContext(options, '读取数据');
      const params: Array<string | number> = [type, id];
      let workspaceClause = '';
      let userClause = '';
      if (options.workspaceId) {
        params.push(options.workspaceId);
        workspaceClause = ` AND workspace_id = $${params.length}`;
      }
      if (options.userId) {
        params.push(options.userId);
        userClause = ` AND metadata->>'userId' = $${params.length}`;
      }
      const result = await query(
        `SELECT id, type, data, metadata, created_at, updated_at, deleted_at
         FROM data_records
         WHERE type = $1 AND id = $2 AND deleted_at IS NULL${workspaceClause}${userClause}`,
        params
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(`数据记录不存在: ${type}/${id}`);
      }
      const record: DataRecord = {
        id: row.id,
        type: row.type,
        data: row.data || {},
        metadata: row.metadata || {},
      };

      if (options.fields) {
        return this.filterFields(record, options.fields);
      }

      return record;
    } catch (error) {
      Logger.error('读取数据失败', error);
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
      this.ensureIsolationContext(options, '更新数据');
      const existingRecord = (await this.readData(type, id, {
        userId: options.userId,
        workspaceId: options.workspaceId,
      })) as DataRecord;

      await this.saveVersionSnapshot(existingRecord, 'update', options.userId, options.workspaceId);

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

      const params: Array<string | number> = [
        JSON.stringify(updatedRecord.data),
        JSON.stringify(updatedRecord.metadata),
        type,
        id,
      ];
      let workspaceClause = '';
      let userClause = '';
      if (options.workspaceId) {
        params.push(options.workspaceId);
        workspaceClause = ` AND workspace_id = $${params.length}`;
      }
      if (options.userId) {
        params.push(options.userId);
        userClause = ` AND metadata->>'userId' = $${params.length}`;
      }
      await query(
        `UPDATE data_records
         SET data = $1,
             metadata = $2,
             updated_at = NOW()
         WHERE type = $3 AND id = $4${workspaceClause}${userClause}`,
        params
      );

      this.emit('dataUpdated', { type, id, record: updatedRecord, changes: updates });

      return updatedRecord;
    } catch (error) {
      Logger.error('更新数据失败', error);
      throw error;
    }
  }

  /**
   * 删除数据记录
   */
  async deleteData(type: string, id: string, options: DeleteOptions = {}) {
    try {
      this.ensureIsolationContext(options, '删除数据');
      const record = (await this.readData(type, id, {
        userId: options.userId,
        workspaceId: options.workspaceId,
      })) as DataRecord;

      await this.saveVersionSnapshot(record, 'delete', options.userId, options.workspaceId);

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
        const params: Array<string | number> = [JSON.stringify(updatedRecord.metadata), type, id];
        let workspaceClause = '';
        let userClause = '';
        if (options.workspaceId) {
          params.push(options.workspaceId);
          workspaceClause = ` AND workspace_id = $${params.length}`;
        }
        if (options.userId) {
          params.push(options.userId);
          userClause = ` AND metadata->>'userId' = $${params.length}`;
        }
        await query(
          `UPDATE data_records
           SET metadata = $1,
               updated_at = NOW(),
               deleted_at = NOW()
           WHERE type = $2 AND id = $3${workspaceClause}${userClause}`,
          params
        );
        this.emit('dataDeleted', { type, id, record: updatedRecord });
        return { success: true, deletedRecord: updatedRecord };
      }

      const deleteParams: Array<string | number> = [type, id];
      let deleteWorkspaceClause = '';
      let deleteUserClause = '';
      if (options.workspaceId) {
        deleteParams.push(options.workspaceId);
        deleteWorkspaceClause = ` AND workspace_id = $${deleteParams.length}`;
      }
      if (options.userId) {
        deleteParams.push(options.userId);
        deleteUserClause = ` AND metadata->>'userId' = $${deleteParams.length}`;
      }
      await query(
        `DELETE FROM data_records WHERE type = $1 AND id = $2${deleteWorkspaceClause}${deleteUserClause}`,
        deleteParams
      );

      this.emit('dataDeleted', { type, id, record });

      return { success: true, deletedRecord: record };
    } catch (error) {
      Logger.error('删除数据失败', error);
      throw error;
    }
  }

  /**
   * 查询数据
   */
  async queryData(type: string, queryOptions: QueryOptions = {}, options: PaginationOptions = {}) {
    try {
      this.ensureIsolationContext(queryOptions, '查询数据');
      const filters = queryOptions.filters || {};
      const params: Array<string | number> = [type];
      const clauses: string[] = ['type = $1', 'deleted_at IS NULL'];

      if (queryOptions.userId) {
        params.push(queryOptions.userId);
        clauses.push(`metadata->>'userId' = $${params.length}`);
      }
      if (queryOptions.workspaceId) {
        params.push(queryOptions.workspaceId);
        clauses.push(`workspace_id = $${params.length}`);
      }

      Object.entries(filters).forEach(([key, value]) => {
        params.push(String(value));
        clauses.push(`data->>'${key}' = $${params.length}`);
      });

      if (queryOptions.search) {
        params.push(`%${queryOptions.search}%`);
        clauses.push(`data::text ILIKE $${params.length}`);
      }

      const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const sortField = queryOptions.sort?.field
        ? `COALESCE(data->>'${queryOptions.sort.field}', metadata->>'${queryOptions.sort.field}')`
        : 'created_at';
      const sortDirection = queryOptions.sort?.direction === 'asc' ? 'ASC' : 'DESC';

      const limit = options.limit ?? 20;
      const page = options.page ?? 1;
      const offset = (page - 1) * limit;

      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM data_records ${whereClause}`,
        params
      );

      const result = await query(
        `SELECT id, type, data, metadata, created_at, updated_at, deleted_at
         FROM data_records
         ${whereClause}
         ORDER BY ${sortField} ${sortDirection}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const results = result.rows.map(
        (row: {
          id: string;
          type: string;
          data: Record<string, unknown>;
          metadata: Record<string, unknown>;
        }) => ({
          id: row.id,
          type: row.type,
          data: row.data || {},
          metadata: row.metadata || {},
        })
      );

      const total = Number(countResult.rows[0]?.total || 0);

      return {
        results,
        total,
        page,
        limit,
        totalPages: limit ? Math.ceil(total / limit) : 1,
      };
    } catch (error) {
      Logger.error('查询数据失败', error);
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
      Logger.error('批量操作失败', error);
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
      Logger.error('数据导入失败', error);
      throw error;
    }
  }

  /**
   * 数据统计
   */
  async getStatistics(type: string, options: StatisticsOptions = {}) {
    try {
      this.ensureIsolationContext(options, '统计数据');
      const params: Array<string | number> = [type];
      const clauses: string[] = ['type = $1', 'deleted_at IS NULL'];

      if (options.userId) {
        params.push(options.userId);
        clauses.push(`metadata->>'userId' = $${params.length}`);
      }
      if (options.workspaceId) {
        params.push(options.workspaceId);
        clauses.push(`workspace_id = $${params.length}`);
      }
      const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await query(
        `SELECT id, type, data, metadata
         FROM data_records
         ${whereClause}`,
        params
      );
      const records = result.rows.map(row => ({
        id: row.id,
        type: row.type,
        data: row.data || {},
        metadata: row.metadata || {},
      })) as DataRecord[];

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
      Logger.error('获取统计信息失败', error);
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

      const typesToBackup = types || Object.values(this.dataTypes);
      const recordsSummary: Record<string, number> = {};

      for (const dataType of typesToBackup) {
        const countResult = await query(
          'SELECT COUNT(*)::int AS total FROM data_records WHERE type = $1 AND deleted_at IS NULL',
          [dataType]
        );
        recordsSummary[dataType] = Number(countResult.rows[0]?.total || 0);
      }

      const backupInfo = {
        name: backupName,
        timestamp,
        types: typesToBackup,
        records: recordsSummary,
      };

      await query(
        `INSERT INTO data_backups (name, data_types, summary, records, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [backupName, typesToBackup, JSON.stringify({ timestamp }), JSON.stringify(recordsSummary)]
      );

      return backupInfo;
    } catch (error) {
      Logger.error('数据备份失败', error);
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

  private ensureIsolationContext(
    options: { userId?: string; workspaceId?: string },
    action: string
  ) {
    if (!options.userId && !options.workspaceId) {
      throw new Error(`${action}缺少用户或工作区信息`);
    }
  }

  async ensureTables() {
    await query(
      `CREATE TABLE IF NOT EXISTS data_records (
         id VARCHAR(80) PRIMARY KEY,
         type VARCHAR(100) NOT NULL,
         workspace_id VARCHAR(80),
         data JSONB NOT NULL,
         metadata JSONB NOT NULL DEFAULT '{}',
         created_at TIMESTAMPTZ DEFAULT NOW(),
         updated_at TIMESTAMPTZ DEFAULT NOW(),
         deleted_at TIMESTAMPTZ
       );
       CREATE INDEX IF NOT EXISTS idx_data_records_type ON data_records(type);
       CREATE INDEX IF NOT EXISTS idx_data_records_workspace_id ON data_records(workspace_id);
       CREATE INDEX IF NOT EXISTS idx_data_records_created ON data_records(created_at DESC);

       CREATE TABLE IF NOT EXISTS data_record_versions (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         record_id VARCHAR(80) NOT NULL,
         type VARCHAR(100) NOT NULL,
         workspace_id VARCHAR(80),
         data JSONB NOT NULL,
         metadata JSONB NOT NULL DEFAULT '{}',
         version INTEGER NOT NULL,
         action VARCHAR(30) NOT NULL,
         created_by VARCHAR(80),
         created_at TIMESTAMPTZ DEFAULT NOW()
       );
       CREATE INDEX IF NOT EXISTS idx_data_record_versions_record_id
         ON data_record_versions(record_id);
       CREATE INDEX IF NOT EXISTS idx_data_record_versions_created_at
         ON data_record_versions(created_at DESC);

       CREATE TABLE IF NOT EXISTS data_backups (
         id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
         name VARCHAR(255) NOT NULL,
         data_types TEXT[] DEFAULT ARRAY[]::TEXT[],
         summary JSONB DEFAULT '{}',
         records JSONB DEFAULT '{}',
         created_at TIMESTAMPTZ DEFAULT NOW()
       );`
    );
  }

  setupPeriodicBackup() {
    const backupInterval = 24 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        await this.createBackup(null, { name: `auto_backup_${Date.now()}` });
      } catch (error) {
        Logger.error('自动备份失败', error);
      }
    }, backupInterval);
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

      const aComparable = typeof aValue === 'number' ? aValue : String(aValue ?? '');
      const bComparable = typeof bValue === 'number' ? bValue : String(bValue ?? '');

      if (sortConfig.direction === 'desc') {
        return aComparable === bComparable ? 0 : aComparable < bComparable ? 1 : -1;
      }
      return aComparable === bComparable ? 0 : aComparable > bComparable ? 1 : -1;
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

  private getExportService(): DataExportService {
    if (!this.exportService) {
      this.exportService = new DataExportService({
        exportDir: path.join(process.cwd(), 'exports'),
        maxFileSize: 100 * 1024 * 1024,
        supportedFormats: ['json', 'csv', 'excel', 'pdf', 'zip'],
      });
    }
    return this.exportService;
  }

  private resolveExportDataType(value: string): ExportJobRequest['dataType'] {
    const normalized = value.toLowerCase();
    const mapping: Record<string, ExportJobRequest['dataType']> = {
      [this.dataTypes.TEST_RESULTS]: 'test_results',
      [this.dataTypes.USER_DATA]: 'users',
      [this.dataTypes.SYSTEM_LOGS]: 'logs',
      [this.dataTypes.ANALYTICS]: 'analytics',
      [this.dataTypes.REPORTS]: 'reports',
      test_results: 'test_results',
      users: 'users',
      logs: 'logs',
      analytics: 'analytics',
      reports: 'reports',
    };
    const resolved = mapping[normalized];
    if (!resolved) {
      throw new Error(`不支持的数据类型: ${value}`);
    }
    return resolved;
  }

  private resolveRecordType(
    record: Record<string, unknown>,
    recordData: Record<string, unknown>
  ): string {
    return String(
      record.type ||
        record.dataType ||
        recordData.type ||
        recordData.dataType ||
        this.dataTypes.TEST_RESULTS
    );
  }

  private async saveVersionSnapshot(
    record: DataRecord,
    action: 'update' | 'delete' | 'restore',
    userId?: string,
    workspaceId?: string
  ) {
    const version = Number(record.metadata.version || 1);
    await query(
      `INSERT INTO data_record_versions
        (record_id, type, workspace_id, data, metadata, version, action, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        record.id,
        record.type,
        workspaceId || null,
        JSON.stringify(record.data),
        JSON.stringify(record.metadata),
        version,
        action,
        userId || null,
      ]
    );
  }

  private async upsertRestoredRecord(payload: {
    id: string;
    type: string;
    data: Record<string, unknown>;
    metadata: Record<string, unknown>;
    userId: string;
    workspaceId?: string;
    mode: 'merge' | 'overwrite';
  }) {
    const { id, type, data, metadata, userId, workspaceId, mode } = payload;
    const now = new Date().toISOString();
    const baseMetadata: DataRecordMetadata = {
      createdAt: (metadata.createdAt as string) || now,
      updatedAt: now,
      version: Number(metadata.version || 1),
      tags: (metadata.tags as string[]) || [],
      source: (metadata.source as string) || 'restore',
      userId: (metadata.userId as string) || userId,
      updatedBy: userId,
    };

    if (mode === 'overwrite') {
      const existing = await query(
        `SELECT id, type, data, metadata FROM data_records WHERE id = $1`,
        [id]
      );
      if (existing.rows.length) {
        const record = existing.rows[0] as DataRecord;
        await this.saveVersionSnapshot(record, 'restore', userId, workspaceId);
        baseMetadata.version = Number(record.metadata?.version || 1) + 1;
      }
    }

    this.validateData(type, data);

    await query(
      `INSERT INTO data_records (id, type, workspace_id, data, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id)
       DO UPDATE SET data = $4, metadata = $5, updated_at = NOW(), deleted_at = NULL`,
      [id, type, workspaceId || null, JSON.stringify(data), JSON.stringify(baseMetadata)]
    );
  }
}

const dataManagementService = new DataManagementService();

export { DataManagementService, dataManagementService };

// 兼容 CommonJS require
module.exports = {
  DataManagementService,
  dataManagementService,
};
