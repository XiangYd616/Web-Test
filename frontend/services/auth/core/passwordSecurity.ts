/**
 * 密码安全模块
 * 从AuthManager提取的密码策略功能
 */

import type { PasswordPolicy, PasswordStrength } from './authTypes';

export class PasswordSecurityManager {
  /**
   * 默认密码策略
   */
  static readonly DEFAULT_POLICY: PasswordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // 90天
    preventReuse: 5,
  };

  /**
   * 验证密码强度
   */
  static validatePasswordStrength(
    password: string,
    policy: PasswordPolicy = this.DEFAULT_POLICY
  ): PasswordStrength {
    const feedback: string[] = [];
    const requirements = {
      length: password.length >= policy.minLength,
      uppercase: policy.requireUppercase ? /[A-Z]/.test(password) : true,
      lowercase: policy.requireLowercase ? /[a-z]/.test(password) : true,
      numbers: policy.requireNumbers ? /\d/.test(password) : true,
      specialChars: policy.requireSpecialChars ? /[!@#$%^&*(),.?":{}|<>]/.test(password) : true,
    };

    let score = 0;

    // 基础要求检查
    if (!requirements.length) {
      feedback.push(`密码长度至少需要${policy.minLength}个字符`);
    } else {
      score += 1;
    }

    if (!requirements.uppercase) {
      feedback.push('密码需要包含大写字母');
    } else {
      score += 1;
    }

    if (!requirements.lowercase) {
      feedback.push('密码需要包含小写字母');
    } else {
      score += 1;
    }

    if (!requirements.numbers) {
      feedback.push('密码需要包含数字');
    } else {
      score += 1;
    }

    if (!requirements.specialChars) {
      feedback.push('密码需要包含特殊字符');
    } else {
      score += 1;
    }

    // 检查常见弱密码模式
    const weakPatterns = this.getWeakPatterns();
    const foundWeakPattern = weakPatterns.find(pattern => pattern.regex.test(password));

    if (foundWeakPattern) {
      feedback.push(foundWeakPattern.message);
      score = Math.max(0, score - 2);
    }

    // 检查重复字符
    if (this.hasRepeatingChars(password)) {
      feedback.push('避免使用重复字符');
      score = Math.max(0, score - 1);
    }

    // 检查连续字符
    if (this.hasSequentialChars(password)) {
      feedback.push('避免使用连续字符（如abc、123）');
      score = Math.max(0, score - 1);
    }

    // 额外强度检查
    if (password.length >= 12) {
      score += 0.5; // 长密码加分
    }

    if (this.hasGoodVariety(password)) {
      score += 0.5; // 字符多样性加分
    }

    const isValid = Object.values(requirements).every(req => req) && feedback.length === 0;

    return {
      score: Math.min(4, Math.round(score)),
      feedback,
      isValid,
      requirements,
    };
  }

  /**
   * 获取弱密码模式
   */
  private static getWeakPatterns(): { regex: RegExp; message: string }[] {
    return [
      { regex: /^123456/, message: '避免使用常见的数字序列' },
      { regex: /^password/i, message: '不要在密码中包含"password"' },
      { regex: /^qwerty/i, message: '避免使用键盘序列' },
      { regex: /^admin/i, message: '不要在密码中包含"admin"' },
      { regex: /^letmein/i, message: '避免使用常见短语' },
      { regex: /^welcome/i, message: '避免使用常见单词' },
      { regex: /^123123/, message: '避免重复的数字模式' },
      { regex: /^abcabc/i, message: '避免重复的字母模式' },
    ];
  }

  /**
   * 检查重复字符
   */
  private static hasRepeatingChars(password: string): boolean {
    return /(.)\\1{2,}/.test(password);
  }

  /**
   * 检查连续字符
   */
  private static hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const substr = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(substr)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查字符多样性
   */
  private static hasGoodVariety(password: string): boolean {
    let variety = 0;
    if (/[a-z]/.test(password)) variety++;
    if (/[A-Z]/.test(password)) variety++;
    if (/[0-9]/.test(password)) variety++;
    if (/[^a-zA-Z0-9]/.test(password)) variety++;

    return variety >= 3;
  }

  /**
   * 生成强密码建议
   */
  static generatePasswordSuggestion(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = lowercase + uppercase + numbers + special;
    let password = '';

    // 确保每种字符类型至少有一个
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // 填充剩余长度
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // 打乱密码字符顺序
    return password
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
  }

  /**
   * 检查密码是否在常见密码列表中
   */
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      '123456',
      'password',
      '123456789',
      '12345678',
      '12345',
      '1234567',
      '1234567890',
      'qwerty',
      'abc123',
      '111111',
      '123123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      '1234',
      'dragon',
      'princess',
      'qwerty123',
      'solo',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * 获取密码强度描述
   */
  static getStrengthDescription(score: number): { text: string; color: string } {
    switch (score) {
      case 0:
      case 1:
        return { text: '很弱', color: '#dc3545' }; // 红色
      case 2:
        return { text: '弱', color: '#fd7e14' }; // 橙色
      case 3:
        return { text: '中等', color: '#ffc107' }; // 黄色
      case 4:
        return { text: '强', color: '#28a745' }; // 绿色
      default:
        return { text: '未知', color: '#6c757d' }; // 灰色
    }
  }

  /**
   * 检查密码年龄（需要存储密码创建时间）
   */
  static isPasswordExpired(createdAt: Date, policy: PasswordPolicy = this.DEFAULT_POLICY): boolean {
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= policy.maxAge;
  }
}
