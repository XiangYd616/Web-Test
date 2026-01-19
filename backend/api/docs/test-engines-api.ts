/**
 * 测试引擎API文档定义
 * OpenAPI 3.0规范
 */

interface TestRequest {
  url: string;
  testType: 'seo' | 'performance' | 'security' | 'api' | 'stress' | 'website' | 'accessibility';
  testName?: string;
  config?: Record<string, unknown>;
  options?: {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
    userAgent?: string;
    viewport?: {
      width: number;
      height: number;
    };
  };
}

interface TestResponse {
  success: boolean;
  testId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: TestResult;
  error?: string;
  timestamp: Date;
}

interface TestResult {
  testId: string;
  testType: string;
  url: string;
  score: number;
  status: 'pass' | 'fail' | 'warning';
  timestamp: Date;
  duration: number;
  summary: {
    overall: string;
    score: number;
    issues: number;
    warnings: number;
    passed: number;
  };
  details: {
    seo?: SEOResult;
    performance?: PerformanceResult;
    security?: SecurityResult;
    accessibility?: AccessibilityResult;
    api?: APIResult;
  };
  recommendations: Array<{
    type: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface SEOResult {
  title: string;
  description: string;
  h1: {
    present: boolean;
    optimized: boolean;
    content: string;
  };
  metaDescription: {
    present: boolean;
    optimized: boolean;
    length: number;
    content: string;
  };
  headings: {
    structure: Array<{
      level: number;
      text: string;
      optimized: boolean;
    }>;
    issues: string[];
  };
  images: {
    total: number;
    withAlt: number;
    optimized: number;
    issues: string[];
  };
  links: {
    internal: number;
    external: number;
    broken: number;
    issues: string[];
  };
  structuredData: {
    present: boolean;
    valid: boolean;
    types: string[];
  };
  socialTags: {
    openGraph: boolean;
    twitter: boolean;
    issues: string[];
  };
}

interface PerformanceResult {
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  webVitals: {
    lcp: {
      value: number;
      rating: 'good' | 'needs-improvement' | 'poor';
    };
    fid: {
      value: number;
      rating: 'good' | 'needs-improvement' | 'poor';
    };
    cls: {
      value: number;
      rating: 'good' | 'needs-improvement' | 'poor';
    };
    fcp: {
      value: number;
      rating: 'good' | 'needs-improvement' | 'poor';
    };
    ttfb: {
      value: number;
      rating: 'good' | 'needs-improvement' | 'poor';
    };
  };
  loading: {
    totalSize: number;
    resources: number;
    requests: number;
    domSize: number;
  };
  optimization: {
    minifiedCSS: boolean;
    minifiedJS: boolean;
    optimizedImages: boolean;
    compressionEnabled: boolean;
    cachingEnabled: boolean;
  };
}

interface SecurityResult {
  overall: {
    score: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  headers: {
    securityHeaders: Array<{
      name: string;
      present: boolean;
      value?: string;
      recommendation: string;
    }>;
    missingHeaders: string[];
  };
  vulnerabilities: {
    xss: {
      vulnerable: boolean;
      severity: 'low' | 'medium' | 'high';
      details: string[];
    };
    sqlInjection: {
      vulnerable: boolean;
      severity: 'low' | 'medium' | 'high';
      details: string[];
    };
    csrf: {
      vulnerable: boolean;
      severity: 'low' | 'medium' | 'high';
      details: string[];
    };
    directoryTraversal: {
      vulnerable: boolean;
      severity: 'low' | 'medium' | 'high';
      details: string[];
    };
  };
  ssl: {
    enabled: boolean;
    valid: boolean;
    protocol: string;
    issuer: string;
    expiresAt?: Date;
    issues: string[];
  };
}

interface AccessibilityResult {
  overall: {
    score: number;
    compliance: 'AA' | 'AAA' | 'non-compliant';
  };
  wcag: {
    level: 'A' | 'AA' | 'AAA';
    violations: Array<{
      principle: string;
      guideline: string;
      successCriterion: string;
      level: string;
      impact: 'minor' | 'moderate' | 'serious' | 'critical';
      description: string;
      elements: number;
    }>;
  };
  contrast: {
    issues: Array<{
      element: string;
      foreground: string;
      background: string;
      ratio: number;
      wcagLevel: 'AA' | 'AAA';
    }>;
  };
  images: {
    total: number;
    withAlt: number;
    missingAlt: number;
    decorativeAlt: number;
  };
  forms: {
    total: number;
    withLabels: number;
    missingLabels: number;
    withAriaLabels: number;
  };
  headings: {
    structure: Array<{
      level: number;
      text: string;
      hasContent: boolean;
    }>;
    issues: string[];
  };
  keyboard: {
    focusable: number;
    tabOrder: boolean;
    skipLinks: number;
    issues: string[];
  };
}

interface APIResult {
  overall: {
    score: number;
    status: 'healthy' | 'degraded' | 'unhealthy';
  };
  endpoints: Array<{
    method: string;
    path: string;
    status: number;
    responseTime: number;
    size: number;
    headers: Record<string, string>;
    body?: unknown;
  }>;
  performance: {
    averageResponseTime: number;
    slowestEndpoint: string;
    fastestEndpoint: string;
    throughput: number;
  };
  reliability: {
    successRate: number;
    errorRate: number;
    totalRequests: number;
    errors: Array<{
      endpoint: string;
      method: string;
      status: number;
      message: string;
    }>;
  };
  security: {
    authentication: boolean;
    authorization: boolean;
    https: boolean;
    rateLimiting: boolean;
    cors: boolean;
    issues: string[];
  };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     TestRequest:
 *       type: object
 *       required:
 *         - url
 *         - testType
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           description: 要测试的URL
 *           example: "https://example.com"
 *         testType:
 *           type: string
 *           enum: [seo, performance, security, api, stress, website, accessibility]
 *           description: 测试类型
 *           example: "seo"
 *         testName:
 *           type: string
 *           description: 测试名称
 *           example: "首页SEO测试"
 *         config:
 *           type: object
 *           description: 测试配置
 *           properties:
 *             depth:
 *               type: number
 *               description: 测试深度
 *               example: 3
 *             followLinks:
 *               type: boolean
 *               description: 是否跟踪链接
 *               example: true
 *         options:
 *           type: object
 *           description: 测试选项
 *           properties:
 *             timeout:
 *               type: number
 *               description: 超时时间(秒)
 *               example: 30
 *             retries:
 *               type: number
 *               description: 重试次数
 *               example: 3
 *             headers:
 *               type: object
 *               description: 自定义请求头
 *               example:
 *                 User-Agent: "TestWeb Bot"
 *             userAgent:
 *               type: string
 *               description: 用户代理
 *               example: "Mozilla/5.0"
 *             viewport:
 *               type: object
 *               description: 视口设置
 *               properties:
 *                 width:
 *                   type: number
 *                   example: 1920
 *                 height:
 *                   type: number
 *                   example: 1080
 *     TestResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 请求是否成功
 *         testId:
 *           type: string
 *           description: 测试ID
 *         status:
 *           type: string
 *           enum: [pending, running, completed, failed]
 *           description: 测试状态
 *         results:
 *           $ref: '#/components/schemas/TestResult'
 *         error:
 *           type: string
 *           description: 错误信息
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 时间戳
 *     TestResult:
 *       type: object
 *       properties:
 *         testId:
 *           type: string
 *           description: 测试ID
 *         testType:
 *           type: string
 *           description: 测试类型
 *         url:
 *           type: string
 *           description: 测试URL
 *         score:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: 测试分数
 *         status:
 *           type: string
 *           enum: [pass, fail, warning]
 *           description: 测试状态
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: 测试时间
 *         duration:
 *           type: number
 *           description: 测试耗时(毫秒)
 *         summary:
 *           type: object
 *           properties:
 *             overall:
 *               type: string
 *               description: 总体评价
 *             score:
 *               type: number
 *               description: 总体分数
 *             issues:
 *               type: number
 *               description: 问题数量
 *             warnings:
 *               type: number
 *               description: 警告数量
 *             passed:
 *               type: number
 *               description: 通过项目数
 *         details:
 *           type: object
 *           properties:
 *             seo:
 *               $ref: '#/components/schemas/SEOResult'
 *             performance:
 *               $ref: '#/components/schemas/PerformanceResult'
 *             security:
 *               $ref: '#/components/schemas/SecurityResult'
 *             accessibility:
 *               $ref: '#/components/schemas/AccessibilityResult'
 *             api:
 *               $ref: '#/components/schemas/APIResult'
 *         recommendations:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [error, warning, info]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 */
export default {
  TestRequest,
  TestResponse,
  TestResult,
  SEOResult,
  PerformanceResult,
  SecurityResult,
  AccessibilityResult,
  APIResult,
};
