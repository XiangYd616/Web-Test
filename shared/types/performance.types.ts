/**
 * performance.types.ts - 性能类型定义
 */

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  tti?: number; // Time to Interactive
  speedIndex?: number;
  loadTime?: number;
  domContentLoaded?: number;
}

export interface PerformanceBudget {
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
}

export interface PerformanceResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: PerformanceMetrics;
  issues?: PerformanceIssue[];
}

export interface PerformanceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation?: string;
}

