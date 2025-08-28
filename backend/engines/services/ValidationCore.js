/**
 * 🔍 验证核心服务 (引擎内部版本)
 * 为统一测试引擎提供核心验证功能
 */

const Joi = require('joi');

/**
 * 验证核心类
 */
class ValidationCore {
  constructor() {
    this.schemas = new Map();
    this.initializeSchemas();
  }

  /**
   * 初始化验证Schema
   */
  initializeSchemas() {
    // URL验证Schema
    this.schemas.set('url', Joi.string().uri({
      scheme: ['http', 'https']
    }).required());

    // 测试类型验证Schema
    this.schemas.set('testType', Joi.string().valid(
      'performance', 'security', 'api', 'stress', 
      'database', 'network', 'ux', 'seo', 
      'compatibility', 'website'
    ).required());
  }

  /**
   * 验证测试配置
   */
  validateTestConfig(testType, config) {
    switch (testType) {
      case 'performance':
        return this.validatePerformanceConfig(config);
      case 'security':
        return this.validateSecurityConfig(config);
      case 'api':
        return this.validateApiConfig(config);
      case 'stress':
        return this.validateStressConfig(config);
      default:
        return this.validateBaseConfig(config);
    }
  }

  /**
   * 验证基础配置
   */
  validateBaseConfig(config) {
    const schema = Joi.object({
      url: this.schemas.get('url')
    });
    return schema.validate(config);
  }

  /**
   * 验证性能测试配置
   */
  validatePerformanceConfig(config) {
    const schema = Joi.object({
      url: this.schemas.get('url'),
      device: Joi.string().valid('desktop', 'mobile').default('desktop'),
      throttling: Joi.string().valid('none', 'simulated3G', 'applied3G', 'applied4G').default('simulated3G')
    });
    return schema.validate(config);
  }

  /**
   * 验证安全测试配置
   */
  validateSecurityConfig(config) {
    const schema = Joi.object({
      url: this.schemas.get('url'),
      scanDepth: Joi.number().integer().min(1).max(5).default(3),
      timeout: Joi.number().integer().min(10000).max(300000).default(30000)
    });
    return schema.validate(config);
  }

  /**
   * 验证API测试配置
   */
  validateApiConfig(config) {
    const schema = Joi.object({
      baseUrl: this.schemas.get('url'),
      endpoints: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE').required(),
        path: Joi.string().required()
      })).min(1).required()
    });
    return schema.validate(config);
  }

  /**
   * 验证压力测试配置
   */
  validateStressConfig(config) {
    const schema = Joi.object({
      url: this.schemas.get('url'),
      users: Joi.number().integer().min(1).max(1000).required(),
      duration: Joi.number().integer().min(10).max(3600).required(),
      testType: Joi.string().valid('load', 'stress', 'spike', 'volume').default('load')
    });
    return schema.validate(config);
  }

  /**
   * 获取支持的测试类型
   */
  getSupportedTestTypes() {
    return [
      { id: 'performance', name: '性能测试', core: 'performance' },
      { id: 'security', name: '安全测试', core: 'security' },
      { id: 'api', name: 'API测试', core: 'api' },
      { id: 'stress', name: '压力测试', core: 'stress' },
      { id: 'database', name: '数据库测试', core: 'database' },
      { id: 'network', name: '网络测试', core: 'network' },
      { id: 'ux', name: '用户体验测试', core: 'ux' },
      { id: 'seo', name: 'SEO测试', core: 'seo' },
      { id: 'compatibility', name: '兼容性测试', core: 'compatibility' },
      { id: 'website', name: '网站测试', core: 'website' }
    ];
  }
}

module.exports = ValidationCore;
