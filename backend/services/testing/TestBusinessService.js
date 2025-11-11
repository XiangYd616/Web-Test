/**
 * 测试业务服务
 * 职责: 处理所有测试相关的业务逻辑和验证
 * 
 * 包含:
 * 1. 业务规则验证(并发限制、配额检查、权限控制)
 * 2. 测试类型验证和规范化
 * 3. 业务流程编排(创建并启动测试)
 * 4. 数据转换和处理
 */

const { query } = require('../../config/database');
const UserTestManager = require('./UserTestManager');
const TestHistoryService = require('./TestHistoryService');
const {
  ValidationError,
  QuotaExceededError,
  UnauthorizedError,
  NotFoundError,
  PermissionError
} = require('../../utils/errors');

/**
 * 业务规则配置
 */
const BUSINESS_RULES = {
  // 并发限制
  concurrent: {
    min: 1,
    max: 1000,
    default: 10,
    recommended: 100
  },

  // 测试时长限制(秒)
  duration: {
    min: 1,
    max: 3600, // 最长1小时
    default: 60
  },

  // 加压时间限制(秒)
  rampUpTime: {
    min: 0,
    max: 600, // 最长10分钟
    default: 10
  },

  // 超时时间限制(秒)
  timeout: {
    min: 1,
    max: 60,
    default: 30
  },

  // 思考时间限制(秒)
  thinkTime: {
    min: 0,
    max: 10,
    default: 0
  },

  // 有效的测试类型
  validTestTypes: ['gradual', 'stress', 'spike', 'load', 'seo', 'performance', 'security', 'api', 'compatibility', 'accessibility'],

  // 有效的HTTP方法
  validHttpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],

  // 用户配额(根据用户角色)
  quotas: {
    free: {
      maxConcurrentTests: 2,      // 最多同时运行2个测试
      maxTestsPerDay: 10,          // 每天最多10个测试
      maxConcurrentPerTest: 50     // 单个测试最多50并发
    },
    premium: {
      maxConcurrentTests: 10,
      maxTestsPerDay: 100,
      maxConcurrentPerTest: 500
    },
    enterprise: {
      maxConcurrentTests: 50,
      maxTestsPerDay: 1000,
      maxConcurrentPerTest: 1000
    },
    admin: {
      maxConcurrentTests: 100,
      maxTestsPerDay: -1,          // 无限制
      maxConcurrentPerTest: 1000
    }
  }
};

/**
 * 测试业务服务类
 */
class TestBusinessService {
  constructor() {
    this.userTestManager = UserTestManager;
    this.testHistoryService = new TestHistoryService(require('../../config/database'));
  }

