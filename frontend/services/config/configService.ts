import { apiService } from './apiService';

export interface TestConfigTemplate {
  id: string;
  name: string;
  testType: string;
  config: any;
  description?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

class ConfigService {
  private baseUrl = '/api/test/config';
  private localStorageKey = 'test-configs';

  /**
   * 获取测试配置模板
   */
  async getConfigTemplates(testType?: string): Promise<TestConfigTemplate[]> {
    try {
      const params = testType ? `?testType=${testType}` : '';
      const response = await apiService.get(`${this.baseUrl}/templates${params}`);
      return response.data || [];
    } catch (error) {
      console.error('获取配置模板失败:', error);
      // 返回本地存储的配置
      return this.getLocalConfigs(testType);
    }
  }

  /**
   * 保存配置模板
   */
  async saveConfigTemplate(template: Omit<TestConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestConfigTemplate> {
    try {
      const response = await apiService.post(`${this.baseUrl}/templates`, template);
      return response.data;
    } catch (error) {
      console.error('保存配置模板失败:', error);
      // 保存到本地存储
      return this.saveLocalConfig(template);
    }
  }

  /**
   * 更新配置模板
   */
  async updateConfigTemplate(id: string, template: Partial<TestConfigTemplate>): Promise<TestConfigTemplate> {
    try {
      const response = await apiService.put(`${this.baseUrl}/templates/${id}`, template);
      return response.data;
    } catch (error) {
      console.error('更新配置模板失败:', error);
      throw new Error('更新配置模板失败');
    }
  }

  /**
   * 删除配置模板
   */
  async deleteConfigTemplate(id: string): Promise<void> {
    try {
      await apiService.delete(`${this.baseUrl}/templates/${id}`);
    } catch (error) {
      console.error('删除配置模板失败:', error);
      throw new Error('删除配置模板失败');
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(testType: string): any {
    const defaults = {
      api: {
        timeout: 30000,
        retries: 3,
        followRedirects: true,
        validateSSL: true,
        headers: {},
        authentication: {
          type: 'none'
        }
      },
      security: {
        checkSSL: true,
        checkHeaders: true,
        checkCookies: true,
        checkXSS: true,
        checkSQLInjection: true,
        checkCSRF: true,
        scanDepth: 'medium'
      },
      stress: {
        duration: 60,
        concurrency: 10,
        rampUp: 5,
        rampDown: 5,
        thinkTime: 1000,
        requestsPerSecond: 0
      },
      seo: {
        checkTechnical: true,
        checkContent: true,
        checkMobile: true,
        checkSpeed: true,
        checkAccessibility: true,
        checkSocial: true
      },
      compatibility: {
        browsers: ['chrome', 'firefox', 'safari', 'edge'],
        devices: ['desktop', 'tablet', 'mobile'],
        resolutions: ['1920x1080', '1366x768', '375x667'],
        checkCSS: true,
        checkJS: true
      },
      ux: {
        checkPerformance: true,
        checkAccessibility: true,
        checkUsability: true,
        checkMobile: true,
        performanceThreshold: 3000,
        accessibilityLevel: 'AA'
      }
    };

    return defaults[testType] || {};
  }

  /**
   * 验证配置
   */
  validateConfig(testType: string, config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('配置不能为空');
      return { valid: false, errors };
    }

    switch (testType) {
      case 'api':
        if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 300000)) {
          errors.push('超时时间必须是1秒到5分钟之间的数字');
        }
        if (config.retries && (typeof config.retries !== 'number' || config.retries < 0 || config.retries > 10)) {
          errors.push('重试次数必须是0到10之间的数字');
        }
        break;

      case 'stress':
        if (config.duration && (typeof config.duration !== 'number' || config.duration < 10 || config.duration > 3600)) {
          errors.push('测试时长必须是10秒到1小时之间的数字');
        }
        if (config.concurrency && (typeof config.concurrency !== 'number' || config.concurrency < 1 || config.concurrency > 1000)) {
          errors.push('并发用户数必须是1到1000之间的数字');
        }
        break;

      case 'seo':
        const requiredChecks = ['checkTechnical', 'checkContent', 'checkMobile'];
        const hasAnyCheck = requiredChecks.some(check => config[check] === true);
        if (!hasAnyCheck) {
          errors.push('至少需要选择一项SEO检查');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 从本地存储获取配置
   */
  private getLocalConfigs(testType?: string): TestConfigTemplate[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      const configs = stored ? JSON.parse(stored) : [];

      if (testType) {
        return configs.filter((config: TestConfigTemplate) => config.testType === testType);
      }

      return configs;
    } catch (error) {
      console.error('读取本地配置失败:', error);
      return [];
    }
  }

  /**
   * 保存配置到本地存储
   */
  private saveLocalConfig(template: Omit<TestConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>): TestConfigTemplate {
    try {
      const configs = this.getLocalConfigs();
      const newTemplate: TestConfigTemplate = {
        ...template,
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      configs.push(newTemplate);
      localStorage.setItem(this.localStorageKey, JSON.stringify(configs));

      return newTemplate;
    } catch (error) {
      console.error('保存本地配置失败:', error);
      throw new Error('保存配置失败');
    }
  }

  /**
   * 导入配置
   */
  async importConfig(file: File): Promise<TestConfigTemplate[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const configs = JSON.parse(content);

          if (!Array.isArray(configs)) {
            reject(new Error('配置文件格式不正确'));
            return;
          }

          // 验证配置格式
          const validConfigs = configs.filter(config =>
            config.name && config.testType && config.config
          );

          resolve(validConfigs);
        } catch (error) {
          reject(new Error('配置文件解析失败'));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * 导出配置
   */
  exportConfig(configs: TestConfigTemplate[]): void {
    try {
      const dataStr = JSON.stringify(configs, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `test-configs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出配置失败:', error);
      throw new Error('导出配置失败');
    }
  }
}

export const configService = new ConfigService();
export default configService;
