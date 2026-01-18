/**
 * 🔍 验证核心服务
 * 为统一测试引擎提供核心验证功能
 */

const Joi = require('joi');
const winston = require('winston');

// 创建专用的logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'validation-core' },
  transports: [
    new winston.transports.File({ 
      filename: 'backend/logs/validation.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      level: 'warn',
      format: winston.format.simple()
    })
  ]
});

/**
 * 验证核心类
 */
class ValidationCore {
  constructor() {
    this.schemas = new Map();
    this.customValidators = new Map();
    this.initializeSchemas();
  }

  /**
   * 初始化验证Schema
   */
  initializeSchemas() {
    // URL验证Schema
    this.schemas.set('url', Joi.string().uri({
      scheme: ['http', 'https']
    }).required().messages({
      'string.uri': '请输入有效的URL地址',
      'any.required': 'URL是必需的'
    }));

    // 测试类型验证Schema
    this.schemas.set('testType', Joi.string().valid(
      'performance', 'security', 'api', 'stress',
      'seo', 'website', 'accessibility'
    ).required().messages({
      'any.only': '不支持的测试类型',
      'any.required': '测试类型是必需的'
    }));

    // 优先级验证Schema
    this.schemas.set('priority', Joi.string().valid(
      'low', 'normal', 'high'
    ).default('normal'));

    // 超时验证Schema
    this.schemas.set('timeout', Joi.number().integer().min(10000).max(300000).default(30000));

    // 重试次数验证Schema
    this.schemas.set('retries', Joi.number().integer().min(0).max(5).default(0));

    // 标签验证Schema
    this.schemas.set('tags', Joi.array().items(Joi.string()).default([]));

    logger.info('验证Schema初始化完成');
  }

  /**
   * 验证URL
   */
  validateUrl(url) {
    const schema = this.schemas.get('url');
    return schema.validate(url);
  }

  /**
   * 验证测试类型
   */
  validateTestType(testType) {
    const schema = this.schemas.get('testType');
    return schema.validate(testType);
  }

  /**
   * 验证基础配置
   */
  validateBaseConfig(config) {
    const baseSchema = Joi.object({
      url: this.schemas.get('url'),
      testType: this.schemas.get('testType'),
      priority: this.schemas.get('priority'),
      timeout: this.schemas.get('timeout'),
      retries: this.schemas.get('retries'),
      tags: this.schemas.get('tags'),
      metadata: Joi.object().default({})
    });

    return baseSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
  }

  /**
   * 验证性能测试配置
   */
  validatePerformanceConfig(config) {
    const performanceSchema = Joi.object({
      url: this.schemas.get('url'),
      device: Joi.string().valid('desktop', 'mobile').default('desktop'),
      locale: Joi.string().default('zh-CN'),
      throttling: Joi.string().valid(
        'none', 'simulated3G', 'applied3G', 'applied4G'
      ).default('simulated3G'),
      categories: Joi.array().items(
        Joi.string().valid('performance', 'accessibility', 'best-practices', 'seo')
      ).default(['performance']),
      checkCoreWebVitals: Joi.boolean().default(true),
      checkPageSpeed: Joi.boolean().default(true),
      checkResources: Joi.boolean().default(true),
      checkCaching: Joi.boolean().default(true)
    });

    return performanceSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
  }

  /**
   * 验证安全测试配置
   */
  validateSecurityConfig(config) {
    const securitySchema = Joi.object({
      url: this.schemas.get('url'),
      checkSSL: Joi.boolean().default(true),
      checkHeaders: Joi.boolean().default(true),
      checkVulnerabilities: Joi.boolean().default(true),
      checkCookies: Joi.boolean().default(true),
      scanDepth: Joi.number().integer().min(1).max(5).default(3),
      timeout: this.schemas.get('timeout')
    });

    return securitySchema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
  }

