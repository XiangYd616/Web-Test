/**
 * 测试历史服务
 * 专门处理测试历史相关的数据操作
 */

const winston = require('winston');
const { getPool, query } = require('../../config/database');

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
   * 创建测试记录 - 增强版本，支持完整的生命周期管理
   */
  async createTestRecord(testData) {
    try {

      const {
        testName,
        testType = 'stress',
        url,
        status = 'pending',
        userId,
        config = {},
        results = {},
        tags = [],
        environment = 'production'
      } = testData;

      // 开始事务
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 创建测试记录
        const testResult = await client.query(
          `INSERT INTO test_history
           (test_name, test_type, url, status, user_id, config, results, tags, environment, created_at, start_time)
           VALUES ($1, $2, $3, $4::varchar, $5, $6, $7, $8, $9, NOW(), CASE WHEN $4::varchar = 'running' THEN NOW() ELSE NULL END)
           RETURNING *`,
          [
            testName,
            testType,
            url,
            status,
            userId,
            JSON.stringify(config),
            JSON.stringify(results),
            tags,
            environment
          ]
        );

        const testRecord = testResult.rows[0];

        // 记录初始状态
        await client.query(
          `INSERT INTO test_status_logs
           (test_history_id, from_status, to_status, reason, change_source)
           VALUES ($1, NULL, $2, $3, 'system')`,
          [testRecord.id, status, `Test record created with status: ${status}`]
        );

        // 如果是运行状态，记录初始进度
        if (status === 'running') {
          await client.query(
            `INSERT INTO test_progress_logs
             (test_history_id, progress_percentage, current_phase, current_step)
             VALUES ($1, 0, 'initialization', 'Test started')`,
            [testRecord.id]
          );
        }

        await client.query('COMMIT');

        this.logger.info(`测试记录创建成功: ${testRecord.id}`);

        return {
          success: true,
          data: this.formatTestRecord(testRecord)
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

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
        actualDuration,
        totalRequests,
        successfulRequests,
        failedRequests
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

      if (totalRequests !== undefined) {
        updates.push(`total_requests = $${paramIndex}`);
        params.push(totalRequests);
        paramIndex++;
      }

      if (successfulRequests !== undefined) {
        updates.push(`successful_requests = $${paramIndex}`);
        params.push(successfulRequests);
        paramIndex++;
      }

      if (failedRequests !== undefined) {
        updates.push(`failed_requests = $${paramIndex}`);
        params.push(failedRequests);
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
   * 开始测试 - 将状态更新为运行中
   */
  async startTest(testId, userId = null) {
    try {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 更新测试状态为运行中
        const result = await client.query(
          `UPDATE test_history
           SET status = 'running', start_time = NOW(), updated_at = NOW()
           WHERE id = $1 ${userId ? 'AND user_id = $2' : ''}
           RETURNING *`,
          userId ? [testId, userId] : [testId]
        );

        if (result.rows.length === 0) {
          throw new Error('测试记录不存在或无权限操作');
        }

        const testRecord = result.rows[0];

        // 记录进度
        await client.query(
          `INSERT INTO test_progress_logs
           (test_history_id, progress_percentage, current_phase, current_step)
           VALUES ($1, 0, 'initialization', 'Test execution started')`,
          [testId]
        );

        await client.query('COMMIT');

        this.logger.info(`测试开始: ${testId}`);

        return {
          success: true,
          data: this.formatTestRecord(testRecord)
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('开始测试失败:', error);
      throw new Error(`开始测试失败: ${error.message}`);
    }
  }

  /**
   * 更新测试进度
   */
  async updateTestProgress(testId, progressData) {
    try {

      const {
        progress = 0,
        phase = 'running',
        step = '',
        currentUsers = 0,
        currentTps = 0,
        currentResponseTime = 0,
        currentErrorRate = 0,
        metrics = {}
      } = progressData;

      // 记录进度日志
      await query(
        `INSERT INTO test_progress_logs
         (test_history_id, progress_percentage, current_phase, current_step,
          current_users, current_tps, current_response_time, current_error_rate, metrics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [testId, progress, phase, step, currentUsers, currentTps, currentResponseTime, currentErrorRate, JSON.stringify(metrics)]
      );

      this.logger.debug(`测试进度更新: ${testId} - ${progress}%`);

      return {
        success: true,
        message: '进度更新成功'
      };

    } catch (error) {
      this.logger.error('更新测试进度失败:', error);
      throw new Error(`更新测试进度失败: ${error.message}`);
    }
  }

  /**
   * 完成测试
   */
  async completeTest(testId, finalResults, userId = null) {
    try {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const {
          results = {},
          overallScore = null,
          performanceGrade = null,
          totalRequests = 0,
          successfulRequests = 0,
          failedRequests = 0,
          averageResponseTime = 0,
          peakTps = 0,
          errorRate = 0,
          realTimeData = []
        } = finalResults;

        // 计算持续时间
        const durationResult = await client.query(
          `SELECT EXTRACT(EPOCH FROM (NOW() - start_time))::integer as duration
           FROM test_history WHERE id = $1`,
          [testId]
        );

        const duration = durationResult.rows[0]?.duration || 0;

        // 更新测试记录
        const updateResult = await client.query(
          `UPDATE test_history
           SET status = 'completed',
               end_time = NOW(),
               duration = $2,
               results = $3,
               overall_score = $4,
               performance_grade = $5,
               total_requests = $6,
               successful_requests = $7,
               failed_requests = $8,
               average_response_time = $9,
               peak_tps = $10,
               error_rate = $11,
               real_time_data = $12,
               updated_at = NOW()
           WHERE id = $1 ${userId ? 'AND user_id = $13' : ''}
           RETURNING *`,
          userId ?
            [testId, duration, JSON.stringify(results), overallScore, performanceGrade,
              totalRequests, successfulRequests, failedRequests, averageResponseTime,
              peakTps, errorRate, JSON.stringify(realTimeData), userId] :
            [testId, duration, JSON.stringify(results), overallScore, performanceGrade,
              totalRequests, successfulRequests, failedRequests, averageResponseTime,
              peakTps, errorRate, JSON.stringify(realTimeData)]
        );

        if (updateResult.rows.length === 0) {
          throw new Error('测试记录不存在或无权限操作');
        }

        // 记录最终进度
        await client.query(
          `INSERT INTO test_progress_logs
           (test_history_id, progress_percentage, current_phase, current_step)
           VALUES ($1, 100, 'completed', 'Test completed successfully')`,
          [testId]
        );

        await client.query('COMMIT');

        this.logger.info(`测试完成: ${testId}`);

        return {
          success: true,
          data: this.formatTestRecord(updateResult.rows[0])
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('完成测试失败:', error);
      throw new Error(`完成测试失败: ${error.message}`);
    }
  }

  /**
   * 删除测试记录
   */
  async deleteTestRecord(testId, userId) {
    try {

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
   * 测试失败
   */
  async failTest(testId, errorMessage, errorDetails = {}, userId = null) {
    try {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 计算持续时间
        const durationResult = await client.query(
          `SELECT EXTRACT(EPOCH FROM (NOW() - start_time))::integer as duration
           FROM test_history WHERE id = $1`,
          [testId]
        );

        const duration = durationResult.rows[0]?.duration || 0;

        // 更新测试记录
        const updateResult = await client.query(
          `UPDATE test_history
           SET status = 'failed',
               end_time = NOW(),
               duration = $2,
               error_message = $3,
               error_details = $4,
               updated_at = NOW()
           WHERE id = $1 ${userId ? 'AND user_id = $5' : ''}
           RETURNING *`,
          userId ?
            [testId, duration, errorMessage, JSON.stringify(errorDetails), userId] :
            [testId, duration, errorMessage, JSON.stringify(errorDetails)]
        );

        if (updateResult.rows.length === 0) {
          throw new Error('测试记录不存在或无权限操作');
        }

        // 记录失败进度
        await client.query(
          `INSERT INTO test_progress_logs
           (test_history_id, progress_percentage, current_phase, current_step)
           VALUES ($1, -1, 'failed', $2)`,
          [testId, `Test failed: ${errorMessage}`]
        );

        await client.query('COMMIT');

        this.logger.warn(`测试失败: ${testId} - ${errorMessage}`);

        return {
          success: true,
          data: this.formatTestRecord(updateResult.rows[0])
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('标记测试失败失败:', error);
      throw new Error(`标记测试失败失败: ${error.message}`);
    }
  }

  /**
   * 取消测试
   */
  async cancelTest(testId, reason = '用户取消', userId = null) {
    try {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 计算持续时间
        const durationResult = await client.query(
          `SELECT EXTRACT(EPOCH FROM (NOW() - start_time))::integer as duration
           FROM test_history WHERE id = $1`,
          [testId]
        );

        const duration = durationResult.rows[0]?.duration || 0;

        // 更新测试记录
        const updateResult = await client.query(
          `UPDATE test_history
           SET status = 'cancelled',
               end_time = NOW(),
               duration = $2,
               error_message = $3,
               updated_at = NOW()
           WHERE id = $1 ${userId ? 'AND user_id = $4' : ''}
           RETURNING *`,
          userId ? [testId, duration, reason, userId] : [testId, duration, reason]
        );

        if (updateResult.rows.length === 0) {
          throw new Error('测试记录不存在或无权限操作');
        }

        // 记录取消进度
        await client.query(
          `INSERT INTO test_progress_logs
           (test_history_id, progress_percentage, current_phase, current_step)
           VALUES ($1, -1, 'cancelled', $2)`,
          [testId, reason]
        );

        await client.query('COMMIT');

        this.logger.info(`测试取消: ${testId} - ${reason}`);

        return {
          success: true,
          data: this.formatTestRecord(updateResult.rows[0])
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      this.logger.error('取消测试失败:', error);
      throw new Error(`取消测试失败: ${error.message}`);
    }
  }

  /**
   * 获取测试进度历史
   */
  async getTestProgress(testId, userId = null) {
    try {

      const whereClause = userId ?
        'WHERE tpl.test_history_id = $1 AND th.user_id = $2' :
        'WHERE tpl.test_history_id = $1';

      const params = userId ? [testId, userId] : [testId];

      const result = await query(
        `SELECT tpl.*, th.test_name, th.status as test_status
         FROM test_progress_logs tpl
         JOIN test_history th ON th.id = tpl.test_history_id
         ${whereClause}
         ORDER BY tpl.recorded_at ASC`,
        params
      );

      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      this.logger.error('获取测试进度失败:', error);
      throw new Error(`获取测试进度失败: ${error.message}`);
    }
  }

  /**
   * 批量删除测试记录
   */
  async batchDeleteTestRecords(testIds, userId) {
    try {

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
   * 格式化测试记录 - 增强版本
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

      // 性能评分
      overallScore: record.overall_score ? parseFloat(record.overall_score) : null,
      performanceGrade: record.performance_grade,

      // 配置和结果
      config: this.parseJsonField(record.config),
      results: this.parseJsonField(record.results),

      // 错误信息
      errorMessage: record.error_message,
      errorDetails: this.parseJsonField(record.error_details),

      // 统计信息
      totalRequests: record.total_requests ? parseInt(record.total_requests) : 0,
      successfulRequests: record.successful_requests ? parseInt(record.successful_requests) : 0,
      failedRequests: record.failed_requests ? parseInt(record.failed_requests) : 0,
      averageResponseTime: record.average_response_time ? parseFloat(record.average_response_time) : 0,
      peakTps: record.peak_tps ? parseFloat(record.peak_tps) : 0,
      errorRate: record.error_rate ? parseFloat(record.error_rate) : 0,

      // 实时数据
      realTimeData: this.parseJsonField(record.real_time_data) || [],

      // 标签和环境
      tags: record.tags || [],
      environment: record.environment || 'production',

      // 报告相关
      reportGenerated: record.report_generated || false,
      reportPath: record.report_path,

      // 添加兼容性字段
      timestamp: record.created_at || record.start_time,
      savedAt: record.created_at,

      // 计算实际持续时间
      actualDuration: record.end_time && record.start_time ?
        Math.floor((new Date(record.end_time) - new Date(record.start_time)) / 1000) : null,

      // 从结束时间推导完成时间
      completedAt: record.end_time,

      // 状态历史
      statusHistory: this.parseJsonField(record.status_history) || []
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
