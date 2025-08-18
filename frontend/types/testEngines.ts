/**
 * 测试引擎统一类型定义
 * 为所有测试引擎提供一致的接口和数据结构
 * 版本: v1.0.0
 */

import type { TestPriority  } from './enums';// 定义缺失的基础类型
export type UUID   = string;export type URL   = string;export interface BaseTestConfig     {
  // 基础测试配置
}

export interface BaseTestResult     {
  // 基础测试结果
}

export interface TestError     {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical'
  line?: number;
  column?: number;
}

export interface TestWarning     {
  code: string;
  message: string;
  severity: 'info' | 'warning'
  suggestion?: string;
}

export interface TestRecommendation     {
  id: string;
  title: string;
  description: string;
  priority: TestPriority;
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  category: string;
}

// ==================== SEO 测试类型 ====================

export interface SEOTestConfig extends BaseTestConfig     {
  includeImages?: boolean;
  checkInternalLinks?: boolean;
  checkExternalLinks?: boolean;
  analyzeContent?: boolean;
  checkStructuredData?: boolean;
  mobileOptimization?: boolean;
  socialMediaTags?: boolean;
}

export interface SEOTestResult extends BaseTestResult     {
  testType: 'seo'
  seoScore: number;
  metaTags: MetaTagsAnalysis;
  headings: HeadingAnalysis;
  images: ImageAnalysis;
  links: LinkAnalysis;
  content: ContentAnalysis;
  structuredData: StructuredDataAnalysis;
  socialMedia: SocialMediaAnalysis;
  mobile: MobileOptimizationAnalysis;
}

export interface MetaTagsAnalysis     {
  title: { present: boolean; length: number; content?: string; };
  description: { present: boolean; length: number; content?: string; };
  keywords: { present: boolean; content?: string; };
  robots: { present: boolean; content?: string; };
  canonical: { present: boolean; url?: string; };
  openGraph: Record<string, any>;
  twitterCard: Record<string, any>;
}

export interface HeadingAnalysis     {
  h1Count: number;
  h1Content: string[];
  structure: Array<{ level: number; text: string; }>;
  issues: string[];
}

export interface ImageAnalysis     {
  totalImages: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  largeImages: number;
  optimizationSuggestions: string[];
}

export interface LinkAnalysis     {
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: number;
  noFollowLinks: number;
  issues: string[];
}

export interface ContentAnalysis     {
  wordCount: number;
  readabilityScore: number;
  keywordDensity: Record<string, number>;
  duplicateContent: boolean;
  contentQuality: 'poor' | 'fair' | 'good' | 'excellent'
}

export interface StructuredDataAnalysis     {
  present: boolean;
  types: string[];
  errors: string[];
  warnings: string[];
}

export interface SocialMediaAnalysis     {
  openGraph: { present: boolean; complete: boolean; };
  twitterCard: { present: boolean; complete: boolean; };
  facebookPixel: boolean;
  googleAnalytics: boolean;
}

export interface MobileOptimizationAnalysis     {
  responsive: boolean;
  viewportMeta: boolean;
  mobileSpeed: number;
  touchTargets: boolean;
  fontSizes: boolean;
}

// ==================== 性能测试类型 ====================

export interface PerformanceTestConfig extends BaseTestConfig     {
  device?: 'desktop' | 'mobile' | 'tablet'
  connection?: 'fast' | 'slow' | '3g' | '4g'
  location?: string;
  runs?: number;
  includeScreenshot?: boolean;
  includeVideo?: boolean;
  categories?: string[];
}

export interface PerformanceTestResult extends BaseTestResult     {
  testType: 'performance'
  performanceScore: number;
  coreWebVitals: CoreWebVitals;
  lighthouse: LighthouseMetrics;
  resources: ResourceAnalysis;
  opportunities: PerformanceOpportunity[];
  diagnostics: PerformanceDiagnostic[];
}

export interface CoreWebVitals     {
  lcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; };
  fid: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; };
  cls: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; };
  fcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; };
  ttfb: { value: number; rating: 'good' | 'needs-improvement' | 'poor'; };
}

export interface LighthouseMetrics     {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstMeaningfulPaint: number;
  speedIndex: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
}

