/**
 * 增强的测试历史服务
 * 提供完整的测试历史管理功能
 */

const { query } = require('../config/database');
const winston = require('winston');

class EnhancedTestHistoryService {
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
   * 获取增强的测试历史记录
   */
  async getEnhancedTestHistory(userId, queryParams = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        searchFields = ['test_name', 'url', 'tags'],
        testType,
        status,
        priority,
        environment,
        tags,
        category,
        dateFrom,
        dateTo,
        minScore,
        maxScore,
        sortBy = 'created_at',
        sortOrder = 'desc',
        includeResults = false,
        includeConfig = false,
        includeMetadata = false,
        includeComments = false,
        includeAttachments = false
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
      if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map(field => {
          const condition = `${field}::text ILIKE $${paramIndex}`;
          params.push(`%${search}%`);
          paramIndex++;
          return condition;
        });
        whereClause += ` AND (${searchConditions.join(' OR ')})`;
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

      // 优先级过滤
      if (priority) {
        whereClause += ` AND priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      // 环境过滤
      if (environment) {
        whereClause += ` AND environment = $${paramIndex}`;
        params.push(environment);
        paramIndex++;
      }

      // 标签过滤
      if (tags && tags.length > 0) {
        whereClause += ` AND tags && $${paramIndex}`;
        params.push(tags);
        paramIndex++;
      }

      // 分类过滤
      if (category) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(category);
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

      // 分数范围过滤
      if (minScore !== undefined) {
        whereClause += ` AND overall_score >= $${paramIndex}`;
        params.push(minScore);
        paramIndex++;
      }

      if (maxScore !== undefined) {
        whereClause += ` AND overall_score <= $${paramIndex}`;
        params.push(maxScore);
        paramIndex++;
      }

      // 构建选择字段
      let selectFields = `
        id, test_name, test_type, url, status, priority, environment,
        start_time, end_time, duration, created_at, updated_at,
        user_id, overall_score, tags, category, notes, view_count,
        share_count, bookmarked, report_path, report_url
      `;

      if (includeResults) {
        selectFields += ', results';
      }

      if (includeConfig) {
        selectFields += ', config';
      }

      if (includeMetadata) {
        selectFields += ', metadata';
      }

      // 排序
      const validSortFields = [
        'created_at', 'start_time', 'end_time', 'duration', 
        'overall_score', 'test_name', 'status', 'priority'
      ];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // 执行主查询
      const testsQuery = `
        SELECT ${selectFields}
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

      // 处理关联数据
      const tests = testsResult.rows;
      
      if (includeComments && tests.length > 0) {
        await this.includeComments(tests);
      }

      if (includeAttachments && tests.length > 0) {
        await this.includeAttachments(tests);
      }

      // 获取过滤器选项
      const filters = await this.getFilterOptions(userId);

      return {
        success: true,
        data: {
          tests: tests.map(test => this.formatTestRecord(test)),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: (page * limit) < total,
            hasPrev: page > 1
          },
          filters
        }
      };

    } catch (error) {
      this.logger.error('获取增强测试历史失败:', error);
      throw new Error(`获取测试历史失败: ${error.message}`);
    }
  }

  /**
   * 获取测试历史统计信息
   */
  async getTestHistoryStatistics(userId, timeRange = 30) {
    try {
      // 概览统计
      const overviewQuery = `
        SELECT 
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
          AVG(overall_score) as average_score,
          AVG(duration) as average_duration,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*)::float * 100) as success_rate
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
      `;

      const overviewResult = await query(overviewQuery, [userId]);

      // 按类型统计
      const byTypeQuery = `
        SELECT 
          test_type as type,
          COUNT(*) as count,
          AVG(overall_score) as average_score,
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / COUNT(*)::float * 100) as success_rate
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY test_type
        ORDER BY count DESC
      `;

      const byTypeResult = await query(byTypeQuery, [userId]);

      // 按状态统计
      const byStatusQuery = `
        SELECT 
          status,
          COUNT(*) as count,
          (COUNT(*)::float / (SELECT COUNT(*) FROM test_history WHERE user_id = $1)::float * 100) as percentage
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY status
        ORDER BY count DESC
      `;

      const byStatusResult = await query(byStatusQuery, [userId]);

      // 按时间范围统计
      const byTimeRangeQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          AVG(overall_score) as average_score
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const byTimeRangeResult = await query(byTimeRangeQuery, [userId]);

      // 热门URL统计
      const topUrlsQuery = `
        SELECT 
          url,
          COUNT(*) as count,
          AVG(overall_score) as average_score
        FROM test_history 
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY url
        ORDER BY count DESC
        LIMIT 10
      `;

      const topUrlsResult = await query(topUrlsQuery, [userId]);

      return {
        success: true,
        data: {
          overview: overviewResult.rows[0],
          byType: byTypeResult.rows,
          byStatus: byStatusResult.rows,
          byTimeRange: byTimeRangeResult.rows,
          topUrls: topUrlsResult.rows,
          recentActivity: byTimeRangeResult.rows.slice(0, 7)
        }
      };

    } catch (error) {
      this.logger.error('获取测试历史统计失败:', error);
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }

  /**
   * 批量操作测试记录
   */
  async batchOperation(userId, operation) {
    try {
      const { action, testIds, options = {} } = operation;

      if (!testIds || testIds.length === 0) {
        throw new Error('未提供测试ID');
      }

      let result;

      switch (action) {
        case 'delete':
          result = await this.batchDelete(userId, testIds);
          break;
        case 'archive':
          result = await this.batchArchive(userId, testIds);
          break;
        case 'tag':
          result = await this.batchTag(userId, testIds, options.tags);
          break;
        case 'category':
          result = await this.batchCategory(userId, testIds, options.category);
          break;
        default:
          throw new Error(`不支持的操作: ${action}`);
      }

      return {
        success: true,
        data: result,
        message: `批量${action}操作完成`
      };

    } catch (error) {
      this.logger.error('批量操作失败:', error);
      throw new Error(`批量操作失败: ${error.message}`);
    }
  }

  /**
   * 格式化测试记录
   */
  formatTestRecord(record) {
    return {
      ...record,
      // 确保数据类型正确
      duration: record.duration ? parseInt(record.duration) : null,
      overallScore: record.overall_score ? parseFloat(record.overall_score) : null,
      viewCount: record.view_count ? parseInt(record.view_count) : 0,
      shareCount: record.share_count ? parseInt(record.share_count) : 0,
      bookmarked: Boolean(record.bookmarked),
      // 解析JSON字段
      tags: record.tags || [],
      results: record.results ? (typeof record.results === 'string' ? JSON.parse(record.results) : record.results) : null,
      config: record.config ? (typeof record.config === 'string' ? JSON.parse(record.config) : record.config) : null,
      metadata: record.metadata ? (typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata) : null
    };
  }

  /**
   * 获取过滤器选项
   */
  async getFilterOptions(userId) {
    try {
      // 获取可用的测试类型
      const typesQuery = `
        SELECT DISTINCT test_type 
        FROM test_history 
        WHERE user_id = $1 
        ORDER BY test_type
      `;
      const typesResult = await query(typesQuery, [userId]);

      // 获取可用的状态
      const statusesQuery = `
        SELECT DISTINCT status 
        FROM test_history 
        WHERE user_id = $1 
        ORDER BY status
      `;
      const statusesResult = await query(statusesQuery, [userId]);

      // 获取可用的标签
      const tagsQuery = `
        SELECT DISTINCT unnest(tags) as tag 
        FROM test_history 
        WHERE user_id = $1 AND tags IS NOT NULL
        ORDER BY tag
      `;
      const tagsResult = await query(tagsQuery, [userId]);

      // 获取日期范围
      const dateRangeQuery = `
        SELECT 
          MIN(created_at) as earliest,
          MAX(created_at) as latest
        FROM test_history 
        WHERE user_id = $1
      `;
      const dateRangeResult = await query(dateRangeQuery, [userId]);

      // 获取分数范围
      const scoreRangeQuery = `
        SELECT 
          MIN(overall_score) as min,
          MAX(overall_score) as max
        FROM test_history 
        WHERE user_id = $1 AND overall_score IS NOT NULL
      `;
      const scoreRangeResult = await query(scoreRangeQuery, [userId]);

      return {
        availableTypes: typesResult.rows.map(row => row.test_type),
        availableStatuses: statusesResult.rows.map(row => row.status),
        availableTags: tagsResult.rows.map(row => row.tag),
        dateRange: dateRangeResult.rows[0] || { earliest: null, latest: null },
        scoreRange: scoreRangeResult.rows[0] || { min: 0, max: 100 }
      };

    } catch (error) {
      this.logger.error('获取过滤器选项失败:', error);
      return {
        availableTypes: [],
        availableStatuses: [],
        availableTags: [],
        dateRange: { earliest: null, latest: null },
        scoreRange: { min: 0, max: 100 }
      };
    }
  }

  /**
   * 包含评论数据
   */
  async includeComments(tests) {
    // 实现评论数据加载逻辑
    // 这里可以扩展评论功能
  }

  /**
   * 包含附件数据
   */
  async includeAttachments(tests) {
    // 实现附件数据加载逻辑
    // 这里可以扩展附件功能
  }

  /**
   * 批量删除
   */
  async batchDelete(userId, testIds) {
    const deleteQuery = `
      DELETE FROM test_history 
      WHERE user_id = $1 AND id = ANY($2)
    `;
    const result = await query(deleteQuery, [userId, testIds]);
    return { deletedCount: result.rowCount };
  }

  /**
   * 批量归档
   */
  async batchArchive(userId, testIds) {
    const archiveQuery = `
      UPDATE test_history 
      SET status = 'archived', updated_at = NOW()
      WHERE user_id = $1 AND id = ANY($2)
    `;
    const result = await query(archiveQuery, [userId, testIds]);
    return { archivedCount: result.rowCount };
  }

  /**
   * 批量标签
   */
  async batchTag(userId, testIds, tags) {
    const tagQuery = `
      UPDATE test_history 
      SET tags = $3, updated_at = NOW()
      WHERE user_id = $1 AND id = ANY($2)
    `;
    const result = await query(tagQuery, [userId, testIds, tags]);
    return { taggedCount: result.rowCount };
  }

  /**
   * 批量分类
   */
  async batchCategory(userId, testIds, category) {
    const categoryQuery = `
      UPDATE test_history 
      SET category = $3, updated_at = NOW()
      WHERE user_id = $1 AND id = ANY($2)
    `;
    const result = await query(categoryQuery, [userId, testIds, category]);
    return { categorizedCount: result.rowCount };
  }
}

module.exports = new EnhancedTestHistoryService();
