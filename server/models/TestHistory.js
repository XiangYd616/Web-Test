/**
 * 测试历史数据模型
 * 对应前端 src/types/testHistory.ts 中的测试历史接口
 */

class TestHistory {
  constructor(data = {}) {
    this.id = data.id || null;
    this.testId = data.testId || null;
    this.userId = data.userId || null;
    this.sessionId = data.sessionId || null;
    this.type = data.type || 'performance';
    this.url = data.url || '';
    this.config = data.config || {};
    this.results = data.results || null;
    this.metrics = data.metrics || {};
    this.status = data.status || 'completed';
    this.duration = data.duration || null;
    this.startTime = data.startTime || null;
    this.endTime = data.endTime || null;
    this.errors = data.errors || [];
    this.tags = data.tags || [];
    this.notes = data.notes || '';
    this.archived = data.archived || false;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.metadata = data.metadata || {};
  }

  /**
   * 验证测试历史数据
   */
  validate() {
    const errors = [];

    if (!this.testId) {
      errors.push('测试ID不能为空');
    }

    if (!this.userId) {
      errors.push('用户ID不能为空');
    }

    if (!this.url || !this.isValidUrl(this.url)) {
      errors.push('请提供有效的URL');
    }

    if (!['performance', 'content', 'security', 'api', 'stress', 'compatibility'].includes(this.type)) {
      errors.push('无效的测试类型');
    }

    if (!['pending', 'running', 'completed', 'failed', 'cancelled'].includes(this.status)) {
      errors.push('无效的测试状态');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证URL格式
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 添加标签
   */
  addTag(tag) {
    if (tag && !this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date().toISOString();
    }
  }

  /**
   * 移除标签
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date().toISOString();
    }
  }

  /**
   * 更新备注
   */
  updateNotes(notes) {
    this.notes = notes || '';
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 归档测试历史
   */
  archive() {
    this.archived = true;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 取消归档
   */
  unarchive() {
    this.archived = false;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * 获取测试成功率
   */
  getSuccessRate() {
    if (!this.results || !this.results.summary) {
      return null;
    }

    const { total, passed, failed } = this.results.summary;
    if (!total || total === 0) {
      return null;
    }

    return Math.round((passed / total) * 100);
  }

  /**
   * 获取平均响应时间
   */
  getAverageResponseTime() {
    if (!this.metrics || !this.metrics.responseTime) {
      return null;
    }

    return this.metrics.responseTime.average || null;
  }

  /**
   * 获取错误率
   */
  getErrorRate() {
    if (!this.metrics || !this.metrics.errors) {
      return null;
    }

    const { total, errors } = this.metrics.errors;
    if (!total || total === 0) {
      return 0;
    }

    return Math.round((errors / total) * 100);
  }

  /**
   * 转换为数据库格式
   */
  toDatabase() {
    return {
      id: this.id,
      test_id: this.testId,
      user_id: this.userId,
      session_id: this.sessionId,
      type: this.type,
      url: this.url,
      config: JSON.stringify(this.config),
      results: this.results ? JSON.stringify(this.results) : null,
      metrics: JSON.stringify(this.metrics),
      status: this.status,
      duration: this.duration,
      start_time: this.startTime,
      end_time: this.endTime,
      errors: JSON.stringify(this.errors),
      tags: JSON.stringify(this.tags),
      notes: this.notes,
      archived: this.archived,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      metadata: JSON.stringify(this.metadata)
    };
  }

  /**
   * 从数据库格式创建实例
   */
  static fromDatabase(dbData) {
    if (!dbData) return null;

    return new TestHistory({
      id: dbData.id,
      testId: dbData.test_id,
      userId: dbData.user_id,
      sessionId: dbData.session_id,
      type: dbData.type,
      url: dbData.url,
      config: dbData.config ? JSON.parse(dbData.config) : {},
      results: dbData.results ? JSON.parse(dbData.results) : null,
      metrics: dbData.metrics ? JSON.parse(dbData.metrics) : {},
      status: dbData.status,
      duration: dbData.duration,
      startTime: dbData.start_time,
      endTime: dbData.end_time,
      errors: dbData.errors ? JSON.parse(dbData.errors) : [],
      tags: dbData.tags ? JSON.parse(dbData.tags) : [],
      notes: dbData.notes || '',
      archived: dbData.archived || false,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at,
      metadata: dbData.metadata ? JSON.parse(dbData.metadata) : {}
    });
  }

  /**
   * 转换为API响应格式
   */
  toAPI() {
    return {
      id: this.id,
      testId: this.testId,
      userId: this.userId,
      sessionId: this.sessionId,
      type: this.type,
      url: this.url,
      config: this.config,
      results: this.results,
      metrics: this.metrics,
      status: this.status,
      duration: this.duration,
      startTime: this.startTime,
      endTime: this.endTime,
      errors: this.errors,
      tags: this.tags,
      notes: this.notes,
      archived: this.archived,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
      // 计算字段
      successRate: this.getSuccessRate(),
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate()
    };
  }

  /**
   * 转换为简化格式（用于列表显示）
   */
  toSummary() {
    return {
      id: this.id,
      testId: this.testId,
      type: this.type,
      url: this.url,
      status: this.status,
      duration: this.duration,
      startTime: this.startTime,
      endTime: this.endTime,
      tags: this.tags,
      archived: this.archived,
      createdAt: this.createdAt,
      successRate: this.getSuccessRate(),
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate()
    };
  }

  /**
   * 从测试实例创建历史记录
   */
  static fromTest(test) {
    return new TestHistory({
      testId: test.id,
      userId: test.userId,
      type: test.type,
      url: test.url,
      config: test.config,
      results: test.results,
      metrics: test.metrics,
      status: test.status,
      duration: test.duration,
      startTime: test.startTime,
      endTime: test.endTime,
      errors: test.errors,
      metadata: test.metadata
    });
  }
}

module.exports = TestHistory;
