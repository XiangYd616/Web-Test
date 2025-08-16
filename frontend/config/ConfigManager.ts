/**
 * 增强的前端配置管理器
 * 与后端配置中心集成，支持动态配置更新
 */

import { EventEmitter    } from 'events';/**'
 * 前端配置接口
 */
export interface FrontendConfig     {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    retryDelay: number;
  };
  features: {
    realTimeUpdates: boolean;
    advancedAnalytics: boolean;
    batchOperations: boolean;
    performanceMonitoring: boolean;
    errorReporting: boolean;
    lazyLoading: boolean;
  };
  ui: {
    theme: 'dark' | 'light' | 'auto';
    language: string;
    pageSize: number;
    animationsEnabled: boolean;
    compactMode: boolean;
  };
  performance: {
    enableWebVitals: boolean;
    enableResourceTiming: boolean;
    enableUserTiming: boolean;
    reportingInterval: number;
    maxReports: number;
  };
  monitoring: {
    enableErrorTracking: boolean;
    enablePerformanceTracking: boolean;
    enableUserInteractionTracking: boolean;
    sampleRate: number;
  };
  cache: {
    enableServiceWorker: boolean;
    cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
    maxAge: number;
  };
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent     {
  key: string;
  oldValue: any;
  newValue: any;
  source: 'local' | 'remote' | 'user';
}

/**
 * 增强的配置管理器
 */
export class ConfigManager extends EventEmitter {
  private config: FrontendConfig;
  private remoteConfig: Partial<FrontendConfig> = {};
  private isInitialized = false;
  private syncInterval: number | null = null;
  private readonly storageKey = 'enhanced-app-config';
  private readonly remoteConfigUrl = '/api/config/frontend';
  constructor() {
    super();
    this.config = this.getDefaultConfig();
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): FrontendConfig {
    return {
      api: {
        baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001','
        timeout: 30000,
        retries: 3,
        retryDelay: 1000
      },
      features: {
        realTimeUpdates: true,
        advancedAnalytics: true,
        batchOperations: true,
        performanceMonitoring: true,
        errorReporting: true,
        lazyLoading: true
      },
      ui: {
        theme: 'auto','
        language: 'zh-CN','
        pageSize: 20,
        animationsEnabled: true,
        compactMode: false
      },
      performance: {
        enableWebVitals: true,
        enableResourceTiming: true,
        enableUserTiming: true,
        reportingInterval: 30000,
        maxReports: 100
      },
      monitoring: {
        enableErrorTracking: true,
        enablePerformanceTracking: true,
        enableUserInteractionTracking: false,
        sampleRate: 0.1
      },
      cache: {
        enableServiceWorker: true,
        cacheStrategy: 'stale-while-revalidate','
        maxAge: 86400000 // 24小时
      }
    }; // 已删除
  }

