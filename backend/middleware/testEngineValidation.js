/**
 * 🔍 统一测试引擎专用验证中间件
 * 基于Joi最佳实践，为统一测试引擎提供严格的配置验证
 */

const Joi = require('joi');

// 测试类型枚举
const TEST_TYPES = [
  'performance',
  'security',
  'api',
  'stress',
  'database',
  'network',
  'ux',
  'seo',
  'compatibility',
  'website'
];

/**
 * 基础URL验证Schema
 */
const urlSchema = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .required()
  .messages({
    'string.uri': '请输入有效的URL地址',
    'any.required': 'URL地址是必需的'
  });

/**
 * 性能测试配置验证Schema
 */
const performanceConfigSchema = Joi.object({
  url: urlSchema,
  device: Joi.string().valid('desktop', 'mobile').default('desktop'),
  locale: Joi.string().default('zh-CN'),
  throttling: Joi.string().valid('simulated3G', 'applied3G', 'applied4G', 'none').default('simulated3G'),
  categories: Joi.array().items(
    Joi.string().valid('performance', 'accessibility', 'best-practices', 'seo')
  ).default(['performance']),
  checkCoreWebVitals: Joi.boolean().default(true),
  checkPageSpeed: Joi.boolean().default(true),
  checkResources: Joi.boolean().default(true),
  checkCaching: Joi.boolean().default(true)
}).required();

/**
 * 安全测试配置验证Schema
 */
const securityConfigSchema = Joi.object({
  url: urlSchema,
  checkSSL: Joi.boolean().default(true),
  checkHeaders: Joi.boolean().default(true),
  checkVulnerabilities: Joi.boolean().default(true),
  checkCookies: Joi.boolean().default(true),
  scanDepth: Joi.number().integer().min(1).max(5).default(3),
  timeout: Joi.number().integer().min(5000).max(60000).default(30000)
}).required();

/**
 * API端点验证Schema
 */
const apiEndpointSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS').default('GET'),
  path: Joi.string().required(),
  url: Joi.string().uri().optional(),
  expectedStatus: Joi.array().items(Joi.number().integer().min(100).max(599)).default([200]),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  body: Joi.any().optional(),
  params: Joi.object().optional(),
  maxResponseTime: Joi.number().integer().min(100).max(30000).optional(),
  expectedContentType: Joi.string().optional(),
  description: Joi.string().optional(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  tags: Joi.array().items(Joi.string()).default([])
});

/**
 * API测试配置验证Schema
 */
const apiConfigSchema = Joi.object({
  baseUrl: urlSchema,
  endpoints: Joi.array().items(apiEndpointSchema).min(1).required(),
  timeout: Joi.number().integer().min(1000).max(60000).default(10000),
  retries: Joi.number().integer().min(0).max(10).default(3),
  concurrency: Joi.number().integer().min(1).max(20).default(5),
  validateSchema: Joi.boolean().default(true),
  testSecurity: Joi.boolean().default(false),
  testPerformance: Joi.boolean().default(false),
  testReliability: Joi.boolean().default(true),
  followRedirects: Joi.boolean().default(true),
  validateSSL: Joi.boolean().default(true),
  generateDocumentation: Joi.boolean().default(false),
  authentication: Joi.object({
    type: Joi.string().valid('none', 'bearer', 'basic', 'apikey').default('none'),
    token: Joi.string().when('type', { is: 'bearer', then: Joi.required() }),
    username: Joi.string().when('type', { is: 'basic', then: Joi.required() }),
    password: Joi.string().when('type', { is: 'basic', then: Joi.required() }),
    apiKey: Joi.string().when('type', { is: 'apikey', then: Joi.required() }),
    headerName: Joi.string().when('type', { is: 'apikey', then: Joi.string().default('X-API-Key') })
  }).default({ type: 'none' }),
  globalHeaders: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      value: Joi.string().required(),
      enabled: Joi.boolean().default(true)
    })
  ).default([])
}).required();

/**
 * 压力测试配置验证Schema
 */
const stressConfigSchema = Joi.object({
  url: urlSchema,
  users: Joi.number().integer().min(1).max(1000).required(),
  duration: Joi.number().integer().min(10).max(3600).required(),
  testType: Joi.string().valid('load', 'stress', 'spike', 'volume').default('load'),
  rampUpTime: Joi.number().integer().min(0).max(300).default(10),
  requestsPerSecond: Joi.number().integer().min(1).max(1000).optional(),
  timeout: Joi.number().integer().min(1000).max(60000).default(10000),
  followRedirects: Joi.boolean().default(true),
  validateSSL: Joi.boolean().default(true)
}).required();

/**
 * 数据库测试配置验证Schema
 */
