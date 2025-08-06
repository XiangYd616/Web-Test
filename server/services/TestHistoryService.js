/**
 * 测试历史服务 - 主从表设计
 * 支持7种测试类型的历史记录管理
 */

const { Pool } = require('pg');

class TestHistoryService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  /**
   * 获取测试历史列表（90%的查询场景）
   * 只查询主表，性能最佳
   */
  async getTestHistory(userId, testType, options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['user_id = $1', 'test_type = $2', 'deleted_at IS NULL'];
    let params = [userId, testType];
    let paramIndex = 3;

    // 搜索条件
    if (search) {
      whereConditions.push(`(test_name ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // 状态筛选
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // 构建查询
    const query = `
      SELECT 
        id, test_name, url, status, created_at, updated_at,
        start_time, end_time, duration, overall_score, grade,
        total_issues, critical_issues, major_issues, minor_issues,
        environment, tags, description
      FROM test_sessions 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM test_sessions 
      WHERE ${whereConditions.slice(0, -2).join(' AND ')}
    `;

    try {
      const [dataResult, countResult] = await Promise.all([
        this.db.query(query, params),
        this.db.query(countQuery, params.slice(0, -2))
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          tests: dataResult.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      console.error('获取测试历史失败:', error);
      return {
        success: false,
        error: '获取测试历史失败'
      };
    }
  }

  /**
   * 获取详细测试历史（10%的查询场景）
   * 使用视图查询，包含详细指标
   */
  async getDetailedTestHistory(userId, testType, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // 根据测试类型选择对应的视图
    const viewMap = {
      stress: 'stress_test_history',
      security: 'security_test_history',
      api: 'api_test_history',
      seo: 'seo_test_history',
      accessibility: 'accessibility_test_history',
      compatibility: 'compatibility_test_history',
      performance: 'performance_test_history'
    };

    const viewName = viewMap[testType];
    if (!viewName) {
      return {
        success: false,
        error: '不支持的测试类型'
      };
    }

    const query = `
      SELECT * FROM ${viewName}
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(query, [userId, limit, offset]);
      
      return {
        success: true,
        data: {
          tests: result.rows,
          pagination: {
            page,
            limit,
            hasNext: result.rows.length === limit
          }
        }
      };
    } catch (error) {
      console.error('获取详细测试历史失败:', error);
      return {
        success: false,
        error: '获取详细测试历史失败'
      };
    }
  }

  /**
   * 获取单个测试详情（1%的查询场景）
   * 需要JOIN查询获取完整信息
   */
  async getTestDetails(sessionId, userId) {
    // 首先获取基础信息
    const sessionQuery = `
      SELECT * FROM test_sessions 
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    `;

    try {
      const sessionResult = await this.db.query(sessionQuery, [sessionId, userId]);
      
      if (sessionResult.rows.length === 0) {
        return {
          success: false,
          error: '测试记录不存在'
        };
      }

      const session = sessionResult.rows[0];
      const testType = session.test_type;

      // 根据测试类型获取详细信息
      const detailsMap = {
        stress: 'stress_test_details',
        security: 'security_test_details',
        api: 'api_test_details',
        seo: 'seo_test_details',
        accessibility: 'accessibility_test_details',
        compatibility: 'compatibility_test_details',
        performance: 'performance_test_details'
      };

      const detailsTable = detailsMap[testType];
      if (!detailsTable) {
        return {
          success: true,
          data: { session, details: null }
        };
      }

      const detailsQuery = `
        SELECT * FROM ${detailsTable}
        WHERE session_id = $1
      `;

      const detailsResult = await this.db.query(detailsQuery, [sessionId]);

      // 获取文件资源
      const artifactsQuery = `
        SELECT * FROM test_artifacts
        WHERE session_id = $1
        ORDER BY created_at DESC
      `;

      const artifactsResult = await this.db.query(artifactsQuery, [sessionId]);

      return {
        success: true,
        data: {
          session,
          details: detailsResult.rows[0] || null,
          artifacts: artifactsResult.rows
        }
      };
    } catch (error) {
      console.error('获取测试详情失败:', error);
      return {
        success: false,
        error: '获取测试详情失败'
      };
    }
  }

  /**
   * 创建压力测试记录
   */
  async createStressTestResult(userId, testData) {
    const { testName, url, config, stressData } = testData;

    try {
      const result = await this.db.query(
        'SELECT insert_stress_test_result($1, $2, $3, $4, $5) as session_id',
        [userId, testName, url, config, stressData]
      );

      return {
        success: true,
        data: { sessionId: result.rows[0].session_id }
      };
    } catch (error) {
      console.error('创建压力测试记录失败:', error);
      return {
        success: false,
        error: '创建测试记录失败'
      };
    }
  }

  /**
   * 创建安全测试记录
   */
  async createSecurityTestResult(userId, testData) {
    const { testName, url, config, securityData } = testData;

    try {
      const result = await this.db.query(
        'SELECT insert_security_test_result($1, $2, $3, $4, $5) as session_id',
        [userId, testName, url, config, securityData]
      );

      return {
        success: true,
        data: { sessionId: result.rows[0].session_id }
      };
    } catch (error) {
      console.error('创建安全测试记录失败:', error);
      return {
        success: false,
        error: '创建测试记录失败'
      };
    }
  }

  /**
   * 软删除测试记录
   */
  async deleteTestSession(sessionId, userId) {
    // 验证权限
    const checkQuery = `
      SELECT id FROM test_sessions 
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    `;

    try {
      const checkResult = await this.db.query(checkQuery, [sessionId, userId]);
      
      if (checkResult.rows.length === 0) {
        return {
          success: false,
          error: '测试记录不存在或无权限删除'
        };
      }

      const result = await this.db.query(
        'SELECT soft_delete_test_session($1) as deleted',
        [sessionId]
      );

      return {
        success: result.rows[0].deleted,
        message: result.rows[0].deleted ? '删除成功' : '删除失败'
      };
    } catch (error) {
      console.error('删除测试记录失败:', error);
      return {
        success: false,
        error: '删除测试记录失败'
      };
    }
  }

  /**
   * 批量删除测试记录
   */
  async batchDeleteTestSessions(sessionIds, userId) {
    // 验证权限
    const checkQuery = `
      SELECT id FROM test_sessions 
      WHERE id = ANY($1) AND user_id = $2 AND deleted_at IS NULL
    `;

    try {
      const checkResult = await this.db.query(checkQuery, [sessionIds, userId]);
      const validIds = checkResult.rows.map(row => row.id);

      if (validIds.length === 0) {
        return {
          success: false,
          error: '没有可删除的测试记录'
        };
      }

      const result = await this.db.query(
        'SELECT batch_soft_delete_test_sessions($1) as deleted_count',
        [validIds]
      );

      return {
        success: true,
        data: {
          deletedCount: result.rows[0].deleted_count,
          requestedCount: sessionIds.length
        }
      };
    } catch (error) {
      console.error('批量删除测试记录失败:', error);
      return {
        success: false,
        error: '批量删除测试记录失败'
      };
    }
  }

  /**
   * 获取测试统计信息
   */
  async getTestStatistics(userId, timeRange = 30) {
    const query = `
      SELECT 
        test_type,
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        AVG(overall_score) as avg_score,
        AVG(duration) as avg_duration
      FROM test_sessions 
      WHERE user_id = $1 
        AND deleted_at IS NULL
        AND created_at >= CURRENT_DATE - INTERVAL '${timeRange} days'
      GROUP BY test_type
      ORDER BY total_tests DESC
    `;

    try {
      const result = await this.db.query(query, [userId]);
      
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('获取测试统计失败:', error);
      return {
        success: false,
        error: '获取测试统计失败'
      };
    }
  }
}

module.exports = TestHistoryService;
