/**
 * 验证工具函数测试
 */

describe('验证工具测试', () => {
  describe('邮箱验证', () => {
    const validateEmail = (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };
    
    test.each([
      ['test@example.com', true],
      ['user.name@domain.co.uk', true],
      ['user+tag@example.com', true],
      ['user_123@test-domain.org', true]
    ])('应该正确验证邮箱: %s -> %s', (email, expected) => {
      expect(validateEmail(email)).toBe(expected);
    });
    
    test.each([
      ['invalid', false],
      ['@example.com', false],
      ['user@', false],
      ['user @example.com', false],
      ['', false],
      [null, false],
      [undefined, false]
    ])('应该拒绝无效邮箱: %s', (email, expected) => {
      expect(validateEmail(email)).toBe(expected);
    });
  });
  
  describe('密码强度验证', () => {
    const validatePassword = (password) => {
      if (!password || password.length < 8) {
        return { isValid: false, errors: ['密码长度至少为 8 个字符'] };
      }
      
      const errors = [];
      
      if (!/[A-Z]/.test(password)) {
        errors.push('密码必须包含至少一个大写字母');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('密码必须包含至少一个小写字母');
      }
      if (!/\d/.test(password)) {
        errors.push('密码必须包含至少一个数字');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('密码必须包含至少一个特殊字符');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    };
    
    test('应该接受强密码', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('应该拒绝太短的密码', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码长度至少为 8 个字符');
    });
    
    test('应该拒绝没有大写字母的密码', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个大写字母');
    });
    
    test('应该拒绝没有数字的密码', () => {
      const result = validatePassword('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个数字');
    });
    
    test('应该拒绝没有特殊字符的密码', () => {
      const result = validatePassword('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个特殊字符');
    });
  });
  
  describe('输入清理', () => {
    const sanitizeInput = (input) => {
      if (input === null || input === undefined) {
        return '';
      }
      
      // 移除 HTML 标签
      let cleaned = String(input).replace(/<[^>]*>/g, '');
      
      // 转义特殊字符
      cleaned = cleaned
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
      
      return cleaned.trim();
    };
    
    test('应该移除 HTML 标签', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toContain('Hello');
    });
    
    test('应该转义特殊字符', () => {
      const input = 'Test & <test>';
      const result = sanitizeInput(input);
      expect(result).toContain('&amp;');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
    
    test('应该处理 null 和 undefined', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });
    
    test('应该去除首尾空格', () => {
      const input = '  Hello World  ';
      const result = sanitizeInput(input);
      expect(result).toBe('Hello World');
    });
  });
  
  describe('URL 验证', () => {
    const validateUrl = (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    };
    
    test.each([
      ['https://example.com', true],
      ['http://test.com', true],
      ['https://sub.domain.com/path', true],
      ['https://example.com:8080', true]
    ])('应该接受有效的 URL: %s', (url, expected) => {
      expect(validateUrl(url)).toBe(expected);
    });
    
    test.each([
      ['not a url', false],
      ['ftp://example.com', false],
      ['//example.com', false],
      ['', false]
    ])('应该拒绝无效的 URL: %s', (url, expected) => {
      expect(validateUrl(url)).toBe(expected);
    });
  });
  
  describe('数字验证', () => {
    const isPositiveInteger = (value) => {
      const num = Number(value);
      return Number.isInteger(num) && num > 0;
    };
    
    test.each([
      [1, true],
      [100, true],
      ['50', true],
      [0, false],
      [-1, false],
      [1.5, false],
      ['abc', false],
      [null, false]
    ])('应该验证正整数: %s -> %s', (value, expected) => {
      expect(isPositiveInteger(value)).toBe(expected);
    });
  });
  
  describe('日期验证', () => {
    const isValidDate = (dateString) => {
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date.getTime());
    };
    
    test('应该接受有效的日期', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024/01/15')).toBe(true);
      expect(isValidDate('Jan 15, 2024')).toBe(true);
    });
    
    test('应该拒绝无效的日期', () => {
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('2024-13-45')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });
  });
  
  describe('JSON 验证', () => {
    const isValidJson = (str) => {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    };
    
    test('应该验证有效的 JSON', () => {
      expect(isValidJson('{"key": "value"}')).toBe(true);
      expect(isValidJson('[1, 2, 3]')).toBe(true);
      expect(isValidJson('null')).toBe(true);
      expect(isValidJson('true')).toBe(true);
    });
    
    test('应该拒绝无效的 JSON', () => {
      expect(isValidJson('{invalid}')).toBe(false);
      expect(isValidJson('undefined')).toBe(false);
      expect(isValidJson('')).toBe(false);
    });
  });
  
  describe('电话号码验证（中国）', () => {
    const validateChinesePhone = (phone) => {
      const regex = /^1[3-9]\d{9}$/;
      return regex.test(phone);
    };
    
    test('应该接受有效的中国手机号', () => {
      expect(validateChinesePhone('13800138000')).toBe(true);
      expect(validateChinesePhone('18912345678')).toBe(true);
    });
    
    test('应该拒绝无效的手机号', () => {
      expect(validateChinesePhone('12345678901')).toBe(false);
      expect(validateChinesePhone('1380013800')).toBe(false);
      expect(validateChinesePhone('abc')).toBe(false);
    });
  });
});

