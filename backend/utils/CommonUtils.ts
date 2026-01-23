/**
 * 通用工具类
 * 本地化程度：100%
 * 提供常用的工具函数和实用方法
 */

const crypto = require('crypto');
const Logger = require('./logger');

type RetryOptions<T = unknown> = {
  retries?: number;
  delay?: number;
  backoff?: number;
  maxDelay?: number;
  onRetry?: (error: Error, attempt: number, nextDelay: number) => void;
  initialValue?: T;
};

type UrlValidationResult = {
  isValid: boolean;
  url: string;
  protocol?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  error?: string;
};

type GradeColors = Record<string, string>;

class CommonUtils {
  /**
   * 生成唯一ID
   */
  static generateId(prefix = '', length = 8) {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(length).toString('hex').substring(0, length);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  /**
   * 生成UUID
   */
  static generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * 生成哈希值
   */
  static generateHash(data: string, algorithm = 'md5') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * URL验证和规范化
   */
  static validateAndNormalizeUrl(inputUrl: string): UrlValidationResult {
    try {
      let normalizedInput = inputUrl;
      // 如果没有协议，默认添加https
      if (!normalizedInput.startsWith('http://') && !normalizedInput.startsWith('https://')) {
        normalizedInput = `https://${normalizedInput}`;
      }

      const parsedUrl = new URL(normalizedInput);

      // 验证协议
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('只支持HTTP和HTTPS协议');
      }

      // 验证主机名
      if (!parsedUrl.hostname) {
        throw new Error('无效的主机名');
      }

      // 规范化URL
      const normalizedUrl = parsedUrl.toString();

      return {
        isValid: true,
        url: normalizedUrl,
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
      };
    } catch (error) {
      return {
        isValid: false,
        error: (error as Error).message,
        url: inputUrl,
      };
    }
  }

  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as T;
    }

    if (typeof obj === 'object') {
      const cloned: Record<string, unknown> = {};
      for (const key in obj as Record<string, unknown>) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          cloned[key] = this.deepClone((obj as Record<string, unknown>)[key]);
        }
      }
      return cloned as T;
    }

    return obj;
  }

  /**
   * 对象合并（深度合并）
   */
  static deepMerge<T extends Record<string, unknown>>(
    target: T,
    ...sources: Array<Record<string, unknown>>
  ): T {
    if (!sources.length) return target;
    const source = sources.shift();

    if (source && this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          );
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * 判断是否为对象
   */
  static isObject(item: unknown): item is Record<string, unknown> {
    return Boolean(item) && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 延迟执行
   */
  static delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试机制
   */
  static async retry<T>(fn: () => Promise<T>, options: RetryOptions<T> = {}) {
    const { retries = 3, delay = 1000, backoff = 2, maxDelay = 30000, onRetry = null } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retries) {
          throw error;
        }

        const currentDelay = Math.min(delay * Math.pow(backoff, attempt), maxDelay);

        if (onRetry) {
          onRetry(lastError, attempt + 1, currentDelay);
        }

        Logger.warn(`重试执行 (${attempt + 1}/${retries})`, {
          error: lastError.message,
          nextRetryIn: currentDelay,
        });

        await this.delay(currentDelay);
      }
    }

    throw lastError;
  }

  /**
   * 防抖函数
   */
  static debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number,
    immediate = false
  ) {
    let timeout: NodeJS.Timeout | null = null;
    return function executedFunction(this: unknown, ...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  }

  /**
   * 节流函数
   */
  static throttle<T extends (...args: unknown[]) => void>(func: T, limit: number) {
    let inThrottle = false;
    return function (this: unknown, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`;
    }
    if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟 ${seconds % 60}秒`;
    }
    if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  }

  /**
   * 安全的JSON解析
   */
  static safeJsonParse<T = unknown>(str: string, defaultValue: T | null = null) {
    try {
      return JSON.parse(str) as T;
    } catch (error) {
      Logger.warn('JSON解析失败', { str: str.substring(0, 100), error: (error as Error).message });
      return defaultValue;
    }
  }

  /**
   * 安全的JSON字符串化
   */
  static safeJsonStringify(obj: unknown, space = 0) {
    try {
      return JSON.stringify(obj, null, space);
    } catch (error) {
      Logger.warn('JSON字符串化失败', { error: (error as Error).message });
      return '{}';
    }
  }

  /**
   * 数组分块
   */
  static chunk<T>(array: T[], size: number) {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 数组去重
   */
  static unique<T>(array: T[], key: keyof T | null = null) {
    if (key) {
      const seen = new Set<unknown>();
      return array.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    }
    return [...new Set(array)];
  }

  /**
   * 随机选择数组元素
   */
  static randomChoice<T>(array: T[]) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 生成随机数
   */
  static randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 检查是否为空值
   */
  static isEmpty(value: unknown) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * 清理对象中的空值
   */
  static cleanObject<T extends Record<string, unknown>>(obj: T, removeEmpty = true) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (removeEmpty && this.isEmpty(value)) {
        continue;
      }

      if (this.isObject(value)) {
        const cleanedValue = this.cleanObject(value, removeEmpty);
        if (!removeEmpty || !this.isEmpty(cleanedValue)) {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * 获取嵌套对象属性
   */
  static getNestedProperty<T = unknown>(
    obj: Record<string, unknown>,
    path: string,
    defaultValue: T | undefined = undefined
  ) {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return defaultValue;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return (current !== undefined ? current : defaultValue) as T;
  }

  /**
   * 设置嵌套对象属性
   */
  static setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current: Record<string, unknown> = obj;

    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    if (lastKey) {
      current[lastKey] = value;
    }

    return obj;
  }

  /**
   * 计算百分比
   */
  static calculatePercentage(value: number, total: number, decimals = 2) {
    if (total === 0) return 0;
    return Number(((value / total) * 100).toFixed(decimals));
  }

  /**
   * 限制数值范围
   */
  static clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 生成评级
   */
  static getGrade(score: number) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取评级颜色
   */
  static getGradeColor(grade: string) {
    const colors: GradeColors = {
      A: '#4CAF50',
      B: '#8BC34A',
      C: '#FFC107',
      D: '#FF9800',
      F: '#F44336',
    };
    return colors[grade] || '#9E9E9E';
  }
}

export default CommonUtils;

module.exports = CommonUtils;
