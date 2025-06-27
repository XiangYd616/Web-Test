import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface TestResult {
  id: string;
  user_id: string;
  url: string;
  type: 'stress' | 'content' | 'compatibility' | 'security' | 'api' | 'ux' | 'monitoring';
  status: 'running' | 'success' | 'warning' | 'error' | 'cancelled';
  start_time: Date;
  end_time?: Date;
  duration?: number;
  config: any;
  results: any;
  summary?: string;
  error_message?: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  created_at: Date;
  updated_at: Date;
}

export interface CreateTestData {
  user_id: string;
  url: string;
  type: TestResult['type'];
  config: any;
  tags?: string[];
  priority?: TestResult['priority'];
}

export interface UpdateTestData {
  status?: TestResult['status'];
  end_time?: Date;
  duration?: number;
  results?: any;
  summary?: string;
  error_message?: string;
  tags?: string[];
}

export interface TestFilter {
  user_id?: string;
  type?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  start_date?: Date;
  end_date?: Date;
  search?: string;
}

export class TestResultModel {
  // 创建测试记录
  static async create(testData: CreateTestData): Promise<TestResult> {
    const { user_id, url, type, config, tags = [], priority = 'medium' } = testData;

    try {
      const query = `
        INSERT INTO test_results (user_id, url, type, config, tags, priority)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await db.query(query, [
        user_id,
        url,
        type,
        JSON.stringify(config),
        tags,
        priority
      ]);

      const test = result.rows[0];
      logger.info('测试记录创建成功', { testId: test.id, userId: user_id, type, url });
      return test;
    } catch (error) {
      logger.error('测试记录创建失败', { user_id, url, type, error });
      throw error;
    }
  }

  // 根据ID查找测试
  static async findById(id: string): Promise<TestResult | null> {
    try {
      const query = 'SELECT * FROM test_results WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('查找测试记录失败', { id, error });
      throw error;
    }
  }

  // 更新测试记录
  static async update(id: string, updateData: UpdateTestData): Promise<TestResult | null> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // 构建动态更新查询
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          if (key === 'results' || key === 'config') {
            fields.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        throw new Error('没有提供更新数据');
      }

      const query = `
        UPDATE test_results 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      values.push(id);

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      const test = result.rows[0];
      logger.info('测试记录更新成功', { testId: id, fields: Object.keys(updateData) });
      return test;
    } catch (error) {
      logger.error('测试记录更新失败', { id, error });
      throw error;
    }
  }

  // 删除测试记录
  static async delete(id: string): Promise<boolean> {
    try {
      const query = 'DELETE FROM test_results WHERE id = $1';
      const result = await db.query(query, [id]);
      
      const deleted = result.rowCount > 0;
      if (deleted) {
        logger.info('测试记录删除成功', { testId: id });
      }
      
      return deleted;
    } catch (error) {
      logger.error('测试记录删除失败', { id, error });
      throw error;
    }
  }

