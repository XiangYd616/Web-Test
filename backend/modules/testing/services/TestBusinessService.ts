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
import { TestTypeValues } from '../../../../shared/types/test.types';
import { query } from '../../config/database';
import { TEST_TYPE_ENGINE_META } from '../../constants/testEngineMappings';
import testEngineRegistry from '../../core/TestEngineRegistry';
import registerTestEngines from '../../engines/core/registerEngines';
import { ErrorFactory } from '../../middleware/errorHandler';
import { hasWorkspacePermission, resolveWorkspaceRole } from '../../utils/workspacePermissions';
import testRepository from '../repositories/testRepository';
import {
  insertExecutionLog,
  markFailedWithLog,
  markStartedWithLog,
  updateStatusWithLog,
} from './testLogService';
import { dispatchTest } from './TestQueueService';
import testTemplateService from './testTemplateService';
import userTestManager from './UserTestManager';

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

interface HistoryConfig {
  saveToHistory?: boolean;
  title?: string;
  tags?: string[];
  retentionDays?: number;
  baselineId?: string;
  notes?: string;
}

interface TestConfig {
  testId?: string;
  url: string;
  testType: string;
  options?: Record<string, unknown>;
  concurrency?: number;
  duration?: number;
  batchId?: string;
  templateId?: string;
  scheduleId?: string | number;
  workspaceId?: string;
  history?: HistoryConfig;
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

    // 并发数验证（仅保留最小值校验，上限改为警告）
    if (config.concurrency !== undefined && config.concurrency < 1) {
      errors.push('并发数不能小于 1');
    }
    if (config.concurrency && config.concurrency > BUSINESS_RULES.concurrent.recommended) {
      warnings.push(
        `并发数 ${config.concurrency} 超过推荐值 ${BUSINESS_RULES.concurrent.recommended}，可能影响系统性能`
      );
    }

    // 时长验证（仅保留最小值校验，上限改为警告）
    if (config.duration !== undefined && config.duration < 1) {
      errors.push('测试时长不能小于 1 秒');
    }
    if (config.duration && config.duration > BUSINESS_RULES.duration.max) {
      warnings.push(
        `测试时长 ${config.duration}s 超过 ${BUSINESS_RULES.duration.max}s，测试将持续较长时间`
      );
    }

    // 权限检查
    const permissionCheck = await this.checkUserPermissions(user, config);
    if (!permissionCheck.isValid) {
      errors.push(...permissionCheck.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 检查用户权限
   */
  private async checkUserPermissions(user: User, config: TestConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    if (config.workspaceId) {
      const role = await resolveWorkspaceRole(config.workspaceId, user.userId, query);
      if (!role) {
        errors.push('没有权限访问该工作空间');
      } else if (!hasWorkspacePermission(role, 'execute')) {
        errors.push('当前工作空间角色无执行测试权限');
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
  normalizeTestConfig(config: TestConfig, _user: User): TestConfig {
    const normalized: TestConfig = {
      ...config,
      concurrency: config.concurrency ?? BUSINESS_RULES.concurrent.default,
      duration: config.duration ?? BUSINESS_RULES.duration.default,
    };

    return normalized;
  }

  /**
   * 需要 Puppeteer 的重型测试类型
   */
  private static readonly HEAVY_TEST_TYPES = new Set([
    'performance',
    'security',
    'seo',
    'website',
    'compatibility',
    'ux',
    'accessibility',
  ]);

  /**
   * 检查重型测试是否被禁用（system_configs 开关）
   */
  private async isHeavyTestDisabled(): Promise<boolean> {
    try {
      const result = await query(
        "SELECT config_value FROM system_configs WHERE config_key = 'web_heavy_test_enabled' LIMIT 1",
        []
      );
      if (result.rows.length === 0) return false;
      const val = result.rows[0].config_value as { value?: boolean };
      return val?.value === false;
    } catch {
      return false;
    }
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
    warnings?: string[];
    estimatedDuration: number;
    templateId?: string;
  }> {
    // 检查重型测试全局开关
    if (TestBusinessService.HEAVY_TEST_TYPES.has(config.testType) && user.role !== 'admin') {
      const disabled = await this.isHeavyTestDisabled();
      if (disabled) {
        throw ErrorFactory.validation(
          '当前已暂停浏览器类测试（性能/安全/SEO等），仅支持 API 测试',
          ['管理员已禁用此类测试以降低服务器负载']
        );
      }
    }

    const templateResult = await this.applyTemplateConfig(config, user);
    const preparedConfig = {
      ...templateResult.config,
      testId: templateResult.config.testId || config.testId || uuidv4(),
    };

    // 验证配置
    const validation = await this.validateTestConfig(preparedConfig, user);
    if (!validation.isValid) {
      throw ErrorFactory.validation('测试配置验证失败', validation.errors);
    }

    // 规范化配置
    const normalizedConfig = this.normalizeTestConfig(preparedConfig, user);

    try {
      const testId = normalizedConfig.testId;
      if (!testId) {
        throw ErrorFactory.validation('测试配置验证失败', ['testId 不能为空']);
      }
      const engineMeta = this.getEngineMeta(normalizedConfig.testType);
      const historyConfig = normalizedConfig.history;
      const customTitle = historyConfig?.title?.trim();

      const { testId: _ignoredTestId, ...testConfigPayload } = normalizedConfig as TestConfig;

      await testRepository.create({
        testId,
        userId: user.userId,
        workspaceId: normalizedConfig.workspaceId,
        engineType: normalizedConfig.testType,
        engineName: engineMeta.engineName,
        testName: customTitle || engineMeta.testName,
        testUrl: normalizedConfig.url,
        testConfig: testConfigPayload,
        status: 'pending',
        createdAt: new Date(),
      });

      await updateStatusWithLog(testId, 'queued', '测试已进入队列', {
        engineType: normalizedConfig.testType,
        url: normalizedConfig.url,
      });

      // 将验证警告写入测试日志
      if (validation.warnings?.length) {
        for (const warn of validation.warnings) {
          await insertExecutionLog(testId, 'warn', warn);
        }
      }

      await dispatchTest({
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
        warnings: validation.warnings?.length ? validation.warnings : undefined,
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
        const { getAlertManager } = await import('../../alert/services/AlertManager');
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
      console.error(
        `[TestEngine] 测试执行失败 testId=${testId}:`,
        error.message,
        error.stack?.split('\n')[1]
      );
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
    const meta = TEST_TYPE_ENGINE_META[testType as keyof typeof TEST_TYPE_ENGINE_META];
    return meta || { engineName: 'UnknownEngine', testName: '未知测试' };
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