  /**
   * 验证API测试配置
   */
  validateApiConfig(config) {
    const endpointSchema = Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH').required(),
      path: Joi.string().required(),
      expectedStatus: Joi.array().items(Joi.number().integer()).default([200]),
      maxResponseTime: Joi.number().integer().min(100).max(30000).default(5000),
      headers: Joi.object().default({}),
      body: Joi.any().default(null)
    });

    const apiSchema = Joi.object({
      baseUrl: this.schemas.get('url'),
      endpoints: Joi.array().items(endpointSchema).min(1).required(),
      timeout: this.schemas.get('timeout'),
      retries: this.schemas.get('retries'),
      authentication: Joi.object({
        type: Joi.string().valid('none', 'basic', 'bearer', 'api-key').default('none'),
        username: Joi.string().when('type', { is: 'basic', then: Joi.required() }),
        password: Joi.string().when('type', { is: 'basic', then: Joi.required() }),
        token: Joi.string().when('type', { is: 'bearer', then: Joi.required() }),
        apiKey: Joi.string().when('type', { is: 'api-key', then: Joi.required() }),
        header: Joi.string().when('type', { is: 'api-key', then: Joi.required() })
      }).default({ type: 'none' })
    });

    return apiSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
  }

  /**
   * 验证压力测试配置
   */
  validateStressConfig(config) {
    const stressSchema = Joi.object({
      url: this.schemas.get('url'),
      users: Joi.number().integer().min(1).max(1000).required(),
      duration: Joi.number().integer().min(10).max(3600).required(),
      testType: Joi.string().valid('load', 'stress', 'spike', 'volume').default('load'),
      rampUpTime: Joi.number().integer().min(0).max(300).default(10),
      timeout: this.schemas.get('timeout')
    });

    return stressSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
  }

  /**
   * 根据测试类型验证配置
   */
  validateConfigByType(testType, config) {
    switch (testType) {
      case 'performance':
        return this.validatePerformanceConfig(config);
      case 'security':
        return this.validateSecurityConfig(config);
      case 'api':
        return this.validateApiConfig(config);
      case 'stress':
        return this.validateStressConfig(config);
      case 'accessibility':
        return this.validateBaseConfig(config);
      default:
        return this.validateBaseConfig(config);
    }
  }

  /**
   * 添加自定义验证器
   */
  addCustomValidator(name, validator) {
    this.customValidators.set(name, validator);
    logger.info(`添加自定义验证器: ${name}`);
  }

  /**
   * 获取验证错误的友好消息
   */
  getValidationErrorMessage(error) {
    if (!error.details) return error.message;

    const messages = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return {
      error: '配置验证失败',
      details: messages
    };
  }

  /**
   * 验证测试执行请求
   */
  validateTestExecutionRequest(request) {
    const executionSchema = Joi.object({
      testType: this.schemas.get('testType'),
      config: Joi.object().required(),
      options: Joi.object({
        testId: Joi.string().optional(),
        priority: this.schemas.get('priority'),
        timeout: this.schemas.get('timeout'),
        retries: this.schemas.get('retries'),
        tags: this.schemas.get('tags'),
        metadata: Joi.object().default({})
      }).default({})
    });

    // 首先验证基础结构
    const { error: baseError, value: baseValue } = executionSchema.validate(request, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (baseError) {
      return { error: baseError, value: null };
    }

    // 然后验证特定测试类型的配置
    const { error: configError, value: configValue } = this.validateConfigByType(
      baseValue.testType, 
      baseValue.config
    );

    if (configError) {
      return { error: configError, value: null };
    }

    return {
      error: null,
      value: {
        ...baseValue,
        config: configValue
      }
    };
  }

  /**
   * 获取支持的测试类型
   */
  getSupportedTestTypes() {
    return [
      {
        id: 'performance',
        name: '性能测试',
        description: '网站性能和Core Web Vitals测试',
        core: 'performance'
      },
      {
        id: 'security',
        name: '安全测试',
        description: '安全漏洞扫描和SSL检查',
        core: 'security'
      },
      {
        id: 'api',
        name: 'API测试',
        description: 'API端点测试和文档生成',
        core: 'api'
      },
      {
        id: 'stress',
        name: '压力测试',
        description: '负载和压力测试',
        core: 'stress'
      },
      {
        id: 'seo',
        name: 'SEO测试',
        description: '搜索引擎优化检查',
        core: 'seo'
      },
      {
        id: 'website',
        name: '网站测试',
        description: '综合网站测试',
        core: 'website'
      },
      {
        id: 'accessibility',
        name: '可访问性测试',
        description: 'WCAG可访问性检查',
        core: 'accessibility'
      }
    ];
  }

  /**
   * 验证测试ID格式
   */
  validateTestId(testId) {
    const testIdSchema = Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(3).max(100);
    return testIdSchema.validate(testId);
  }

  /**
   * 验证用户权限
   */
  validateUserPermissions(user, testType) {
    if (!user) {
      return {
        error: new Error('用户身份验证失败'),
        value: null
      };
    }

    // 基础用户权限检查
    const restrictedTypes = ['stress', 'security'];
    if (restrictedTypes.includes(testType) && user.role === 'guest') {
      return {
        error: new Error('权限不足，需要注册用户权限'),
        value: null
      };
    }

    return { error: null, value: user };
  }

  /**
   * 清理和标准化配置
   */
  sanitizeConfig(config) {
    // 移除潜在的危险字段
    const dangerousFields = ['__proto__', 'constructor', 'prototype'];
    const sanitized = { ...config };
    
    dangerousFields.forEach(field => {
      delete sanitized[field];
    });

    // 标准化URL
    if (sanitized.url) {
      sanitized.url = sanitized.url.trim().toLowerCase();
      if (!sanitized.url.startsWith('http')) {
        sanitized.url = 'https://' + sanitized.url;
      }
    }

    return sanitized;
  }

  /**
   * 获取验证统计
   */
  getValidationStats() {
    return {
      totalSchemas: this.schemas.size,
      customValidators: this.customValidators.size,
      supportedTestTypes: this.getSupportedTestTypes().length
    };
  }
}

// 创建全局实例
const validationCore = new ValidationCore();

module.exports = {
  ValidationCore,
  validationCore
};
