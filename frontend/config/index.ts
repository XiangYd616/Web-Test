/**
 * 应用配置管理
 */

export interface AppConfig     {
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    realTimeUpdates: boolean;
    advancedAnalytics: boolean;
    batchOperations: boolean;
  };
  ui: {
    theme: 'dark' | 'light';
    language: string;
    pageSize: number;
  };
}

// 默认配置
const defaultConfig: AppConfig  = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001','
    timeout: 30000
  },
  features: {
    realTimeUpdates: true,
    advancedAnalytics: true,
    batchOperations: true
  },
  ui: {
    theme: 'dark','
    language: 'zh-CN','
    pageSize: 20
  }
};
// 配置管理器
class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 加载配置
   */
  private loadConfig(): AppConfig {
    try {
      const saved = localStorage.getItem('app-config');'
      if (saved) {
        
        return { ...defaultConfig, ...JSON.parse(saved)
      };
      }
    } catch (error) {
      console.warn('加载配置失败，使用默认配置:', error);'
    }
    return defaultConfig;
  }

  /**
   * 保存配置
   */
  private saveConfig() {
    try {
      localStorage.setItem('app-config', JSON.stringify(this.config));'
    } catch (error) {
      console.error('保存配置失败:', error);'
    }
  }

  /**
   * 获取配置
   */
  get(): AppConfig {
    return this.config;
  }

  /**
   * 更新配置
   */
  update(updates: Partial<AppConfig>) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  /**
   * 重置配置
   */
  reset() {
    this.config = defaultConfig;
    this.saveConfig();
  }
}

export const configManager = new ConfigManager();
export default configManager;