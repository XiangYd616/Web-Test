/**
 * 增强JWT管理器
 * 提供安全的token管理、自动刷新、并发登录控制
 * 版本: v1.0.0
 */

import { jwtDecode } from 'jwt-decode';
import type { User } from '../../types/common';

// ==================== 类型定义 ====================

export interface JwtConfig {
  accessTokenExpiry: number; // 访问token过期时间（秒）
  refreshTokenExpiry: number; // 刷新token过期时间（秒）
  autoRefreshThreshold: number; // 自动刷新阈值（秒）
  maxConcurrentSessions: number; // 最大并发会话数
  enableFingerprinting: boolean; // 启用设备指纹
  enableSecureStorage: boolean; // 启用安全存储
  apiBaseUrl: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  issuedAt: number;
}

export interface JwtPayload {
  sub: string; // 用户ID
  username: string;
  email: string;
  role: string;
  sessionId: string;
  deviceId?: string;
  fingerprint?: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export interface SessionInfo {
  sessionId: string;
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  location?: string;
  isActive: boolean;
  lastActivity: number;
  createdAt: number;
}

export interface RefreshResult {
  success: boolean;
  tokens?: TokenPair;
  user?: User;
  error?: string;
  requiresReauth?: boolean;
}

// ==================== 设备指纹生成器 ====================

class DeviceFingerprinter {
  /**
   * 生成设备指纹
   */
  static async generateFingerprint(): Promise<string> {
    const components: string[] = [];

    // 基础信息
    components.push(navigator.userAgent);
    components.push(navigator.language);
    components.push(navigator.platform);
    components.push(screen.width + 'x' + screen.height);
    components.push(screen.colorDepth.toString());
    components.push(new Date().getTimezoneOffset().toString());

    // Canvas指纹
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint test', 2, 2);
        components.push(canvas.toDataURL());
      }
    } catch (e) {
      // Canvas可能被禁用
    }

    // WebGL指纹
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      // WebGL可能不可用
    }

    // 生成哈希
    const fingerprint = await this.hashString(components.join('|'));
    return fingerprint;
  }

  /**
   * 字符串哈希
   */
  private static async hashString(str: string): Promise<string> {
    if (crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // 降级到简单哈希
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return Math.abs(hash).toString(16);
    }
  }
}

// ==================== 安全存储管理器 ====================

class SecureStorageManager {
  private static readonly STORAGE_KEY_PREFIX = 'testweb_secure_';
  private static readonly ENCRYPTION_KEY = 'testweb_encryption_key';