export interface ResourceAnalysis     {
  totalSize: number;
  totalRequests: number;
  byType: Record<string, { size: number; count: number; }>;
  largestResources: Array<{ url: string; size: number; type: string; }>;
  unusedResources: Array<{ url: string; wastedBytes: number; }>;
}

export interface PerformanceOpportunity     {
  id: string;
  title: string;
  description: string;
  savings: number;
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
}

export interface PerformanceDiagnostic     {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error'
  details?: Record<string, any>;
}

// ==================== 安全测试类型 ====================

export interface SecurityTestConfig extends BaseTestConfig     {
  depth?: number;
  includeSubdomains?: boolean;
  checkSSL?: boolean;
  checkHeaders?: boolean;
  checkCookies?: boolean;
  scanType?: 'basic' | 'comprehensive'
  customChecks?: string[];
}

export interface SecurityTestResult extends BaseTestResult     {
  testType: 'security'
  securityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  vulnerabilities: SecurityVulnerability[];
  securityHeaders: SecurityHeaders;
  sslInfo: SSLInfo;
  cookieAnalysis: CookieAnalysis;
  contentSecurityPolicy: CSPAnalysis;
}

export interface SecurityVulnerability     {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string;
  description: string;
  impact: string;
  solution: string;
  cwe?: string;
  cvss?: number;
  evidence?: string[];
}

export interface SecurityHeaders     {
  contentSecurityPolicy: boolean;
  strictTransportSecurity: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  xXSSProtection: boolean;
  referrerPolicy: boolean;
  permissionsPolicy: boolean;
  expectCT: boolean;
}

export interface SSLInfo     {
  isSecure: boolean;
  protocol: string;
  cipher: string;
  validFrom: string;
  validTo: string;
  issuer: string;
  grade: string;
  vulnerabilities: string[];
  certificateChain: SSLCertificate[];
}

export interface SSLCertificate     {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprint: string;
}

export interface CookieAnalysis     {
  totalCookies: number;
  secureCookies: number;
  httpOnlyCookies: number;
  sameSiteCookies: number;
  issues: string[];
}

export interface CSPAnalysis     {
  present: boolean;
  directives: Record<string, string[]>;
  issues: string[];
  recommendations: string[];
}

// ==================== API 测试类型 ====================

export interface APITestConfig extends BaseTestConfig     {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  headers?: Record<string, string>;
  body?: any;
  authentication?: APIAuthentication;
  validateResponse?: boolean;
  expectedStatus?: number;
  expectedSchema?: any;
  followRedirects?: boolean;
}

export interface APIAuthentication     {
  type: 'none' | 'basic' | 'bearer' | 'apikey' | 'oauth2'
  credentials?: Record<string, string>;
}

export interface APITestResult extends BaseTestResult     {
  testType: 'api'
  method: string;
  statusCode: number;
  responseTime: number;
  responseSize: number;
  headers: Record<string, string>;
  body: any;
  validations: APIValidation[];
  performance: APIPerformanceMetrics;
}

