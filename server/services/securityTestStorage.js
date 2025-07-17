/**
 * 安全测试结果数据库存储服务
 * 负责安全测试结果的数据库存储、查询和管理
 */

const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SecurityTestStorage {
  /**
   * 保存安全测试结果到数据库
   */
  async saveSecurityTestResult(testResult, userId = null) {
    try {
      console.log('💾 保存安全测试结果到数据库:', testResult.id);

      const testId = testResult.id || uuidv4();
      const now = new Date();

      // 准备数据
      const testData = {
        id: testId,
        user_id: userId,
        url: testResult.url,
        type: 'security',
        status: this.mapTestStatus(testResult.status),
        start_time: testResult.timestamp ? new Date(testResult.timestamp) : now,
        end_time: now,
        duration: testResult.duration || 0,
        config: JSON.stringify(testResult.config || {}),
        results: JSON.stringify(this.sanitizeResults(testResult)),
        summary: this.generateSummary(testResult),
        score: testResult.overallScore || testResult.securityScore || 0,
        metrics: JSON.stringify(testResult.statistics || {}),
        tags: this.extractTags(testResult),
        category: 'security_scan',
        priority: this.determinePriority(testResult),
        created_at: now,
        updated_at: now
      };

      // 插入到数据库
      const insertQuery = `
        INSERT INTO test_results (
          id, user_id, url, type, status, start_time, end_time, duration,
          config, results, summary, score, metrics, tags, category, priority,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          end_time = EXCLUDED.end_time,
          duration = EXCLUDED.duration,
          results = EXCLUDED.results,
          summary = EXCLUDED.summary,
          score = EXCLUDED.score,
          metrics = EXCLUDED.metrics,
          updated_at = EXCLUDED.updated_at
        RETURNING id
      `;

      const values = [
        testData.id, testData.user_id, testData.url, testData.type, testData.status,
        testData.start_time, testData.end_time, testData.duration, testData.config,
        testData.results, testData.summary, testData.score, testData.metrics,
        testData.tags, testData.category, testData.priority, testData.created_at,
        testData.updated_at
      ];

      const result = await query(insertQuery, values);
      
      // 记录活动日志
      await this.logActivity(userId, 'security_test_saved', testId, {
        url: testResult.url,
        score: testData.score,
        duration: testData.duration
      });

      console.log('✅ 安全测试结果已保存到数据库:', testId);
      return { success: true, testId: testId };

    } catch (error) {
      console.error('❌ 保存安全测试结果失败:', error);
      throw new Error(`保存安全测试结果失败: ${error.message}`);
    }
  }

  /**
   * 获取安全测试历史记录
   */
  async getSecurityTestHistory(userId = null, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC',
        status = null,
        dateFrom = null,
        dateTo = null
      } = options;

      let whereClause = "WHERE type = 'security'";
      const queryParams = [];
      let paramIndex = 1;

      // 用户过滤
      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      }

      // 状态过滤
      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      // 日期范围过滤
      if (dateFrom) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        queryParams.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        queryParams.push(dateTo);
        paramIndex++;
      }

      const selectQuery = `
        SELECT 
          id, user_id, url, status, start_time, end_time, duration,
          score, summary, tags, category, priority, created_at, updated_at,
          (results->>'overallScore')::numeric as overall_score,
          (results->>'riskLevel') as risk_level,
          (results->'statistics'->>'totalChecks')::integer as total_checks,
          (results->'statistics'->>'failedChecks')::integer as failed_checks
        FROM test_results 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await query(selectQuery, queryParams);

      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM test_results ${whereClause}`;
      const countResult = await query(countQuery, queryParams.slice(0, -2));

      return {
        success: true,
        data: result.rows.map(row => this.formatTestRecord(row)),
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit,
          offset,
          hasMore: (offset + limit) < parseInt(countResult.rows[0].total)
        }
      };

    } catch (error) {
      console.error('❌ 获取安全测试历史失败:', error);
      throw new Error(`获取安全测试历史失败: ${error.message}`);
    }
  }

  /**
   * 获取单个安全测试结果详情
   */
  async getSecurityTestResult(testId, userId = null) {
    try {
      let whereClause = "WHERE id = $1 AND type = 'security'";
      const queryParams = [testId];

      if (userId) {
        whereClause += " AND user_id = $2";
        queryParams.push(userId);
      }

      const selectQuery = `
        SELECT * FROM test_results ${whereClause}
      `;

      const result = await query(selectQuery, queryParams);

      if (result.rows.length === 0) {
        return { success: false, message: '测试结果不存在' };
      }

      const testResult = result.rows[0];
      
      return {
        success: true,
        data: {
          ...this.formatTestRecord(testResult),
          config: testResult.config,
          results: testResult.results,
          metrics: testResult.metrics
        }
      };

    } catch (error) {
      console.error('❌ 获取安全测试结果失败:', error);
      throw new Error(`获取安全测试结果失败: ${error.message}`);
    }
  }

  /**
   * 删除安全测试结果
   */
  async deleteSecurityTestResult(testId, userId = null) {
    try {
      let whereClause = "WHERE id = $1 AND type = 'security'";
      const queryParams = [testId];

      if (userId) {
        whereClause += " AND user_id = $2";
        queryParams.push(userId);
      }

      const deleteQuery = `DELETE FROM test_results ${whereClause} RETURNING id`;
      const result = await query(deleteQuery, queryParams);

      if (result.rows.length === 0) {
        return { success: false, message: '测试结果不存在或无权限删除' };
      }

      // 记录活动日志
      await this.logActivity(userId, 'security_test_deleted', testId);

      return { success: true, message: '测试结果已删除' };

    } catch (error) {
      console.error('❌ 删除安全测试结果失败:', error);
      throw new Error(`删除安全测试结果失败: ${error.message}`);
    }
  }

  /**
   * 获取安全测试统计信息
   */
  async getSecurityTestStatistics(userId = null, days = 30) {
    try {
      let whereClause = "WHERE type = 'security' AND created_at >= NOW() - INTERVAL '30 days'";
      const queryParams = [];

      if (userId) {
        whereClause += " AND user_id = $1";
        queryParams.push(userId);
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_tests,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_tests,
          AVG(score) as average_score,
          AVG(duration) as average_duration,
          COUNT(CASE WHEN score < 60 THEN 1 END) as low_score_tests,
          COUNT(CASE WHEN score >= 60 AND score < 80 THEN 1 END) as medium_score_tests,
          COUNT(CASE WHEN score >= 80 THEN 1 END) as high_score_tests
        FROM test_results ${whereClause}
      `;

      const result = await query(statsQuery, queryParams);
      const stats = result.rows[0];

      return {
        success: true,
        data: {
          totalTests: parseInt(stats.total_tests) || 0,
          successfulTests: parseInt(stats.successful_tests) || 0,
          failedTests: parseInt(stats.failed_tests) || 0,
          averageScore: parseFloat(stats.average_score) || 0,
          averageDuration: parseInt(stats.average_duration) || 0,
          scoreDistribution: {
            low: parseInt(stats.low_score_tests) || 0,
            medium: parseInt(stats.medium_score_tests) || 0,
            high: parseInt(stats.high_score_tests) || 0
          }
        }
      };

    } catch (error) {
      console.error('❌ 获取安全测试统计失败:', error);
      throw new Error(`获取安全测试统计失败: ${error.message}`);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 映射测试状态
   */
  mapTestStatus(status) {
    const statusMap = {
      'completed': 'success',
      'failed': 'error',
      'running': 'running',
      'pending': 'pending',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * 清理结果数据
   */
  sanitizeResults(testResult) {
    // 移除敏感信息和过大的数据
    const sanitized = { ...testResult };
    
    // 移除可能包含敏感信息的字段
    delete sanitized.config;
    delete sanitized.rawData;
    
    return sanitized;
  }

  /**
   * 生成测试摘要
   */
  generateSummary(testResult) {
    const score = testResult.overallScore || testResult.securityScore || 0;
    const riskLevel = testResult.riskLevel || 'unknown';
    const totalChecks = testResult.statistics?.totalChecks || 0;
    const failedChecks = testResult.statistics?.failedChecks || 0;
    
    return `安全评分: ${score}/100, 风险等级: ${riskLevel}, 检查项: ${totalChecks}, 失败: ${failedChecks}`;
  }

  /**
   * 提取标签
   */
  extractTags(testResult) {
    const tags = [];
    
    if (testResult.riskLevel) {
      tags.push(`risk:${testResult.riskLevel}`);
    }
    
    if (testResult.overallScore >= 80) {
      tags.push('high-score');
    } else if (testResult.overallScore < 60) {
      tags.push('low-score');
    }
    
    return tags;
  }

  /**
   * 确定优先级
   */
  determinePriority(testResult) {
    const score = testResult.overallScore || testResult.securityScore || 0;
    const riskLevel = testResult.riskLevel;
    
    if (riskLevel === 'critical' || score < 40) {
      return 'urgent';
    } else if (riskLevel === 'high' || score < 60) {
      return 'high';
    } else if (score < 80) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 格式化测试记录
   */
  formatTestRecord(row) {
    return {
      id: row.id,
      testName: `安全测试 - ${new URL(row.url).hostname}`,
      testType: 'security',
      url: row.url,
      status: row.status,
      score: parseFloat(row.score) || 0,
      duration: parseInt(row.duration) || 0,
      startTime: row.start_time?.toISOString(),
      endTime: row.end_time?.toISOString(),
      summary: row.summary,
      tags: row.tags || [],
      priority: row.priority,
      riskLevel: row.risk_level,
      totalChecks: row.total_checks,
      failedChecks: row.failed_checks,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }

  /**
   * 记录活动日志
   */
  async logActivity(userId, action, resourceId, metadata = {}) {
    try {
      if (!userId) return; // 匿名用户不记录日志

      const logQuery = `
        INSERT INTO activity_logs (
          user_id, action, resource_type, resource_id, description, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const description = this.getActionDescription(action, metadata);
      
      await query(logQuery, [
        userId,
        action,
        'test',
        resourceId,
        description,
        JSON.stringify(metadata),
        new Date()
      ]);

    } catch (error) {
      console.error('记录活动日志失败:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 获取操作描述
   */
  getActionDescription(action, metadata) {
    const descriptions = {
      'security_test_saved': `保存了安全测试结果，评分: ${metadata.score}`,
      'security_test_deleted': '删除了安全测试结果'
    };
    
    return descriptions[action] || action;
  }
}

// 导出单例实例
const securityTestStorage = new SecurityTestStorage();
module.exports = securityTestStorage;