  /**
   * 安全存储数据
   */
  static async setItem(key: string, value: any): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = await this.encrypt(serialized);
      localStorage.setItem(this.STORAGE_KEY_PREFIX + key, encrypted);
    } catch (error) {
      console.error('安全存储失败:', error);
      // 降级到普通存储
      localStorage.setItem(this.STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    }
  }

  /**
   * 安全获取数据
   */
  static async getItem<T>(key: string): Promise<T | null> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
      if (!stored) return null;

      try {
        const decrypted = await this.decrypt(stored);
        return JSON.parse(decrypted);
      } catch {
        // 可能是未加密的数据，尝试直接解析
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('安全获取失败:', error);
      return null;
    }
  }

  /**
   * 删除数据
   */
  static removeItem(key: string): void {
    localStorage.removeItem(this.STORAGE_KEY_PREFIX + key);
  }

  /**
   * 清除所有安全存储数据
   */
  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * 简单加密（实际项目中应使用更强的加密）
   */
  private static async encrypt(text: string): Promise<string> {
    if (crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const key = await this.getEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return btoa(String.fromCharCode(...combined));
    } else {
      // 降级到Base64编码
      return btoa(text);
    }
  }

  /**
   * 简单解密
   */
  private static async decrypt(encryptedText: string): Promise<string> {
    if (crypto.subtle) {
      const combined = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
      );

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const key = await this.getEncryptionKey();
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } else {
      // 降级到Base64解码
      return atob(encryptedText);
    }
  }

  /**
   * 获取加密密钥
   */
  private static async getEncryptionKey(): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.ENCRYPTION_KEY),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('testweb_salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

// ==================== 增强JWT管理器 ====================

export class EnhancedJwtManager {
  private config: JwtConfig;
  private refreshTimer?: NodeJS.Timeout;
  private currentTokens?: TokenPair;
  private deviceId: string;
  private fingerprint?: string;
  private activeSessions = new Map<string, SessionInfo>();

  constructor(config: Partial<JwtConfig> = {}) {
    this.config = {
      accessTokenExpiry: 900, // 15分钟
      refreshTokenExpiry: 604800, // 7天
      autoRefreshThreshold: 300, // 5分钟前自动刷新
      maxConcurrentSessions: 5,
      enableFingerprinting: true,
      enableSecureStorage: true,
      apiBaseUrl: '/api',
      ...config
    };

    this.deviceId = this.generateDeviceId();
    this.initializeFingerprint();
    this.loadStoredTokens();
  }

  // ==================== 初始化方法 ====================

  /**
   * 初始化设备指纹
   */
  private async initializeFingerprint(): Promise<void> {
    if (this.config.enableFingerprinting) {
      try {
        this.fingerprint = await DeviceFingerprinter.generateFingerprint();
      } catch (error) {
        console.warn('设备指纹生成失败:', error);
      }
    }
  }

  /**
   * 生成设备ID
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * 加载存储的tokens
   */
  private async loadStoredTokens(): Promise<void> {
    if (this.config.enableSecureStorage) {
      this.currentTokens = await SecureStorageManager.getItem<TokenPair>('tokens');
    } else {
      const stored = localStorage.getItem('auth_tokens');
      if (stored) {
        try {
          this.currentTokens = JSON.parse(stored);
        } catch (error) {
          console.error('解析存储的tokens失败:', error);
        }
      }
    }

    if (this.currentTokens && this.isTokenExpiringSoon(this.currentTokens.accessToken)) {
      this.scheduleTokenRefresh();
    }
  }

  // ==================== Token管理 ====================

  /**
   * 设置tokens
   */
  async setTokens(tokens: TokenPair): Promise<void> {
    this.currentTokens = tokens;

    if (this.config.enableSecureStorage) {
      await SecureStorageManager.setItem('tokens', tokens);
    } else {
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    }

    this.scheduleTokenRefresh();
  }

  /**
   * 获取当前访问token
   */
  getAccessToken(): string | null {
    if (!this.currentTokens) return null;

    if (this.isTokenExpired(this.currentTokens.accessToken)) {
      return null;
    }

    return this.currentTokens.accessToken;
  }

  /**
   * 获取刷新token
   */
  getRefreshToken(): string | null {
    return this.currentTokens?.refreshToken || null;
  }

  /**
   * 检查token是否过期
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * 检查token是否即将过期
   */
  isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expiryTime = decoded.exp * 1000;
      const thresholdTime = Date.now() + (this.config.autoRefreshThreshold * 1000);
      return thresholdTime >= expiryTime;
    } catch {
      return true;
    }
  }

  /**
   * 解码token
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  // ==================== 自动刷新 ====================

  /**
   * 调度token刷新
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.currentTokens) return;

    const decoded = this.decodeToken(this.currentTokens.accessToken);
    if (!decoded) return;

    const expiryTime = decoded.exp * 1000;
    const refreshTime = expiryTime - (this.config.autoRefreshThreshold * 1000);
    const delay = Math.max(0, refreshTime - Date.now());

    this.refreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, delay);
  }

  /**
   * 刷新tokens
   */
  async refreshTokens(): Promise<RefreshResult> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return {
        success: false,
        error: '没有刷新token',
        requiresReauth: true
      };
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshToken,
          deviceId: this.deviceId,
          fingerprint: this.fingerprint
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '刷新失败');
      }

      const newTokens: TokenPair = {
        accessToken: result.token || result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: Date.now() + (this.config.accessTokenExpiry * 1000),
        issuedAt: Date.now()
      };

      await this.setTokens(newTokens);

      return {
        success: true,
        tokens: newTokens,
        user: result.user
      };
    } catch (error) {
      console.error('Token刷新失败:', error);

      // 清除无效的tokens
      await this.clearTokens();

      return {
        success: false,
        error: error instanceof Error ? error.message : '刷新失败',
        requiresReauth: true
      };
    }
  }

  /**
   * 手动刷新tokens
   */
  async manualRefresh(): Promise<RefreshResult> {
    return this.refreshTokens();
  }

  // ==================== 会话管理 ====================

  /**
   * 获取活跃会话
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const token = this.getAccessToken();
      if (!token) return [];

      const response = await fetch(`${this.config.apiBaseUrl}/auth/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      return result.success ? result.sessions : [];
    } catch (error) {
      console.error('获取活跃会话失败:', error);
      return [];
    }
  }

  /**
   * 终止会话
   */
  async terminateSession(sessionId: string): Promise<boolean> {
    try {
      const token = this.getAccessToken();
      if (!token) return false;

      const response = await fetch(`${this.config.apiBaseUrl}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('终止会话失败:', error);
      return false;
    }
  }

  /**
   * 终止所有其他会话
   */
  async terminateOtherSessions(): Promise<boolean> {
    try {
      const token = this.getAccessToken();
      if (!token) return false;

      const response = await fetch(`${this.config.apiBaseUrl}/auth/sessions/terminate-others`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('终止其他会话失败:', error);
      return false;
    }
  }

  // ==================== 清理方法 ====================

  /**
   * 清除tokens
   */
  async clearTokens(): Promise<void> {
    this.currentTokens = undefined;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    if (this.config.enableSecureStorage) {
      SecureStorageManager.removeItem('tokens');
    } else {
      localStorage.removeItem('auth_tokens');
    }
  }

  /**
   * 完全清理
   */
  async cleanup(): Promise<void> {
    await this.clearTokens();

    if (this.config.enableSecureStorage) {
      SecureStorageManager.clear();
    }

    this.activeSessions.clear();
  }

  // ==================== 工具方法 ====================

  /**
   * 获取token剩余时间
   */
  getTokenTimeRemaining(): number {
    if (!this.currentTokens) return 0;

    const decoded = this.decodeToken(this.currentTokens.accessToken);
    if (!decoded) return 0;

    return Math.max(0, decoded.exp * 1000 - Date.now());
  }

  /**
   * 获取用户信息
   */
  getCurrentUser(): Partial<User> | null {
    const token = this.getAccessToken();
    if (!token) return null;

    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    return {
      id: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role as any
    };
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && !this.isTokenExpired(token);
  }
}

// ==================== 默认实例 ====================

export const defaultJwtManager = new EnhancedJwtManager();

export default defaultJwtManager;
