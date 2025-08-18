// SystemService - 系统服务
export interface SystemInfo {
  version: string;
  platform: string;
  memory: number;
  cpu: number;
}

export interface SystemConfig {
  theme: string;
  language: string;
  autoSave: boolean;
}

export class SystemService {
  private config: SystemConfig;

  constructor() {
    this.config = {
      theme: 'light',
      language: 'zh-CN',
      autoSave: true
    };
  }

  /**
   * 获取系统信息
   */
  public async getSystemInfo(): Promise<SystemInfo> {
    try {
      const info: SystemInfo = {
        version: '1.0.0',
        platform: navigator.platform,
        memory: (performance as any).memory?.usedJSHeapSize || 0,
        cpu: navigator.hardwareConcurrency || 1
      };

      return info;
    } catch (error) {
      console.error('获取系统信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): SystemConfig {
    return this.config;
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  /**
   * 保存配置
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('systemConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }

  /**
   * 加载配置
   */
  public loadConfig(): void {
    try {
      const saved = localStorage.getItem('systemConfig');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  }
}

export default SystemService;
