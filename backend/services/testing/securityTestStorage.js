/**
 * 安全测试结果数据库存储服务
 * 负责安全测试结果的数据库存储、查询和管理
 */

const { query, transaction } = require('..\..\config\database.js');
const { v4: uuidv4 } = require('uuid');

class SecurityTestStorage {
  /**
   * 保存安全测试结果到数据库
   */
  async saveSecurityTestResult(testResult, userId = null) {
    try {
      console.log('💾 保存安全测试结果到数据库:', testResult.id);

      const sessionId = testResult.id || uuidv4();
      const now = new Date();

      // 准备主表数据
      const sessionData = {
        id: sessionId,
        user_id: userId,
        test_name: testResult.testName || `安全测试 - ${new URL(testResult.url).hostname}`,
        test_type: 'security',
        url: testResult.url,
        status: this.mapTestStatus(testResult.status),
        start_time: testResult.timestamp ? new Date(testResult.timestamp) : now,
        end_time: now,
        duration: Math.floor((testResult.duration || 0) / 1000), // 转换为秒
        overall_score: testResult.overallScore || testResult.securityScore || 0,
        grade: this.calculateGrade(testResult.overallScore || testResult.securityScore || 0),
        total_issues: testResult.statistics?.totalChecks || 0,
        critical_issues: testResult.statistics?.criticalIssues || 0,
        major_issues: testResult.statistics?.majorIssues || 0,
        minor_issues: testResult.statistics?.minorIssues || 0,
        config: testResult.config || {},
        environment: 'production',
        tags: this.extractTags(testResult),
        description: this.generateSummary(testResult)
      };

      // 插入主表
      const sessionInsertQuery = `
        INSERT INTO test_sessions (
          id, user_id, test_name, test_type, url, status, start_time, end_time, duration,
          overall_score, grade, total_issues, critical_issues, major_issues, minor_issues,
          config, environment, tags, description, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          end_time = EXCLUDED.end_time,
          duration = EXCLUDED.duration,
          overall_score = EXCLUDED.overall_score,
          grade = EXCLUDED.grade,
          total_issues = EXCLUDED.total_issues,
          critical_issues = EXCLUDED.critical_issues,
          major_issues = EXCLUDED.major_issues,
          minor_issues = EXCLUDED.minor_issues,
          updated_at = EXCLUDED.updated_at
        RETURNING id
      `;

      const sessionValues = [
        sessionData.id, sessionData.user_id, sessionData.test_name, sessionData.test_type,
        sessionData.url, sessionData.status, sessionData.start_time, sessionData.end_time,
        sessionData.duration, sessionData.overall_score, sessionData.grade,
        sessionData.total_issues, sessionData.critical_issues, sessionData.major_issues,
        sessionData.minor_issues, JSON.stringify(sessionData.config), sessionData.environment,
        JSON.stringify(sessionData.tags), sessionData.description, now, now
      ];

      await query(sessionInsertQuery, sessionValues);

      // 准备安全测试详情数据
      const securityData = {
        session_id: sessionId,
        security_score: testResult.overallScore || testResult.securityScore || 0,
        ssl_score: testResult.sslScore || 0,
        header_security_score: testResult.headerSecurityScore || 0,
        authentication_score: testResult.authenticationScore || 0,
        vulnerabilities_total: testResult.statistics?.totalVulnerabilities || 0,
        vulnerabilities_critical: testResult.statistics?.criticalVulnerabilities || 0,
        vulnerabilities_high: testResult.statistics?.highVulnerabilities || 0,
        vulnerabilities_medium: testResult.statistics?.mediumVulnerabilities || 0,
        vulnerabilities_low: testResult.statistics?.lowVulnerabilities || 0,
        sql_injection_found: testResult.vulnerabilities?.sqlInjection || 0,
        xss_vulnerabilities: testResult.vulnerabilities?.xss || 0,
        csrf_vulnerabilities: testResult.vulnerabilities?.csrf || 0,
        https_enforced: testResult.securityFeatures?.httpsEnforced || false,
        hsts_enabled: testResult.securityFeatures?.hstsEnabled || false,
        csrf_protection: testResult.securityFeatures?.csrfProtection || false
      };

      // 插入安全测试详情
      const securityInsertQuery = `
        INSERT INTO security_test_details (
          session_id, security_score, ssl_score, header_security_score, authentication_score,
          vulnerabilities_total, vulnerabilities_critical, vulnerabilities_high,
          vulnerabilities_medium, vulnerabilities_low, sql_injection_found,
          xss_vulnerabilities, csrf_vulnerabilities, https_enforced, hsts_enabled,
          csrf_protection, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (session_id) DO UPDATE SET
          security_score = EXCLUDED.security_score,
          ssl_score = EXCLUDED.ssl_score,
          vulnerabilities_total = EXCLUDED.vulnerabilities_total,
          vulnerabilities_critical = EXCLUDED.vulnerabilities_critical,
          vulnerabilities_high = EXCLUDED.vulnerabilities_high
      `;

      const securityValues = [
        securityData.session_id, securityData.security_score, securityData.ssl_score,
        securityData.header_security_score, securityData.authentication_score,
        securityData.vulnerabilities_total, securityData.vulnerabilities_critical,
        securityData.vulnerabilities_high, securityData.vulnerabilities_medium,
        securityData.vulnerabilities_low, securityData.sql_injection_found,
        securityData.xss_vulnerabilities, securityData.csrf_vulnerabilities,
        securityData.https_enforced, securityData.hsts_enabled,
        securityData.csrf_protection, now
      ];

      await query(securityInsertQuery, securityValues);

      // 记录活动日志
      await this.logActivity(userId, 'security_test_saved', sessionId, {
        url: testResult.url,
        score: sessionData.overall_score,
        duration: sessionData.duration
      });

      console.log('✅ 安全测试结果已保存到数据库:', sessionId);
      return { success: true, testId: sessionId };

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

      let whereClause = "WHERE test_type = 'security' AND deleted_at IS NULL";
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

      // 使用安全测试历史视图
      const selectQuery = `
        SELECT
          id, user_id, test_name, url, status, start_time, end_time, duration,
          overall_score, grade, total_issues, critical_issues, major_issues, minor_issues,
          environment, tags, description, created_at, updated_at,
          security_score, ssl_score, vulnerabilities_total, vulnerabilities_critical,
          vulnerabilities_high, sql_injection_found, xss_vulnerabilities, csrf_vulnerabilities,
          https_enforced, hsts_enabled, csrf_protection
        FROM security_test_history
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await query(selectQuery, queryParams);

      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM test_sessions ${whereClause}`;
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
      let whereClause = "WHERE id = $1 AND test_type = 'security' AND deleted_at IS NULL";
      const queryParams = [testId];

      if (userId) {
        whereClause += " AND user_id = $2";
        queryParams.push(userId);
      }

      // 使用安全测试历史视图获取完整信息
      const selectQuery = `
        SELECT * FROM security_test_history ${whereClause}
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
          securityDetails: {
            securityScore: testResult.security_score,
            sslScore: testResult.ssl_score,
            vulnerabilitiesTotal: testResult.vulnerabilities_total,
            vulnerabilitiesCritical: testResult.vulnerabilities_critical,
            vulnerabilitiesHigh: testResult.vulnerabilities_high,
            sqlInjectionFound: testResult.sql_injection_found,
            xssVulnerabilities: testResult.xss_vulnerabilities,
            csrfVulnerabilities: testResult.csrf_vulnerabilities,
            httpsEnforced: testResult.https_enforced,
            hstsEnabled: testResult.hsts_enabled,
            csrfProtection: testResult.csrf_protection
          }
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
      let whereClause = "WHERE id = $1 AND test_type = 'security' AND deleted_at IS NULL";
      const queryParams = [testId];

      if (userId) {
        whereClause += " AND user_id = $2";
        queryParams.push(userId);
      }

      // 使用软删除
      const deleteQuery = `UPDATE test_sessions SET deleted_at = CURRENT_TIMESTAMP ${whereClause} RETURNING id`;
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
      let whereClause = "WHERE test_type = 'security' AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '30 days'";
      const queryParams = [];

      if (userId) {
        whereClause += " AND user_id = $1";
        queryParams.push(userId);
      }

      const statsQuery = `
        SELECT
          COUNT(*) as total_tests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_tests,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
          AVG(overall_score) as average_score,
          AVG(duration) as average_duration,
          COUNT(CASE WHEN overall_score < 60 THEN 1 END) as low_score_tests,
          COUNT(CASE WHEN overall_score >= 60 AND overall_score < 80 THEN 1 END) as medium_score_tests,
          COUNT(CASE WHEN overall_score >= 80 THEN 1 END) as high_score_tests
        FROM test_sessions ${whereClause}
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
      'completed': 'completed',
      'failed': 'failed',
      'running': 'running',
      'pending': 'pending',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * 计算等级
   */
  calculateGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
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
      testName: row.test_name || `安全测试 - ${new URL(row.url).hostname}`,
      testType: 'security',
      url: row.url,
      status: row.status,
      score: parseFloat(row.overall_score) || 0,
      grade: row.grade,
      duration: parseInt(row.duration) || 0,
      startTime: row.start_time?.toISOString(),
      endTime: row.end_time?.toISOString(),
      description: row.description,
      tags: Array.isArray(row.tags) ? row.tags : (row.tags ? JSON.parse(row.tags) : []),
      environment: row.environment,
      totalIssues: row.total_issues || 0,
      criticalIssues: row.critical_issues || 0,
      majorIssues: row.major_issues || 0,
      minorIssues: row.minor_issues || 0,
      securityScore: row.security_score,
      sslScore: row.ssl_score,
      vulnerabilitiesTotal: row.vulnerabilities_total,
      vulnerabilitiesCritical: row.vulnerabilities_critical,
      vulnerabilitiesHigh: row.vulnerabilities_high,
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
