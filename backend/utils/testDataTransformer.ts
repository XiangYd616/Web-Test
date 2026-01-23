/**
 * 后端测试数据转换器
 * 处理数据库记录与API响应格式的转换
 */

type DbRecord = Record<string, unknown>;

type HistoryItem = Record<string, unknown>;

type TestResultRecord = Record<string, unknown>;

class TestDataTransformer {
  /**
   * 转换数据库记录为历史项格式
   */
  static transformToHistoryItem(dbRecord: DbRecord | null) {
    if (!dbRecord) return null;

    return {
      id: dbRecord.id || dbRecord.session_id,
      test_name: dbRecord.test_name || dbRecord.testName || '未命名测试',
      test_type: dbRecord.test_type || dbRecord.testType,
      url: dbRecord.url || dbRecord.target_url,
      status: this.normalizeStatus(dbRecord.status as string),
      overall_score: dbRecord.overall_score || dbRecord.score,
      duration:
        dbRecord.duration ||
        this.calculateDuration(
          dbRecord.start_time as string | Date,
          dbRecord.end_time as string | Date
        ),
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
      description: dbRecord.description,
    };
  }

  /**
   * 转换数据库记录为前端TestResult格式
   */
  static transformToTestResult(dbRecord: DbRecord | null) {
    if (!dbRecord) return null;

    const results = this.parseJSON(dbRecord.results) as TestResultRecord | null;
    const config = this.parseJSON(dbRecord.config);

    return {
      testId: dbRecord.id || dbRecord.session_id,
      testType: dbRecord.test_type || dbRecord.testType,
      url: dbRecord.url || dbRecord.target_url,
      timestamp: dbRecord.created_at || dbRecord.createdAt,
      totalTime:
        dbRecord.duration ||
        this.calculateDuration(
          dbRecord.start_time as string | Date | null,
          dbRecord.end_time as string | Date | null
        ),
      summary: {
        score: dbRecord.overall_score || dbRecord.score || 0,
        totalChecks: dbRecord.total_issues || this.calculateTotalChecks(results),
        passed: this.calculatePassedChecks(results),
        failed:
          ((dbRecord.critical_issues as number) || 0) + ((dbRecord.major_issues as number) || 0),
        warnings: dbRecord.minor_issues || 0,
        grade: dbRecord.grade,
      },
      checks: this.extractChecks(results),
      config,
      status: this.normalizeStatus(dbRecord.status as string),
      metadata: {
        environment: dbRecord.environment,
        tags: this.parseJSON(dbRecord.tags) || [],
        description: dbRecord.description,
        startTime: dbRecord.start_time,
        endTime: dbRecord.end_time,
      },
    };
  }

  /**
   * 批量转换历史记录
   */
  static transformHistoryList(dbRecords: DbRecord[]) {
    if (!Array.isArray(dbRecords)) return [];
    return dbRecords
      .map(record => this.transformToHistoryItem(record))
      .filter(Boolean) as HistoryItem[];
  }

  /**
   * 批量转换为TestResult格式
   */
  static transformToTestResultList(dbRecords: DbRecord[]) {
    if (!Array.isArray(dbRecords)) return [];
    return dbRecords
      .map(record => this.transformToTestResult(record))
      .filter(Boolean) as HistoryItem[];
  }

  /**
   * 解析JSON字符串
   */
  static parseJSON(jsonString: unknown) {
    if (typeof jsonString === 'object') return jsonString;
    if (typeof jsonString !== 'string') return null;

    try {
      return JSON.parse(jsonString) as Record<string, unknown>;
    } catch (error) {
      console.warn('Failed to parse JSON:', error);
      return null;
    }
  }

