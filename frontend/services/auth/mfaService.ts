/**
 * 多因素认证(MFA)服务
 * 支持TOTP、短信、邮件、备用码等多种认证方式
 * 版本: v1.0.0
 */

import { useCallback, useState } from 'react';
import { defaultMemoryCache } from '../cacheStrategy';

// ==================== 类型定义 ====================

export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup_codes' | 'hardware_key' | 'biometric';

export interface MFAConfig {
  enabledMethods: MFAMethod[];
  requireMFA: boolean;
  totpIssuer: string;
  totpDigits: number;
  totpPeriod: number;
  smsProvider: 'twilio' | 'aliyun' | 'tencent' | 'mock';
  emailProvider: 'smtp' | 'sendgrid' | 'mock';
  backupCodesCount: number;
  codeExpiry: number; // 验证码过期时间（秒）
  maxAttempts: number; // 最大尝试次数
  lockoutDuration: number; // 锁定时间（秒）
}

export interface MFASetup {
  userId: string;
  method: MFAMethod;
  isEnabled: boolean;
  secret?: string; // TOTP密钥
  phone?: string; // 手机号
  email?: string; // 邮箱
  backupCodes?: string[]; // 备用码
  createdAt: string;
  lastUsed?: string;
  metadata?: Record<string, any>;
}

export interface MFAChallenge {
  challengeId: string;
  userId: string;
  method: MFAMethod;
  code?: string; // 发送的验证码
  expiresAt: string;
  attempts: number;
  isUsed: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface MFAVerificationResult {
  success: boolean;
  method: MFAMethod;
  challengeId?: string;
  error?: string;
  remainingAttempts?: number;
  lockoutUntil?: string;
  backupCodeUsed?: boolean;
}

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

// ==================== TOTP工具类 ====================

class TOTPGenerator {
  private static readonly BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /**
   * 生成TOTP密钥
   */
  static generateSecret(length: number = 32): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);

    let secret = '';
    for (let i = 0; i < bytes.length; i++) {
      secret += this.BASE32_CHARS[bytes[i] % 32];
    }

    return secret;
  }

  /**
   * 生成TOTP码
   */
  static async generateTOTP(secret: string, timeStep?: number): Promise<string> {
    const time = Math.floor((timeStep || Date.now()) / 1000 / 30);
    const timeBytes = new ArrayBuffer(8);
    const timeView = new DataView(timeBytes);
    timeView.setUint32(4, time, false);

    const keyBytes = this.base32Decode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, timeBytes);
    const signatureArray = new Uint8Array(signature);

    const offset = signatureArray[19] & 0xf;
    const code = (
      ((signatureArray[offset] & 0x7f) << 24) |
      ((signatureArray[offset + 1] & 0xff) << 16) |
      ((signatureArray[offset + 2] & 0xff) << 8) |
      (signatureArray[offset + 3] & 0xff)
    ) % 1000000;

    return code.toString().padStart(6, '0');
  }

  /**
   * 验证TOTP码
   */
  static async verifyTOTP(secret: string, token: string, window: number = 1): Promise<boolean> {
    const currentTime = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const timeStep = (currentTime + i) * 30 * 1000;
      const expectedToken = await this.generateTOTP(secret, timeStep);

      if (expectedToken === token) {
        return true;
      }
    }

    return false;
  }

  /**
   * 生成QR码URL
   */
  static generateQRCodeUrl(
    secret: string,
    accountName: string,
    issuer: string
  ): string {
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
  }

  /**
   * Base32解码
   */
  private static base32Decode(encoded: string): Uint8Array {
    const cleanedInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const bytes: number[] = [];
    let buffer = 0;
    let bitsLeft = 0;

    for (const char of cleanedInput) {
      const value = this.BASE32_CHARS.indexOf(char);
      if (value === -1) continue;

      buffer = (buffer << 5) | value;
      bitsLeft += 5;

      if (bitsLeft >= 8) {
        bytes.push((buffer >> (bitsLeft - 8)) & 255);
        bitsLeft -= 8;
      }
    }

    return new Uint8Array(bytes);
  }
}

// ==================== 验证码生成器 ====================

class CodeGenerator {
  /**
   * 生成数字验证码
   */
  static generateNumericCode(length: number = 6): string {
    const digits = '0123456789';
    let code = '';

    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }

