/**
 * 🔍 统一测试引擎专用验证中间件
 * 基于Joi最佳实践，为统一测试引擎提供严格的配置验证
 */

import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { StandardErrorCode } from '../../shared/types/standardApiResponse';
import { TEST_TYPES, type TestType } from '../constants/testTypes';

interface TestEngineRequest extends Request {
  body: {
    testType?: TestType;
    url?: string;
    [key: string]: unknown;
  };
}

interface ValidationResult {
  error?: {
    success: boolean;
    message: string;
    details: Joi.ValidationResult;
  };
  value?: Record<string, unknown>;
}

const respondValidationError = (res: Response, validationError: ValidationResult['error']) => {
  if (!validationError) {
    return res;
  }
  return res.error(
    StandardErrorCode.INVALID_INPUT,
    validationError.message,
    validationError.details ?? validationError,
    400
  );
};

/**
 * 基础URL验证Schema
 */
const urlSchema = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .required()
  .messages({
    'string.uri': '请输入有效的URL地址',
    'any.required': 'URL地址是必需的',
  });

/**
 * 性能测试配置验证Schema
 */
const performanceConfigSchema = Joi.object({
  url: urlSchema,
  device: Joi.string().valid('desktop', 'mobile').default('desktop'),
  locale: Joi.string().default('zh-CN'),
  throttling: Joi.string()
    .valid('simulated3G', 'applied3G', 'applied4G', 'none')
    .default('simulated3G'),
  categories: Joi.array()
    .items(Joi.string().valid('performance', 'accessibility', 'best-practices', 'seo'))
    .default(['performance']),
  checkCoreWebVitals: Joi.boolean().default(true),
  checkPageSpeed: Joi.boolean().default(true),
  checkResources: Joi.boolean().default(true),
  checkCaching: Joi.boolean().default(true),
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
  timeout: Joi.number().integer().min(5000).max(60000).default(30000),
}).required();

/**
 * API端点验证Schema
 */
const apiEndpointSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  method: Joi.string()
    .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')
    .default('GET'),
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
  tags: Joi.array().items(Joi.string()).default([]),
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
    headerName: Joi.string().when('type', {
      is: 'apikey',
      then: Joi.string().default('X-API-Key'),
    }),
  }).default({ type: 'none' }),
  globalHeaders: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().required(),
        value: Joi.string().required(),
        enabled: Joi.boolean().default(true),
      })
    )
    .default([]),
}).required();

/**
 * 压力测试配置验证Schema
 */
const stressConfigSchema = Joi.object({
  url: urlSchema,
  users: Joi.number().integer().min(1).max(1000).required(),
  duration: Joi.number().integer().min(10).max(3600).required(),
  testType: Joi.string().valid('load', 'stress', 'spike', 'volume').default('load'),
  rampUp: Joi.number().integer().min(1).max(300).default(60),
  thinkTime: Joi.number().integer().min(100).max(5000).default(1000),
  timeout: Joi.number().integer().min(5000).max(120000).default(30000),
  enableLogging: Joi.boolean().default(true),
  enableMetrics: Joi.boolean().default(true),
  enableScreenshots: Joi.boolean().default(false),
  customHeaders: Joi.object().default({}),
  cookies: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
        domain: Joi.string().optional(),
      })
    )
    .default([]),
}).required();

/**
 * SEO测试配置验证Schema
 */
const seoConfigSchema = Joi.object({
  url: urlSchema,
  language: Joi.string().default('zh-CN'),
  locale: Joi.string().default('zh-CN'),
  checkMobile: Joi.boolean().default(true),
  checkPerformance: Joi.boolean().default(true),
  checkAccessibility: Joi.boolean().default(true),
  checkBestPractices: Joi.boolean().default(true),
  checkSEO: Joi.boolean().default(true),
  checkPWA: Joi.boolean().default(false),
  customCategories: Joi.array().items(Joi.string()).default([]),
  customRules: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        weight: Joi.number().min(0).max(1).default(1),
        impact: Joi.string().valid('low', 'medium', 'high').default('medium'),
      })
    )
    .default([]),
}).required();

/**
 * 可访问性测试配置验证Schema
 */
