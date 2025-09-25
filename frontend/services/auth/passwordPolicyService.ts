/**
 * 密码策略和安全验证服务
 * 提供密码强度检查、安全问题、账户锁定等功能
 * 版本: v1.0.0
 */

import { defaultMemoryCache } from '../cacheStrategy';

// ==================== 类型定义 ====================

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  forbidPersonalInfo: boolean;
  forbidRepeatingChars: boolean;
  maxRepeatingChars: number;
  forbidSequentialChars: boolean;
  passwordHistory: number; // 不能重复使用的历史密码数量
  expiryDays: number; // 密码过期天数，0表示不过期
}

export interface PasswordStrength {
  score: number; // 0-100
  level: 'very_weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
  feedback: string[];
  warnings: string[];
  suggestions: string[];
  estimatedCrackTime: string;
  entropy: number;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  category: 'personal' | 'preference' | 'history' | 'custom';
  isActive: boolean;
}

export interface UserSecurityQuestions {
  userId: string;
  questions: Array<{
    questionId: string;
    question: string;
    answerHash: string; // 加密后的答案
    createdAt: string;
    lastUsed?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AccountLockInfo {
  userId: string;
  isLocked: boolean;
  lockReason: 'failed_login' | 'failed_mfa' | 'suspicious_activity' | 'admin_lock' | 'password_expired';
  lockTime: string;
  unlockTime?: string;
  failedAttempts: number;
  maxAttempts: number;
  lockDuration: number; // 锁定时长（秒）
  metadata?: Record<string, any>;
}

export interface LoginAttempt {
  userId: string;
  timestamp: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  failureReason?: string;
  location?: {
    country?: string;
    city?: string;
  };
}

export interface PasswordValidationResult {
  isValid: boolean;
  strength: PasswordStrength;
  violations: string[];
  suggestions: string[];
}


/**

 * PasswordAnalyzer类 - 负责处理相关功能

 */
// ==================== 密码强度分析器 ====================

class PasswordAnalyzer {
  private static readonly COMMON_PASSWORDS = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
    'qwerty123', 'admin123', '123123', 'welcome123', 'password!', 'qwertyuiop'
  ];

  private static readonly SEQUENTIAL_PATTERNS = [
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
    '1234567890',
    '0987654321'
  ];

  /**
   * 分析密码强度
   */
  static analyzePassword(password: string, userInfo?: { email?: string; username?: string; name?: string }): PasswordStrength {
    const feedback: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    let score = 0;
    let entropy = 0;

    // 基础长度检查
    if (password.length >= 8) {
      score += 20;
    } else {
      warnings.push('密码长度不足8位');
      suggestions.push('使用至少8个字符');
    }

    if (password.length >= 12) {
      score += 10;
      feedback.push('密码长度良好');
    }

    if (password.length >= 16) {
      score += 10;
      feedback.push('密码长度优秀');
    }

    // 字符类型检查
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    let charsetSize = 0;
    if (hasLowercase) {
      score += 10;
      charsetSize += 26;
      feedback.push('包含小写字母');
    } else {
      suggestions.push('添加小写字母');
    }

    if (hasUppercase) {
      score += 10;
      charsetSize += 26;
      feedback.push('包含大写字母');
    } else {
      suggestions.push('添加大写字母');
    }

    if (hasNumbers) {
      score += 10;
      charsetSize += 10;
      feedback.push('包含数字');
    } else {
      suggestions.push('添加数字');
    }

    if (hasSpecialChars) {
      score += 15;
      charsetSize += 32;
      feedback.push('包含特殊字符');
    } else {
      suggestions.push('添加特殊字符 (!@#$%^&* 等)');
    }

    // 计算熵值
    entropy = password.length * Math.log2(charsetSize);
    if (entropy > 50) score += 10;
    if (entropy > 70) score += 10;

    // 常见密码检查
    if (this.COMMON_PASSWORDS.includes(password.toLowerCase())) {
      score -= 30;
      warnings.push('这是一个常见密码');
      suggestions.push('避免使用常见密码');
    }

    // 重复字符检查
    const repeatingPattern = this.findRepeatingPattern(password);
    if (repeatingPattern.length > 3) {
      score -= 15;
      warnings.push('包含重复字符模式');
      suggestions.push('避免重复字符');
    }

    // 顺序字符检查
    if (this.hasSequentialChars(password)) {
      score -= 10;
      warnings.push('包含顺序字符');
      suggestions.push('避免使用键盘顺序或字母顺序');
    }

    // 个人信息检查
    if (userInfo) {
      const personalInfo = [userInfo.email, userInfo.username, userInfo.name]
        .filter(Boolean)
        .map(info => info!.toLowerCase());

      for (const info of personalInfo) {
        if (password.toLowerCase().includes(info)) {
          score -= 20;
          warnings.push('包含个人信息');
          suggestions.push('避免使用个人信息作为密码');
          break;
        }
      }
    }

    // 确保分数在0-100范围内
    score = Math.max(0, Math.min(100, score));

    // 确定强度等级
    let level: PasswordStrength['level'];
    if (score < 20) level = 'very_weak';
    else if (score < 40) level = 'weak';
    else if (score < 60) level = 'fair';
    else if (score < 80) level = 'good';
    else if (score < 95) level = 'strong';
    else level = 'very_strong';

    // 估算破解时间
    const estimatedCrackTime = this.estimateCrackTime(entropy);

    return {
      score,
      level,
      feedback,
      warnings,
      suggestions,
      estimatedCrackTime,
      entropy
    };
  }

  /**
   * 查找重复模式
   */
  private static findRepeatingPattern(password: string): string {
    let longestPattern = '';

    for (let i = 0; i < password.length; i++) {
      for (let j = i + 1; j <= password.length; j++) {
        const pattern = password.slice(i, j);
        const regex = new RegExp(pattern, 'g');
        const matches = password.match(regex);

        if (matches && matches.length > 1 && pattern.length > longestPattern.length) {
          longestPattern = pattern;
        }
      }
    }

    return longestPattern;
  }

  /**
   * 检查顺序字符
   */
  private static hasSequentialChars(password: string): boolean {
    const lowerPassword = password.toLowerCase();

    for (const pattern of this.SEQUENTIAL_PATTERNS) {
      for (let i = 0; i <= pattern.length - 3; i++) {
        const sequence = pattern.slice(i, i + 3);
        const reverseSequence = sequence.split('').reverse().join('');

        if (lowerPassword.includes(sequence) || lowerPassword.includes(reverseSequence)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 估算破解时间
   */
  private static estimateCrackTime(entropy: number): string {
    // 假设每秒可以尝试10^9次（现代GPU）
    const attemptsPerSecond = 1e9;
    const possibleCombinations = Math.pow(2, entropy);
    const averageAttempts = possibleCombinations / 2;
    const seconds = averageAttempts / attemptsPerSecond;

    if (seconds < 1) return '瞬间';
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}小时`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)}天`;
    if (seconds < 31536000000) return `${Math.round(seconds / 31536000)}年`;
    return '数千年';
  }
}

// ==================== 密码策略服务 ====================

export class PasswordPolicyService {
  private policy: PasswordPolicy;
  private securityQuestions: SecurityQuestion[] = [];
  private userSecurityQuestions = new Map<string, UserSecurityQuestions>();
  private accountLocks = new Map<string, AccountLockInfo>();
  private loginAttempts = new Map<string, LoginAttempt[]>();

  /**

   * 处理constructor事件

   * @param {Object} event - 事件对象

   * @returns {Promise<void>}

   */
  private passwordHistory = new Map<string, string[]>();

  constructor(policy: Partial<PasswordPolicy> = {}) {
    this.policy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      forbidCommonPasswords: true,
      forbidPersonalInfo: true,
      forbidRepeatingChars: true,
      maxRepeatingChars: 3,
      forbidSequentialChars: true,
      passwordHistory: 5,
      expiryDays: 90,
      ...policy
    };

    this.initializeSecurityQuestions();
  }

  // ==================== 密码验证 ====================

  /**
   * 验证密码是否符合策略
   */
  validatePassword(
    password: string,
    userInfo?: { email?: string; username?: string; name?: string },
    userId?: string
  ): PasswordValidationResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // 长度检查
    if (password.length < this.policy.minLength) {
      violations.push(`密码长度不能少于${this.policy.minLength}位`);
    }

    if (password.length > this.policy.maxLength) {
      violations.push(`密码长度不能超过${this.policy.maxLength}位`);
    }

    // 字符类型检查
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      violations.push('密码必须包含大写字母');
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      violations.push('密码必须包含小写字母');
    }

    if (this.policy.requireNumbers && !/\d/.test(password)) {
      violations.push('密码必须包含数字');
    }

    if (this.policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      violations.push('密码必须包含特殊字符');
    }

    // 常见密码检查
    if (this.policy.forbidCommonPasswords) {
      // 这里可以集成更完整的常见密码库
      const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
      if (commonPasswords.includes(password.toLowerCase())) {
        violations.push('不能使用常见密码');
      }
    }

    // 个人信息检查
    if (this.policy.forbidPersonalInfo && userInfo) {
      const personalInfo = [userInfo.email, userInfo.username, userInfo.name]
        .filter(Boolean)
        .map(info => info!.toLowerCase());

      for (const info of personalInfo) {
        if (password.toLowerCase().includes(info)) {
          violations.push('密码不能包含个人信息');
          break;
        }
      }
    }

    // 重复字符检查
    if (this.policy.forbidRepeatingChars) {
      const repeatingPattern = this.findLongestRepeatingChar(password);
      if (repeatingPattern.length > this.policy.maxRepeatingChars) {
        violations.push(`不能包含超过${this.policy.maxRepeatingChars}个重复字符`);
      }
    }

    // 顺序字符检查
    if (this.policy.forbidSequentialChars && this.hasSequentialChars(password)) {
      violations.push('不能包含顺序字符（如abc、123）');
    }

    // 密码历史检查
    if (userId && this.policy.passwordHistory > 0) {
      const history = this.passwordHistory.get(userId) || [];
      const passwordHash = this.hashPassword(password);

      if (history.includes(passwordHash)) {
        violations.push(`不能重复使用最近${this.policy.passwordHistory}个密码`);
      }
    }

    // 分析密码强度
    const strength = PasswordAnalyzer.analyzePassword(password, userInfo);

    // 根据强度等级添加建议
    if (strength.level === 'very_weak' || strength.level === 'weak') {
      suggestions.push('建议使用更强的密码');
    }

    return {
      isValid: violations.length === 0,
      strength,
      violations,
      suggestions: [...suggestions, ...strength.suggestions]
    };
  }

  /**
   * 更新密码历史
   */
  updatePasswordHistory(userId: string, password: string): void {
    const passwordHash = this.hashPassword(password);
    const history = this.passwordHistory.get(userId) || [];

    // 添加新密码到历史记录
    history.unshift(passwordHash);

    // 保持历史记录数量限制
    if (history.length > this.policy.passwordHistory) {
      history.splice(this.policy.passwordHistory);
    }

    this.passwordHistory.set(userId, history);
  }

  // ==================== 账户锁定管理 ====================

  /**
   * 记录登录尝试
   */
  recordLoginAttempt(
    userId: string,
    success: boolean,
    ipAddress: string,
    userAgent: string,
    failureReason?: string
  ): void {
    const attempt: LoginAttempt = {
      userId,
      timestamp: new Date().toISOString(),
      success,
      ipAddress,
      userAgent,
      failureReason
    };

    const attempts = this.loginAttempts.get(userId) || [];
    attempts.unshift(attempt);

    // 保持最近100次尝试记录
    if (attempts.length > 100) {
      attempts.splice(100);
    }

    this.loginAttempts.set(userId, attempts);

    // 如果登录失败，检查是否需要锁定账户
    if (!success) {
      this.checkAccountLock(userId);
    } else {
      // 登录成功，清除锁定状态
      this.unlockAccount(userId);
    }
  }

  /**
   * 检查是否需要锁定账户
   */
  private checkAccountLock(userId: string): void {
    const attempts = this.loginAttempts.get(userId) || [];
    const recentFailures = attempts.filter(
      attempt => !attempt.success &&
        Date.now() - new Date(attempt.timestamp).getTime() < 15 * 60 * 1000 // 15分钟内
    );

    const maxAttempts = 5; // 最大失败次数
    const lockDuration = 30 * 60; // 锁定30分钟

    if (recentFailures.length >= maxAttempts) {
      this.lockAccount(userId, 'failed_login', lockDuration, {
        failedAttempts: recentFailures.length,
        lastFailureTime: recentFailures[0].timestamp
      });
    }
  }

  /**
   * 锁定账户
   */
  lockAccount(
    userId: string,
    reason: AccountLockInfo['lockReason'],
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const lockInfo: AccountLockInfo = {
      userId,
      isLocked: true,
      lockReason: reason,
      lockTime: new Date().toISOString(),
      unlockTime: new Date(Date.now() + duration * 1000).toISOString(),
      failedAttempts: this.getRecentFailedAttempts(userId),
      maxAttempts: 5,
      lockDuration: duration,
      metadata
    };

    this.accountLocks.set(userId, lockInfo);

    // 缓存锁定信息
    defaultMemoryCache.set(`account_lock_${userId}`, lockInfo, undefined, duration * 1000);
  }

  /**
   * 解锁账户
   */
  unlockAccount(userId: string): void {
    this.accountLocks.delete(userId);
    defaultMemoryCache.delete(`account_lock_${userId}`);
  }

  /**
   * 检查账户是否被锁定
   */
  async isAccountLocked(userId: string): Promise<AccountLockInfo | null> {
    // 先检查内存
    let lockInfo = this.accountLocks.get(userId);

    // 如果内存中没有，检查缓存
    if (!lockInfo) {
      lockInfo = await defaultMemoryCache.get(`account_lock_${userId}`);
    }

    if (!lockInfo) return null;

    // 检查是否已过期
    if (lockInfo.unlockTime && new Date() > new Date(lockInfo.unlockTime)) {
      this.unlockAccount(userId);
      return null;
    }

    return lockInfo;
  }

  /**
   * 获取最近失败尝试次数
   */
  private getRecentFailedAttempts(userId: string): number {
    const attempts = this.loginAttempts.get(userId) || [];
    return attempts.filter(
      attempt => !attempt.success &&
        Date.now() - new Date(attempt.timestamp).getTime() < 15 * 60 * 1000
    ).length;
  }

  // ==================== 安全问题管理 ====================

  /**
   * 初始化安全问题
   */
  private initializeSecurityQuestions(): void {
    this.securityQuestions = [
      { id: 'q1', question: '您的第一只宠物叫什么名字？', category: 'personal', isActive: true },
      { id: 'q2', question: '您母亲的娘家姓是什么？', category: 'personal', isActive: true },
      { id: 'q3', question: '您出生的城市是哪里？', category: 'personal', isActive: true },
      { id: 'q4', question: '您最喜欢的电影是什么？', category: 'preference', isActive: true },
      { id: 'q5', question: '您小学最好朋友的名字是什么？', category: 'history', isActive: true },
      { id: 'q6', question: '您第一份工作的公司名称是什么？', category: 'history', isActive: true },
      { id: 'q7', question: '您最喜欢的食物是什么？', category: 'preference', isActive: true },
      { id: 'q8', question: '您的第一辆车是什么品牌？', category: 'history', isActive: true }
    ];
  }

  /**
   * 获取可用的安全问题
   */
  getAvailableSecurityQuestions(): SecurityQuestion[] {
    return this.securityQuestions.filter(q => q.isActive);
  }

  /**
   * 设置用户安全问题
   */
  async setUserSecurityQuestions(
    userId: string,
    questions: Array<{ questionId: string; answer: string }>
  ): Promise<void> {
    const userQuestions: UserSecurityQuestions = {
      userId,
      questions: questions.map(q => ({
        questionId: q.questionId,
        question: this.securityQuestions.find(sq => sq.id === q.questionId)?.question || '',
        answerHash: this.hashPassword(q.answer.toLowerCase().trim()),
        createdAt: new Date().toISOString()
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.userSecurityQuestions.set(userId, userQuestions);

    // 缓存用户安全问题
    await defaultMemoryCache.set(`security_questions_${userId}`, userQuestions, undefined, 24 * 60 * 60 * 1000);
  }

  /**
   * 验证安全问题答案
   */
  async verifySecurityQuestions(
    userId: string,
    answers: Array<{ questionId: string; answer: string }>
  ): Promise<boolean> {
    const userQuestions = this.userSecurityQuestions.get(userId) ||
      await defaultMemoryCache.get(`security_questions_${userId}`);

    if (!userQuestions) return false;

    for (const answer of answers) {
      const question = userQuestions.questions.find((q: any) => q.questionId === answer.questionId);
      if (!question) return false;

      const answerHash = this.hashPassword(answer.answer.toLowerCase().trim());
      if (question.answerHash !== answerHash) return false;
    }

    return true;
  }

  // ==================== 工具方法 ====================

  /**
   * 简单密码哈希（实际项目中应使用bcrypt等）
   */
  private hashPassword(password: string): string {
    // 这里应该使用更安全的哈希算法
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 查找最长重复字符
   */
  private findLongestRepeatingChar(password: string): string {
    let longest = '';
    let current = '';

    for (let i = 0; i < password.length; i++) {
      if (i === 0 || password[i] === password[i - 1]) {
        current += password[i];
      } else {
        if (current.length > longest.length) {
          longest = current;
        }
        current = password[i];
      }
    }

    if (current.length > longest.length) {
      longest = current;
    }

    return longest;
  }

  /**
   * 检查顺序字符
   */
  private hasSequentialChars(password: string): boolean {
    const sequences = ['abcdefghijklmnopqrstuvwxyz', '1234567890', 'qwertyuiop'];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.slice(i, i + 3);
        const reverseSubseq = subseq.split('').reverse().join('');

        if (password.toLowerCase().includes(subseq) ||
          password.toLowerCase().includes(reverseSubseq)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 获取密码策略
   */
  getPasswordPolicy(): PasswordPolicy {
    return { ...this.policy };
  }

  /**
   * 更新密码策略
   */
  updatePasswordPolicy(newPolicy: Partial<PasswordPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
  }
}

// ==================== 默认实例 ====================

export const defaultPasswordPolicyService = new PasswordPolicyService();

export default defaultPasswordPolicyService;