const databaseConfigSchema = Joi.object({
  connectionString: Joi.string().required().messages({
    'any.required': '数据库连接字符串是必需的',
    'string.empty': '数据库连接字符串不能为空'
  }),
  testType: Joi.string().valid('connection', 'performance', 'security', 'comprehensive').default('comprehensive'),
  timeout: Joi.number().integer().min(5000).max(300000).default(30000),
  maxConnections: Joi.number().integer().min(1).max(100).default(10),
  queryTimeout: Joi.number().integer().min(1000).max(60000).default(5000),
  includePerformanceTests: Joi.boolean().default(true),
  includeSecurityTests: Joi.boolean().default(true),
  customQueries: Joi.array().items(Joi.string()).default([])
}).required();

/**
 * 配置Schema映射
 */
const configSchemas = {
  performance: performanceConfigSchema,
  security: securityConfigSchema,
  api: apiConfigSchema,
  stress: stressConfigSchema,
  database: databaseConfigSchema,
  // 其他测试类型使用基础Schema
  network: Joi.object({ url: urlSchema }).required(),
  ux: Joi.object({ url: urlSchema }).required(),
  seo: Joi.object({ url: urlSchema }).required(),
  compatibility: Joi.object({ url: urlSchema }).required(),
  website: Joi.object({ url: urlSchema }).required()
};

/**
 * 测试执行请求验证Schema
 */
const testExecutionSchema = Joi.object({
  testType: Joi.string().valid(...TEST_TYPES).required().messages({
    'any.only': `测试类型必须是以下之一: ${TEST_TYPES.join(', ')}`,
    'any.required': '测试类型是必需的'
  }),
  config: Joi.object().required().messages({
    'any.required': '测试配置是必需的'
  }),
  options: Joi.object({
    testId: Joi.string().optional(),
    priority: Joi.string().valid('low', 'normal', 'high').default('normal'),
    timeout: Joi.number().integer().min(10000).max(300000).optional(),
    retries: Joi.number().integer().min(0).max(5).default(0),
    tags: Joi.array().items(Joi.string()).default([]),
    metadata: Joi.object().optional()
  }).default({})
}).required();

/**
 * 验证测试配置中间件
 */
const validateTestConfig = async (req, res, next) => {
  try {
    // 首先验证基础请求结构
    const { error: baseError, value: baseValue } = testExecutionSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (baseError) {
      return res.status(400).json({
        success: false,
        error: '请求验证失败',
        details: baseError.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }

    // 获取测试类型特定的配置Schema
    const { testType, config } = baseValue;
    const configSchema = configSchemas[testType];

    if (!configSchema) {
      return res.status(400).json({
        success: false,
        error: '不支持的测试类型',
        message: `测试类型 "${testType}" 暂不支持`
      });
    }

    // 验证测试类型特定的配置
    const { error: configError, value: validatedConfig } = configSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (configError) {
      return res.status(400).json({
        success: false,
        error: '配置验证失败',
        testType,
        details: configError.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          allowedValues: detail.context?.valids
        }))
      });
    }

    // 将验证后的数据设置回请求对象
    req.body = {
      ...baseValue,
      config: validatedConfig
    };

    // 添加验证元数据
    req.validationMeta = {
      testType,
      configSchema: configSchema.describe(),
      validatedAt: new Date().toISOString()
    };

    next();

  } catch (error) {
    console.error('验证中间件错误:', error);
    res.status(500).json({
      success: false,
      error: '验证过程中发生错误',
      message: error.message
    });
  }
};

/**
 * 验证测试ID参数中间件
 */
const validateTestId = (req, res, next) => {
  const { testId } = req.params;

  const schema = Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(10)
    .max(50)
    .required();

  const { error } = schema.validate(testId);

  if (error) {
    return res.status(400).json({
      success: false,
      error: '无效的测试ID',
      message: '测试ID必须是10-50位的字母数字字符串'
    });
  }

  next();
};

/**
 * 获取测试类型的配置Schema描述
 */
const getConfigSchemaDescription = (testType) => {
  const schema = configSchemas[testType];
  if (!schema) {
    return null;
  }

  return schema.describe();
};

/**
 * 验证配置对象（用于API文档生成）
 */
const validateConfigOnly = (testType, config) => {
  const schema = configSchemas[testType];
  if (!schema) {
    return {
      isValid: false,
      error: `不支持的测试类型: ${testType}`
    };
  }

  const { error, value } = schema.validate(config, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  return {
    isValid: !error,
    error: error ? error.details : null,
    value
  };
};

/**
 * 通用验证错误处理器
 */
const handleValidationError = (error, req, res, next) => {
  if (error.isJoi) {
    return res.status(400).json({
      success: false,
      error: '数据验证失败',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
    });
  }

  next(error);
};

module.exports = {
  validateTestConfig,
  validateTestId,
  handleValidationError,
  getConfigSchemaDescription,
  validateConfigOnly,
  configSchemas,
  TEST_TYPES
};