  /**
   * 完整的测试配置验证(格式+业务规则)
   * 
   * @param {Object} config - 测试配置
   * @param {Object} user - 当前用户
   * @returns {Object} { isValid, errors, warnings }
   */
  async validateTestConfig(config, user) {
    const errors = [];
    const warnings = [];

    // 1. 格式验证
    const formatValidation = this.validateFormat(config);
    errors.push(...formatValidation.errors);
    warnings.push(...formatValidation.warnings);

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // 2. 业务规则验证
    const businessValidation = await this.validateBusinessRules(config, user);
    errors.push(...businessValidation.errors);
    warnings.push(...businessValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 格式验证
   */
  validateFormat(config) {
    const errors = [];
    const warnings = [];

    // URL验证
    if (!config.url || typeof config.url !== 'string' || config.url.trim() === '') {
      errors.push('URL不能为空');
      return { errors, warnings };
    }

    try {
      new URL(config.url);
      if (!/^https?:\/\/.+/.test(config.url)) {
        errors.push('URL格式不正确,需要以http://或https://开头');
      }
    } catch {
      errors.push('URL格式不正确');
      return { errors, warnings };
    }

    // 并发数格式验证
    if (config.concurrent !== undefined) {
      if (typeof config.concurrent !== 'number' || config.concurrent < 1) {
        errors.push('并发数必须是大于0的数字');
      }
    }

    // 测试时长格式验证
    if (config.duration !== undefined) {
      if (typeof config.duration !== 'number' || config.duration < 1) {
        errors.push('测试时长必须是大于0的数字');
      }
    }

    // 加压时间格式验证
    if (config.rampUpTime !== undefined) {
      if (typeof config.rampUpTime !== 'number' || config.rampUpTime < 0) {
        errors.push('加压时间必须是非负数字');
      }
    }

    // 测试类型格式验证
    if (config.testType && !BUSINESS_RULES.validTestTypes.includes(config.testType)) {
      errors.push(`测试类型必须是以下之一: ${BUSINESS_RULES.validTestTypes.join(', ')}`);
    }

    // HTTP方法格式验证
    if (config.method && !BUSINESS_RULES.validHttpMethods.includes(config.method)) {
      errors.push(`HTTP方法必须是以下之一: ${BUSINESS_RULES.validHttpMethods.join(', ')}`);
    }

    return { errors, warnings };
  }

  /**
   * 业务规则验证
   */
  async validateBusinessRules(config, user) {
    const errors = [];
    const warnings = [];

    // 获取用户配额
    const quota = this.getUserQuota(user);

    // 1. 并发数业务限制
    if (config.concurrent !== undefined) {
      if (config.concurrent > BUSINESS_RULES.concurrent.max) {
        errors.push(`并发数不能超过${BUSINESS_RULES.concurrent.max}`);
      }

      if (config.concurrent > quota.maxConcurrentPerTest) {
        errors.push(`您的套餐最多支持${quota.maxConcurrentPerTest}并发`);
      }

      if (config.concurrent > BUSINESS_RULES.concurrent.recommended) {
        warnings.push(`并发数较高(>${BUSINESS_RULES.concurrent.recommended}),可能会影响目标服务器`);
      }
    }

    // 2. 测试时长业务限制
    if (config.duration !== undefined) {
      if (config.duration > BUSINESS_RULES.duration.max) {
        errors.push(`测试时长不能超过${BUSINESS_RULES.duration.max}秒`);
      }

      if (config.duration > 600) {
        warnings.push('测试时长较长(>10分钟),建议适当缩短');
      }
    }

    // 3. 加压时间业务限制
    if (config.rampUpTime !== undefined && config.duration !== undefined) {
      if (config.rampUpTime >= config.duration) {
        errors.push('加压时间不能大于或等于测试时长');
      }
    }

    // 4. 超时时间业务限制
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout < BUSINESS_RULES.timeout.min) {
        errors.push(`超时时间必须大于${BUSINESS_RULES.timeout.min}秒`);
      }

      if (config.timeout > BUSINESS_RULES.timeout.max) {
        errors.push(`超时时间不能超过${BUSINESS_RULES.timeout.max}秒`);
      }
    }

    // 5. 检查当前运行的测试数量
    try {
      const runningTests = await this.userTestManager.getRunningTestCount(user.userId);
      if (runningTests >= quota.maxConcurrentTests) {
        errors.push(`您当前有${runningTests}个正在运行的测试,已达到最大并发数(${quota.maxConcurrentTests})`);
      }
    } catch (error) {
      console.error('检查运行测试数量失败:', error);
      warnings.push('无法检查当前运行的测试数量');
    }

    // 6. 检查今日测试次数
    if (quota.maxTestsPerDay > 0) {
      try {
        const todayTestCount = await this.getTodayTestCount(user.userId);
        if (todayTestCount >= quota.maxTestsPerDay) {
          errors.push(`您今日已创建${todayTestCount}个测试,已达到每日限额(${quota.maxTestsPerDay})`);
        } else if (todayTestCount >= quota.maxTestsPerDay * 0.8) {
          warnings.push(`您今日已创建${todayTestCount}个测试,接近每日限额(${quota.maxTestsPerDay})`);
        }
      } catch (error) {
        console.error('检查今日测试次数失败:', error);
        warnings.push('无法检查今日测试次数');
      }
    }

    return { errors, warnings };
  }

  /**
   * 获取用户配额
   */
  getUserQuota(user) {
    const role = user?.role || 'free';
    return BUSINESS_RULES.quotas[role] || BUSINESS_RULES.quotas.free;
  }

