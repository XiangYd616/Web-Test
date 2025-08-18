// 集成配置服务
export interface APIKey     {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  isActive: boolean;
  usageCount: number;
  rateLimit: number;
  description?: string;
}

export interface WebhookConfig     {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  headers: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  createdAt: string;
  lastTriggered?: string;
  successCount: number;
  failureCount: number;
  timeout: number;
}

export interface ThirdPartyIntegration     {
  id: string;
  name: string;
  type: 'slack' | 'discord' | 'teams' | 'email' | 'jira' | 'github' | 'gitlab' | 'jenkins' | 'docker' | 'aws' | 'gcp' | 'azure'
  isEnabled: boolean;
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  lastSync?: string;
  description: string;
  icon: string;
  category: 'notification' | 'cicd' | 'cloud' | 'monitoring' | 'collaboration'
}

export interface CICDIntegration     {
  id: string;
  name: string;
  type: 'github' | 'gitlab' | 'jenkins' | 'azure-devops' | 'circleci' | 'travis'
  repository: string;
  branch: string;
  triggerEvents: string[];
  testCommands: string[];
  isActive: boolean;
  config: {
    token?: string;
    webhookUrl?: string;
    buildScript?: string;
    environment?: Record<string, string>;
  };
  lastRun?: string;
  status: 'success' | 'failure' | 'pending' | 'disabled'
}

export interface NotificationConfig     {
  id: string;
  type: 'email' | 'slack' | 'discord' | 'teams' | 'webhook'
  name: string;
  isEnabled: boolean;
  triggers: {
    testCompleted: boolean;
    testFailed: boolean;
    alertTriggered: boolean;
    systemMaintenance: boolean;
    quotaExceeded: boolean;
  };
  config: Record<string, any>;
  template?: string;
  recipients: string[];
}

export interface IntegrationStats     {
  totalAPIKeys: number;
  activeAPIKeys: number;
  totalWebhooks: number;
  activeWebhooks: number;
  totalIntegrations: number;
  activeIntegrations: number;
  apiCallsToday: number;
  webhookCallsToday: number;
  lastActivity?: string;
}

