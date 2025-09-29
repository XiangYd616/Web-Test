/**
 * 配置验证工具
 * 版本: v1.0.0
 * 
 * 提供API和Auth配置的运行时验证功能
 */

import type { UnifiedApiConfig } from './apiConfig';
import type { UnifiedAuthConfig } from './authConfig';
import type { ErrorSeverity } from './errors';

// ==================== 验证结果接口 ====================

export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 验证错误列表 */
  errors: ConfigValidationError[];
  /** 警告列表 */
  warnings: ConfigValidationWarning[];
  /** 验证摘要 */
  summary: ValidationSummary;
}

export interface ConfigValidationError {
  /** 错误字段路径 */
  path: string;
  /** 错误消息 */
  message: string;
  /** 当前值 */
  value: unknown;
  /** 错误类型 */
  type: 'required' | 'type' | 'range' | 'format' | 'dependency';
  /** 严重级别 */
  severity: ErrorSeverity;
  /** 修复建议 */
  suggestion?: string;
}

export interface ConfigValidationWarning {
  /** 警告字段路径 */
  path: string;
  /** 警告消息 */
  message: string;
  /** 当前值 */
  value: unknown;
  /** 建议值 */
  suggestedValue?: unknown;
  /** 建议原因 */
  reason?: string;
}

export interface ValidationSummary {
  /** 总字段数 */
  totalFields: number;
  /** 验证通过的字段数 */
  validFields: number;
  /** 错误字段数 */
  errorFields: number;
  /** 警告字段数 */
  warningFields: number;
  /** 验证耗时（毫秒） */
  validationTime: number;
}

// ==================== 验证规则接口 ====================

export type ValidationRule<T = any> = (value: T, config: unknown, path: string) => ConfigValidationError | null;
export type WarningRule<T = any> = (value: T, config: unknown, path: string) => ConfigValidationWarning | null;

export interface FieldValidator {
  /** 必填验证 */
  required?: boolean;
  /** 类型验证 */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function';
  /** 最小值/长度 */
  min?: number;
  /** 最大值/长度 */
  max?: number;
  /** 正则表达式 */
  pattern?: RegExp;
  /** 枚举值 */
  enum?: unknown[];
  /** 自定义验证规则 */
  custom?: ValidationRule[];
  /** 警告规则 */
  warnings?: WarningRule[];
}

// ==================== API配置验证 ====================

const API_CONFIG_SCHEMA: Record<string, FieldValidator> = {
  'baseURL': {
    required: true,
    type: 'string',
    min: 1,
    pattern: /^https?:\/\/.+/,
    custom: [
      (value, config, path) => {
        if (typeof value !== 'string') return null;
        if (value.endsWith('/')) {
          return {
            path,
            message: 'BaseURL不应以斜杠结尾',
            value,
            type: 'format',
            severity: 'low',
            suggestion: value.slice(0, -1)
          };
        }
        return null;
      }
    ]
  },
  'timeout': {
    required: true,
    type: 'number',
    min: 1000,
    max: 300000,
    warnings: [
      (value, config, path) => {
        if (typeof value !== 'number') return null;
        if (value < 5000) {
          return {
            path,
            message: 'API超时时间过短，可能导致请求失败',
            value,
            suggestedValue: 30000,
            reason: '推荐使用30秒超时以适应网络延迟'
          };
        }
        if (value > 60000) {
          return {
            path,
            message: 'API超时时间过长，可能影响用户体验',
            value,
            suggestedValue: 30000,
            reason: '推荐使用30秒超时以平衡稳定性和响应性'
          };
        }
        return null;
      }
    ]
  },
  'cache?.enabled': {
    required: true,
    type: 'boolean'
  },
  'cache?.maxSize': {
    required: true,
    type: 'number',
    min: 10,
    max: 10000,
    warnings: [
      (value, config, path) => {
        if (typeof value !== 'number') return null;
        if (value < 100) {
          return {
            path,
            message: '缓存大小较小，可能影响性能',
            value,
            suggestedValue: 1000,
            reason: '推荐至少100个缓存条目以获得更好的性能'
          };
        }
        return null;
      }
    ]
  },
  'cache?.defaultTtl': {
    required: true,
    type: 'number',
    min: 1000,
    max: 3600000
  },
  'retry?.enabled': {
    required: true,
    type: 'boolean'
  },
  'retry?.maxAttempts': {
    required: true,
    type: 'number',
    min: 1,
    max: 10,
    warnings: [
      (value, config, path) => {
        if (typeof value !== 'number') return null;
        if (value > 5) {
          return {
            path,
            message: '重试次数过多可能导致性能问题',
            value,
            suggestedValue: 3,
            reason: '推荐最多3次重试以平衡可靠性和性能'
          };
        }
        return null;
      }
    ]
  },
  'retry?.baseDelay': {
    required: true,
    type: 'number',
    min: 100,
    max: 10000
  }
};