  /**
   * 获取今日测试次数
   */
  async getTodayTestCount(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const result = await query(
        'SELECT COUNT(*) as count FROM test_history WHERE user_id = $1 AND created_at >= $2',
        [userId, todayStr]
      );

      return parseInt(result.rows[0]?.count || 0);
    } catch (error) {
      console.error('获取今日测试次数失败:', error);
      return 0;
    }
  }

  /**
   * 规范化测试配置
   * 补充默认值和标准化字段
   */
  normalizeTestConfig(config) {
    return {
      url: config.url.trim(),
      testType: config.testType || 'load',
      concurrent: config.concurrent || BUSINESS_RULES.concurrent.default,
      duration: config.duration || BUSINESS_RULES.duration.default,
      rampUpTime: config.rampUpTime || BUSINESS_RULES.rampUpTime.default,
      timeout: config.timeout || BUSINESS_RULES.timeout.default,
      thinkTime: config.thinkTime || BUSINESS_RULES.thinkTime.default,
      method: config.method || 'GET',
      headers: config.headers || {},
      body: config.body || null,
      assertions: config.assertions || [],
      scenarios: config.scenarios || null,
      metadata: {
        ...config.metadata,
        normalizedAt: new Date().toISOString()
      }
    };
  }

  /**
   * 创建并启动测试(完整业务流程)
   * 
   * @param {Object} config - 测试配置
   * @param {Object} user - 当前用户
   * @returns {Object} 测试结果
   */
  async createAndStartTest(config, user) {
    // 1. 验证权限
    if (!user || !user.userId) {
      throw new UnauthorizedError();
    }

    // 2. 完整验证(格式+业务规则)
    const validation = await this.validateTestConfig(config, user);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors, validation.warnings);
    }

    // 3. 规范化配置
    const normalizedConfig = this.normalizeTestConfig(config);

    // 4. 创建测试
    let test;
    try {
      test = await this.createTest(normalizedConfig, user);
    } catch (error) {
      console.error('创建测试失败:', error);
      throw new Error(`创建测试失败: ${error.message}`);
    }

    // 5. 启动测试
    try {
      const startedTest = await this.startTest(test.testId, user);
      
      // 6. 返回警告信息(如果有)
      if (validation.warnings.length > 0) {
        startedTest.warnings = validation.warnings;
      }

      return startedTest;
    } catch (error) {
      console.error('启动测试失败:', error);
      // 启动失败,但测试已创建,返回测试信息
      test.warnings = [`测试启动失败: ${error.message}`, ...(validation.warnings || [])];
      return test;
    }
  }

  /**
   * 创建测试(不启动)
   */
  async createTest(config, user) {
    try {
      // 1. 生成testId
      const testId = this.generateTestId(config.testType);

      // 2. 保存到数据库
      await query(`
        INSERT INTO test_history (
          test_id, 
          user_id, 
          test_type, 
          url,
          status, 
          config, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        testId,
        user.userId,
        config.testType || 'load',
        config.url,
        'pending',
        JSON.stringify(config)
      ]);

      return {
        testId,
        status: 'pending',
        config,
        userId: user.userId,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('创建测试失败:', error);
      throw error;
    }
  }

  /**
   * 生成测试ID
   */
  generateTestId(testType = 'load') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${testType}_${timestamp}_${random}`;
  }

  /**
   * 启动测试
   */
  async startTest(testId, user) {
    try {
      // 1. 检查权限
      const hasPermission = await this.checkTestPermission(testId, user.userId);
      if (!hasPermission) {
        throw new PermissionError('start', 'test');
      }

      // 2. 获取测试配置
      const result = await query(
        'SELECT config, test_type, url FROM test_history WHERE test_id = $1',
        [testId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('测试', testId);
      }

      const testData = result.rows[0];
      const config = typeof testData.config === 'string' 
        ? JSON.parse(testData.config) 
        : testData.config;

      // 3. 更新测试状态为running
      await query(
        'UPDATE test_history SET status = $1, started_at = NOW() WHERE test_id = $2',
        ['running', testId]
      );

      // 4. 创建测试引擎实例
      const testEngine = this.userTestManager.createUserTest(user.userId, testId);

      // 5. 异步执行测试(不阻塞响应)
      setImmediate(async () => {
        try {
          await testEngine.executeTest(config);
        } catch (error) {
          console.error(`测试执行失败: ${testId}`, error);
          // 更新测试状态为失败
          await query(
            'UPDATE test_history SET status = $1, error_message = $2, completed_at = NOW() WHERE test_id = $3',
            ['failed', error.message, testId]
          );
        }
      });

      return {
        testId,
        status: 'running',
        startedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('启动测试失败:', error);
      throw error;
    }
  }

  /**
   * 检查测试权限
   */
  async checkTestPermission(testId, userId) {
    try {
      const result = await query(
        'SELECT user_id FROM test_history WHERE test_id = $1',
        [testId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      // 检查是否是测试所有者
      return result.rows[0].user_id === userId;
    } catch (error) {
      console.error('检查测试权限失败:', error);
      return false;
    }
  }

  /**
   * 获取业务规则配置(用于前端展示)
   */
  getBusinessRules() {
    return {
      concurrent: {
        min: BUSINESS_RULES.concurrent.min,
        max: BUSINESS_RULES.concurrent.max,
        recommended: BUSINESS_RULES.concurrent.recommended
      },
      duration: {
        min: BUSINESS_RULES.duration.min,
        max: BUSINESS_RULES.duration.max
      },
      validTestTypes: BUSINESS_RULES.validTestTypes,
      validHttpMethods: BUSINESS_RULES.validHttpMethods
    };
  }

  /**
   * 获取用户配额信息
   */
  async getUserQuotaInfo(user) {
    const quota = this.getUserQuota(user);
    
    // 获取运行中的测试数量
    let runningTests = 0;
    try {
      const result = await query(
        "SELECT COUNT(*) as count FROM test_history WHERE user_id = $1 AND status = 'running'",
        [user.userId]
      );
      runningTests = parseInt(result.rows[0]?.count || 0);
    } catch (error) {
      console.error('获取运行测试数量失败:', error);
    }

    const todayTests = await this.getTodayTestCount(user.userId);

    return {
      role: user.role || 'free',
      quota,
      usage: {
        runningTests,
        todayTests
      },
      remaining: {
        concurrentTests: quota.maxConcurrentTests - runningTests,
        todayTests: quota.maxTestsPerDay > 0 ? quota.maxTestsPerDay - todayTests : -1
      }
    };
  }

  /**
   * 保存测试结果
   */
  async saveTestResults(userId, testId, results) {
    try {
      // 计算总体评分
      const overallScore = this.calculateOverallScore(results);
      
      // 计算测试时长
      const durationResult = await query(
        'SELECT started_at FROM test_history WHERE test_id = $1',
        [testId]
      );
      
      let duration = 0;
      if (durationResult.rows.length > 0 && durationResult.rows[0].started_at) {
        const startTime = new Date(durationResult.rows[0].started_at);
        duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
      }

      // 更新测试记录
      await query(`
        UPDATE test_history 
        SET 
          status = 'completed',
          results = $1,
          completed_at = NOW(),
          duration = $2,
          overall_score = $3
        WHERE test_id = $4 AND user_id = $5
      `, [
        JSON.stringify(results),
        duration,
        overallScore,
        testId,
        userId
      ]);

      console.log(`✅ 测试结果已保存: ${testId}`);
      return true;
    } catch (error) {
      console.error('保存测试结果失败:', error);
      throw error;
    }
  }

  /**
   * 计算总体评分
   */
  calculateOverallScore(results) {
    if (!results) return 0;

    // 如果结果中已有评分
    if (results.overallScore !== undefined) {
      return results.overallScore;
    }

    // 根据不同指标计算评分
    if (results.metrics) {
      const metrics = results.metrics;
      
      // 计算成功率
      const successRate = metrics.totalRequests > 0
        ? ((metrics.totalRequests - (metrics.failedRequests || 0)) / metrics.totalRequests) * 100
        : 0;

      // 计算性能得分(基于响应时间)
      let performanceScore = 100;
      if (metrics.avgResponseTime) {
        if (metrics.avgResponseTime < 100) performanceScore = 100;
        else if (metrics.avgResponseTime < 500) performanceScore = 80;
        else if (metrics.avgResponseTime < 1000) performanceScore = 60;
        else if (metrics.avgResponseTime < 2000) performanceScore = 40;
        else performanceScore = 20;
      }

      // 综合评分
      return Math.round((successRate * 0.7 + performanceScore * 0.3));
    }

    return 50; // 默认评分
  }
}

/**
 * 导出单例
 */
module.exports = new TestBusinessService();