const accessibilityConfigSchema = Joi.object({
  url: urlSchema,
  standards: Joi.array()
    .items(Joi.string().valid('WCAG2.1', 'WCAG2.2', 'SECTION508'))
    .default(['WCAG2.1']),
  level: Joi.string().valid('A', 'AA', 'AAA').default('AA'),
  checkColorContrast: Joi.boolean().default(true),
  checkKeyboardNavigation: Joi.boolean().default(true),
  checkScreenReaders: Joi.boolean().default(true),
  checkForms: Joi.boolean().default(true),
  checkImages: Joi.boolean().default(true),
  checkHeadings: Joi.boolean().default(true),
  checkLinks: Joi.boolean().default(true),
  checkTables: Joi.boolean().default(true),
  checkLists: Joi.boolean().default(true),
  checkIFrames: Joi.boolean().default(true),
  checkLanguage: Joi.boolean().default(true),
  checkZoom: Joi.boolean().default(true),
  customRules: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        severity: Joi.string().valid('error', 'warning', 'info').default('warning'),
      })
    )
    .default([]),
}).required();

/**
 * 网站测试配置验证Schema（综合测试）
 */
const websiteConfigSchema = Joi.object({
  url: urlSchema,
  testTypes: Joi.array()
    .items(Joi.string().valid('performance', 'security', 'seo', 'accessibility'))
    .default(['performance', 'security']),
  performanceOptions: performanceConfigSchema.optional(),
  securityOptions: securityConfigSchema.optional(),
  seoOptions: seoConfigSchema.optional(),
  accessibilityOptions: accessibilityConfigSchema.optional(),
  timeout: Joi.number().integer().min(10000).max(300000).default(60000),
  enableScreenshots: Joi.boolean().default(true),
  enableVideoRecording: Joi.boolean().default(false),
  enableConsoleLogging: Joi.boolean().default(true),
  enableNetworkLogging: Joi.boolean().default(false),
  customHeaders: Joi.object().default({}),
  cookies: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
        domain: Joi.string().optional(),
      })
    )
    .default([]),
}).required();

/**
 * 测试类型到Schema的映射
 */
const testTypeSchemas: Record<TestType, Joi.ObjectSchema> = {
  performance: performanceConfigSchema,
  security: securityConfigSchema,
  api: apiConfigSchema,
  stress: stressConfigSchema,
  seo: seoConfigSchema,
  website: websiteConfigSchema,
  accessibility: accessibilityConfigSchema,
};

/**
 * 验证测试配置
 */
function validateTestConfig(testType: TestType, config: unknown): ValidationResult {
  const schema = testTypeSchemas[testType];

  if (!schema) {
    const validationError = new Error(`Invalid test type: ${testType}`) as Joi.ValidationError;
    return {
      error: {
        success: false,
        message: `不支持的测试类型: ${testType}`,
        details: {
          error: validationError,
          value: config,
        },
      },
    };
  }

  const { error, value } = schema.validate(config, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    return {
      error: {
        success: false,
        message: '测试配置验证失败',
        details: error as unknown as Joi.ValidationResult,
      },
    };
  }

  return { value: value as Record<string, unknown> };
}

/**
 * 测试引擎验证中间件
 */
function testEngineValidation(req: TestEngineRequest, res: Response, next: NextFunction) {
  const { testType, ...config } = req.body;

  if (!testType) {
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      '测试类型是必需的',
      {
        code: 'MISSING_TEST_TYPE',
        details: {
          availableTypes: TEST_TYPES,
        },
      },
      400
    );
  }

  if (!TEST_TYPES.includes(testType)) {
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      `不支持的测试类型: ${testType}`,
      {
        code: 'INVALID_TEST_TYPE',
        details: {
          availableTypes: TEST_TYPES,
        },
      },
      400
    );
  }

  const validation = validateTestConfig(testType, config);

  if (validation.error) {
    return respondValidationError(res, validation.error);
  }

  const validatedValue = validation.value ?? {};
  // 将验证后的配置重新赋值到请求体
  req.body = {
    testType,
    ...validatedValue,
  };

  return next();
}

/**
 * 性能测试专用验证中间件
 */
function performanceTestValidation(req: Request, res: Response, next: NextFunction) {
  const validation = validateTestConfig('performance', req.body);

  if (validation.error) {
    return respondValidationError(res, validation.error);
  }

  req.body = validation.value ?? {};
  return next();
}

/**
 * 安全测试专用验证中间件
 */
function securityTestValidation(req: Request, res: Response, next: NextFunction) {
  const validation = validateTestConfig('security', req.body);

  if (validation.error) {
    return respondValidationError(res, validation.error);
  }

  req.body = validation.value ?? {};
  return next();
}

/**
 * API测试专用验证中间件
 */