/**
 * 验证API配置
 */
export function validateApiConfig(config: Partial<UnifiedApiConfig>): ValidationResult {
  const startTime = Date.now();
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  // 验证必需字段
  validateFields(config, API_CONFIG_SCHEMA, errors, warnings);

  // 自定义验证逻辑
  validateApiConfigLogic(config, errors, warnings);

  const endTime = Date.now();
  const validationTime = endTime - startTime;

  const totalFields = Object.keys(API_CONFIG_SCHEMA).length;
  const errorFields = errors.length;
  const warningFields = warnings?.length;
  const validFields = totalFields - errorFields;

  return {
    valid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
    errors,
    warnings,
    summary: {
      totalFields,
      validFields,
      errorFields,
      warningFields,
      validationTime
    }
  };
}

/**
 * 验证API配置的业务逻辑
 */
function validateApiConfigLogic(
  config: Partial<UnifiedApiConfig>,
  errors: ConfigValidationError[],
  warnings: ConfigValidationWarning[]
): void {
  // 缓存和重试依赖验证
  if (config.cache?.enabled && config.retry?.enabled) {
    if (config.retry.maxAttempts > 3 && config.cache.defaultTtl < 60000) {
      warnings?.push({
        path: 'cache?.defaultTtl',
        message: '高重试次数配合短缓存时间可能导致频繁的重复请求',
        value: config.cache.defaultTtl,
        suggestedValue: 300000,
        reason: '建议增加缓存时间或减少重试次数'
      });
    }
  }

  // 生产环境特殊验证
  if (config.isProduction) {
    if (config.enableDebugLogging) {
      warnings?.push({
        path: 'enableDebugLogging',
        message: '生产环境不建议启用调试日志',
        value: true,
        suggestedValue: false,
        reason: '调试日志可能泄露敏感信息并影响性能'
      });
    }

    if (!config.security?.requestSigning?.enabled) {
      warnings?.push({
        path: 'security?.requestSigning.enabled',
        message: '生产环境建议启用请求签名',
        value: false,
        suggestedValue: true,
        reason: '请求签名可以提高API安全性'
      });
    }
  }
}

// ==================== Auth配置验证 ====================

const AUTH_CONFIG_SCHEMA: Record<string, FieldValidator> = {
  'apiBaseUrl': {
    required: true,
    type: 'string',
    min: 1,
    pattern: /^https?:\/\/.+/
  },
  'tokens?.jwt.accessTokenExpiry': {
    required: true,
    type: 'number',
    min: 60,
    max: 86400,
    warnings: [
      (value, config, path) => {
        if (typeof value !== 'number') return null;
        if (value > 3600) {
          return {
            path,
            message: '访问token过期时间过长，存在安全风险',
            value,
            suggestedValue: 900,
            reason: '推荐15分钟访问token过期时间以平衡安全性和用户体验'
          };
        }
        return null;
      }
    ]
  },
  'tokens?.jwt.refreshTokenExpiry': {
    required: true,
    type: 'number',
    min: 3600,
    max: 2592000
  },
  'security?.sessionManagement.maxConcurrentSessions': {
    required: true,
    type: 'number',
    min: 1,
    max: 20,
    warnings: [
      (value, config, path) => {
        if (typeof value !== 'number') return null;
        if (value > 10) {
          return {
            path,
            message: '过多的并发会话可能存在安全风险',
            value,
            suggestedValue: 5,
            reason: '建议限制并发会话数量以提高安全性'
          };
        }
        return null;
      }
    ]
  }
};