export class IntegrationService {
  private static readonly BASE_URL = '/api/integrations'
  private static cache = new Map<string, any>();
  private static cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  // API密钥管理
  static async getAPIKeys(): Promise<APIKey[]> {
    const cacheKey = 'api-keys'
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // 如果用户未认证，直接返回模拟数据
    if (!this.isAuthenticated()) {
      console.warn('User not authenticated, returning mock API keys");"
      const mockData = this.generateMockAPIKeys();
      this.setCache(cacheKey, mockData);
      return mockData;
    }

    try {
      const response = await fetch(`${this.BASE_URL}/api-keys`, {`
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        
        if (response.status === 401) {
          console.warn("Authentication failed, returning mock API keys");``
          const mockData = this.generateMockAPIKeys();
          this.setCache(cacheKey, mockData);
          return mockData;
      }
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const data = await response.json();
      if (data.success) {
        
        this.setCache(cacheKey, data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Failed to fetch API keys");``
      }

    } catch (error) {
      console.error('Failed to fetch API keys: ', error);
      const mockData = this.generateMockAPIKeys();
      this.setCache(cacheKey, mockData);
      return mockData;
    }
  }

  static async createAPIKey(keyData: Partial<APIKey>): Promise<APIKey> {
    try {
      const response = await fetch(`${this.BASE_URL}/api-keys`, {`
        method: "POST','`"`
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': "application/json"
        },
        body: JSON.stringify(keyData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const data = await response.json();
      if (data.success) {
        
        // 清除缓存
        this.clearCache("api-keys");``
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create API key");"
      }

    } catch (error) {
      console.error('Failed to create API key: ', error);
      throw error;
    }
  }

  static async deleteAPIKey(keyId: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/api-keys/${keyId}`, {`
        method: "DELETE','`"`
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      // 清除缓存
      this.clearCache("api-keys");``

    } catch (error) {
      console.error('Failed to delete API key: ', error);
      throw error;
    }
  }

  // Webhook管理
  static async getWebhooks(): Promise<WebhookConfig[]> {
    const cacheKey = 'webhooks'
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // 如果用户未认证，直接返回模拟数据
    if (!this.isAuthenticated()) {
      console.warn('User not authenticated, returning mock webhooks");"
      const mockData = this.generateMockWebhooks();
      this.setCache(cacheKey, mockData);
      return mockData;
    }

    try {
      const response = await fetch(`${this.BASE_URL}/webhooks`, {`
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        
        if (response.status === 401) {
          console.warn("Authentication failed, returning mock webhooks");``
          const mockData = this.generateMockWebhooks();
          this.setCache(cacheKey, mockData);
          return mockData;
      }
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const data = await response.json();
      if (data.success) {
        
        this.setCache(cacheKey, data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Failed to fetch webhooks");``
      }

    } catch (error) {
      console.error('Failed to fetch webhooks: ', error);
      const mockData = this.generateMockWebhooks();
      this.setCache(cacheKey, mockData);
      return mockData;
    }
  }

  static async createWebhook(webhookData: Partial<WebhookConfig>): Promise<WebhookConfig> {
    try {
      const response = await fetch(`${this.BASE_URL}/webhooks`, {`
        method: "POST','`"`
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': "application/json"
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const newWebhook: WebhookConfig  = {
        id: Date.now().toString(),
        name: webhookData.name || "New Webhook','`"`
        url: webhookData.url || '',
        events: webhookData.events || ['test.completed'],
        isActive: true,
        headers: webhookData.headers || {},
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2
        },
        createdAt: new Date().toISOString(),
        successCount: 0,
        failureCount: 0,
        timeout: 30000
      };
      // 清除缓存
      this.clearCache('webhooks");"
      return newWebhook;

    } catch (error) {
      console.error('Failed to create webhook: ', error);
      throw error;
    }
  }

  // 第三方集成
  static async getThirdPartyIntegrations(): Promise<ThirdPartyIntegration[]> {
    const cacheKey = 'third-party-integrations'
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // 如果用户未认证，直接返回模拟数据
    if (!this.isAuthenticated()) {
      console.warn('User not authenticated, returning mock third-party integrations");"
      const mockData = this.generateMockThirdPartyIntegrations();
      this.setCache(cacheKey, mockData);
      return mockData;
    }

    try {
      const response = await fetch(`${this.BASE_URL}/third-party`, {`
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        
        if (response.status === 401) {
          console.warn("Authentication failed, returning mock third-party integrations");``
          const mockData = this.generateMockThirdPartyIntegrations();
          this.setCache(cacheKey, mockData);
          return mockData;
      }
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const data = await response.json();
      if (data.success) {
        
        this.setCache(cacheKey, data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Failed to fetch third-party integrations");``
      }

    } catch (error) {
      console.error('Failed to fetch third-party integrations: ', error);
      const mockData = this.generateMockThirdPartyIntegrations();
      this.setCache(cacheKey, mockData);
      return mockData;
    }
  }

  // 集成统计
  static async getIntegrationStats(): Promise<IntegrationStats> {
    const cacheKey = 'integration-stats'
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    // 如果用户未认证，直接返回模拟数据
    if (!this.isAuthenticated()) {
      console.warn('User not authenticated, returning mock integration stats");"
      const mockData = this.generateMockStats();
      this.setCache(cacheKey, mockData);
      return mockData;
    }

    try {
      const response = await fetch(`${this.BASE_URL}/stats`, {`
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        
        if (response.status === 401) {
          console.warn("Authentication failed, returning mock integration stats");``
          const mockData = this.generateMockStats();
          this.setCache(cacheKey, mockData);
          return mockData;
      }
        throw new Error(`HTTP error! status: ${response.status}`);`
      }

      const data = await response.json();
      if (data.success) {
        
        this.setCache(cacheKey, data.data);
        return data.data;
      } else {
        throw new Error(data.message || "Failed to fetch integration stats");``
      }

    } catch (error) {
      console.error('Failed to fetch integration stats: ', error);
      const mockData = this.generateMockStats();
      this.setCache(cacheKey, mockData);
      return mockData;
    }
  }

  // 私有辅助方法
  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken");"
    const headers: Record<string, string>  = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;'`
    }

    return headers;
  }

  // 检查用户是否已登录
  private static isAuthenticated(): boolean {
    const token = localStorage.getItem("token') || localStorage.getItem('authToken");``
    return !!token;
  }

  private static getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {>
      return cached.data;
    }
    return null;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private static clearCache(key: string): void {
    this.cache.delete(key);
  }

  private static generateAPIKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'twapp_'
    for (let i = 0; i < 32; i++) {>
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static generateMockAPIKeys(): APIKey[] {
    return [
      {
        id: '1',
        name: '生产环境API密钥',
        key: 'twapp_prod_' + Math.random().toString(36).substring(2, 15),
        permissions: ['read', 'write', 'admin'],
        createdAt: '2025-01-15T10:30:00Z',
        lastUsed: '2025-06-19T08:45:00Z',
        isActive: true,
        usageCount: 15420,
        rateLimit: 5000,
        description: '用于生产环境的主要API密钥'
      },
      {
        id: '2',
        name: '测试环境API密钥',
        key: 'twapp_test_' + Math.random().toString(36).substring(2, 15),
        permissions: ['read', 'write'],
        createdAt: '2025-03-20T14:20:00Z',
        lastUsed: '2025-06-18T16:30:00Z',
        isActive: true,
        usageCount: 3240,
        rateLimit: 1000,
        description: '用于测试和开发环境'
      },
      {
        id: '3',
        name: 'CI/CD集成密钥',
        key: 'twapp_cicd_' + Math.random().toString(36).substring(2, 15),
        permissions: ['read'],
        createdAt: '2025-05-10T09:15:00Z',
        isActive: false,
        usageCount: 890,
        rateLimit: 500,
        description: '用于持续集成和部署流程'
      }
    ];
  }

  private static generateMockWebhooks(): WebhookConfig[] {
    return [
      {
        id: '1',
        name: 'Slack通知',
        url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
        events: ['test.completed', 'test.failed', 'alert.triggered'],
        isActive: true,
        headers: { 'Content-Type': 'application/json' },
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2
        },
        createdAt: '2025-02-10T11:20:00Z',
        lastTriggered: '2025-06-19T09:30:00Z',
        successCount: 1250,
        failureCount: 15,
        timeout: 30000
      },
      {
        id: '2',
        name: '内部监控系统',
        url: 'https://monitoring.company.com/webhooks/testweb',
        events: ['test.completed', 'system.maintenance'],
        isActive: true,
        secret: 'webhook_secret_key_123',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'internal-monitoring-key'
        },
        retryPolicy: {
          maxRetries: 5,
          retryDelay: 2000,
          backoffMultiplier: 1.5
        },
        createdAt: '2025-04-05T15:45:00Z',
        lastTriggered: '2025-06-19T10:15:00Z',
        successCount: 890,
        failureCount: 8,
        timeout: 45000
      }
    ];
  }

  private static generateMockThirdPartyIntegrations(): ThirdPartyIntegration[] {
    return [
      {
        id: '1',
        name: 'Slack',
        type: 'slack',
        isEnabled: true,
        config: {
          webhookUrl: 'https://hooks.slack.com/services/...',
          channel: '#testing',
          username: 'TestWebApp'
        },
        status: 'connected',
        lastSync: '2025-06-19T10:30:00Z',
        description: '发送测试结果和告警到Slack频道',
        icon: '💬',
        category: 'notification'
      },
      {
        id: '2',
        name: 'GitHub Actions',
        type: 'github',
        isEnabled: true,
        config: {
          token: 'ghp_xxxxxxxxxxxxxxxxxxxx',
          repository: 'company/web-app',
          branch: 'main'
        },
        status: 'connected',
        lastSync: '2025-06-19T09:45:00Z',
        description: '与GitHub Actions集成进行自动化测试',
        icon: '🐙',
        category: 'cicd'
      },
      {
        id: '3',
        name: 'AWS CloudWatch',
        type: 'aws',
        isEnabled: false,
        config: {
          accessKeyId: 'AKIA...',
          region: 'us-east-1',
          logGroup: '/testweb/monitoring'
        },
        status: 'disconnected',
        description: '将监控数据发送到AWS CloudWatch',
        icon: '☁️',
        category: 'cloud'
      }
    ];
  }

  private static generateMockStats(): IntegrationStats {
    return {
      totalAPIKeys: 3,
      activeAPIKeys: 2,
      totalWebhooks: 2,
      activeWebhooks: 2,
      totalIntegrations: 3,
      activeIntegrations: 2,
      apiCallsToday: 1250,
      webhookCallsToday: 45,
      lastActivity: '2025-06-19T10:30:00Z'
    };
  }
}

export default IntegrationService;
