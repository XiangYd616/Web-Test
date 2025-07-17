// 配置服务
export class ConfigService {
  private config: any = {};

  async getConfig(key?: string): Promise<any> {
    // 临时实现
    if (key) {
      return this.config[key];
    }
    return this.config;
  }

  async setConfig(key: string, value: any): Promise<void> {
    // 临时实现
    this.config[key] = value;
  }

  async updateConfig(updates: any): Promise<void> {
    // 临时实现
    this.config = { ...this.config, ...updates };
  }

  async resetConfig(): Promise<void> {
    // 临时实现
    this.config = {};
  }
}

export const configService = new ConfigService();