/**
 * 验证Auth配置
 */
export function validateAuthConfig(config: Partial<UnifiedAuthConfig>): ValidationResult {
  const startTime = Date.now();
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  // 验证必需字段
  validateFields(config, AUTH_CONFIG_SCHEMA, errors, warnings);

  // 自定义验证逻辑
  validateAuthConfigLogic(config, errors, warnings);

  const endTime = Date.now();
  const validationTime = endTime - startTime;

  const totalFields = Object.keys(AUTH_CONFIG_SCHEMA).length;
  const errorFields = errors.length;
  const warningFields = warnings?.length;
  const validFields = totalFields - errorFields;

  return {
    valid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
    errors,
    warnings,
    summary: {
      totalFields,
      validFields,
      errorFields,
      warningFields,
      validationTime
    }
  };
}

/**
 * 验证Auth配置的业务逻辑
 */
function validateAuthConfigLogic(
  config: Partial<UnifiedAuthConfig>,
  errors: ConfigValidationError[],
  warnings: ConfigValidationWarning[]
): void {
  // JWT配置逻辑验证
  if (config.tokens?.jwt) {
    const { accessTokenExpiry, refreshTokenExpiry, autoRefreshThreshold } = config.tokens.jwt;
    
    if (accessTokenExpiry && autoRefreshThreshold && accessTokenExpiry <= autoRefreshThreshold) {
      errors.push({
        path: 'tokens?.jwt.autoRefreshThreshold',
        message: '自动刷新阈值必须小于访问token过期时间',
        value: autoRefreshThreshold,
        type: 'dependency',
        severity: 'high',
        suggestion: `设置为小于 ${accessTokenExpiry} 的值`
      });
    }

    if (refreshTokenExpiry && accessTokenExpiry && refreshTokenExpiry <= accessTokenExpiry) {
      errors.push({
        path: 'tokens?.jwt.refreshTokenExpiry',
        message: '刷新token过期时间必须大于访问token过期时间',
        value: refreshTokenExpiry,
        type: 'dependency',
        severity: 'high',
        suggestion: `设置为大于 ${accessTokenExpiry} 的值`
      });
    }
  }

  // 安全配置验证
  if (config.environment === 'production') {
    if (config.security?.mfa.enabled === false) {
      warnings?.push({
        path: 'security?.mfa.enabled',
        message: '生产环境建议启用多因素认证',
        value: false,
        suggestedValue: true,
        reason: 'MFA可以显著提高账户安全性'
      });
    }

    if (!config.tokens?.storage?.encryptTokens) {
      warnings?.push({
        path: 'tokens?.storage.encryptTokens',
        message: '生产环境建议加密存储token',
        value: false,
        suggestedValue: true,
        reason: 'Token加密可以防止本地存储泄露'
      });
    }
  }
}

// ==================== 通用验证工具函数 ====================

/**
 * 验证字段
 */
