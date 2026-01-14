import Logger from '@/utils/logger';

﻿/**
 * 安全存储模块
 * 从enhancedJwtManager提取的安全存储功能
 */

export class SecureStorageManager {
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
      Logger.error('安全存储失败:', { error: String(error) });
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
      Logger.error('安全获取失败:', { error: String(error) });
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
   * 检查是否支持加密存储
   */
  static isEncryptionSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           crypto.subtle !== undefined &&
           typeof crypto.getRandomValues === 'function';
  }

  /**
   * 简单加密（实际项目中应使用更强的加密）
   */
  private static async encrypt(text: string): Promise<string> {
    if (this.isEncryptionSupported()) {
      try {
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
      } catch (error) {
        Logger.warn('加密失败，降级到Base64:', { error: String(error) });
        return btoa(text);
      }
    } else {
      // 降级到Base64编码
      return btoa(text);
    }
  }

  /**
   * 简单解密
   */
  private static async decrypt(encryptedText: string): Promise<string> {
    if (this.isEncryptionSupported()) {
      try {
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
      } catch (error) {
        Logger.warn('解密失败，尝试Base64解码:', { error: String(error) });
        return atob(encryptedText);
      }
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

  /**
   * 基础存储方法（非加密）
   */
  static setItemPlain(key: string, value: any): void {
    localStorage.setItem(this.STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  }

  /**
   * 基础获取方法（非加密）
   */
  static getItemPlain<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      Logger.error('获取数据失败:', { error: String(error) });
      return null;
    }
  }
}
