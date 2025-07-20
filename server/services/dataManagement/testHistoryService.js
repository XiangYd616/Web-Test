/**
 * 测试历史服务
 * 专门处理测试历史相关的数据操作
 */

const winston = require('winston');

class TestHistoryService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/test-history.log' }),
        new winston.transports.Console()
      ]
    });
  }

  /**
   * 获取测试历史记录
   */
  async getTestHistory(userId, queryParams = {}) {
    try {
      const { query } = require('../../config/database');

      // 处理查询参数
      const {
        page = 1,
        limit = 20,
        search,
        testType,
        status,
        dateFrom,
        dateTo,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = queryParams;

      const offset = (page - 1) * limit;

      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      // 用户过滤
      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      // 搜索过滤
      if (search) {
        whereClause += ` AND (test_name ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // 测试类型过滤
      if (testType) {
        const types = Array.isArray(testType) ? testType : [testType];
        whereClause += ` AND test_type = ANY($${paramIndex})`;
        params.push(types);
        paramIndex++;
      }

      // 状态过滤
      if (status) {
        const statuses = Array.isArray(status) ? status : [status];
        whereClause += ` AND status = ANY($${paramIndex})`;
        params.push(statuses);
        paramIndex++;
      }

      // 日期范围过滤
      if (dateFrom) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
      }

      // 排序
      const validSortFields = ['created_at', 'start_time', 'duration', 'test_name', 'status'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // 执行主查询
      const testsQuery = `
        SELECT 
          id, test_name, test_type, url, status, start_time, 
          duration, created_at, user_id, config, results
        FROM test_history
        ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(parseInt(limit), offset);
      const testsResult = await query(testsQuery, params);

      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM test_history ${whereClause}`;
      const countResult = await query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // 格式化结果
      const tests = testsResult.rows.map(test => this.formatTestRecord(test));

      return {
        success: true,
        data: {
          tests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: (page * limit) < total,
            hasPrev: page > 1
          }
        }
      };

    } catch (error) {
      this.logger.error('获取测试历史失败:', error);
      throw new Error(`获取测试历史失败: ${error.message}`);
    }
  }

  /**
   * 获取单个测试记录详情
   */
  async getTestById(testId, userId) {
    try {
      const { query } = require('../../config/database');

      const result = await query(
        `SELECT * FROM test_history WHERE id = $1 AND user_id = $2`,
        [testId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('测试记录不存在');
      }

      return {
        success: true,
        data: this.formatTestRecord(result.rows[0])
      };

    } catch (error) {
      this.logger.error('获取测试详情失败:', error);
      throw new Error(`获取测试详情失败: ${error.message}`);
    }
  }

  /**
   * 创建测试记录
   */
  async createTestRecord(testData) {
    try {
      const { query } = require('../../config/database');

      const {
        testName,
        testType,
        url,
        status = 'pending',
        userId,
        config = {},
        results = null
      } = testData;

      const result = await query(
        `INSERT INTO test_history 
         (test_name, test_type, url, status, user_id, config, results, created_at, start_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [testName, testType, url, status, userId, JSON.stringify(config), results ? JSON.stringify(results) : null]
      );

      return {
        success: true,
        data: this.formatTestRecord(result.rows[0])
      };

    } catch (error) {
      this.logger.error('创建测试记录失败:', error);
      throw new Error(`创建测试记录失败: ${error.message}`);
    }
  }

  /**
   * 更新测试记录
   */
  async updateTestRecord(testId, updateData, userId = null) {
    try {
      const { query } = require('../../config/database');

      // 支持两种调用方式：updateTestRecord(id, data) 或 updateTestRecord(id, userId, data)
      let actualUpdateData, actualUserId;
      if (typeof updateData === 'string' && userId !== null) {
        // 旧的调用方式：updateTestRecord(testId, userId, updateData)
        actualUserId = updateData;
        actualUpdateData = userId;
      } else {
        // 新的调用方式：updateTestRecord(testId, updateData)
        actualUpdateData = updateData;
        actualUserId = userId;
      }

      const {
        status,
        results,
        duration,
        endTime,
        testName,
        url,
        config,
        overallScore,
        error: errorMsg,
        progress,
        currentPhase,
        completedAt,
        actualDuration
      } = actualUpdateData;

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (results !== undefined) {
        updates.push(`results = $${paramIndex}`);
        params.push(JSON.stringify(results));
        paramIndex++;
      }

      if (duration !== undefined) {
        updates.push(`duration = $${paramIndex}`);
        params.push(duration);
        paramIndex++;
      }

      if (endTime !== undefined) {
        updates.push(`end_time = $${paramIndex}`);
        params.push(endTime);
        paramIndex++;
      }

      if (testName !== undefined) {
        updates.push(`test_name = $${paramIndex}`);
        params.push(testName);
        paramIndex++;
      }

      if (url !== undefined) {
        updates.push(`url = $${paramIndex}`);
        params.push(url);
        paramIndex++;
      }

      if (config !== undefined) {
        updates.push(`config = $${paramIndex}`);
        params.push(JSON.stringify(config));
        paramIndex++;
      }

      if (overallScore !== undefined) {
        updates.push(`overall_score = $${paramIndex}`);
        params.push(overallScore);
        paramIndex++;
      }

      // 注意：error_message, completed_at, actual_duration 字段在当前数据库表中不存在
      // 这些信息可以通过其他字段推导或存储在 results 中

      if (updates.length === 0) {
        throw new Error('没有提供更新数据');
      }

      updates.push(`updated_at = NOW()`);

      // 构建WHERE条件
      let whereClause = `WHERE id = $${paramIndex}`;
      params.push(testId);
      paramIndex++;

      if (actualUserId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(actualUserId);
      }

      const result = await query(
        `UPDATE test_history
         SET ${updates.join(', ')}
         ${whereClause}
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('测试记录不存在或无权限更新');
      }

      return {
        success: true,
        data: this.formatTestRecord(result.rows[0])
      };

    } catch (error) {
      this.logger.error('更新测试记录失败:', error);
      throw new Error(`更新测试记录失败: ${error.message}`);
    }
  }

  /**
   * 删除测试记录
   */
  async deleteTestRecord(testId, userId) {
    try {
      const { query } = require('../../config/database');

      const result = await query(
        'DELETE FROM test_history WHERE id = $1 AND user_id = $2',
        [testId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('测试记录不存在或无权限删除');
      }

      return {
        success: true,
        message: '测试记录已删除'
      };

    } catch (error) {
      this.logger.error('删除测试记录失败:', error);
      throw new Error(`删除测试记录失败: ${error.message}`);
    }
  }

  /**
   * 批量删除测试记录
   */
  async batchDeleteTestRecords(testIds, userId) {
    try {
      const { query } = require('../../config/database');

      const result = await query(
        'DELETE FROM test_history WHERE id = ANY($1) AND user_id = $2',
        [testIds, userId]
      );

      return {
        success: true,
        data: { deletedCount: result.rowCount },
        message: `已删除 ${result.rowCount} 条记录`
      };

    } catch (error) {
      this.logger.error('批量删除测试记录失败:', error);
      throw new Error(`批量删除测试记录失败: ${error.message}`);
    }
  }

  /**
   * 格式化测试记录
   */
  formatTestRecord(record) {
    if (!record) return null;

    return {
      id: record.id,
      testName: record.test_name,
      testType: record.test_type,
      url: record.url,
      status: record.status,
      startTime: record.start_time,
      endTime: record.end_time,
      duration: record.duration ? parseInt(record.duration) : null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      userId: record.user_id,
      overallScore: record.overall_score ? parseFloat(record.overall_score) : null,
      config: this.parseJsonField(record.config),
      results: this.parseJsonField(record.results),
      // 添加兼容性字段
      timestamp: record.created_at || record.start_time,
      savedAt: record.created_at,
      // 计算实际持续时间
      actualDuration: record.end_time && record.start_time ?
        Math.floor((new Date(record.end_time) - new Date(record.start_time)) / 1000) : null,
      // 从结束时间推导完成时间
      completedAt: record.end_time
    };
  }

  /**
   * 解析JSON字段
   */
  parseJsonField(field) {
    if (!field) return null;
    if (typeof field === 'object') return field;

    try {
      return JSON.parse(field);
    } catch (error) {
      this.logger.warn('Failed to parse JSON field:', { field, error: error.message });
      return null;
    }
  }

  /**
   * 获取测试类型统计
   */
  async getTestTypeStats(userId, timeRange = 30) {
    try {
      const { query } = require('../../config/database');

      const result = await query(
        `SELECT 
           test_type,
           COUNT(*) as count,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
         FROM test_history 
         WHERE user_id = $1 
           AND created_at >= NOW() - INTERVAL '${timeRange} days'
         GROUP BY test_type
         ORDER BY count DESC`,
        [userId]
      );

      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      this.logger.error('获取测试类型统计失败:', error);
      throw new Error(`获取测试类型统计失败: ${error.message}`);
    }
  }
}

module.exports = TestHistoryService;
