/**
 * 数据模型验证器
 * 确保前后端数据模型的一致性
 * 版本: v1.0.0
 */

import type { User, UserDatabaseFields } from './user';
import type { TestResult, TestResultDatabaseFields } from './testResult';
import type { ApiResponse } from './apiResponse';

// ==================== 数据模型验证接口 ====================

export interface ModelValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface FieldMapping {
  frontendField: string;
  backendField: string;
  databaseField: string;
  type: string;
  required: boolean;
  transformer?: (value: any) => any;
}

// ==================== 字段映射配置 ====================

/**
 * 用户模型字段映射
 */
export const USER_FIELD_MAPPINGS: FieldMapping[] = [
  {
    frontendField: 'id',
    backendField: 'id',
    databaseField: 'id',
    type: 'UUID',
    required: true
  },
  {
    frontendField: 'username',
    backendField: 'username',
    databaseField: 'username',
    type: 'string',
    required: true
  },
  {
    frontendField: 'email',
    backendField: 'email',
    databaseField: 'email',
    type: 'Email',
    required: true
  },
  {
    frontendField: 'lastLoginAt',
    backendField: 'lastLogin',
    databaseField: 'last_login_at',
    type: 'Timestamp',
    required: false,
    transformer: (value: string | Date) => 
      value instanceof Date ? value.toISOString() : value
  },
  {
    frontendField: 'createdAt',
    backendField: 'createdAt',
    databaseField: 'created_at',
    type: 'Timestamp',
    required: true,
    transformer: (value: string | Date) => 
      value instanceof Date ? value.toISOString() : value
  },
  {
    frontendField: 'updatedAt',
    backendField: 'updatedAt',
    databaseField: 'updated_at',
    type: 'Timestamp',
    required: true,
    transformer: (value: string | Date) => 
      value instanceof Date ? value.toISOString() : value
  }
];

/**
 * 测试结果模型字段映射
 */
export const TEST_RESULT_FIELD_MAPPINGS: FieldMapping[] = [
  {
    frontendField: 'id',
    backendField: 'id',
    databaseField: 'id',
    type: 'UUID',
    required: true
  },
  {
    frontendField: 'testType',
    backendField: 'testType',
    databaseField: 'test_type',
    type: 'TestType',
    required: true
  },
  {
    frontendField: 'startTime',
    backendField: 'startedAt',
    databaseField: 'started_at',
    type: 'Timestamp',
    required: false,
    transformer: (value: string | Date) => 
      value instanceof Date ? value.toISOString() : value
  },
  {
    frontendField: 'endTime',
    backendField: 'completedAt',
    databaseField: 'completed_at',
    type: 'Timestamp',
    required: false,
    transformer: (value: string | Date) => 
      value instanceof Date ? value.toISOString() : value
  },
  {
    frontendField: 'duration',
    backendField: 'duration',
    databaseField: 'duration_ms',
    type: 'number',
    required: false
  }
];

// ==================== 数据转换函数 ====================

/**
 * 将数据库字段转换为前端字段
 */
export function transformDatabaseToFrontend<T>(
  data: Record<string, any>,
  mappings: FieldMapping[]
): Partial<T> {
  const result: Record<string, any> = {};

  for (const mapping of mappings) {
    const dbValue = data[mapping.databaseField];
    if (dbValue !== undefined) {
      const transformedValue = mapping.transformer 
        ? mapping.transformer(dbValue)
        : dbValue;
      result[mapping.frontendField] = transformedValue;
    }
  }

  return result as Partial<T>;
}

/**
 * 将前端字段转换为数据库字段
 */
export function transformFrontendToDatabase(
  data: Record<string, any>,
  mappings: FieldMapping[]
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of mappings) {
    const frontendValue = data[mapping.frontendField];
    if (frontendValue !== undefined) {
      const transformedValue = mapping.transformer 
        ? mapping.transformer(frontendValue)
        : frontendValue;
      result[mapping.databaseField] = transformedValue;
    }
  }

  return result;
}

// ==================== 数据验证器类 ====================

export class DataModelValidator {
  /**
   * 验证用户数据模型
   */
  static validateUserModel(data: any): ModelValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 验证必填字段
    const requiredFields = USER_FIELD_MAPPINGS
      .filter(mapping => mapping.required)
      .map(mapping => mapping.frontendField);

    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`缺少必填字段: ${field}`);
      }
    }

    // 验证字段类型
    for (const mapping of USER_FIELD_MAPPINGS) {
      const value = data[mapping.frontendField];
      if (value !== undefined) {
        const isValid = this.validateFieldType(value, mapping.type);
        if (!isValid) {
          errors.push(`字段 ${mapping.frontendField} 类型不匹配，期望: ${mapping.type}`);
        }
      }
    }

    // 验证邮箱格式
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('邮箱格式无效');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 验证测试结果数据模型
   */
  static validateTestResultModel(data: any): ModelValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 验证必填字段
    const requiredFields = TEST_RESULT_FIELD_MAPPINGS
      .filter(mapping => mapping.required)
      .map(mapping => mapping.frontendField);

    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`缺少必填字段: ${field}`);
      }
    }

    // 验证时间逻辑
    if (data.startTime && data.endTime) {
      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);
      if (startTime >= endTime) {
        errors.push('结束时间必须晚于开始时间');
      }
    }

    // 验证分数范围
    if (data.score !== undefined) {
      if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
        errors.push('分数必须是0-100之间的数字');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 验证字段类型
   */
  private static validateFieldType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'UUID':
        return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      case 'Email':
        return typeof value === 'string' && this.isValidEmail(value);
      case 'Timestamp':
        return typeof value === 'string' && !isNaN(Date.parse(value));
      case 'TestType':
        return typeof value === 'string' && ['seo', 'performance', 'security', 'api', 'compatibility', 'accessibility', 'stress'].includes(value);
      default:
        return true; // 未知类型，跳过验证
    }
  }

  /**
   * 验证邮箱格式
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// ==================== 数据模型版本控制 ====================

export interface ModelVersion {
  version: string;
  timestamp: string;
  changes: string[];
  breaking: boolean;
}

export const DATA_MODEL_VERSIONS: ModelVersion[] = [
  {
    version: '1.0.0',
    timestamp: '2024-08-08T00:00:00Z',
    changes: [
      '初始版本',
      '统一用户模型字段映射',
      '统一测试结果模型字段映射',
      '建立数据验证机制'
    ],
    breaking: false
  }
];

export const CURRENT_MODEL_VERSION = '1.0.0';
