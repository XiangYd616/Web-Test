/**
 * 扩展的API测试类型定义
 * 补充实际使用中需要但未在标准类型中定义的属性
 */

/** 安全问题 */
export interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  message?: string;
  recommendation?: string;
}

/** 性能问题 */
export interface PerformanceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description?: string;
  message?: string;
  recommendation?: string;
}

/** 响应时间分布 */
export interface ResponseTimeDistribution {
  fast: number;    // <200ms
  medium: number;  // 200-1000ms
  slow: number;    // >1000ms
}

/** 性能指标 */
export interface PerformanceMetrics {
  successRate: number;
  throughput: number;
  responseTimeDistribution?: ResponseTimeDistribution;
  averageResponseTime?: number;
}

/** 响应分析 */
export interface ResponseAnalysis {
  contentType: string;
  size?: number;
  encoding?: string;
}

/** 错误诊断 */
export interface ErrorDiagnosis {
  suggestion: string;
  troubleshooting?: string[];
  category?: string;
}

/** 扩展的端点结果 */
export interface ExtendedEndpointResult {
  // 基础属性
  name: string;
  method: string;
  path?: string;
  url?: string;
  status: 'pass' | 'fail' | 'passed' | 'failed' | 'skipped';
  statusCode: number;
  responseTime: number;
  responseSize?: number;
  retryCount?: number;
  
  // 性能相关
  performanceCategory?: 'excellent' | 'good' | 'fair' | 'poor';
  performanceIssues?: (PerformanceIssue | string)[];
  
  // 安全相关
  securityIssues?: (SecurityIssue | string)[];
  
  // 验证相关
  validationErrors?: string[];
  
  // 错误相关
  error?: string;
  errorDiagnosis?: ErrorDiagnosis;
  
  // 分析相关
  responseAnalysis?: ResponseAnalysis;
  
  // 其他
  [key: string]: any;
}

/** 扩展的API测试结果 */
export interface ExtendedAPITestResult {
  // 基础统计
  overallScore?: number;
  passedTests?: number;
  failedTests?: number;
  totalTests?: number;
  averageResponseTime?: number;
  
  // 性能指标
  performanceMetrics?: PerformanceMetrics;
  
  // 安全问题
  securityIssues?: (SecurityIssue | string)[];
  
  // 端点结果
  endpointResults?: ExtendedEndpointResult[];
  endpoints?: ExtendedEndpointResult[];
  
  // 其他
  success?: boolean;
  successRate?: number;
  score?: number;
  totalTime?: number;
  duration?: number;
  
  [key: string]: any;
}

/** 类型守卫 - 检查是否为安全问题对象 */
export function isSecurityIssue(issue: unknown): issue is SecurityIssue {
  return typeof issue === 'object' && issue !== null && 'type' in issue;
}

/** 类型守卫 - 检查是否为性能问题对象 */
export function isPerformanceIssue(issue: unknown): issue is PerformanceIssue {
  return typeof issue === 'object' && issue !== null && 'type' in issue;
}

/** 辅助函数 - 安全地获取问题描述 */
export function getIssueDescription(issue: unknown): string {
  if (typeof issue === 'string') {
    return issue;
  }
  if (isSecurityIssue(issue) || isPerformanceIssue(issue)) {
    return issue.description || issue.message || '未知问题';
  }
  return '未知问题';
}

/** 辅助函数 - 安全地获取问题类型 */
export function getIssueType(issue: unknown): string {
  if (typeof issue === 'string') {
    return '通用问题';
  }
  if (isSecurityIssue(issue) || isPerformanceIssue(issue)) {
    return issue.type;
  }
  return '未知类型';
}