  /**
   * 标准化状态值
   */
  static normalizeStatus(status: string | undefined | null) {
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
  static calculateDuration(startTime: string | Date | null, endTime: string | Date | null) {
    if (!startTime || !endTime) return 0;

    try {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      return Math.max(0, end - start);
    } catch (error) {
      void error;
      return 0;
    }
  }

  /**
   * 计算总问题数
   */
  static calculateTotalIssues(dbRecord: DbRecord) {
    const critical = (dbRecord.critical_issues as number) || 0;
    const major = (dbRecord.major_issues as number) || 0;
    const minor = (dbRecord.minor_issues as number) || 0;
    return critical + major + minor;
  }

  /**
   * 从结果中提取检查项
   */
  static extractChecks(results: TestResultRecord | null): Record<string, unknown> {
    if (!results) return {};

    // 尝试不同的结果结构
    if ((results as Record<string, unknown>).checks)
      return (results as Record<string, unknown>).checks as Record<string, unknown>;
    if ((results as Record<string, unknown>).tests)
      return (results as Record<string, unknown>).tests as Record<string, unknown>;
    if ((results as Record<string, unknown>).audits)
      return (results as Record<string, unknown>).audits as Record<string, unknown>;

    // 如果结果本身就是检查项对象
    if (typeof results === 'object' && !Array.isArray(results)) {
      const checks: Record<string, unknown> = {};

      // 过滤出看起来像检查项的属性
      Object.keys(results).forEach(key => {
        const value = (results as Record<string, unknown>)[key];
        if (
          value &&
          typeof value === 'object' &&
          ('status' in (value as Record<string, unknown>) ||
            (value as Record<string, unknown>).score !== undefined)
        ) {
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
  static calculateTotalChecks(results: TestResultRecord | null) {
    const checks = this.extractChecks(results);
    return Object.keys(checks).length;
  }

  /**
   * 计算通过的检查项数
   */
  static calculatePassedChecks(results: TestResultRecord | null) {
    const checks = this.extractChecks(results) as Record<string, unknown>;
    let passed = 0;

    Object.values(checks).forEach(check => {
      const record = check as Record<string, unknown>;
      if (
        record &&
        (record.status === 'passed' ||
          record.status === 'success' ||
          (record.score !== undefined && Number(record.score) >= 80))
      ) {
        passed++;
      }
    });

    return passed;
  }

  /**
   * 转换分页信息
   */
  static transformPagination(
    page: string | number,
    limit: string | number,
    total: string | number
  ) {
    const totalPages = Math.ceil(Number(total) / Number(limit));

    return {
      page: parseInt(String(page), 10),
      limit: parseInt(String(limit), 10),
      total: parseInt(String(total), 10),
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1,
    };
  }

  /**
   * 构建查询条件
   */
  static buildQueryConditions(params: Record<string, unknown>) {
    const conditions: string[] = [];
    const values: Array<string | number> = [];

    if (params.testType) {
      conditions.push('test_type = ?');
      values.push(params.testType as string | number);
    }

    if (params.status && params.status !== 'all') {
      conditions.push('status = ?');
      values.push(params.status as string | number);
    }

    if (params.userId) {
      conditions.push('user_id = ?');
      values.push(params.userId as string | number);
    }

    if (params.search) {
      conditions.push('(test_name LIKE ? OR url LIKE ?)');
      values.push(`%${params.search}%`, `%${params.search}%`);
    }

    if (params.startDate) {
      conditions.push('created_at >= ?');
      values.push(params.startDate as string | number);
    }

    if (params.endDate) {
      conditions.push('created_at <= ?');
      values.push(params.endDate as string | number);
    }

    return {
      conditions: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      values,
    };
  }

  /**
   * 构建排序条件
   */
  static buildOrderClause(sortBy = 'created_at', sortOrder = 'DESC') {
    const allowedSortFields = [
      'created_at',
      'updated_at',
      'test_name',
      'test_type',
      'status',
      'overall_score',
      'duration',
    ];

    const allowedSortOrders = ['ASC', 'DESC'];

    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = allowedSortOrders.includes(String(sortOrder).toUpperCase())
      ? String(sortOrder).toUpperCase()
      : 'DESC';

    return `ORDER BY ${validSortBy} ${validSortOrder}`;
  }

  /**
   * 构建分页条件
   */
  static buildLimitClause(page: string | number = 1, limit: string | number = 20) {
    const validPage = Math.max(1, parseInt(String(page), 10));
    const validLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const offset = (validPage - 1) * validLimit;

    return {
      clause: `LIMIT ${validLimit} OFFSET ${offset}`,
      page: validPage,
      limit: validLimit,
    };
  }
}

export { TestDataTransformer };

module.exports = { TestDataTransformer };
