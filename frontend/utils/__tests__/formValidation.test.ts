/**
 * formValidation单元测试
 * 
 * 测试内容:
 * 1. URL格式验证
 * 2. 邮箱格式验证
 * 3. 密码格式验证
 * 4. 必填项验证
 * 5. 长度验证
 * 6. 数字范围验证
 * 7. FormValidator类功能
 * 8. 测试配置格式验证
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  validateUrlFormat,
  validateEmailFormat,
  validatePasswordFormat,
  validateRequired,
  validateLength,
  validateRange,
  validateTestConfigFormat,
  FormValidator,
  ValidationRules
} from '../formValidation';

describe('formValidation - URL格式验证', () => {
  test('应该接受有效的HTTP URL', () => {
    const result = validateUrlFormat('http://example.com');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('应该接受有效的HTTPS URL', () => {
    const result = validateUrlFormat('https://example.com');
    expect(result.valid).toBe(true);
  });

  test('应该接受带端口的URL', () => {
    const result = validateUrlFormat('https://example.com:8080');
    expect(result.valid).toBe(true);
  });

  test('应该接受带路径的URL', () => {
    const result = validateUrlFormat('https://example.com/path/to/resource');
    expect(result.valid).toBe(true);
  });

  test('应该接受带查询参数的URL', () => {
    const result = validateUrlFormat('https://example.com?foo=bar&baz=qux');
    expect(result.valid).toBe(true);
  });

  test('应该拒绝空URL', () => {
    const result = validateUrlFormat('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL不能为空');
  });

  test('应该拒绝空白URL', () => {
    const result = validateUrlFormat('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL不能为空');
  });

  test('应该拒绝无效的URL格式', () => {
    const result = validateUrlFormat('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL格式不正确');
  });

  test('应该拒绝没有协议的URL', () => {
    const result = validateUrlFormat('example.com');
    expect(result.valid).toBe(false);
  });

  test('应该拒绝非HTTP(S)协议的URL', () => {
    const result = validateUrlFormat('ftp://example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(ValidationRules.url.message);
  });

  test('应该拒绝file协议', () => {
    const result = validateUrlFormat('file:///path/to/file');
    expect(result.valid).toBe(false);
  });
});

describe('formValidation - 邮箱格式验证', () => {
  test('应该接受有效的邮箱', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.com',
      'user+tag@example.co.uk',
      'user123@test-domain.com'
    ];

    validEmails.forEach(email => {
      const result = validateEmailFormat(email);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  test('应该拒绝空邮箱', () => {
    const result = validateEmailFormat('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('邮箱不能为空');
  });

  test('应该拒绝无效的邮箱格式', () => {
    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'user@',
      'user@.com',
      'user @example.com',
      'user@example',
      'user@@example.com'
    ];

    invalidEmails.forEach(email => {
      const result = validateEmailFormat(email);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(ValidationRules.email.message);
    });
  });
});

describe('formValidation - 密码格式验证', () => {
  test('应该接受有效的密码', () => {
    const validPasswords = [
      'Abcd1234',
      'Password123',
      'Test1234Pass',
      'MyP@ssw0rd'
    ];

    validPasswords.forEach(password => {
      const result = validatePasswordFormat(password);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  test('应该拒绝空密码', () => {
    const result = validatePasswordFormat('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('密码不能为空');
  });

  test('应该拒绝过短的密码', () => {
    const result = validatePasswordFormat('Ab1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(`密码至少${ValidationRules.password.minLength}位`);
  });

  test('应该拒绝没有大写字母的密码', () => {
    const result = validatePasswordFormat('abcd1234');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(ValidationRules.password.message);
  });

  test('应该拒绝没有小写字母的密码', () => {
    const result = validatePasswordFormat('ABCD1234');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(ValidationRules.password.message);
  });

  test('应该拒绝没有数字的密码', () => {
    const result = validatePasswordFormat('AbcdEfgh');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(ValidationRules.password.message);
  });
});

describe('formValidation - 必填项验证', () => {
  test('应该接受有效值', () => {
    const result = validateRequired('value', '字段名');
    expect(result.valid).toBe(true);
  });

  test('应该接受数字0', () => {
    const result = validateRequired(0, '字段名');
    expect(result.valid).toBe(true);
  });

  test('应该拒绝null', () => {
    const result = validateRequired(null, '字段名');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('字段名是必填项');
  });

  test('应该拒绝undefined', () => {
    const result = validateRequired(undefined, '字段名');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('字段名是必填项');
  });

  test('应该拒绝空字符串', () => {
    const result = validateRequired('', '字段名');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('字段名是必填项');
  });

  test('应该拒绝只包含空白的字符串', () => {
    const result = validateRequired('   ', '字段名');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('字段名不能为空');
  });
});

describe('formValidation - 长度验证', () => {
  test('应该接受符合最小长度的值', () => {
    const result = validateLength('abcde', { min: 5, fieldName: '字段' });
    expect(result.valid).toBe(true);
  });

  test('应该接受符合最大长度的值', () => {
    const result = validateLength('abc', { max: 5, fieldName: '字段' });
    expect(result.valid).toBe(true);
  });

  test('应该接受在范围内的值', () => {
    const result = validateLength('abcd', { min: 2, max: 10, fieldName: '字段' });
    expect(result.valid).toBe(true);
  });

  test('应该拒绝过短的值', () => {
    const result = validateLength('ab', { min: 5, fieldName: '字段' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('字段至少5个字符');
  });

  test('应该拒绝过长的值', () => {
    const result = validateLength('abcdef', { max: 5, fieldName: '字段' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('字段最多5个字符');
  });
});

describe('formValidation - 数字范围验证', () => {
  test('应该接受符合最小值的数字', () => {
    const result = validateRange(10, { min: 5, fieldName: '字段' });
    expect(result.valid).toBe(true);
  });

  test('应该接受符合最大值的数字', () => {
    const result = validateRange(5, { max: 10, fieldName: '字段' });
    expect(result.valid).toBe(true);
  });

  test('应该接受在范围内的数字', () => {
    const result = validateRange(7, { min: 5, max: 10, fieldName: '字段' });
    expect(result.valid).toBe(true);
  });

  test('应该接受边界值', () => {
    const result1 = validateRange(5, { min: 5, max: 10, fieldName: '字段' });
    expect(result1.valid).toBe(true);

    const result2 = validateRange(10, { min: 5, max: 10, fieldName: '字段' });
    expect(result2.valid).toBe(true);
  });

  test('应该拒绝过小的数字', () => {
    const result = validateRange(3, { min: 5, fieldName: '字段' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('字段不能小于5');
  });

  test('应该拒绝过大的数字', () => {
    const result = validateRange(15, { max: 10, fieldName: '字段' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('字段不能大于10');
  });
});

describe('formValidation - FormValidator类', () => {
  let validator: FormValidator;

  beforeEach(() => {
    validator = new FormValidator();
  });

  test('应该能添加错误', () => {
    validator.addError('field1', 'Error message');
    const result = validator.getResult();
    
    expect(result.valid).toBe(false);
    expect(result.errors.field1).toContain('Error message');
  });

  test('应该能添加多个错误到同一字段', () => {
    validator.addError('field1', 'Error 1');
    validator.addError('field1', 'Error 2');
    const result = validator.getResult();
    
    expect(result.errors.field1).toHaveLength(2);
    expect(result.errors.field1).toContain('Error 1');
    expect(result.errors.field1).toContain('Error 2');
  });

  test('应该验证必填字段', () => {
    validator.validate('username', '', { required: true });
    const result = validator.getResult();
    
    expect(result.valid).toBe(false);
    expect(result.errors.username).toBeDefined();
  });

  test('应该验证长度', () => {
    validator.validate('username', 'ab', { minLength: 5 });
    const result = validator.getResult();
    
    expect(result.valid).toBe(false);
    expect(result.errors.username.some(e => e.includes('至少'))).toBe(true);
  });

  test('应该验证正则表达式', () => {
    validator.validate('code', 'abc', { pattern: /^\d+$/ });
    const result = validator.getResult();
    
    expect(result.valid).toBe(false);
    expect(result.errors.code.some(e => e.includes('格式不正确'))).toBe(true);
  });

  test('应该执行自定义验证', () => {
    validator.validate('age', 15, {
      custom: (value) => value < 18 ? '年龄必须大于18岁' : null
    });
    const result = validator.getResult();
    
    expect(result.valid).toBe(false);
    expect(result.errors.age).toContain('年龄必须大于18岁');
  });

  test('应该跳过空值的非必填验证', () => {
    validator.validate('optional', '', {
      required: false,
      minLength: 5
    });
    const result = validator.getResult();
    
    expect(result.valid).toBe(true);
  });

  test('应该能清空错误', () => {
    validator.addError('field1', 'Error');
    validator.clear();
    const result = validator.getResult();
    
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test('应该返回有效结果当没有错误时', () => {
    validator.validate('username', 'validuser', { required: true });
    const result = validator.getResult();
    
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});

describe('formValidation - 测试配置格式验证', () => {
  test('应该接受有效的测试配置', () => {
    const config = {
      url: 'https://example.com',
      testType: 'load',
      concurrent: 10
    };
    
    const result = validateTestConfigFormat(config);
    
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  test('应该拒绝缺少URL的配置', () => {
    const config = {
      testType: 'load',
      concurrent: 10
    };
    
    const result = validateTestConfigFormat(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors.url).toBeDefined();
  });

  test('应该拒绝无效的URL', () => {
    const config = {
      url: 'not-a-url',
      concurrent: 10
    };
    
    const result = validateTestConfigFormat(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors.url).toBeDefined();
  });

  test('应该拒绝无效的并发数', () => {
    const config = {
      url: 'https://example.com',
      concurrent: 0
    };
    
    const result = validateTestConfigFormat(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors.concurrent).toBeDefined();
  });

  test('应该拒绝负数的并发数', () => {
    const config = {
      url: 'https://example.com',
      concurrent: -5
    };
    
    const result = validateTestConfigFormat(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors.concurrent).toBeDefined();
  });

  test('应该拒绝非数字的并发数', () => {
    const config = {
      url: 'https://example.com',
      concurrent: 'ten' as any
    };
    
    const result = validateTestConfigFormat(config);
    
    expect(result.valid).toBe(false);
    expect(result.errors.concurrent).toBeDefined();
  });

  test('应该允许省略并发数', () => {
    const config = {
      url: 'https://example.com'
    };
    
    const result = validateTestConfigFormat(config);
    
    expect(result.valid).toBe(true);
  });

  test('应该允许省略测试类型', () => {
    const config = {
      url: 'https://example.com',
      concurrent: 10
    };
    
    const result = validateTestConfigFormat(config);
    
    expect(result.valid).toBe(true);
  });

  test('注意:不验证最大并发数(业务规则)', () => {
    // 前端格式验证不应该验证业务限制
    const config = {
      url: 'https://example.com',
      concurrent: 10000 // 超过业务限制,但格式有效
    };
    
    const result = validateTestConfigFormat(config);
    
    // 应该通过格式验证,业务规则由后端处理
    expect(result.valid).toBe(true);
  });
});

describe('formValidation - ValidationRules', () => {
  test('应该提供URL规则', () => {
    expect(ValidationRules.url.required).toBe(true);
    expect(ValidationRules.url.pattern).toBeDefined();
    expect(ValidationRules.url.message).toBeDefined();
  });

  test('应该提供邮箱规则', () => {
    expect(ValidationRules.email.pattern).toBeDefined();
    expect(ValidationRules.email.message).toBeDefined();
  });

  test('应该提供密码规则', () => {
    expect(ValidationRules.password.minLength).toBe(8);
    expect(ValidationRules.password.pattern).toBeDefined();
    expect(ValidationRules.password.message).toBeDefined();
  });
});

describe('formValidation - 边界情况', () => {
  test('应该处理Unicode字符', () => {
    const result = validateUrlFormat('https://例え.com');
    // URL构造函数应该能处理国际化域名
    expect(result.valid).toBe(true);
  });

  test('应该处理特殊字符的邮箱', () => {
    const result = validateEmailFormat('user+tag@example.com');
    expect(result.valid).toBe(true);
  });

  test('应该处理包含特殊字符的密码', () => {
    const result = validatePasswordFormat('P@ssw0rd!#$');
    expect(result.valid).toBe(true);
  });

  test('应该处理极长的URL', () => {
    const longPath = 'a'.repeat(1000);
    const result = validateUrlFormat(`https://example.com/${longPath}`);
    expect(result.valid).toBe(true);
  });

  test('应该处理长度为0的验证', () => {
    const result = validateLength('', { min: 0, max: 10, fieldName: '字段' });
    expect(result.valid).toBe(true);
  });

  test('应该处理负数范围验证', () => {
    const result = validateRange(-5, { min: -10, max: 0, fieldName: '字段' });
    expect(result.valid).toBe(true);
  });
});
