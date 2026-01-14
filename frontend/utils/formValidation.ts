/**
 * 前端基础表单验证
 * 职责: 仅做格式检查,提供即时反馈
 * 注意: 业务规则验证由后端处理
 */

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * 验证规则
 */
export const ValidationRules = {
  // URL格式规则
  url: {
    required: true,
    pattern: /^https?:\/\/.+/,
    message: 'URL格式不正确,需要以http://或https://开头'
  },

  // 邮箱格式规则
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '邮箱格式不正确'
  },

  // 密码格式规则
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: '密码至少8位,包含大小写字母和数字'
  }
} as const;

/**
 * URL格式验证(仅格式)
 */
export function validateUrlFormat(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL不能为空' };
  }

  try {
    new URL(url);
    if (!ValidationRules.url.pattern.test(url)) {
      return { valid: false, error: ValidationRules.url.message };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'URL格式不正确' };
  }
}

/**
 * 邮箱格式验证
 */
export function validateEmailFormat(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { valid: false, error: '邮箱不能为空' };
  }

  if (!ValidationRules.email.pattern.test(email)) {
    return { valid: false, error: ValidationRules.email.message };
  }

  return { valid: true };
}

/**
 * 密码格式验证
 */
export function validatePasswordFormat(password: string): { valid: boolean; error?: string } {
  if (!password || password.length === 0) {
    return { valid: false, error: '密码不能为空' };
  }

  if (password.length < ValidationRules.password.minLength) {
    return { valid: false, error: `密码至少${ValidationRules.password.minLength}位` };
  }

  if (!ValidationRules.password.pattern.test(password)) {
    return { valid: false, error: ValidationRules.password.message };
  }

  return { valid: true };
}

/**
 * 必填项验证
 */
export function validateRequired(value: any, fieldName: string): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName}是必填项` };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, error: `${fieldName}不能为空` };
  }

  return { valid: true };
}

/**
 * 长度验证
 */
export function validateLength(
  value: string,
  options: { min?: number; max?: number; fieldName: string }
): { valid: boolean; error?: string } {
  const { min, max, fieldName } = options;

  if (min !== undefined && value.length < min) {
    return { valid: false, error: `${fieldName}至少${min}个字符` };
  }

  if (max !== undefined && value.length > max) {
    return { valid: false, error: `${fieldName}最多${max}个字符` };
  }

  return { valid: true };
}

/**
 * 数字范围验证
 */
export function validateRange(
  value: number,
  options: { min?: number; max?: number; fieldName: string }
): { valid: boolean; error?: string } {
  const { min, max, fieldName } = options;

  if (min !== undefined && value < min) {
    return { valid: false, error: `${fieldName}不能小于${min}` };
  }

  if (max !== undefined && value > max) {
    return { valid: false, error: `${fieldName}不能大于${max}` };
  }

  return { valid: true };
}

/**
 * 通用表单验证器
 */
export class FormValidator {
  private errors: Record<string, string[]> = {};

  /**
   * 添加错误
   */
  addError(field: string, error: string): void {
    if (!this.errors[field]) {
      this.errors[field] = [];
    }
    this.errors[field].push(error);
  }

  /**
   * 验证字段
   */
  validate(field: string, value: any, rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  }): void {
    // 必填验证
    if (rules.required) {
      const result = validateRequired(value, field);
      if (!result.valid && result.error) {
        this.addError(field, result.error);
        return; // 如果必填验证失败,不继续其他验证
      }
    }

    // 如果值为空且不是必填,跳过其他验证
    if (!value || value === '') return;

    // 长度验证
    if (rules.minLength || rules.maxLength) {
      const result = validateLength(value, {
        min: rules.minLength,
        max: rules.maxLength,
        fieldName: field
      });
      if (!result.valid && result.error) {
        this.addError(field, result.error);
      }
    }

    // 正则验证
    if (rules.pattern && !rules.pattern.test(value)) {
      this.addError(field, `${field}格式不正确`);
    }

    // 自定义验证
    if (rules.custom) {
      const error = rules.custom(value);
      if (error) {
        this.addError(field, error);
      }
    }
  }

  /**
   * 获取验证结果
   */
  getResult(): ValidationResult {
    return {
      valid: Object.keys(this.errors).length === 0,
      errors: this.errors
    };
  }

  /**
   * 清空错误
   */
  clear(): void {
    this.errors = {};
  }
}

/**
 * 快速验证测试配置(仅格式)
 */
export function validateTestConfigFormat(config: {
  url?: string;
  testType?: string;
  concurrent?: number;
}): ValidationResult {
  const validator = new FormValidator();

  // URL验证
  validator.validate('url', config.url, {
    required: true,
    custom: (value) => {
      const result = validateUrlFormat(value);
      return result.valid ? null : (result.error || 'URL格式不正确');
    }
  });

  // 并发数验证(仅格式,不验证业务限制)
  if (config.concurrent !== undefined) {
    validator.validate('concurrent', config.concurrent, {
      custom: (value) => {
        if (typeof value !== 'number' || value < 1) {
          return '并发数必须大于0';
        }
        // 注意: 不验证最大值,因为这是业务规则,由后端处理
        return null;
      }
    });
  }

  return validator.getResult();
}

/**
 * 默认导出
 */
export default {
  validateUrlFormat,
  validateEmailFormat,
  validatePasswordFormat,
  validateRequired,
  validateLength,
  validateRange,
  validateTestConfigFormat,
  FormValidator,
  ValidationRules
};