    return code;
  }

  /**
   * 生成字母数字验证码
   */
  static generateAlphanumericCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
  }

  /**
   * 生成备用码
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = this.generateAlphanumericCode(8);
      codes.push(code);
    }

    return codes;
  }
}

// ==================== MFA服务主类 ====================

export class MFAService {
  private config: MFAConfig;
  private userSetups = new Map<string, MFASetup[]>();
  private activeChallenges = new Map<string, MFAChallenge>();
  private attemptCounts = new Map<string, { count: number; lockoutUntil?: number }>();

  constructor(config: Partial<MFAConfig> = {}) {
    this.config = {
      enabledMethods: ['totp', 'sms', 'email', 'backup_codes'],
      requireMFA: false,
      totpIssuer: 'TestWeb Platform',
      totpDigits: 6,
      totpPeriod: 30,
      smsProvider: 'mock',
      emailProvider: 'mock',
      backupCodesCount: 10,
      codeExpiry: 300, // 5分钟
      maxAttempts: 3,
      lockoutDuration: 900, // 15分钟
      ...config
    };
  }

  // ==================== TOTP设置 ====================

  /**
   * 设置TOTP
   */
  async setupTOTP(userId: string, accountName: string): Promise<TOTPSetupResult> {
    const secret = TOTPGenerator.generateSecret();
    const qrCodeUrl = TOTPGenerator.generateQRCodeUrl(
      secret,
      accountName,
      this.config.totpIssuer
    );
    const backupCodes = CodeGenerator.generateBackupCodes(this.config.backupCodesCount);

    // 临时存储，等待验证后正式启用
    await defaultMemoryCache.set(
      `totp_setup_${userId}`,
      { secret, backupCodes },
      undefined,
      600000 // 10分钟
    );

    return {
      secret,
      qrCodeUrl,
      manualEntryKey: secret,
      backupCodes
    };
  }

  /**
   * 验证并启用TOTP
   */
  async enableTOTP(userId: string, token: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    const setupData = await defaultMemoryCache.get(`totp_setup_${userId}`);
    if (!setupData) {
      return { success: false };
    }

    const isValid = await TOTPGenerator.verifyTOTP(setupData.secret, token);
    if (!isValid) {
      return { success: false };
    }

    // 保存TOTP设置
    const setup: MFASetup = {
      userId,
      method: 'totp',
      isEnabled: true,
      secret: setupData.secret,
      backupCodes: setupData.backupCodes,
      createdAt: new Date().toISOString()
    };

    await this.saveMFASetup(setup);
    await defaultMemoryCache.delete(`totp_setup_${userId}`);

    return { success: true, backupCodes: setupData.backupCodes };
  }

  // ==================== 短信验证 ====================

  /**
   * 设置短信验证
   */
  async setupSMS(userId: string, phoneNumber: string): Promise<{ challengeId: string }> {
    const code = CodeGenerator.generateNumericCode(6);
    const challengeId = this.generateChallengeId();

    const challenge: MFAChallenge = {
      challengeId,
      userId,
      method: 'sms',
      code,
      expiresAt: new Date(Date.now() + this.config.codeExpiry * 1000).toISOString(),
      attempts: 0,
      isUsed: false,
      createdAt: new Date().toISOString(),
      metadata: { phoneNumber }
    };

    this.activeChallenges.set(challengeId, challenge);

    // 发送短信
    await this.sendSMS(phoneNumber, code);

    return { challengeId };
  }

  /**
   * 验证并启用短信
   */
  async enableSMS(userId: string, challengeId: string, code: string, phoneNumber: string): Promise<boolean> {
    const isValid = await this.verifyChallenge(challengeId, code);
    if (!isValid.success) {
      return false;
    }

    const setup: MFASetup = {
      userId,
      method: 'sms',
      isEnabled: true,
      phone: phoneNumber,
      createdAt: new Date().toISOString()
    };

    await this.saveMFASetup(setup);
    return true;
  }

  // ==================== 邮件验证 ====================

  /**
   * 设置邮件验证
   */
  async setupEmail(userId: string, email: string): Promise<{ challengeId: string }> {
    const code = CodeGenerator.generateNumericCode(6);
    const challengeId = this.generateChallengeId();

    const challenge: MFAChallenge = {
      challengeId,
      userId,
      method: 'email',
      code,
      expiresAt: new Date(Date.now() + this.config.codeExpiry * 1000).toISOString(),
      attempts: 0,
      isUsed: false,
      createdAt: new Date().toISOString(),
      metadata: { email }
    };

    this.activeChallenges.set(challengeId, challenge);

    // 发送邮件
    await this.sendEmail(email, code);

    return { challengeId };
  }

  /**
   * 验证并启用邮件
   */
  async enableEmail(userId: string, challengeId: string, code: string, email: string): Promise<boolean> {
    const isValid = await this.verifyChallenge(challengeId, code);
    if (!isValid.success) {
      return false;
    }

    const setup: MFASetup = {
      userId,
      method: 'email',
      isEnabled: true,
      email,
      createdAt: new Date().toISOString()
    };

    await this.saveMFASetup(setup);
    return true;
  }

  // ==================== 验证方法 ====================

  /**
   * 创建MFA挑战
   */
  async createChallenge(userId: string, method: MFAMethod): Promise<{ challengeId: string; message?: string }> {
    if (this.isUserLockedOut(userId)) {
      throw new Error('用户已被锁定，请稍后再试');
    }

    const userSetups = await this.getUserMFASetups(userId);
    const setup = userSetups.find(s => s.method === method && s.isEnabled);

    if (!setup) {
      throw new Error('未找到启用的MFA方法');
    }

    const challengeId = this.generateChallengeId();

    switch (method) {
      case 'totp':
        // TOTP不需要发送验证码
        const totpChallenge: MFAChallenge = {
          challengeId,
          userId,
          method: 'totp',
          expiresAt: new Date(Date.now() + this.config.codeExpiry * 1000).toISOString(),
          attempts: 0,
          isUsed: false,
          createdAt: new Date().toISOString()
        };
        this.activeChallenges.set(challengeId, totpChallenge);
        return { challengeId, message: '请输入身份验证器中的6位数字' };

      case 'sms':
        if (!setup.phone) throw new Error('未设置手机号');
        const smsCode = CodeGenerator.generateNumericCode(6);
        const smsChallenge: MFAChallenge = {
          challengeId,
          userId,
          method: 'sms',
          code: smsCode,
          expiresAt: new Date(Date.now() + this.config.codeExpiry * 1000).toISOString(),
          attempts: 0,
          isUsed: false,
          createdAt: new Date().toISOString()
        };
        this.activeChallenges.set(challengeId, smsChallenge);
        await this.sendSMS(setup.phone, smsCode);
        return { challengeId, message: `验证码已发送到 ${this.maskPhone(setup.phone)}` };

      case 'email':
        if (!setup.email) throw new Error('未设置邮箱');
        const emailCode = CodeGenerator.generateNumericCode(6);
        const emailChallenge: MFAChallenge = {
          challengeId,
          userId,
          method: 'email',
          code: emailCode,
          expiresAt: new Date(Date.now() + this.config.codeExpiry * 1000).toISOString(),
          attempts: 0,
          isUsed: false,
          createdAt: new Date().toISOString()
        };
        this.activeChallenges.set(challengeId, emailChallenge);
        await this.sendEmail(setup.email, emailCode);
        return { challengeId, message: `验证码已发送到 ${this.maskEmail(setup.email)}` };

      default:
        throw new Error('不支持的MFA方法');
    }
  }

  /**
   * 验证MFA挑战
   */
  async verifyChallenge(challengeId: string, code: string): Promise<MFAVerificationResult> {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      return { success: false, method: 'totp', error: '无效的挑战ID' };
    }

    // 检查是否过期
    if (new Date() > new Date(challenge.expiresAt)) {
      this.activeChallenges.delete(challengeId);
      return { success: false, method: challenge.method, error: '验证码已过期' };
    }

    // 检查是否已使用
    if (challenge.isUsed) {
      return { success: false, method: challenge.method, error: '验证码已使用' };
    }

    // 增加尝试次数
    challenge.attempts++;

    // 检查尝试次数
    if (challenge.attempts > this.config.maxAttempts) {
      this.activeChallenges.delete(challengeId);
      this.lockoutUser(challenge.userId);
      return {
        success: false,
        method: challenge.method,
        error: '尝试次数过多，账户已被锁定',
        lockoutUntil: new Date(Date.now() + this.config.lockoutDuration * 1000).toISOString()
      };
    }

    let isValid = false;
    let backupCodeUsed = false;

    switch (challenge.method) {
      case 'totp':
        const userSetups = await this.getUserMFASetups(challenge.userId);
        const totpSetup = userSetups.find(s => s.method === 'totp' && s.isEnabled);
        if (totpSetup?.secret) {
          isValid = await TOTPGenerator.verifyTOTP(totpSetup.secret, code);
        }

        // 如果TOTP验证失败，尝试备用码
        if (!isValid && totpSetup?.backupCodes) {
          const codeIndex = totpSetup.backupCodes.indexOf(code);
          if (codeIndex !== -1) {
            isValid = true;
            backupCodeUsed = true;
            // 移除已使用的备用码
            totpSetup.backupCodes.splice(codeIndex, 1);
            await this.saveMFASetup(totpSetup);
          }
        }
        break;

      case 'sms':
      case 'email':
        isValid = challenge.code === code;
        break;
    }

    if (isValid) {
      challenge.isUsed = true;
      this.activeChallenges.delete(challengeId);
      this.clearAttemptCount(challenge.userId);

      // 更新最后使用时间
      const userSetups = await this.getUserMFASetups(challenge.userId);
      const setup = userSetups.find(s => s.method === challenge.method && s.isEnabled);
      if (setup) {
        setup.lastUsed = new Date().toISOString();
        await this.saveMFASetup(setup);
      }

      return {
        success: true,
        method: challenge.method,
        challengeId,
        backupCodeUsed
      };
    } else {
      const remainingAttempts = this.config.maxAttempts - challenge.attempts;
      return {
        success: false,
        method: challenge.method,
        error: '验证码错误',
        remainingAttempts
      };
    }
  }

  // ==================== 管理方法 ====================

  /**
   * 获取用户MFA设置
   */
  async getUserMFASetups(userId: string): Promise<MFASetup[]> {
    // 从缓存或数据库获取
    const cached = await defaultMemoryCache.get(`mfa_setups_${userId}`);
    if (cached) {
      return cached;
    }

    // 这里应该从数据库获取，目前返回内存中的数据
    return this.userSetups.get(userId) || [];
  }

  /**
   * 禁用MFA方法
   */
  async disableMFA(userId: string, method: MFAMethod): Promise<boolean> {
    const userSetups = await this.getUserMFASetups(userId);
    const setup = userSetups.find(s => s.method === method);

    if (setup) {
      setup.isEnabled = false;
      await this.saveMFASetup(setup);
      return true;
    }

    return false;
  }

  /**
   * 重新生成备用码
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const userSetups = await this.getUserMFASetups(userId);
    const totpSetup = userSetups.find(s => s.method === 'totp' && s.isEnabled);

    if (!totpSetup) {
      throw new Error('未找到TOTP设置');
    }

    const newBackupCodes = CodeGenerator.generateBackupCodes(this.config.backupCodesCount);
    totpSetup.backupCodes = newBackupCodes;
    await this.saveMFASetup(totpSetup);

    return newBackupCodes;
  }

  // ==================== 私有方法 ====================

  private generateChallengeId(): string {
    return 'mfa_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private async saveMFASetup(setup: MFASetup): Promise<void> {
    const userSetups = this.userSetups.get(setup.userId) || [];
    const existingIndex = userSetups.findIndex(s => s.method === setup.method);

    if (existingIndex >= 0) {
      userSetups[existingIndex] = setup;
    } else {
      userSetups.push(setup);
    }

    this.userSetups.set(setup.userId, userSetups);

    // 缓存
    await defaultMemoryCache.set(`mfa_setups_${setup.userId}`, userSetups, undefined, 3600000);
  }

  private isUserLockedOut(userId: string): boolean {
    const attempts = this.attemptCounts.get(userId);
    if (!attempts?.lockoutUntil) return false;

    return Date.now() < attempts.lockoutUntil;
  }

  private lockoutUser(userId: string): void {
    this.attemptCounts.set(userId, {
      count: this.config.maxAttempts,
      lockoutUntil: Date.now() + this.config.lockoutDuration * 1000
    });
  }

  private clearAttemptCount(userId: string): void {
    this.attemptCounts.delete(userId);
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return local.slice(0, 2) + '***@' + domain;
  }

  private async sendSMS(phone: string, code: string): Promise<void> {
    // 这里应该集成实际的短信服务
    console.log(`发送短信到 ${phone}: 验证码 ${code}`);
  }

  private async sendEmail(email: string, code: string): Promise<void> {
    // 这里应该集成实际的邮件服务
    console.log(`发送邮件到 ${email}: 验证码 ${code}`);
  }
}

// ==================== React Hook集成 ====================

export function useMFA() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupTOTP = useCallback(async (userId: string, accountName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await defaultMFAService.setupTOTP(userId, accountName);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '设置TOTP失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const enableTOTP = useCallback(async (userId: string, token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await defaultMFAService.enableTOTP(userId, token);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '启用TOTP失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createChallenge = useCallback(async (userId: string, method: MFAMethod) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await defaultMFAService.createChallenge(userId, method);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建验证挑战失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyChallenge = useCallback(async (challengeId: string, code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await defaultMFAService.verifyChallenge(challengeId, code);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '验证失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserSetups = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await defaultMFAService.getUserMFASetups(userId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取MFA设置失败';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    setupTOTP,
    enableTOTP,
    createChallenge,
    verifyChallenge,
    getUserSetups,
    clearError: () => setError(null)
  };
}

// ==================== 默认实例 ====================

export const defaultMFAService = new MFAService();

export default defaultMFAService;
