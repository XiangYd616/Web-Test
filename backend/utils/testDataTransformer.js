/**
 * 后端测试数据转换器
 * 处理数据库记录与API响应格式的转换
 */

class TestDataTransformer {
  /**
   * 转换数据库记录为历史项格式
   */
  static transformToHistoryItem(dbRecord) {
    if (!dbRecord) return null;

    return {
      id: dbRecord.id || dbRecord.session_id,
      test_name: dbRecord.test_name || dbRecord.testName || '未命名测试',
      test_type: dbRecord.test_type || dbRecord.testType,
      url: dbRecord.url || dbRecord.target_url,
      status: this.normalizeStatus(dbRecord.status),
      overall_score: dbRecord.overall_score || dbRecord.score,
      duration: dbRecord.duration || this.calculateDuration(dbRecord.start_time, dbRecord.end_time),
      created_at: dbRecord.created_at || dbRecord.createdAt,
      updated_at: dbRecord.updated_at || dbRecord.updatedAt,
      config: this.parseJSON(dbRecord.config),
      results: this.parseJSON(dbRecord.results),
      total_issues: dbRecord.total_issues || this.calculateTotalIssues(dbRecord),
      critical_issues: dbRecord.critical_issues || 0,
      major_issues: dbRecord.major_issues || 0,
      minor_issues: dbRecord.minor_issues || 0,
      start_time: dbRecord.start_time,
      end_time: dbRecord.end_time,
      grade: dbRecord.grade,
      environment: dbRecord.environment,
      tags: this.parseJSON(dbRecord.tags) || [],
      description: dbRecord.description
    };
  }

  /**
   * 转换数据库记录为前端TestResult格式
   */
  static transformToTestResult(dbRecord) {
    if (!dbRecord) return null;

    const results = this.parseJSON(dbRecord.results);
    const config = this.parseJSON(dbRecord.config);

    return {
      testId: dbRecord.id || dbRecord.session_id,
      testType: dbRecord.test_type || dbRecord.testType,
      url: dbRecord.url || dbRecord.target_url,
      timestamp: dbRecord.created_at || dbRecord.createdAt,
      totalTime: dbRecord.duration || this.calculateDuration(dbRecord.start_time, dbRecord.end_time),
      summary: {
        score: dbRecord.overall_score || dbRecord.score || 0,
        totalChecks: dbRecord.total_issues || this.calculateTotalChecks(results),
        passed: this.calculatePassedChecks(results),
        failed: (dbRecord.critical_issues || 0) + (dbRecord.major_issues || 0),
        warnings: dbRecord.minor_issues || 0,
        grade: dbRecord.grade
      },
      checks: this.extractChecks(results),
      config,
      status: this.normalizeStatus(dbRecord.status),
      metadata: {
        environment: dbRecord.environment,
        tags: this.parseJSON(dbRecord.tags) || [],
        description: dbRecord.description,
        startTime: dbRecord.start_time,
        endTime: dbRecord.end_time
      }
    };
  }

  /**
   * 批量转换历史记录
   */
  static transformHistoryList(dbRecords) {
    if (!Array.isArray(dbRecords)) return [];
    return dbRecords.map(record => this.transformToHistoryItem(record)).filter(Boolean);
  }

  /**
   * 批量转换为TestResult格式
   */
  static transformToTestResultList(dbRecords) {
    if (!Array.isArray(dbRecords)) return [];
    return dbRecords.map(record => this.transformToTestResult(record)).filter(Boolean);
  }

  /**
   * 解析JSON字符串
   */
  static parseJSON(jsonString) {
    if (typeof jsonString === 'object') return jsonString;
    if (typeof jsonString !== 'string') return null;
    
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return null;
    }
  }

  /**
   * 标准化状态值
   */
  static normalizeStatus(status) {
    if (!status) return 'completed';
    
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
      case 'passed':
        return 'completed';
      case 'failed':
      case 'error':
      case 'failure':
        return 'failed';
      case 'running':
      case 'pending':
      case 'in_progress':
        return 'running';
      case 'cancelled':
      case 'canceled':
      case 'aborted':
        return 'cancelled';
      default:
        return 'completed';
    }
  }

  /**
   * 计算测试持续时间
   */
  static calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    try {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      return Math.max(0, end - start);
    } catch (error) {
      return 0;
    }
  }

  /**
   * 计算总问题数
   */
  static calculateTotalIssues(dbRecord) {
    const critical = dbRecord.critical_issues || 0;
    const major = dbRecord.major_issues || 0;
    const minor = dbRecord.minor_issues || 0;
    return critical + major + minor;
  }

  /**
   * 从结果中提取检查项
   */
  static extractChecks(results) {
    if (!results) return {};

    // 尝试不同的结果结构
    if (results.checks) return results.checks;
    if (results.tests) return results.tests;
    if (results.audits) return results.audits;
    
    // 如果结果本身就是检查项对象
    if (typeof results === 'object' && !Array.isArray(results)) {
      const checks = {};
      
      // 过滤出看起来像检查项的属性
      Object.keys(results).forEach(key => {
        const value = results[key];
        if (value && typeof value === 'object' && (value.status || value.score !== undefined)) {
          checks[key] = value;
        }
      });
      
      return checks;
    }

    return {};
  }

  /**
   * 计算总检查项数
   */
  static calculateTotalChecks(results) {
    const checks = this.extractChecks(results);
    return Object.keys(checks).length;
  }

  /**
   * 计算通过的检查项数
   */
  static calculatePassedChecks(results) {
    const checks = this.extractChecks(results);
    let passed = 0;

    Object.values(checks).forEach(check => {
      if (check && (
        check.status === 'passed' ||
        check.status === 'success' ||
        (check.score !== undefined && check.score >= 80)
      )) {
        passed++;
      }
    });

    return passed;
  }

  /**
   * 转换分页信息
   */
  static transformPagination(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * 构建查询条件
   */
  static buildQueryConditions(params) {
    const conditions = [];
    const values = [];

    if (params.testType) {
      conditions.push('test_type = ?');
      values.push(params.testType);
    }

    if (params.status && params.status !== 'all') {
      conditions.push('status = ?');
      values.push(params.status);
    }

    if (params.userId) {
      conditions.push('user_id = ?');
      values.push(params.userId);
    }

    if (params.search) {
      conditions.push('(test_name LIKE ? OR url LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }

    if (params.startDate) {
      conditions.push('created_at >= ?');
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push('created_at <= ?');
      values.push(params.endDate);
    }

    return {
      conditions: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
      values
    };
  }

  /**
   * 构建排序条件
   */
  static buildOrderClause(sortBy = 'created_at', sortOrder = 'DESC') {
    const allowedSortFields = [
      'created_at', 'updated_at', 'test_name', 'test_type', 
      'status', 'overall_score', 'duration'
    ];
    
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase()) 
      ? sortOrder.toUpperCase() 
      : 'DESC';
    
    return `ORDER BY ${validSortBy} ${validSortOrder}`;
  }

  /**
   * 构建分页条件
   */
  static buildLimitClause(page = 1, limit = 20) {
    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (validPage - 1) * validLimit;
    
    return {
      clause: `LIMIT ${validLimit} OFFSET ${offset}`,
      page: validPage,
      limit: validLimit
    };
  }
}

module.exports = { TestDataTransformer };