  // 获取测试列表
  static async findMany(
    filter: TestFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ tests: TestResult[]; total: number; totalPages: number }> {
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // 构建过滤条件
      if (filter.user_id) {
        conditions.push(`user_id = $${paramIndex}`);
        values.push(filter.user_id);
        paramIndex++;
      }

      if (filter.type) {
        conditions.push(`type = $${paramIndex}`);
        values.push(filter.type);
        paramIndex++;
      }

      if (filter.status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(filter.status);
        paramIndex++;
      }

      if (filter.priority) {
        conditions.push(`priority = $${paramIndex}`);
        values.push(filter.priority);
        paramIndex++;
      }

      if (filter.tags && filter.tags.length > 0) {
        conditions.push(`tags && $${paramIndex}`);
        values.push(filter.tags);
        paramIndex++;
      }

      if (filter.start_date) {
        conditions.push(`start_time >= $${paramIndex}`);
        values.push(filter.start_date);
        paramIndex++;
      }

      if (filter.end_date) {
        conditions.push(`start_time <= $${paramIndex}`);
        values.push(filter.end_date);
        paramIndex++;
      }

      if (filter.search) {
        conditions.push(`(url ILIKE $${paramIndex} OR summary ILIKE $${paramIndex})`);
        values.push(`%${filter.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 获取总数
      const countQuery = `SELECT COUNT(*) FROM test_results ${whereClause}`;
      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // 获取分页数据
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT tr.*, u.username, u.full_name
        FROM test_results tr
        LEFT JOIN users u ON tr.user_id = u.id
        ${whereClause}
        ORDER BY tr.start_time DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(limit, offset);

      const dataResult = await db.query(dataQuery, values);
      const tests = dataResult.rows;

      return {
        tests,
        total,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('获取测试列表失败', { filter, page, limit, error });
      throw error;
    }
  }

  // 获取用户的测试统计
  static async getUserStats(userId: string): Promise<any> {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM test_results WHERE user_id = $1',
        'SELECT COUNT(*) as success FROM test_results WHERE user_id = $1 AND status = \'success\'',
        'SELECT COUNT(*) as running FROM test_results WHERE user_id = $1 AND status = \'running\'',
        'SELECT COUNT(*) as failed FROM test_results WHERE user_id = $1 AND status IN (\'error\', \'warning\')',
        'SELECT type, COUNT(*) as count FROM test_results WHERE user_id = $1 GROUP BY type',
        'SELECT AVG(duration) as avg_duration FROM test_results WHERE user_id = $1 AND duration IS NOT NULL',
      ];

      const results = await Promise.all(queries.map(query => db.query(query, [userId])));

      return {
        total: parseInt(results[0].rows[0].total),
        success: parseInt(results[1].rows[0].success),
        running: parseInt(results[2].rows[0].running),
        failed: parseInt(results[3].rows[0].failed),
        byType: results[4].rows.reduce((acc, row) => {
          acc[row.type] = parseInt(row.count);
          return acc;
        }, {}),
        avgDuration: parseFloat(results[5].rows[0].avg_duration) || 0,
      };
    } catch (error) {
      logger.error('获取用户测试统计失败', { userId, error });
      throw error;
    }
  }

  // 获取系统测试统计
  static async getSystemStats(): Promise<any> {
    try {
      const queries = [
        'SELECT COUNT(*) as total FROM test_results',
        'SELECT COUNT(*) as success FROM test_results WHERE status = \'success\'',
        'SELECT COUNT(*) as running FROM test_results WHERE status = \'running\'',
        'SELECT COUNT(*) as failed FROM test_results WHERE status IN (\'error\', \'warning\')',
        'SELECT COUNT(*) as today FROM test_results WHERE start_time >= CURRENT_DATE',
        'SELECT type, COUNT(*) as count FROM test_results GROUP BY type',
        'SELECT AVG(duration) as avg_duration FROM test_results WHERE duration IS NOT NULL',
        `SELECT DATE(start_time) as date, COUNT(*) as count 
         FROM test_results 
         WHERE start_time >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(start_time)
         ORDER BY date`,
      ];

      const results = await Promise.all(queries.map(query => db.query(query)));

      return {
        total: parseInt(results[0].rows[0].total),
        success: parseInt(results[1].rows[0].success),
        running: parseInt(results[2].rows[0].running),
        failed: parseInt(results[3].rows[0].failed),
        today: parseInt(results[4].rows[0].today),
        byType: results[5].rows.reduce((acc, row) => {
          acc[row.type] = parseInt(row.count);
          return acc;
        }, {}),
        avgDuration: parseFloat(results[6].rows[0].avg_duration) || 0,
        dailyStats: results[7].rows,
      };
    } catch (error) {
      logger.error('获取系统测试统计失败', error);
      throw error;
    }
  }

  // 取消测试
  static async cancel(id: string): Promise<boolean> {
    try {
      const query = `
        UPDATE test_results 
        SET status = 'cancelled', end_time = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'running'
        RETURNING id
      `;
      
      const result = await db.query(query, [id]);
      const cancelled = result.rowCount > 0;
      
      if (cancelled) {
        logger.info('测试已取消', { testId: id });
      }
      
      return cancelled;
    } catch (error) {
      logger.error('取消测试失败', { id, error });
      throw error;
    }
  }

  // 获取运行中的测试
  static async getRunningTests(): Promise<TestResult[]> {
    try {
      const query = `
        SELECT tr.*, u.username, u.full_name
        FROM test_results tr
        LEFT JOIN users u ON tr.user_id = u.id
        WHERE tr.status = 'running'
        ORDER BY tr.start_time ASC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('获取运行中测试失败', error);
      throw error;
    }
  }

  // 清理过期的测试记录
  static async cleanupOldTests(daysToKeep: number = 90): Promise<number> {
    try {
      const query = `
        DELETE FROM test_results
        WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        AND status NOT IN ('running')
      `;

      const result = await db.query(query);
      const deletedCount = result.rowCount;

      logger.info('清理过期测试记录', { deletedCount, daysToKeep });
      return deletedCount;
    } catch (error) {
      logger.error('清理过期测试记录失败', { daysToKeep, error });
      throw error;
    }
  }

  // 分页查询测试结果（为测试历史功能优化）
  static async findWithPagination(
    conditions: any = {},
    limit: number = 10,
    offset: number = 0,
    orderBy: [string, string][] = [['created_at', 'DESC']]
  ): Promise<{ tests: TestResult[], total: number }> {
    try {
      let whereClause = 'WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      // 构建WHERE条件
      Object.entries(conditions).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object' && (value as any).$ilike) {
            whereClause += ` AND ${key} ILIKE $${paramIndex}`;
            values.push((value as any).$ilike);
          } else if (typeof value === 'object' && (value as any).$gte) {
            whereClause += ` AND ${key} >= $${paramIndex}`;
            values.push((value as any).$gte);
          } else {
            whereClause += ` AND ${key} = $${paramIndex}`;
            values.push(value);
          }
          paramIndex++;
        }
      });

      // 构建ORDER BY子句
      const orderClause = orderBy.length > 0
        ? `ORDER BY ${orderBy.map(([col, dir]) => `${col} ${dir}`).join(', ')}`
        : 'ORDER BY created_at DESC';

      // 查询总数
      const countQuery = `SELECT COUNT(*) FROM test_results ${whereClause}`;
      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // 查询数据
      const dataQuery = `
        SELECT tr.*, u.username, u.full_name
        FROM test_results tr
        LEFT JOIN users u ON tr.user_id = u.id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(limit, offset);

      const dataResult = await db.query(dataQuery, values);

      return {
        tests: dataResult.rows,
        total
      };
    } catch (error) {
      logger.error('分页查询测试结果失败', { conditions, limit, offset, error });
      throw error;
    }
  }

  // 根据ID和用户ID查找测试结果
  static async findByIdAndUser(id: string, userId: string): Promise<TestResult | null> {
    try {
      const query = `
        SELECT tr.*, u.username, u.full_name
        FROM test_results tr
        LEFT JOIN users u ON tr.user_id = u.id
        WHERE tr.id = $1 AND tr.user_id = $2
      `;
      const result = await db.query(query, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('根据ID和用户ID查找测试结果失败', { id, userId, error });
      throw error;
    }
  }

  // 获取用户的测试统计信息（支持条件筛选）
  static async getStatsByUser(userId: string, conditions: any = {}): Promise<any> {
    try {
      let whereClause = 'WHERE user_id = $1';
      const values: any[] = [userId];
      let paramIndex = 2;

      // 添加额外条件
      Object.entries(conditions).forEach(([key, value]) => {
        if (key !== 'user_id' && value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object' && (value as any).$gte) {
            whereClause += ` AND ${key} >= $${paramIndex}`;
            values.push((value as any).$gte);
          } else if (typeof value === 'object' && (value as any).$ilike) {
            whereClause += ` AND ${key} ILIKE $${paramIndex}`;
            values.push((value as any).$ilike);
          } else {
            whereClause += ` AND ${key} = $${paramIndex}`;
            values.push(value);
          }
          paramIndex++;
        }
      });

      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
          COUNT(CASE WHEN status IN ('error', 'warning') THEN 1 END) as failed,
          AVG(CASE WHEN duration IS NOT NULL THEN duration END) as avg_response_time
        FROM test_results
        ${whereClause}
      `;

      const result = await db.query(query, values);
      const stats = result.rows[0];

      return {
        total: parseInt(stats.total),
        successful: parseInt(stats.successful),
        failed: parseInt(stats.failed),
        avgResponseTime: stats.avg_response_time ? Math.round(parseFloat(stats.avg_response_time) * 1000) : null
      };
    } catch (error) {
      logger.error('获取用户测试统计失败', { userId, conditions, error });
      throw error;
    }
  }

  // 获取详细统计信息
  static async getDetailedStats(userId: string, conditions: any = {}): Promise<any> {
    try {
      const basicStats = await this.getStatsByUser(userId, conditions);

      let whereClause = 'WHERE user_id = $1';
      const values: any[] = [userId];
      let paramIndex = 2;

      // 添加额外条件
      Object.entries(conditions).forEach(([key, value]) => {
        if (key !== 'user_id' && value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object' && (value as any).$gte) {
            whereClause += ` AND ${key} >= $${paramIndex}`;
            values.push((value as any).$gte);
          } else {
            whereClause += ` AND ${key} = $${paramIndex}`;
            values.push(value);
          }
          paramIndex++;
        }
      });

      // 按测试类型统计
      const typeStatsQuery = `
        SELECT
          type,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful
        FROM test_results
        ${whereClause}
        GROUP BY type
      `;

      const typeStatsResult = await db.query(typeStatsQuery, values);

      // 按日期统计（最近7天）
      const dateStatsQuery = `
        SELECT
          DATE(created_at) as test_date,
          COUNT(*) as count
        FROM test_results
        ${whereClause} AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY test_date
      `;

      const dateStatsResult = await db.query(dateStatsQuery, values);

      return {
        ...basicStats,
        byType: typeStatsResult.rows,
        byDate: dateStatsResult.rows
      };
    } catch (error) {
      logger.error('获取详细统计信息失败', { userId, conditions, error });
      throw error;
    }
  }

  // 查询所有测试结果（用于分析）
  static async findAll(conditions: any = {}): Promise<TestResult[]> {
    try {
      const whereClause = (this as any).buildWhereClause(conditions);
      const query = `
        SELECT * FROM test_results
        ${whereClause.clause}
        ORDER BY created_at DESC
      `;

      const result = await (global as any).pool.query(query, whereClause.values);
      return result.rows.map((row: any) => row);
    } catch (error) {
      logger.error('查询所有测试结果失败', { conditions, error });
      throw error;
    }
  }
}
