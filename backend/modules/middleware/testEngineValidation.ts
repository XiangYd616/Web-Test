/**
 * 🔍 统一测试引擎专用验证中间件
 * 基于Joi最佳实践，为统一测试引擎提供严格的配置验证
 */

import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import { TEST_TYPES, type TestType } from '../constants/testTypes';
import { puppeteerPool } from '../engines/shared/services/PuppeteerPool';

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

const checkPuppeteerAvailable = () => puppeteerPool.isAvailable();

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
  checkCsrf: Joi.boolean().default(true),
  checkCors: Joi.boolean().default(true),
  checkContentSecurity: Joi.boolean().default(true),
  checkXss: Joi.boolean().default(false),
  checkSqlInjection: Joi.boolean().default(false),
  checkSensitiveInfo: Joi.boolean().default(true),
  enableDeepScan: Joi.boolean().default(false),
  enablePortScan: Joi.boolean().default(false),
  enableScreenshot: Joi.boolean().default(false),
  scanDepth: Joi.number().integer().min(1).max(5).default(3),
  timeout: Joi.number().integer().min(5000).max(120000).default(30000),
}).required();

/**
 * API端点验证Schema（批量测试时的端点列表项）
 */
const apiEndpointSchema = Joi.object({
  name: Joi.string().optional(),
  url: Joi.string().uri().required(),
  method: Joi.string()
    .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')
    .default('GET'),
  headers: Joi.object()
    .pattern(Joi.string(), Joi.alternatives(Joi.string(), Joi.number()))
    .optional(),
  body: Joi.any().optional(),
  assertions: Joi.array().optional(),
  variables: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
}).unknown(true);

/**
 * API测试配置验证Schema
 * 与 ApiTestEngine 实际接收的 ApiRunConfig 对齐
 */
const apiConfigSchema = Joi.object({
  url: Joi.string().uri().required(),
  method: Joi.string()
    .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS')
    .default('GET'),
  headers: Joi.object().optional(),
  body: Joi.any().optional(),
  endpoints: Joi.array().items(apiEndpointSchema).optional(),
  assertions: Joi.array().optional(),
  variables: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  request: Joi.object().optional(),
  followRedirects: Joi.boolean().default(true),
  timeout: Joi.number().integer().min(1000).max(120000).default(30000),
  userAgent: Joi.string().optional(),
})
  .unknown(true)
  .required();

/**
 * 兼容性测试配置验证Schema
 */
const compatibilityConfigSchema = Joi.object({
  url: urlSchema,
  browsers: Joi.array().items(Joi.object().unknown(true)).default([]),
  devices: Joi.array().items(Joi.object().unknown(true)).default([]),
  enableMatrix: Joi.boolean().default(true),
  featureDetection: Joi.boolean().default(true),
  realBrowser: Joi.boolean().default(false),
  captureScreenshot: Joi.boolean().default(false),
  timeout: Joi.number().integer().min(1000).max(120000).default(30000),
}).required();

/**
 * UX测试配置验证Schema
 */
const uxConfigSchema = Joi.object({
  url: urlSchema,
  confirmPuppeteer: Joi.boolean().valid(true).required(),
  iterations: Joi.number().min(1).default(3),
  sampleDelayMs: Joi.number().min(0).max(10000).default(500),
  cpuSlowdownMultiplier: Joi.number().min(1).max(6).default(1),
  network: Joi.object({
    downloadKbps: Joi.number().min(0),
    uploadKbps: Joi.number().min(0),
    latencyMs: Joi.number().min(0),
  }).default(undefined),
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
    .items(Joi.string().valid('performance', 'security', 'seo', 'accessibility', 'ux'))
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
  compatibility: compatibilityConfigSchema,
  ux: uxConfigSchema,
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
async function testEngineValidation(req: TestEngineRequest, res: Response, next: NextFunction) {
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
      StandardErrorCode.TEST_INVALID_TYPE,
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

  const requiresPuppeteer =
    testType === 'ux' ||
    (testType === 'compatibility' && Boolean((config as { realBrowser?: boolean }).realBrowser)) ||
    (testType === 'website' &&
      Array.isArray((config as { testTypes?: string[] }).testTypes) &&
      (config as { testTypes?: string[] }).testTypes?.includes('ux'));
  if (requiresPuppeteer) {
    const available = await checkPuppeteerAvailable();
    if (!available) {
      return res.error(
        StandardErrorCode.TEST_DEPENDENCY_MISSING,
        '测试依赖缺失，无法执行当前测试',
        { code: 'PUPPETEER_MISSING' },
        503
      );
    }
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
