import { db } from '../config/database';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export interface DataTaskData {
  id?: string;
  user_id: string;
  type: 'import' | 'export';
  data_type: 'users' | 'tests' | 'reports' | 'logs' | 'all';
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  config: Record<string, any>;
  file_path?: string;
  file_size?: number;
  records_processed: number;
  total_records?: number;
  progress: number;
  error_message?: string;
  errors: any[];
  started_at?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class DataTask {
  public id?: string;
  public user_id: string;
  public type: 'import' | 'export';
  public data_type: 'users' | 'tests' | 'reports' | 'logs' | 'all';
  public format: 'json' | 'csv' | 'xlsx' | 'pdf';
  public status: 'pending' | 'processing' | 'completed' | 'failed';
  public config: Record<string, any>;
  public file_path?: string;
  public file_size?: number;
  public records_processed: number;
  public total_records?: number;
  public progress: number;
  public error_message?: string;
  public errors: any[];
  public started_at?: Date;
  public completed_at?: Date;
  public created_at?: Date;
  public updated_at?: Date;

  constructor(data: DataTaskData) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.data_type = data.data_type;
    this.format = data.format;
    this.status = data.status;
    this.config = data.config;
    this.file_path = data.file_path;
    this.file_size = data.file_size;
    this.records_processed = data.records_processed;
    this.total_records = data.total_records;
    this.progress = data.progress;
    this.error_message = data.error_message;
    this.errors = data.errors;
    this.started_at = data.started_at;
    this.completed_at = data.completed_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // 创建数据任务
  static async create(data: Omit<DataTaskData, 'id' | 'records_processed' | 'progress' | 'errors' | 'created_at' | 'updated_at'>): Promise<DataTask> {
    try {
      const query = `
        INSERT INTO data_tasks (
          user_id, type, data_type, format, status, config, 
          file_path, file_size, total_records, error_message,
          started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const values = [
        data.user_id,
        data.type,
        data.data_type,
        data.format,
        data.status,
        JSON.stringify(data.config),
        data.file_path,
        data.file_size,
        data.total_records,
        data.error_message,
        data.started_at,
        data.completed_at
      ];

      const result = await db.query(query, values);
      const task = new DataTask(result.rows[0]);

      logger.info('数据任务创建成功', { taskId: task.id, type: data.type, dataType: data.data_type, userId: data.user_id });
      return task;
    } catch (error) {
      logger.error('创建数据任务失败', { error, data });
      throw error;
    }
  }

  // 根据用户ID查找任务
  static async findByUserId(userId: string, limit: number = 50): Promise<DataTask[]> {
    try {
      const query = `
        SELECT * FROM data_tasks
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const result = await db.query(query, [userId, limit]);
      return result.rows.map(row => new DataTask(row));
    } catch (error) {
      logger.error('查找用户数据任务失败', { error, userId });
      throw error;
    }
  }

  // 根据ID查找任务
  static async findById(id: string): Promise<DataTask | null> {
    try {
      const query = 'SELECT * FROM data_tasks WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new DataTask(result.rows[0]);
    } catch (error) {
      logger.error('查找数据任务失败', { error, id });
      throw error;
    }
  }

  // 更新任务状�?  async updateStatus(status: DataTaskData['status'], errorMessage?: string): Promise<void> {
    try {
      const updates: any = { status };
      
      if (status === 'processing' && !this.started_at) {
        updates.started_at = new Date();
      }
      
      if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date();
        if (status === 'completed') {
          updates.progress = 100;
        }
      }
      
      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const query = `
        UPDATE data_tasks 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
      `;
      
      const values = [this.id, ...Object.values(updates)];
      await db.query(query, values);

      // 更新本地属�?      Object.assign(this, updates);
      this.updated_at = new Date();

      logger.info('数据任务状态更�?, { taskId: this.id, status, errorMessage });
    } catch (error) {
      logger.error('更新数据任务状态失�?, { error, taskId: this.id, status });
      throw error;
    }
  }

  // 更新进度
  async updateProgress(recordsProcessed: number, totalRecords?: number): Promise<void> {
    try {
      const updates: any = { records_processed: recordsProcessed };
      
      if (totalRecords !== undefined) {
        updates.total_records = totalRecords;
      }
      
      const total = totalRecords || this.total_records || recordsProcessed;
      updates.progress = total > 0 ? Math.round((recordsProcessed / total) * 100) : 0;

      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const query = `
        UPDATE data_tasks 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
      `;
      
      const values = [this.id, ...Object.values(updates)];
      await db.query(query, values);

      // 更新本地属�?      Object.assign(this, updates);
      this.updated_at = new Date();
    } catch (error) {
      logger.error('更新数据任务进度失败', { error, taskId: this.id });
      throw error;
    }
  }

  // 添加错误
  async addError(error: any): Promise<void> {
    try {
      const newErrors = [...this.errors, error];
      
      const query = `
        UPDATE data_tasks 
        SET errors = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await db.query(query, [JSON.stringify(newErrors), this.id]);
      this.errors = newErrors;
      this.updated_at = new Date();
    } catch (dbError) {
      logger.error('添加数据任务错误失败', { error: dbError, taskId: this.id });
      throw dbError;
    }
  }

  // 删除任务
  static async delete(id: string, userId: string): Promise<boolean> {
    try {
      // 先查找任务以获取文件路径
      const task = await this.findById(id);
      if (task && task.user_id === userId && task.file_path) {
        try {
          await fs.unlink(task.file_path);
        } catch (fileError) {
          logger.warn('删除任务文件失败', { error: fileError, filePath: task.file_path });
        }
      }

      const query = 'DELETE FROM data_tasks WHERE id = $1 AND user_id = $2';
      const result = await db.query(query, [id, userId]);
      
      logger.info('数据任务删除成功', { taskId: id, userId });
      return result.rowCount > 0;
    } catch (error) {
      logger.error('删除数据任务失败', { error, id, userId });
      throw error;
    }
  }

  // 获取任务统计
  static async getStats(userId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
    byDataType: Record<string, number>;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          type,
          data_type
        FROM data_tasks 
        WHERE user_id = $1
        GROUP BY type, data_type
      `;
      
      const result = await db.query(query, [userId]);
      
      const stats = {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        byType: {} as Record<string, number>,
        byDataType: {} as Record<string, number>
      };

      result.rows.forEach(row => {
        stats.total += parseInt(row.total);
        stats.pending += parseInt(row.pending);
        stats.processing += parseInt(row.processing);
        stats.completed += parseInt(row.completed);
        stats.failed += parseInt(row.failed);
        
        stats.byType[row.type] = (stats.byType[row.type] || 0) + parseInt(row.total);
        stats.byDataType[row.data_type] = (stats.byDataType[row.data_type] || 0) + parseInt(row.total);
      });

      return stats;
    } catch (error) {
      logger.error('获取数据任务统计失败', { error, userId });
      throw error;
    }
  }

  // 清理过期任务
  static async cleanupExpiredTasks(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // 查找要删除的任务文件
      const query = `
        SELECT file_path FROM data_tasks 
        WHERE created_at < $1 AND status IN ('completed', 'failed')
        AND file_path IS NOT NULL
      `;
      const result = await db.query(query, [cutoffDate]);

      // 删除文件
      for (const row of result.rows) {
        try {
          await fs.unlink(row.file_path);
        } catch (fileError) {
          logger.warn('删除过期任务文件失败', { error: fileError, filePath: row.file_path });
        }
      }

      // 删除数据库记�?      const deleteQuery = `
        DELETE FROM data_tasks 
        WHERE created_at < $1 AND status IN ('completed', 'failed')
      `;
      const deleteResult = await db.query(deleteQuery, [cutoffDate]);

      logger.info('清理过期数据任务完成', { deletedCount: deleteResult.rowCount, daysOld });
      return deleteResult.rowCount;
    } catch (error) {
      logger.error('清理过期数据任务失败', { error, daysOld });
      throw error;
    }
  }

  // 获取文件下载URL
  getDownloadUrl(): string | null {
    if (!this.file_path || this.status !== 'completed') {
      return null;
    }
    
    return `/api/data-management/download/${this.id}`;
  }

  // 检查任务是否可以取�?  canCancel(): boolean {
    return this.status === 'pending' || this.status === 'processing';
  }

  // 检查任务是否已完成
  isCompleted(): boolean {
    return this.status === 'completed' || this.status === 'failed';
  }

  // 静态方法：查找所有任�?  static async findAll(options: {
    where?: Record<string, any>;
    limit?: number;
    offset?: number;
    order?: [string, 'ASC' | 'DESC'][];
  } = {}): Promise<DataTask[]> {
    try {
      const { where = {}, limit, offset, order } = options;

      let query = 'SELECT * FROM data_tasks';
      const values: any[] = [];
      let paramIndex = 1;

      // 构建WHERE条件
      if (Object.keys(where).length > 0) {
        const conditions: string[] = [];
        for (const [key, value] of Object.entries(where)) {
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // 添加排序
      if (order && order.length > 0) {
        const orderClauses = order.map(([column, direction]) => `${column} ${direction}`);
        query += ` ORDER BY ${orderClauses.join(', ')}`;
      } else {
        query += ' ORDER BY created_at DESC';
      }

      // 添加分页
      if (limit) {
        query += ` LIMIT $${paramIndex}`;
        values.push(limit);
        paramIndex++;
      }
      if (offset) {
        query += ` OFFSET $${paramIndex}`;
        values.push(offset);
      }

      const result = await db.query(query, values);
      return result.rows.map(row => new DataTask(row));
    } catch (error) {
      logger.error('查找数据任务失败', error);
      throw error;
    }
  }

  // 静态方法：计数
  static async count(options: { where?: Record<string, any> } = {}): Promise<number> {
    try {
      const { where = {} } = options;

      let query = 'SELECT COUNT(*) as count FROM data_tasks';
      const values: any[] = [];
      let paramIndex = 1;

      // 构建WHERE条件
      if (Object.keys(where).length > 0) {
        const conditions: string[] = [];
        for (const [key, value] of Object.entries(where)) {
          conditions.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      const result = await db.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('计数数据任务失败', error);
      throw error;
    }
  }

  // 静态方法：查找单个任务
  static async findOne(options: {
    where: Record<string, any>;
  }): Promise<DataTask | null> {
    try {
      const { where } = options;

      let query = 'SELECT * FROM data_tasks';
      const values: any[] = [];
      let paramIndex = 1;

      // 构建WHERE条件
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(where)) {
        conditions.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      query += ` WHERE ${conditions.join(' AND ')} LIMIT 1`;

      const result = await db.query(query, values);
      return result.rows.length > 0 ? new DataTask(result.rows[0]) : null;
    } catch (error) {
      logger.error('查找单个数据任务失败', error);
      throw error;
    }
  }
}
