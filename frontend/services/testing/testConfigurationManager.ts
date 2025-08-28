/**
 * 测试配置管理器
 * 提供完整的测试配置管理功能，包括模板、预设、验证等
 */

import type { BaseTestConfig } from './unifiedTestStateManager';

// 配置模板接口
export interface TestConfigTemplate {
  id: string;
  name: string;
  description: string;
  testType: string;
  config: BaseTestConfig;
  tags: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 配置验证结果
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// 配置预设
export interface TestConfigPreset {
  id: string;
  name: string;
  testType: string;
  config: Partial<BaseTestConfig>;
  description: string;
}

/**
 * 测试配置管理器
 */
export class TestConfigurationManager {
  private templates: Map<string, TestConfigTemplate> = new Map();
  private presets: Map<string, TestConfigPreset> = new Map();
  private storageKey = 'test_configuration_manager';

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultPresets();
  }

  /**
   * 初始化默认预设
   */
  private initializeDefaultPresets() {
    const defaultPresets: TestConfigPreset[] = [
      // 性能测试预设
      {
        id: 'perf_desktop_fast',
        name: '桌面端快速性能测试',
        testType: 'performance',
        description: '适用于桌面端的快速性能测试',
        config: {
          testType: 'performance',
          timeout: 60000,
          device: 'desktop',
          networkCondition: 'fast-3g'
        }
      },
      {
        id: 'perf_mobile_comprehensive',
        name: '移动端全面性能测试',
        testType: 'performance',
        description: '适用于移动端的全面性能测试',
        config: {
          testType: 'performance',
          timeout: 120000,
          device: 'mobile',
          networkCondition: 'slow-3g'
        }
      },

      // 安全测试预设
      {
        id: 'security_basic',
        name: '基础安全扫描',
        testType: 'security',
        description: '基础的安全漏洞扫描',
        config: {
          testType: 'security',
          timeout: 180000,
          scanDepth: 'medium',
          includeSsl: true,
          includeHeaders: true
        }
      },
      {
        id: 'security_comprehensive',
        name: '全面安全审计',
        testType: 'security',
        description: '全面的安全审计和漏洞扫描',
        config: {
          testType: 'security',
          timeout: 600000,
          scanDepth: 'deep',
          includeSsl: true,
          includeHeaders: true,
          includeVulnerabilities: true
        }
      },

      // 压力测试预设
      {
        id: 'stress_light',
        name: '轻量压力测试',
        testType: 'stress',
        description: '轻量级的压力测试',
        config: {
          testType: 'stress',
          timeout: 300000,
          concurrentUsers: 10,
          duration: 60,
          rampUpTime: 10
        }
      },
      {
        id: 'stress_heavy',
        name: '重负载压力测试',
        testType: 'stress',
        description: '高负载的压力测试',
        config: {
          testType: 'stress',
          timeout: 1800000,
          concurrentUsers: 100,
          duration: 300,
          rampUpTime: 60
        }
      },

      // API测试预设
      {
        id: 'api_basic',
        name: '基础API测试',
        testType: 'api',
        description: '基础的API功能测试',
        config: {
          testType: 'api',
          timeout: 30000,
          retryCount: 1,
          parallelRequests: 1
        }
      },
      {
        id: 'api_load',
        name: 'API负载测试',
        testType: 'api',
        description: 'API的负载和性能测试',
        config: {
          testType: 'api',
          timeout: 60000,
          retryCount: 3,
          parallelRequests: 10
        }
      }
    ];

    defaultPresets.forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  /**
   * 验证测试配置
   */
  validateConfig(config: BaseTestConfig): ConfigValidationResult {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // 基础验证
    if (!config.url) {
      result.errors.push('测试URL不能为空');
      result.isValid = false;
    } else {
      try {
        new URL(config.url);
      } catch {
        result.errors.push('测试URL格式无效');
        result.isValid = false;
      }
    }

    if (!config.testType) {
      result.errors.push('测试类型不能为空');
      result.isValid = false;
    }

    // 超时验证
    if (config.timeout && config.timeout < 10000) {
      result.warnings.push('超时时间过短，可能导致测试失败');
    }

    if (config.timeout && config.timeout > 3600000) {
      result.warnings.push('超时时间过长，建议缩短以提高效率');
    }

    // 根据测试类型进行特定验证
    switch (config.testType) {
      case 'performance':
        this.validatePerformanceConfig(config, result);
        break;
      case 'security':
        this.validateSecurityConfig(config, result);
        break;
      case 'stress':
        this.validateStressConfig(config, result);
        break;
      case 'api':
        this.validateApiConfig(config, result);
        break;
    }

    return result;
  }

  /**
   * 验证性能测试配置
   */
  private validatePerformanceConfig(config: BaseTestConfig, result: ConfigValidationResult) {
    if (config.device && !['desktop', 'mobile', 'tablet'].includes(config.device)) {
      result.warnings.push('设备类型不在推荐范围内');
    }

    if (config.networkCondition && !['fast-3g', 'slow-3g', 'offline'].includes(config.networkCondition)) {
      result.warnings.push('网络条件设置可能不准确');
    }

    result.suggestions.push('建议同时测试桌面端和移动端性能');
    result.suggestions.push('考虑在不同网络条件下进行测试');
  }

  /**
   * 验证安全测试配置
   */
  private validateSecurityConfig(config: BaseTestConfig, result: ConfigValidationResult) {
    if (config.scanDepth && !['surface', 'medium', 'deep'].includes(config.scanDepth)) {
      result.warnings.push('扫描深度设置无效');
    }

    if (!config.includeSsl) {
      result.suggestions.push('建议启用SSL检查以提高安全性');
    }

    if (!config.includeHeaders) {
      result.suggestions.push('建议启用HTTP头部检查');
    }

    result.suggestions.push('定期进行安全测试以确保网站安全');
  }

  /**
   * 验证压力测试配置
   */
  private validateStressConfig(config: BaseTestConfig, result: ConfigValidationResult) {
    if (config.concurrentUsers && config.concurrentUsers > 1000) {
      result.warnings.push('并发用户数过高，可能影响测试准确性');
    }

    if (config.duration && config.duration > 3600) {
      result.warnings.push('测试持续时间过长，建议分阶段进行');
    }

    if (config.rampUpTime && config.concurrentUsers &&
      config.rampUpTime < config.concurrentUsers / 10) {
      result.suggestions.push('建议增加爬坡时间以获得更准确的结果');
    }

    result.suggestions.push('建议从小负载开始逐步增加');
  }

  /**
   * 验证API测试配置
   */
  private validateApiConfig(config: BaseTestConfig, result: ConfigValidationResult) {
    if (config.parallelRequests && config.parallelRequests > 50) {
      result.warnings.push('并行请求数过高，可能导致服务器过载');
    }

    if (config.retryCount && config.retryCount > 5) {
      result.warnings.push('重试次数过多，可能延长测试时间');
    }

    result.suggestions.push('建议设置合适的断言来验证API响应');
    result.suggestions.push('考虑测试不同的HTTP方法和状态码');
  }

  /**
   * 创建配置模板
   */
  createTemplate(template: Omit<TestConfigTemplate, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateId();
    const now = new Date();

    const newTemplate: TestConfigTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.templates.set(id, newTemplate);
    this.saveToStorage();

    return id;
  }

  /**
   * 更新配置模板
   */
  updateTemplate(id: string, updates: Partial<TestConfigTemplate>): boolean {
    const template = this.templates.get(id);
    if (!template) {
      return false;
    }

    const updatedTemplate: TestConfigTemplate = {
      ...template,
      ...updates,
      id, // 确保ID不被修改
      updatedAt: new Date()
    };

    this.templates.set(id, updatedTemplate);
    this.saveToStorage();

    return true;
  }

  /**
   * 删除配置模板
   */
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * 获取配置模板
   */
  getTemplate(id: string): TestConfigTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): TestConfigTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 根据测试类型获取模板
   */
  getTemplatesByType(testType: string): TestConfigTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.testType === testType);
  }

  /**
   * 获取预设配置
   */
  getPreset(id: string): TestConfigPreset | null {
    return this.presets.get(id) || null;
  }

  /**
   * 获取所有预设
   */
  getAllPresets(): TestConfigPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * 根据测试类型获取预设
   */
  getPresetsByType(testType: string): TestConfigPreset[] {
    return Array.from(this.presets.values())
      .filter(preset => preset.testType === testType);
  }

  /**
   * 应用预设到配置
   */
  applyPreset(presetId: string, baseConfig: BaseTestConfig): BaseTestConfig {
    const preset = this.presets.get(presetId);
    if (!preset) {
      return baseConfig;
    }

    return {
      ...baseConfig,
      ...preset.config
    };
  }

  /**
   * 克隆配置
   */
  cloneConfig(config: BaseTestConfig): BaseTestConfig {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * 合并配置
   */
  mergeConfigs(base: BaseTestConfig, override: Partial<BaseTestConfig>): BaseTestConfig {
    return {
      ...base,
      ...override
    };
  }

  /**
   * 导出配置
   */
  exportConfig(config: BaseTestConfig): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * 导入配置
   */
  importConfig(configJson: string): BaseTestConfig {
    try {
      const config = JSON.parse(configJson);
      const validation = this.validateConfig(config);

      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      return config;
    } catch (error: any) {
      throw new Error(`导入配置失败: ${error.message}`);
    }
  }

  /**
   * 生成配置建议
   */
  generateConfigSuggestions(config: BaseTestConfig): string[] {
    const suggestions: string[] = [];

    // 基于测试类型的建议
    switch (config.testType) {
      case 'performance':
        suggestions.push('考虑在不同设备和网络条件下测试');
        suggestions.push('关注Core Web Vitals指标');
        break;
      case 'security':
        suggestions.push('定期更新安全检查规则');
        suggestions.push('结合手动安全审计');
        break;
      case 'stress':
        suggestions.push('逐步增加负载以找到性能瓶颈');
        suggestions.push('监控服务器资源使用情况');
        break;
      case 'api':
        suggestions.push('测试边界条件和错误处理');
        suggestions.push('验证API文档的准确性');
        break;
    }

    // 通用建议
    suggestions.push('保存成功的配置作为模板');
    suggestions.push('定期回顾和优化测试配置');

    return suggestions;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage() {
    try {
      const data = {
        templates: Array.from(this.templates.entries()),
        presets: Array.from(this.presets.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('保存配置到本地存储失败:', error);
    }
  }

  /**
   * 从本地存储加载
   */
  private loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);

        if (parsed.templates) {
          this.templates = new Map(parsed.templates);
        }

        if (parsed.presets) {
          this.presets = new Map(parsed.presets);
        }
      }
    } catch (error) {
      console.error('从本地存储加载配置失败:', error);
    }
  }

  /**
   * 清除所有数据
   */
  clearAll() {
    this.templates.clear();
    this.presets.clear();
    localStorage.removeItem(this.storageKey);
    this.initializeDefaultPresets();
  }
}

// 创建单例实例
export const testConfigurationManager = new TestConfigurationManager();

export default testConfigurationManager;
