/**
 * 共享辅助函数
 * 测试路由通用的工具函数
 */

const crypto = require('crypto');

/**
 * 格式化测试结果
 * @param {Object} result - 原始测试结果
 * @returns {Object} 格式化后的结果
 */
function formatTestResult(result) {
  return {
    success: result.success !== false,
    timestamp: new Date().toISOString(),
    data: result.data || result,
    metadata: {
      duration: result.duration || 0,
      testType: result.testType || 'unknown',
      version: '2.0'
    }
  };
}

/**
 * 验证测试配置
 * @param {Object} config - 测试配置对象
 * @returns {Object} 验证结果 { valid: boolean, errors: string[] }
 */
function validateTestConfig(config) {
  const errors = [];

  if (!config) {
    return { valid: false, errors: ['配置对象不能为空'] };
  }

  // 验证URL
  if (config.url) {
    try {
      new URL(config.url);
    } catch (error) {
      errors.push('URL格式不正确');
    }
  }

  // 验证超时时间
  if (config.timeout) {
    if (typeof config.timeout !== 'number' || config.timeout < 0) {
      errors.push('超时时间必须是正数');
    }
  }

  // 验证重试次数
  if (config.retries) {
    if (typeof config.retries !== 'number' || config.retries < 0) {
      errors.push('重试次数必须是非负整数');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 生成唯一测试ID
 * @param {string} prefix - ID前缀（可选）
 * @returns {string} 测试ID
 */
function generateTestId(prefix = 'test') {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 解析测试类型
 * @param {string} path - 路由路径
 * @returns {string} 测试类型
 */
function parseTestType(path) {
  const typeMap = {
    '/seo': 'seo',
    '/security': 'security',
    '/stress': 'stress',
    '/api': 'api',
    '/compatibility': 'compatibility',
    '/accessibility': 'accessibility',
    '/ux': 'ux',
    '/performance': 'performance'
  };

  for (const [key, value] of Object.entries(typeMap)) {
    if (path.includes(key)) {
      return value;
    }
  }

  return 'general';
}

/**
 * 格式化错误消息
 * @param {Error|string} error - 错误对象或消息
 * @returns {Object} 格式化的错误对象
 */
function formatError(error) {
  if (typeof error === 'string') {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: false,
    error: error.message || '未知错误',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString()
  };
}

/**
 * 清理测试数据
 * @param {Object} data - 原始数据
 * @returns {Object} 清理后的数据
 */
function sanitizeTestData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const cleaned = { ...data };

  // 移除敏感信息
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  
  sensitiveFields.forEach(field => {
    if (cleaned[field]) {
      cleaned[field] = '***REDACTED***';
    }
  });

  return cleaned;
}

/**
 * 计算测试结果统计
 * @param {Array} results - 测试结果数组
 * @returns {Object} 统计信息
 */
function calculateTestStatistics(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      successRate: 0,
      averageDuration: 0
    };
  }

  const stats = {
    total: results.length,
    passed: results.filter(r => r.success === true).length,
    failed: results.filter(r => r.success === false).length,
    successRate: 0,
    averageDuration: 0
  };

  stats.successRate = (stats.passed / stats.total) * 100;

  const durations = results
    .map(r => r.duration || 0)
    .filter(d => d > 0);

  if (durations.length > 0) {
    stats.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  return stats;
}

/**
 * 限制并发数
 * @param {Array} tasks - 任务数组
 * @param {number} limit - 并发限制
 * @returns {Promise<Array>} 所有任务结果
 */
async function limitConcurrency(tasks, limit = 5) {
  const results = [];
  const executing = [];

  for (const task of tasks) {
    const promise = Promise.resolve().then(() => task());
    results.push(promise);

    if (limit <= tasks.length) {
      const e = promise.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}

/**
 * 重试机制
 * @param {Function} fn - 要执行的函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟（毫秒）
 * @returns {Promise<any>} 函数执行结果
 */
async function retry(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}

module.exports = {
  formatTestResult,
  validateTestConfig,
  generateTestId,
  parseTestType,
  formatError,
  sanitizeTestData,
  calculateTestStatistics,
  limitConcurrency,
  retry
};

