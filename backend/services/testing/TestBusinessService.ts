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

import { query } from '../../config/database';
import { ErrorFactory } from '../../middleware/errorHandler';

interface BusinessRules {
  concurrent: {
    min: number;
    max: number;
    default: number;
    recommended: number;
  };
  duration: {
    min: number;
    max: number;
    default: number;
  };
  url: {
    maxLength: number;
    allowedProtocols: string[];
  };
  quota: {
    free: {
      daily: number;
      monthly: number;
    };
    premium: {
      daily: number;
      monthly: number;
    };
  };
}

interface TestConfig {
  url: string;
  testType: string;
  options?: Record<string, unknown>;
  concurrency?: number;
  duration?: number;
}

interface User {
  userId: string;
  role: string;
  email?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 业务规则配置
 */
const BUSINESS_RULES: BusinessRules = {
  // 并发限制
  concurrent: {
    min: 1,
    max: 1000,
    default: 10,
    recommended: 100,
  },

  // 测试时长限制(秒)
  duration: {
    min: 1,
    max: 3600, // 1小时
    default: 300, // 5分钟
  },

  // URL限制
  url: {
    maxLength: 2048,
    allowedProtocols: ['http:', 'https:'],
  },

  // 配额限制
  quota: {
    free: {
      daily: 10,
      monthly: 100,
    },
    premium: {
      daily: 100,
      monthly: 1000,
    },
  },
};

class TestBusinessService {
  /**
   * 验证测试配置
   */
  async validateTestConfig(config: TestConfig, user: User): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // URL验证
    if (!config.url) {
      errors.push('测试URL不能为空');
    } else {
      try {
        const url = new URL(config.url);

        if (!BUSINESS_RULES.url.allowedProtocols.includes(url.protocol)) {
          errors.push(`不支持的协议: ${url.protocol}，仅支持 HTTP 和 HTTPS`);
        }

        if (config.url.length > BUSINESS_RULES.url.maxLength) {
          errors.push(`URL长度超过限制 (${BUSINESS_RULES.url.maxLength} 字符)`);
        }
      } catch {
        errors.push('无效的URL格式');
      }
    }

    // 测试类型验证
    if (!config.testType) {
      errors.push('测试类型不能为空');
    } else {
      const validTypes = [
        'website',
        'seo',
        'performance',
        'accessibility',
        'security',
        'api',
        'stress',
      ];
      if (!validTypes.includes(config.testType)) {
        errors.push(`不支持的测试类型: ${config.testType}`);
      }
    }

    // 并发数验证
    if (config.concurrency !== undefined) {
      if (config.concurrency < BUSINESS_RULES.concurrent.min) {
        errors.push(`并发数不能小于 ${BUSINESS_RULES.concurrent.min}`);
      }
      if (config.concurrency > BUSINESS_RULES.concurrent.max) {
        errors.push(`并发数不能超过 ${BUSINESS_RULES.concurrent.max}`);
      }
    }

    // 时长验证
    if (config.duration !== undefined) {
      if (config.duration < BUSINESS_RULES.duration.min) {
        errors.push(`测试时长不能小于 ${BUSINESS_RULES.duration.min} 秒`);
      }
      if (config.duration > BUSINESS_RULES.duration.max) {
        errors.push(`测试时长不能超过 ${BUSINESS_RULES.duration.max} 秒`);
      }
    }

    // 配额检查
    const quotaCheck = await this.checkUserQuota(user);
    if (!quotaCheck.isValid) {
      errors.push(...quotaCheck.errors);
    }

    // 权限检查
    const permissionCheck = await this.checkUserPermissions(user, config);
    if (!permissionCheck.isValid) {
      errors.push(...permissionCheck.errors);
    }

