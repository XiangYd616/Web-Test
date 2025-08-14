/**
 * 通用工具类
 * 本地化程度：100%
 * 提供常用的工具函数和实用方法
 */

const crypto = require('crypto');
const url = require('url');
const Logger = require('./logger');

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
  static generateHash(data, algorithm = 'md5') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * URL验证和规范化
   */
  static validateAndNormalizeUrl(inputUrl) {
    try {
      // 如果没有协议，默认添加https
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        inputUrl = 'https://' + inputUrl;
      }

      const parsedUrl = new URL(inputUrl);
      
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
        search: parsedUrl.search
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        url: inputUrl
      };
    }
  }

  /**
   * 深度克隆对象
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * 对象合并（深度合并）
   */
  static deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key], source[key]);
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
  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 延迟执行
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重试机制
   */
  static async retry(fn, options = {}) {
    const {
      retries = 3,
      delay = 1000,
      backoff = 2,
      maxDelay = 30000,
      onRetry = null
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === retries) {
          throw error;
        }

        const currentDelay = Math.min(delay * Math.pow(backoff, attempt), maxDelay);
        
        if (onRetry) {
          onRetry(error, attempt + 1, currentDelay);
        }

        Logger.warn(`重试执行 (${attempt + 1}/${retries})`, {
          error: error.message,
          nextRetryIn: currentDelay
        });

        await this.delay(currentDelay);
      }
    }

    throw lastError;
  }

  /**
   * 防抖函数
   */
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  /**
   * 节流函数
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟 ${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 安全的JSON解析
   */
  static safeJsonParse(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (error) {
      Logger.warn('JSON解析失败', { str: str.substring(0, 100), error: error.message });
      return defaultValue;
    }
  }

  /**
   * 安全的JSON字符串化
   */
  static safeJsonStringify(obj, space = 0) {
    try {
      return JSON.stringify(obj, null, space);
    } catch (error) {
      Logger.warn('JSON字符串化失败', { error: error.message });
      return '{}';
    }
  }

  /**
   * 数组分块
   */
  static chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 数组去重
   */
  static unique(array, key = null) {
    if (key) {
      const seen = new Set();
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
  static randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 生成随机数
   */
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 检查是否为空值
   */
  static isEmpty(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * 清理对象中的空值
   */
  static cleanObject(obj, removeEmpty = true) {
    const cleaned = {};
    
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
  static getNestedProperty(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
  }

  /**
   * 设置嵌套对象属性
   */
  static setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
  }

  /**
   * 计算百分比
   */
  static calculatePercentage(value, total, decimals = 2) {
    if (total === 0) return 0;
    return Number(((value / total) * 100).toFixed(decimals));
  }

  /**
   * 限制数值范围
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 生成评级
   */
  static getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取评级颜色
   */
  static getGradeColor(grade) {
    const colors = {
      'A': '#4CAF50',  // 绿色
      'B': '#8BC34A',  // 浅绿色
      'C': '#FFC107',  // 黄色
      'D': '#FF9800',  // 橙色
      'F': '#F44336'   // 红色
    };
    return colors[grade] || '#9E9E9E';
  }
}

module.exports = CommonUtils;