  /**
   * 初始化配置管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. 加载本地配置
      this.loadLocalConfig();

      // 2. 获取远程配置
      await this.fetchRemoteConfig();

      // 3. 合并配置
      this.mergeConfigs();

      // 4. 启动配置同步
      this.startConfigSync();

      // 5. 监听环境变化
      this.setupEnvironmentListeners();

      this.isInitialized = true;
      this.emit('initialized', this.config);'
      console.log('✅ Enhanced Config Manager initialized');'
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Config Manager: ', error);'
      // 使用默认配置继续运行
      this.isInitialized = true;
    }
  }

  /**
   * 加载本地配置
   */
  private loadLocalConfig(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const localConfig = JSON.parse(saved);
        this.config = this.deepMerge(this.config, localConfig);
      }
    } catch (error) {
      console.warn('Failed to load local config: ', error);'
    }
  }

  /**
   * 获取远程配置
   */
  private async fetchRemoteConfig(): Promise<void> {
    try {
      const response = await fetch(this.remoteConfigUrl, {
        method: 'GET','
        headers: {
          'Content-Type': 'application/json';
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          this.remoteConfig = data.data.frontend || {};
        }
      }
    } catch (error) {
      console.warn('Failed to fetch remote config: ', error);'
    }
  }

  /**
   * 合并配置
   */
  private mergeConfigs(): void {
    // 优先级：环境变量 > 远程配置 > 本地配置 > 默认配置
    const envConfig = this.getEnvironmentConfig();

    this.config = this.deepMerge(
      this.getDefaultConfig(),
      this.remoteConfig,
      envConfig
    );
  }

  /**
   * 获取环境变量配置
   */
  private getEnvironmentConfig(): Partial<FrontendConfig> {
    return {
      api: {
        baseUrl: import.meta.env.VITE_API_URL || this.config.api.baseUrl,
        timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || this.config.api.timeout
      },
      features: {
        realTimeUpdates: import.meta.env.VITE_ENABLE_REAL_TIME === 'true','
        performanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false';
      },
      monitoring: {
        enableErrorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING !== 'false','
        sampleRate: parseFloat(import.meta.env.VITE_MONITORING_SAMPLE_RATE) || this.config.monitoring.sampleRate
      }
    };
  }

  /**
   * 启动配置同步
   */
  private startConfigSync(): void {
    // 每5分钟同步一次远程配置
    this.syncInterval = window.setInterval(async () => {
      await this.syncWithRemote();
    }, 5 * 60 * 1000);
  }

  /**
   * 与远程配置同步
   */
  private async syncWithRemote(): Promise<void> {
    try {
      const oldRemoteConfig = { ...this.remoteConfig };
      await this.fetchRemoteConfig();

      // 检查是否有变化
      if (JSON.stringify(oldRemoteConfig) !== JSON.stringify(this.remoteConfig)) {
        const oldConfig = { ...this.config };
        this.mergeConfigs();

        // 触发变更事件
        this.emitConfigChanges(oldConfig, this.config, 'remote');'
      }
    } catch (error) {
      console.warn('Failed to sync with remote config: ', error);'
    }
  }

  /**
   * 设置环境监听器
   */
  private setupEnvironmentListeners(): void {
    // 监听主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');'
      mediaQuery.addEventListener('change', (e) => {'
        if (this.config.ui.theme === 'auto') {'
          this.emit('themeChanged', e.matches ? 'dark' : 'light');'
        }
      });
    }

    // 监听网络状态变化
    window.addEventListener('online', () => {'
      this.emit('networkStatusChanged', true);'
      this.syncWithRemote();
    });

    window.addEventListener('offline', () => {'
      this.emit('networkStatusChanged', false);'
    });
  }

  /**
   * 获取配置值
   */
  get<K extends keyof FrontendConfig>(key: K): FrontendConfig[K];
  get(key: string): any;
  get(key: string): any {
    return this.getNestedValue(this.config, key);
  }

  /**
   * 设置配置值
   */
  set(key: string, value: any, source: 'local' | 'user' = 'user'): void {'
    const oldValue = this.getNestedValue(this.config, key);
    this.setNestedValue(this.config, key, value);

    // 保存到本地存储
    this.saveLocalConfig();

    // 触发变更事件
    this.emit('configChanged', {'
      key,
      oldValue,
      newValue: value,
      source
    } as ConfigChangeEvent);
  }

  /**
   * 获取完整配置
   */
  getAll(): FrontendConfig {
    return { ...this.config };
  }

  /**
   * 批量更新配置
   */
  updateBatch(updates: Partial<FrontendConfig>, source: 'local' | 'user' = 'user'): void {'
    const oldConfig = { ...this.config };
    this.config = this.deepMerge(this.config, updates);

    // 保存到本地存储
    this.saveLocalConfig();

    // 触发变更事件
    this.emitConfigChanges(oldConfig, this.config, source);
  }

  /**
   * 重置配置
   */
  reset(): void {
    const oldConfig = { ...this.config };
    this.config = this.getDefaultConfig();

    // 清除本地存储
    localStorage.removeItem(this.storageKey);

    // 触发变更事件
    this.emitConfigChanges(oldConfig, this.config, 'user');'
  }

  /**
   * 保存本地配置
   */
  private saveLocalConfig(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save local config: ', error);'
    }
  }

  /**
   * 深度合并对象
   */
  private deepMerge(...objects: any[]): any {
    const result = {};

    for (const obj of objects) {
      if (obj && typeof obj === 'object') {'
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {'
              result[key] = this.deepMerge(result[key] || {}, obj[key]);
            } else {
              result[key] = obj[key];
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);'
  }

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');'
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * 触发配置变更事件
   */
  private emitConfigChanges(oldConfig: FrontendConfig, newConfig: FrontendConfig, source: string): void {
    const changes = this.getConfigDifferences(oldConfig, newConfig);

    for (const change of changes) {
      this.emit('configChanged', { ...change, source } as ConfigChangeEvent);'
    }

    if (changes.length > 0) {
      this.emit('configUpdated', { oldConfig, newConfig, changes, source });'
    }
  }

  /**
   * 获取配置差异
   */
  private getConfigDifferences(oldConfig: any, newConfig: any, prefix = ''): Array<{ key: string, oldValue: any, newValue: any }> {'
    const differences: Array<{ key: string, oldValue: any, newValue: any }>  = [];
    const allKeys = new Set([...Object.keys(oldConfig || {}), ...Object.keys(newConfig || {})]);

    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;`
      const oldValue = oldConfig?.[key];
      const newValue = newConfig?.[key];

      if (typeof oldValue === "object' && typeof newValue === 'object' &&'`
        oldValue !== null && newValue !== null &&
        !Array.isArray(oldValue) && !Array.isArray(newValue)) {
        differences.push(...this.getConfigDifferences(oldValue, newValue, fullKey));
      } else if (oldValue !== newValue) {
        differences.push({ key: fullKey, oldValue, newValue });
      }
    }

    return differences;
  }

  /**
   * 销毁配置管理器
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.removeAllListeners();
    this.isInitialized = false;
  }

  /**
   * 获取配置状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      hasRemoteConfig: Object.keys(this.remoteConfig).length > 0,
      syncEnabled: this.syncInterval !== null,
      lastSync: new Date().toISOString()
    };
  }
}

// 创建全局实例
export const enhancedConfigManager = new ConfigManager();
