
// ==================== 性能配置接口 ====================

export interface UnifiedPerformanceConfig {
  /** 检测级别 */
  level: 'basic' | 'standard' | 'comprehensive';

  /** 页面速度检测 */
  pageSpeed: boolean;

  /** Core Web Vitals检测 */
  coreWebVitals: boolean;

  /** 资源优化检测 */
  resourceOptimization: boolean;

  /** 缓存策略检测 */
  caching: boolean;

  /** 压缩优化检测 */
  compression: boolean;

  /** 图片优化检测 */
  imageOptimization: boolean;

  /** JavaScript优化检测 */
  javascriptOptimization: boolean;

  /** CSS优化检测 */
  cssOptimization: boolean;

  /** 移动端性能检测 */
  mobilePerformance: boolean;

  /** 设备类型 */
  device: 'desktop' | 'mobile' | 'both';

  /** 超时时间（秒） */
  timeout: number;

  /** 重试次数 */
  retries: number;
}

// ==================== 性能指标接口 ====================

export interface CoreWebVitals {
  /** 最大内容绘制时间 (ms) */
  lcp: number;

  /** 首次输入延迟 (ms) */
  fid: number;

  /** 累积布局偏移 */
  cls: number;

  /** 首次内容绘制时间 (ms) */
  fcp: number;

  /** 首次有意义绘制时间 (ms) */
  fmp: number;

  /** 速度指数 */
  speedIndex: number;

  /** 交互时间 (ms) */
  tti: number;
}

export interface PageSpeedMetrics {
  /** 页面加载时间 (ms) */
  loadTime: number;

  /** DOM内容加载时间 (ms) */
  domContentLoaded: number;

  /** 首字节时间 (ms) */
  ttfb: number;

  /** 页面大小 (bytes) */
  pageSize: number;

  /** 请求数量 */
  requestCount: number;

  /** 响应时间 (ms) */
  responseTime: number;

  /** 传输大小 (bytes) */
  transferSize: number;
}

export interface ResourceAnalysis {
  /** 图片资源分析 */
  images: {
    count: number;
    totalSize: number;
    unoptimized: number;
    missingAlt: number;
  };

  /** JavaScript资源分析 */
  javascript: {
    count: number;
    totalSize: number;
    blocking: number;
    unused: number;
  };

  /** CSS资源分析 */
  css: {
    count: number;
    totalSize: number;
    blocking: number;
    unused: number;
  };

  /** 字体资源分析 */
  fonts: {
    count: number;
    totalSize: number;
    webFonts: number;
  };
}

export interface CacheAnalysis {
  /** 缓存策略 */
  strategy: 'none' | 'basic' | 'advanced';

  /** 缓存命中率 */
  hitRate: number;

  /** 可缓存资源 */
  cacheable: {
    count: number;
    size: number;
  };

  /** 未缓存资源 */
  uncached: {
    count: number;
    size: number;
  };

  /** 缓存头分析 */
  headers: {
    cacheControl: boolean;
    etag: boolean;
    lastModified: boolean;
    expires: boolean;
  };
}

export interface CompressionAnalysis {
  /** 压缩类型 */
  type: 'none' | 'gzip' | 'brotli' | 'deflate';

  /** 压缩率 */
  ratio: number;

  /** 原始大小 (bytes) */
  originalSize: number;

  /** 压缩后大小 (bytes) */
  compressedSize: number;

  /** 可压缩资源 */
  compressible: {
    count: number;
    size: number;
  };

  /** 未压缩资源 */
  uncompressed: {
    count: number;
    size: number;
  };
}

// ==================== 性能测试结果接口 ====================

export interface PerformanceTestResult {
  /** 测试ID */
  testId: string;

  /** 测试URL */
  url: string;

  /** 测试时间戳 */
  timestamp: number;

  /** 测试配置 */
  config: UnifiedPerformanceConfig;

  /** 总体评分 (0-100) */
  overallScore: number;

  /** 性能等级 */
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

  /** Core Web Vitals */
  coreWebVitals?: CoreWebVitals;

  /** 页面速度指标 */
  pageSpeed?: PageSpeedMetrics;

  /** 资源分析 */
  resources?: ResourceAnalysis;

