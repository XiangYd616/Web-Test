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

import { v4 as uuidv4 } from 'uuid';
import { TestTypeValues } from '../../../shared/types/test.types';
import { query } from '../../config/database';
import { ErrorFactory } from '../../middleware/errorHandler';
import testRepository from '../../repositories/testRepository';
import { hasWorkspacePermission } from '../../utils/workspacePermissions';
import { markFailedWithLog, markStartedWithLog, updateStatusWithLog } from './testLogService';
import testTemplateService from './testTemplateService';

const registerTestEngines = require('../../engines/core/registerEngines');
const testEngineRegistry = require('../../core/TestEngineRegistry');

const userTestManager = require('./UserTestManager');
const { enqueueTest } = require('./TestQueueService');

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
  batchId?: string;
  templateId?: string;
  scheduleId?: string | number;
  workspaceId?: string;
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
      if (!TestTypeValues.includes(config.testType as (typeof TestTypeValues)[number])) {
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
        'SELECT COUNT(*) as count FROM test_executions WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE',
        [user.userId]
      );

      // 查询本月测试次数
      const monthlyResult = await query(
        'SELECT COUNT(*) as count FROM test_executions WHERE user_id = $1 AND created_at >= $2',
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

    if (config.workspaceId) {
      const workspaceResult = await query(
        `SELECT role
         FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
         LIMIT 1`,
        [config.workspaceId, user.userId]
      );
      const role = workspaceResult.rows[0]?.role as string | undefined;
      if (!role) {
        errors.push('没有权限访问该工作空间');
      } else if (
        !hasWorkspacePermission(role as 'owner' | 'admin' | 'member' | 'viewer', 'execute')
      ) {
        errors.push('当前工作空间角色无执行测试权限');
      }
    }

    // 全局角色限制（作为上限约束）
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
    templateId?: string;
  }> {
    const templateResult = await this.applyTemplateConfig(config, user);
    const preparedConfig = templateResult.config;

    // 验证配置
    const validation = await this.validateTestConfig(preparedConfig, user);
    if (!validation.isValid) {
      throw ErrorFactory.validation('测试配置验证失败', validation.errors);
    }

    // 规范化配置
    const normalizedConfig = this.normalizeTestConfig(preparedConfig, user);

    try {
      const testId = uuidv4();
      const engineMeta = this.getEngineMeta(normalizedConfig.testType);

      const testConfigPayload: Record<string, unknown> = { ...normalizedConfig };

      await testRepository.create({
        testId,
        userId: user.userId,
        workspaceId: normalizedConfig.workspaceId,
        engineType: normalizedConfig.testType,
        engineName: engineMeta.engineName,
        testName: engineMeta.testName,
        testUrl: normalizedConfig.url,
        testConfig: testConfigPayload,
        status: 'pending',
        createdAt: new Date(),
      });

      await updateStatusWithLog(testId, 'queued', '测试已进入队列', {
        engineType: normalizedConfig.testType,
        url: normalizedConfig.url,
      });

      await enqueueTest({
        testId,
        userId: user.userId,
        config: {
          ...normalizedConfig,
          userRole: user.role,
        },
      });

      return {
        testId,
        status: 'queued',
        startTime: new Date(),
        estimatedDuration: normalizedConfig.duration || BUSINESS_RULES.duration.default,
        templateId: normalizedConfig.templateId ?? templateResult.templateId,
      };
    } catch (error) {
      throw ErrorFactory.database(
        '创建测试失败',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async applyTemplateConfig(
    config: TestConfig,
    user: User
  ): Promise<{ config: TestConfig; templateId?: string }> {
    let templateId = config.templateId;
    let template = null as { id: string | number; config: Record<string, unknown> } | null;

    if (config.templateId) {
      const resolved = await testTemplateService.getTemplateForUser(
        user.userId,
        config.templateId,
        config.workspaceId
      );
      template = { id: resolved.id, config: resolved.config };
      templateId = String(resolved.id);
    } else if (config.testType) {
      const resolved = await testTemplateService.getDefaultTemplate(
        user.userId,
        config.testType,
        config.workspaceId
      );
      if (resolved) {
        template = { id: resolved.id, config: resolved.config };
        templateId = String(resolved.id);
      }
    }

    if (!template) {
      return { config, templateId };
    }

    const templateConfig = this.extractTemplateConfig(template.config);
    const mergedConfig: TestConfig = {
      ...templateConfig,
      ...config,
      url: config.url || templateConfig.url || '',
      testType: config.testType || templateConfig.testType || '',
      options: {
        ...(templateConfig.options || {}),
        ...(config.options || {}),
      },
      concurrency: config.concurrency ?? templateConfig.concurrency,
      duration: config.duration ?? templateConfig.duration,
      batchId: config.batchId ?? templateConfig.batchId,
      scheduleId: config.scheduleId ?? templateConfig.scheduleId,
      templateId,
    };

    return { config: mergedConfig, templateId };
  }

  private extractTemplateConfig(config: Record<string, unknown>): TestConfig {
    return {
      url: typeof config.url === 'string' ? config.url : '',
      testType: typeof config.testType === 'string' ? config.testType : '',
      options: this.isRecord(config.options) ? (config.options as Record<string, unknown>) : {},
      concurrency: typeof config.concurrency === 'number' ? config.concurrency : undefined,
      duration: typeof config.duration === 'number' ? config.duration : undefined,
      batchId: typeof config.batchId === 'string' ? config.batchId : undefined,
      templateId: typeof config.templateId === 'string' ? config.templateId : undefined,
      scheduleId:
        typeof config.scheduleId === 'string' || typeof config.scheduleId === 'number'
          ? config.scheduleId
          : undefined,
    };
  }

  /**
   * 启动测试执行
   */
  private async startTestExecution(testId: string, config: TestConfig, user: User): Promise<void> {
    try {
      const stats =
        typeof testEngineRegistry.getStats === 'function' ? testEngineRegistry.getStats() : null;
      if (stats && stats.totalEngines === 0) {
        registerTestEngines();
      }
      if (typeof testEngineRegistry.initialize === 'function') {
        await testEngineRegistry.initialize();
      }
      const refreshedStats =
        typeof testEngineRegistry.getStats === 'function' ? testEngineRegistry.getStats() : null;
      if (refreshedStats && refreshedStats.totalEngines === 0) {
        throw new Error('测试引擎未注册');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const { getAlertManager } = require('../../alert/AlertManager');
        const alertManager = getAlertManager?.();
        if (alertManager && typeof alertManager.checkTestResult === 'function') {
          alertManager.checkTestResult({
            success: false,
            testId,
            type: config.testType,
            error: message,
          });
        }
      } catch (alertError) {
        console.warn('告警触发失败:', alertError);
      }
      await markFailedWithLog(testId, message, {
        engineType: config.testType,
        url: config.url,
      });
      throw error;
    }

    await markStartedWithLog(testId, {
      engineType: config.testType,
      url: config.url,
    });

    const engine = userTestManager.createUserTest(user.userId, testId, config.testType);
    if (!engine || typeof engine.executeTest !== 'function') {
      await markFailedWithLog(testId, '测试引擎初始化失败', {
        engineType: config.testType,
        url: config.url,
      });
      throw new Error('测试引擎初始化失败');
    }

    const payload = {
      ...config,
      testId,
    };

    Promise.resolve(engine.executeTest(payload)).catch(async (error: Error) => {
      try {
        const execution = await testRepository.findById(testId, user.userId);
        const status = execution?.status;
        if (
          status === 'cancelled' ||
          status === 'stopped' ||
          status === 'failed' ||
          status === 'completed'
        ) {
          return;
        }
      } catch (lookupError) {
        console.warn('检查测试状态失败，继续执行兜底失败落库:', lookupError);
      }

      await markFailedWithLog(testId, error.message, {
        engineType: config.testType,
        url: config.url,
        errorName: error.name,
      });
    });
  }

  async executeQueuedTest(testId: string, config: TestConfig, user: User): Promise<void> {
    await this.startTestExecution(testId, config, user);
  }

  private getEngineMeta(testType: string) {
    const metaMap: Record<string, { engineName: string; testName: string }> = {
      website: { engineName: 'WebsiteTestEngine', testName: '网站综合测试' },
      seo: { engineName: 'SeoTestEngine', testName: 'SEO测试' },
      performance: { engineName: 'PerformanceTestEngine', testName: '性能测试' },
      accessibility: { engineName: 'AccessibilityTestEngine', testName: '可访问性测试' },
      security: { engineName: 'SecurityTestEngine', testName: '安全测试' },
      api: { engineName: 'ApiTestEngine', testName: 'API测试' },
      stress: { engineName: 'StressTestEngine', testName: '压力测试' },
      compatibility: { engineName: 'CompatibilityTestEngine', testName: '兼容性测试' },
      ux: { engineName: 'UXTestEngine', testName: 'UX测试' },
    };

    return metaMap[testType] || { engineName: 'UnknownEngine', testName: '未知测试' };
  }

  /**
   * 获取业务规则
   */
  getBusinessRules(): BusinessRules {
    return BUSINESS_RULES;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * 更新业务规则
   */
  updateBusinessRules(newRules: Partial<BusinessRules>): void {
    Object.assign(BUSINESS_RULES, newRules);
  }
}

export default new TestBusinessService();