export interface APIValidation     {
  type: string;
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

export interface APIPerformanceMetrics     {
  dnsLookup: number;
  tcpConnection: number;
  tlsHandshake: number;
  serverProcessing: number;
  contentTransfer: number;
  totalTime: number;
}

// ==================== 兼容性测试类型 ====================

export interface CompatibilityTestConfig extends BaseTestConfig     {
  browsers?: BrowserConfig[];
  devices?: DeviceConfig[];
  viewports?: ViewportConfig[];
  features?: string[];
  includeScreenshots?: boolean;
}

export interface BrowserConfig     {
  name: string;
  version: string;
  platform: string;
}

export interface DeviceConfig     {
  name: string;
  type: 'desktop' | 'tablet' | 'mobile'
  userAgent: string;
  viewport: { width: number; height: number; };
}

export interface ViewportConfig     {
  name: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface CompatibilityTestResult extends BaseTestResult     {
  testType: 'compatibility'
  overallScore: number;
  browserResults: BrowserTestResult[];
  deviceResults: DeviceTestResult[];
  responsiveResults: ResponsiveTestResult[];
  featureSupport: FeatureSupportResult[];
}

export interface BrowserTestResult     {
  browser: BrowserConfig;
  score: number;
  success: boolean;
  loadTime: number;
  errors: string[];
  warnings: string[];
  screenshot?: string;
  features: Record<string, boolean>;
}

export interface DeviceTestResult     {
  device: DeviceConfig;
  score: number;
  success: boolean;
  loadTime: number;
  layoutIssues: LayoutIssue[];
  touchIssues: TouchIssue[];
  screenshot?: string;
}

export interface ResponsiveTestResult     {
  viewport: ViewportConfig;
  score: number;
  layoutScore: number;
  readabilityScore: number;
  usabilityScore: number;
  issues: ResponsiveIssue[];
  screenshot?: string;
}

export interface FeatureSupportResult     {
  feature: string;
  supported: boolean;
  browserSupport: Record<string, boolean>;
  fallbackAvailable: boolean;
  impact: 'low' | 'medium' | 'high'
}

export interface LayoutIssue     {
  type: string;
  element: string;
  description: string;
  severity: 'low' | 'medium' | 'high'
}

export interface TouchIssue     {
  type: string;
  element: string;
  description: string;
  severity: 'low' | 'medium' | 'high'
}

export interface ResponsiveIssue     {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high'
  affectedElements: string[];
}

// ==================== 无障碍测试类型 ====================

export interface AccessibilityTestConfig extends BaseTestConfig     {
  level?: 'A' | 'AA' | 'AAA'
  categories?: string[];
  includeScreenshots?: boolean;
  checkKeyboard?: boolean;
  checkScreenReader?: boolean;
}

export interface AccessibilityTestResult extends BaseTestResult     {
  testType: 'accessibility'
  level: string;
  complianceLevel: 'poor' | 'fair' | 'good' | 'excellent'
  violations: AccessibilityViolation[];
  passes: AccessibilityPass[];
  summary: AccessibilitySummary;
}

export interface AccessibilityViolation     {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: AccessibilityNode[];
}

export interface AccessibilityPass     {
  id: string;
  description: string;
  help: string;
  nodes: AccessibilityNode[];
}

export interface AccessibilityNode     {
  html: string;
  target: string[];
  failureSummary?: string;
  any?: AccessibilityCheck[];
  all?: AccessibilityCheck[];
  none?: AccessibilityCheck[];
}

export interface AccessibilityCheck     {
  id: string;
  impact: string;
  message: string;
  data: any;
}

export interface AccessibilitySummary     {
  totalViolations: number;
  totalPasses: number;
  violationsByImpact: {
    minor: number;
    moderate: number;
    serious: number;
    critical: number;
  };
  complianceRate: number;
  testedElements: number;
}

// ==================== 压力测试类型 ====================

export interface StressTestConfig extends BaseTestConfig     {
  duration: number; // 秒
  concurrency: number;
  rampUp?: number;
  requestsPerSecond?: number;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>;
  body?: any;
  scenarios?: StressTestScenario[];
}

export interface StressTestScenario     {
  name: string;
  weight: number;
  steps: StressTestStep[];
}

export interface StressTestStep     {
  name: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  thinkTime?: number;
  assertions?: StressTestAssertion[];
}

export interface StressTestAssertion     {
  type: 'status' | 'response_time' | 'body_contains' | 'header_exists'
  value: any;
  operator?: 'equals' | 'less_than' | 'greater_than' | 'contains'
}

export interface StressTestResult extends BaseTestResult     {
  testType: 'stress'
  metrics: StressTestMetrics;
  errors: StressTestError[];
  summary: StressTestSummary;
  timeline: StressTestTimelinePoint[];
}

export interface StressTestMetrics extends Record<string, number>     {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  concurrentUsers: number;
}

export interface StressTestError     {
  timestamp: string;
  type: string;
  message: string;
  url: string;
  statusCode?: number;
  count: number;
}

export interface StressTestSummary     {
  passed: boolean;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  bottlenecks: string[];
}

export interface StressTestTimelinePoint     {
  timestamp: string;
  activeUsers: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
}

// ==================== 统一测试引擎接口 ====================

export type TestConfig   = | SEOTestConfig
  | PerformanceTestConfig
  | SecurityTestConfig
  | APITestConfig
  | CompatibilityTestConfig
  | AccessibilityTestConfig
  | StressTestConfig;export type TestResult   = | SEOTestResult
  | PerformanceTestResult
  | SecurityTestResult
  | APITestResult
  | CompatibilityTestResult
  | AccessibilityTestResult
  | StressTestResult;