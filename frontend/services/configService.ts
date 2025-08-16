/**
 * 配置服务
 * 管理应用配置
 */

export interface AppConfig     {
  apiBaseUrl: string;
  timeout: number;
  retryAttempts: number;
}

class ConfigService {
  private config: AppConfig = {
    apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001','
    timeout: 30000,
    retryAttempts: 3
  };

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

const configService = new ConfigService();
export default configService;