function validateFields(
  config: unknown,
  schema: Record<string, FieldValidator>,
  errors: ConfigValidationError[],
  warnings: ConfigValidationWarning[]
): void {
  for (const [path, validator] of Object.entries(schema)) {
    const value = getNestedValue(config, path);
    
    // 必填验证
    if (validator.required && (value === undefined || value === null)) {
      errors.push({
        path,
        message: `字段 ${path} 是必需的`,
        value,
        type: 'required',
        severity: 'high'
      });
      continue;
    }

    if (value !== undefined && value !== null) {
      // 类型验证
      if (validator.type && typeof value !== validator.type) {
        errors.push({
          path,
          message: `字段 ${path} 类型错误，期望 ${validator.type}，实际 ${typeof value}`,
          value,
          type: 'type',
          severity: 'high'
        });
        continue;
      }

      // 范围验证
      if (validator.min !== undefined) {
        const actualLength = typeof value === 'string' || Array.isArray(value) ? value.length : value;
        if (actualLength < validator.min) {
          errors.push({
            path,
            message: `字段 ${path} 值过小，最小值为 ${validator.min}`,
            value,
            type: 'range',
            severity: 'medium'
          });
        }
      }

      if (validator.max !== undefined) {
        const actualLength = typeof value === 'string' || Array.isArray(value) ? value.length : value;
        if (actualLength > validator.max) {
          errors.push({
            path,
            message: `字段 ${path} 值过大，最大值为 ${validator.max}`,
            value,
            type: 'range',
            severity: 'medium'
          });
        }
      }

      // 正则验证
      if (validator.pattern && typeof value === 'string' && !validator.pattern.test(value)) {
        errors.push({
          path,
          message: `字段 ${path} 格式不正确`,
          value,
          type: 'format',
          severity: 'medium'
        });
      }

      // 枚举验证
      if (validator.enum && !validator.enum.includes(value)) {
        errors.push({
          path,
          message: `字段 ${path} 值无效，允许的值为: ${validator.enum.join(', ')}`,
          value,
          type: 'format',
          severity: 'medium'
        });
      }

      // 自定义验证
      if (validator.custom) {
        for (const rule of validator.custom) {
          const error = rule(value, config, path);
          if (error) {
            errors.push(error);
          }
        }
      }

      // 警告规则
      if (validator.warnings) {
        for (const rule of validator.warnings) {
          const warning = rule(value, config, path);
          if (warning) {
            warnings?.push(warning);
          }
        }
      }
    }
  }
}

/**
 * 获取嵌套值
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// ==================== 导出验证工具 ====================

/**
 * 验证所有配置
 */
export function validateAllConfigs(
  apiConfig: Partial<UnifiedApiConfig>,
  authConfig: Partial<UnifiedAuthConfig>
): {
  api: ValidationResult;
  auth: ValidationResult;
  overall: {
    valid: boolean;
    totalErrors: number;
    totalWarnings: number;
    validationTime: number;
  };
} {
  const apiResult = validateApiConfig(apiConfig);
  const authResult = validateAuthConfig(authConfig);

  return {
    api: apiResult,
    auth: authResult,
    overall: {
      valid: apiResult.valid && authResult.valid,
      totalErrors: apiResult.errors.length + authResult.errors.length,
      totalWarnings: apiResult.warnings.length + authResult.warnings.length,
      validationTime: apiResult.summary.validationTime + authResult.summary.validationTime
    }
  };
}

/**
 * 创建配置验证报告
 */
export function createValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(50));
  lines.push('配置验证报告');
  lines.push('='.repeat(50));
  
  // 摘要
  lines.push(`\n摘要:`);
  lines.push(`  总字段数: ${result.summary.totalFields}`);
  lines.push(`  验证通过: ${result.summary.validFields}`);
  lines.push(`  错误字段: ${result.summary.errorFields}`);
  lines.push(`  警告字段: ${result.summary.warningFields}`);
  lines.push(`  验证时间: ${result.summary.validationTime}ms`);
  lines.push(`  整体状态: ${result.valid ? '✅ 通过' : '❌ 失败'}`);
  
  // 错误详情
  if (result.errors.length > 0) {
    lines.push(`\n错误详情:`);
    result.errors.forEach((error, index) => {
      lines.push(`  ${index + 1}. [${error.severity.toUpperCase()}] ${error.path}`);
      lines.push(`     消息: ${error.message}`);
      lines.push(`     当前值: ${JSON.stringify(error.value)}`);
      if (error.suggestion) {
        lines.push(`     建议: ${error.suggestion}`);
      }
      lines.push('');
    });
  }
  
  // 警告详情
  if (result.warnings.length > 0) {
    lines.push(`\n警告详情:`);
    result.warnings.forEach((warning, index) => {
      lines.push(`  ${index + 1}. ⚠️  ${warning.path}`);
      lines.push(`     消息: ${warning.message}`);
      lines.push(`     当前值: ${JSON.stringify(warning.value)}`);
      if (warning.suggestedValue !== undefined) {
        lines.push(`     建议值: ${JSON.stringify(warning.suggestedValue)}`);
      }
      if (warning.reason) {
        lines.push(`     原因: ${warning.reason}`);
      }
      lines.push('');
    });
  }
  
  return lines.join('\n');
}