function apiTestValidation(req: Request, res: Response, next: NextFunction) {
  const validation = validateTestConfig('api', req.body);

  if (validation.error) {
    return respondValidationError(res, validation.error);
  }

  req.body = validation.value ?? {};
  return next();
}

/**
 * 压力测试专用验证中间件
 */
function stressTestValidation(req: Request, res: Response, next: NextFunction) {
  const validation = validateTestConfig('stress', req.body);

  if (validation.error) {
    return respondValidationError(res, validation.error);
  }

  req.body = validation.value ?? {};
  return next();
}

/**
 * SEO测试专用验证中间件
 */
function seoTestValidation(req: Request, res: Response, next: NextFunction) {
  const validation = validateTestConfig('seo', req.body);

  if (validation.error) {
    return respondValidationError(res, validation.error);
  }

  req.body = validation.value ?? {};
  return next();
}

/**
 * 可访问性测试专用验证中间件
 */
function accessibilityTestValidation(req: Request, res: Response, next: NextFunction) {
  const validation = validateTestConfig('accessibility', req.body);

  if (validation.error) {
    return respondValidationError(res, validation.error);
  }

  req.body = validation.value ?? {};
  return next();
}

/**
 * 网站测试专用验证中间件
 */
function websiteTestValidation(req: Request, res: Response, next: NextFunction) {
  const validation = validateTestConfig('website', req.body);

  if (validation.error) {
    return respondValidationError(res, validation.error);
  }

  req.body = validation.value ?? {};
  return next();
}

/**
 * 批量测试验证中间件
 */
function batchTestValidation(req: Request, res: Response, next: NextFunction) {
  const { tests } = req.body as { tests?: unknown[] };

  if (!Array.isArray(tests) || tests.length === 0) {
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      '批量测试请求必须包含测试数组',
      { code: 'INVALID_BATCH_REQUEST' },
      400
    );
  }

  if (tests.length > 10) {
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      '批量测试最多支持10个测试',
      { code: 'BATCH_SIZE_EXCEEDED' },
      400
    );
  }

  const validationResults: Array<
    | ValidationResult
    | { index: number; error: { success: boolean; message: string; details: unknown } }
  > = tests.map((testConfig, index) => {
    const testType = (testConfig as { testType?: TestType }).testType;

    if (!testType || !TEST_TYPES.includes(testType)) {
      return {
        index,
        error: {
          success: false,
          message: `测试 ${index + 1}: 无效的测试类型`,
          details: testConfig,
        },
      };
    }

    return validateTestConfig(testType, testConfig);
  });

  const errors = validationResults.filter(result => result.error);

  if (errors.length > 0) {
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      '批量测试验证失败',
      {
        code: 'BATCH_VALIDATION_FAILED',
        details: errors,
      },
      400
    );
  }

  const validatedResults = validationResults.filter(
    (result): result is ValidationResult => !result.error
  );
  // 更新请求体，使用验证后的配置
  req.body.tests = validatedResults.map(result => result.value ?? {});

  return next();
}

/**
 * 条件验证中间件
 */
function conditionalValidation(condition: (req: Request) => boolean, testType: TestType) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      const validation = validateTestConfig(testType, req.body);

      if (validation.error) {
        return respondValidationError(res, validation.error);
      }

      req.body = validation.value ?? {};
    }

    return next();
  };
}

/**
 * 动态测试类型验证中间件
 */
function dynamicTestValidation(getTestType: (req: Request) => TestType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const testType = getTestType(req);
    const validation = validateTestConfig(testType, req.body);

    if (validation.error) {
      return respondValidationError(res, validation.error);
    }

    req.body = validation.value ?? {};
    return next();
  };
}

export {
  accessibilityTestValidation,
  apiTestValidation,
  batchTestValidation,
  conditionalValidation,
  dynamicTestValidation,
  performanceTestValidation,
  securityTestValidation,
  seoTestValidation,
  stressTestValidation,
  TEST_TYPES,
  testEngineValidation,
  testTypeSchemas,
  validateTestConfig,
  websiteTestValidation,
};

module.exports = {
  TEST_TYPES,
  testTypeSchemas,
  validateTestConfig,
  testEngineValidation,
  performanceTestValidation,
  securityTestValidation,
  apiTestValidation,
  stressTestValidation,
  seoTestValidation,
  accessibilityTestValidation,
  websiteTestValidation,
  batchTestValidation,
  conditionalValidation,
  dynamicTestValidation,
};