  /** 缓存分析 */
  cache?: CacheAnalysis;

  /** 压缩分析 */
  compression?: CompressionAnalysis;

  /** 移动端性能 */
  mobilePerformance?: {
    score: number;
    issues: string[];
    recommendations: string[];
  };

  /** 现代Web功能 */
  modernWebFeatures?: {
    score: number;
    features: Record<string, boolean>;
    recommendations: string[];
    modernityLevel: 'high' | 'medium' | 'low' | 'unknown';
  };

  /** 网络优化 */
  networkOptimization?: {
    score: number;
    issues: string[];
    recommendations: string[];
    metrics: Record<string, number>;
  };

  /** 第三方影响 */
  thirdPartyImpact?: {
    score: number;
    totalBlockingTime: number;
    scripts: Array<{
      url: string;
      blockingTime: number;
      impact: 'high' | 'medium' | 'low';
    }>;
    recommendations: string[];
  };

  /** 性能建议 */
  recommendations: PerformanceRecommendation[];

  /** 详细问题 */
  issues: PerformanceIssue[];

  /** 测试持续时间 (ms) */
  duration: number;

  /** 错误信息 */
  error?: string;
}

export interface PerformanceRecommendation {
  /** 建议类型 */
  type: 'critical' | 'important' | 'minor';

  /** 建议标题 */
  title: string;

  /** 建议描述 */
  description: string;

  /** 预期收益 */
  impact: 'high' | 'medium' | 'low';

  /** 实施难度 */
  difficulty: 'easy' | 'medium' | 'hard';

  /** 相关指标 */
  metrics: string[];
}

export interface PerformanceIssue {
  /** 问题类型 */
  type: 'speed' | 'size' | 'optimization' | 'caching' | 'compression';

  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** 问题描述 */
  description: string;

  /** 影响的指标 */
  affectedMetrics: string[];

  /** 修复建议 */
  solution: string;

  /** 相关资源 */
  resources?: string[];
}

// ==================== 性能测试进度接口 ====================

export interface PerformanceTestProgress {
  /** 当前阶段 */
  phase: 'initializing' | 'analyzing' | 'measuring' | 'optimizing' | 'reporting' | 'completed' | 'failed';

  /** 进度百分比 (0-100) */
  progress: number;

  /** 当前步骤描述 */
  currentStep: string;

  /** 预计剩余时间 (ms) */
  estimatedTimeRemaining?: number;

  /** 已完成的检测项 */
  completedChecks: string[];

  /** 当前检测项 */
  currentCheck?: string;

  /** 实时指标 */
  realTimeMetrics?: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
}

// ==================== 预设配置模板 ====================

export const PERFORMANCE_CONFIG_PRESETS: Record<string, UnifiedPerformanceConfig> = {
  basic: {
    level: 'basic',
    pageSpeed: true,
    coreWebVitals: false,
    resourceOptimization: false,
    caching: false,
    compression: false,
    imageOptimization: false,
    javascriptOptimization: false,
    cssOptimization: false,
    mobilePerformance: false,
    device: 'desktop',
    timeout: 30,
    retries: 1
  },

  standard: {
    level: 'standard',
    pageSpeed: true,
    coreWebVitals: true,
    resourceOptimization: true,
    caching: true,
    compression: true,
    imageOptimization: true,
    javascriptOptimization: false,
    cssOptimization: false,
    mobilePerformance: true,
    device: 'both',
    timeout: 60,
    retries: 2
  },

  comprehensive: {
    level: 'comprehensive',
    pageSpeed: true,
    coreWebVitals: true,
    resourceOptimization: true,
    caching: true,
    compression: true,
    imageOptimization: true,
    javascriptOptimization: true,
    cssOptimization: true,
    mobilePerformance: true,
    device: 'both',
    timeout: 120,
    retries: 3
  }
};

// ==================== 工具函数类型 ====================

export type PerformanceTestCallback = (progress: PerformanceTestProgress) => void;

export interface PerformanceTestOptions {
  /** 进度回调 */
  onProgress?: PerformanceTestCallback;

  /** 用户ID */
  userId?: string;

  /** 测试名称 */
  testName?: string;

  /** 是否保存结果 */
  saveResults?: boolean;
}
