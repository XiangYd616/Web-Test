// 配置服务
export class ConfigService {
  private config: unknown = {};

  async getConfig(key?: string): Promise<any> {
    
    if (key) {
      return this.config[key];
    }
    return this.config;
  }

  async setConfig(key: string, value: unknown): Promise<void> {
    
    this.config[key] = value;
  }

  async updateConfig(updates: unknown): Promise<void> {
    
    this.config = { ...this.config, ...updates };
  }

  async resetConfig(): Promise<void> {
    
    this.config = {};
  }
}

export const _configService = new ConfigService();