    // 生成警告
    if (config.concurrency && config.concurrency > BUSINESS_RULES.concurrent.recommended) {
      warnings.push(
        `并发数 ${config.concurrency} 超过推荐值 ${BUSINESS_RULES.concurrent.recommended}，可能影响性能`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 检查用户配额
   */
  private async checkUserQuota(user: User): Promise<ValidationResult> {
    const errors: string[] = [];
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    try {
      // 查询今日测试次数
      const dailyResult = await query(
        'SELECT COUNT(*) as count FROM test_history WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE',
        [user.userId]
      );

      // 查询本月测试次数
      const monthlyResult = await query(
        'SELECT COUNT(*) as count FROM test_history WHERE user_id = $1 AND created_at >= $2',
        [user.userId, thisMonth]
      );

      const dailyCount = parseInt(dailyResult.rows[0].count);
      const monthlyCount = parseInt(monthlyResult.rows[0].count);

      const quota =
        user.role === 'premium' ? BUSINESS_RULES.quota.premium : BUSINESS_RULES.quota.free;

      if (dailyCount >= quota.daily) {
        errors.push(`今日测试次数已达上限 (${quota.daily})`);
      }

      if (monthlyCount >= quota.monthly) {
        errors.push(`本月测试次数已达上限 (${quota.monthly})`);
      }
    } catch {
      errors.push('无法检查用户配额');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * 检查用户权限
   */
  private async checkUserPermissions(user: User, config: TestConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // 免费用户限制
    if (user.role === 'free') {
      if (config.testType === 'security') {
        errors.push('免费用户无法使用安全测试功能');
      }

      if (config.concurrency && config.concurrency > BUSINESS_RULES.concurrent.default) {
        errors.push(`免费用户并发数不能超过 ${BUSINESS_RULES.concurrent.default}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * 规范化测试配置
   */
  normalizeTestConfig(config: TestConfig, user: User): TestConfig {
    const normalized: TestConfig = {
      ...config,
      concurrency: config.concurrency ?? BUSINESS_RULES.concurrent.default,
      duration: config.duration ?? BUSINESS_RULES.duration.default,
    };

    // 根据用户角色调整配置
    if (user.role === 'free') {
      const concurrency = normalized.concurrency ?? BUSINESS_RULES.concurrent.default;
      const duration = normalized.duration ?? BUSINESS_RULES.duration.default;
      normalized.concurrency = Math.min(concurrency, BUSINESS_RULES.concurrent.default);
      normalized.duration = Math.min(duration, 600); // 免费用户最多10分钟
    }

    return normalized;
  }

  /**
   * 创建并启动测试
   */
  async createAndStartTest(
    config: TestConfig,
    user: User
  ): Promise<{
    testId: string;
    status: string;
    startTime: Date;
    estimatedDuration: number;
  }> {
    // 验证配置
    const validation = await this.validateTestConfig(config, user);
    if (!validation.isValid) {
      throw ErrorFactory.validation('测试配置验证失败', validation.errors);
    }

    // 规范化配置
    const normalizedConfig = this.normalizeTestConfig(config, user);

    try {
      // 创建测试记录
      const testResult = await query(
        `INSERT INTO test_history (user_id, url, test_type, concurrency, duration, options, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW()) RETURNING test_id`,
        [
          user.userId,
          normalizedConfig.url,
          normalizedConfig.testType,
          normalizedConfig.concurrency,
          normalizedConfig.duration,
          JSON.stringify(normalizedConfig.options || {}),
        ]
      );

      const testId = testResult.rows[0].test_id;

      // 启动测试
      await this.startTestExecution(testId, normalizedConfig);

      return {
        testId,
        status: 'running',
        startTime: new Date(),
        estimatedDuration: normalizedConfig.duration || BUSINESS_RULES.duration.default,
      };
    } catch (error) {
      throw ErrorFactory.database(
        '创建测试失败',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 启动测试执行
   */
  private async startTestExecution(testId: string, config: TestConfig): Promise<void> {
    // 更新测试状态为运行中
    await query('UPDATE test_history SET status = $1, started_at = NOW() WHERE test_id = $2', [
      'running',
      testId,
    ]);

    // 根据测试类型调用相应的测试引擎
    switch (config.testType) {
      case 'website':
        await this.runWebsiteTest(testId, config);
        break;
      case 'seo':
        await this.runSEOTest(testId, config);
        break;
      case 'performance':
        await this.runPerformanceTest(testId, config);
        break;
      case 'accessibility':
        await this.runAccessibilityTest(testId, config);
        break;
      case 'security':
        await this.runSecurityTest(testId, config);
        break;
      case 'api':
        await this.runAPITest(testId, config);
        break;
      case 'stress':
        await this.runStressTest(testId, config);
        break;
      default:
        throw new Error(`不支持的测试类型: ${config.testType}`);
    }
  }

  /**
   * 运行网站测试
   */
  async runWebsiteTest(testId: string, _config: TestConfig): Promise<void> {
    console.log(`Running website test for ${testId}`);

    setTimeout(async () => {
      const results = {
        score: 83,
        checks: {
          availability: 'ok',
          seo: 'warning',
          performance: 'ok',
        },
        recommendations: ['补充页面元信息', '优化首屏资源加载'],
      };

      await this.completeTest(testId, results);
    }, 4000);
  }

  /**
   * 运行SEO测试
   */
  async runSEOTest(testId: string, _config: TestConfig): Promise<void> {
    // SEO测试逻辑
    console.log(`Running SEO test for ${testId}`);

    // 模拟测试执行
    setTimeout(async () => {
      const results = {
        score: 85,
        issues: [
          { type: 'missing_meta_description', severity: 'medium' },
          { type: 'missing_h1', severity: 'high' },
        ],
        recommendations: ['添加页面描述', '确保每个页面有H1标题'],
      };

      await this.completeTest(testId, results);
    }, 5000);
  }

  /**
   * 运行性能测试
   */
  async runPerformanceTest(testId: string, _config: TestConfig): Promise<void> {
    // 性能测试逻辑
    console.log(`Running performance test for ${testId}`);

    setTimeout(async () => {
      const results = {
        score: 92,
        metrics: {
          loadTime: 2.3,
          firstContentfulPaint: 1.8,
          largestContentfulPaint: 3.2,
          cumulativeLayoutShift: 0.1,
        },
        recommendations: ['优化图片加载', '减少JavaScript执行时间'],
      };

      await this.completeTest(testId, results);
    }, 8000);
  }

  /**
   * 运行无障碍测试
   */
  async runAccessibilityTest(testId: string, _config: TestConfig): Promise<void> {
    // 无障碍测试逻辑
    console.log(`Running accessibility test for ${testId}`);

    setTimeout(async () => {
      const results = {
        score: 78,
        checks: [
          { category: 'color_contrast', passed: true },
          { category: 'keyboard_navigation', passed: false },
          { category: 'screen_reader', passed: true },
        ],
        recommendations: ['改善键盘导航', '添加跳过链接'],
      };

      await this.completeTest(testId, results);
    }, 6000);
  }

  /**
   * 运行安全测试
   */
  async runSecurityTest(testId: string, _config: TestConfig): Promise<void> {
    // 安全测试逻辑
    console.log(`Running security test for ${testId}`);

    setTimeout(async () => {
      const results = {
        score: 88,
        vulnerabilities: [
          { type: 'missing_https', severity: 'high' },
          { type: 'outdated_libraries', severity: 'medium' },
        ],
        recommendations: ['启用HTTPS', '更新第三方库'],
      };

      await this.completeTest(testId, results);
    }, 10000);
  }

  /**
   * 运行API测试
   */
  async runAPITest(testId: string, _config: TestConfig): Promise<void> {
    // API测试逻辑
    console.log(`Running API test for ${testId}`);

    setTimeout(async () => {
      const results = {
        score: 95,
        endpoints: [
          { url: '/api/users', status: 200, responseTime: 150 },
          { url: '/api/products', status: 200, responseTime: 200 },
        ],
        recommendations: ['优化数据库查询', '添加缓存'],
      };

      await this.completeTest(testId, results);
    }, 7000);
  }

  /**
   * 运行压力测试
   */
  async runStressTest(testId: string, _config: TestConfig): Promise<void> {
    console.log(`Running stress test for ${testId}`);

    setTimeout(async () => {
      const results = {
        score: 80,
        metrics: {
          rps: 420,
          avgResponseTime: 240,
          errorRate: 0.02,
        },
        recommendations: ['提高缓存命中率', '优化慢查询接口'],
      };

      await this.completeTest(testId, results);
    }, 9000);
  }

  /**
   * 完成测试
   */
  private async completeTest(testId: string, results: unknown): Promise<void> {
    await query(
      `UPDATE test_history 
       SET status = 'completed', results = $1, completed_at = NOW(), overall_score = $2
       WHERE test_id = $3`,
      [JSON.stringify(results), this.extractScore(results), testId]
    );
  }

  /**
   * 提取测试分数
   */
  private extractScore(results: unknown): number {
    if (typeof results === 'object' && results !== null && 'score' in results) {
      return typeof (results as { score: unknown }).score === 'number'
        ? (results as { score: number }).score
        : 0;
    }
    return 0;
  }

  /**
   * 获取业务规则
   */
  getBusinessRules(): BusinessRules {
    return BUSINESS_RULES;
  }

  /**
   * 更新业务规则
   */
  updateBusinessRules(newRules: Partial<BusinessRules>): void {
    Object.assign(BUSINESS_RULES, newRules);
  }
}

export default new TestBusinessService();
