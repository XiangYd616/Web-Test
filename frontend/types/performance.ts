declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  interface PerformanceEntry {
    processingStart?: number;
    processingEnd?: number;
    renderStart?: number;
    renderEnd?: number;
  }

  interface PerformanceNavigationTiming {
    processingStart?: number;
    processingEnd?: number;
  }

  interface PerformanceResourceTiming {
    processingStart?: number;
    processingEnd?: number;
  }
}

export type Timestamp = string;
export type UUID = string;

export interface PerformanceConfig {
  url: string;
  testName?: string;
  description?: string;
  
  device?: "desktop" | "mobile" | "tablet";
  viewport?: {
    width: number;
    height: number;
  };
  
  throttling?: {
    type: "none" | "3g" | "4g" | "slow-3g" | "custom";
    downloadThroughput?: number;
    uploadThroughput?: number;
    latency?: number;
  };
  
  iterations?: number;
  timeout?: number;
  cacheDisabled?: boolean;
  
  lighthouse?: {
    categories?: Array<"performance" | "accessibility" | "best-practices" | "seo" | "pwa">;
    onlyCategories?: string[];
    skipAudits?: string[];
    locale?: string;
  };
  
  customMetrics?: string[];
  
  monitoring?: {
    realUserMonitoring?: boolean;
    syntheticMonitoring?: boolean;
    continuousMonitoring?: boolean;
  };
}

export interface CoreWebVitals {
  fcp?: number;
  lcp?: number;
  fid?: number;
  tti?: number;
  tbt?: number;
  cls?: number;
  ttfb?: number;
  si?: number;
}

export interface PerformanceMetrics extends CoreWebVitals {
  navigationTiming?: {
    navigationStart: number;
    unloadEventStart: number;
    unloadEventEnd: number;
    redirectStart: number;
    redirectEnd: number;
    fetchStart: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    connectStart: number;
    connectEnd: number;
    secureConnectionStart: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    domLoading: number;
    domInteractive: number;
    domContentLoadedEventStart: number;
    domContentLoadedEventEnd: number;
    domComplete: number;
    loadEventStart: number;
    loadEventEnd: number;
  };
  
  resourceTiming?: Array<{
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
    initiatorType: string;
    transferSize: number;
    encodedBodySize: number;
    decodedBodySize: number;
  }>;
  
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  
  customMetrics?: Record<string, number>;
}

export interface LighthouseResult {
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
    pwa: number;
  };
  
  audits: Record<string, {
    id: string;
    title: string;
    description: string;
    score: number | null;
    scoreDisplayMode: "binary" | "numeric" | "informative";
    displayValue?: string;
    details?: any;
  }>;
  
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savings: number;
    impact: "low" | "medium" | "high";
    details?: any;
  }>;
  
  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
    details?: any;
  }>;
}

export interface PerformanceTestResult {
  id: UUID;
  testId: UUID;
  url: string;
  testName?: string;
  timestamp: Timestamp;
  
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  
  metrics: PerformanceMetrics;
  lighthouse?: LighthouseResult;
  
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "F";
  
  recommendations: Array<{
    id: string;
    category: string;
    priority: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    impact: string;
    effort: "low" | "medium" | "high";
    savings?: {
      time?: number;
      bytes?: number;
      requests?: number;
    };
    resources?: Array<{
      title: string;
      url: string;
      type: "documentation" | "tutorial" | "tool";
    }>;
  }>;
  
  errors: Array<{
    code: string;
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    details?: any;
  }>;
  
  warnings: Array<{
    code: string;
    message: string;
    suggestion?: string;
    details?: any;
  }>;
  
  metadata: {
    device: string;
    userAgent: string;
    viewport: { width: number; height: number };
    throttling?: any;
    environment: "development" | "staging" | "production";
    version: string;
  };
}

export interface PerformanceMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  getCurrentMetrics(): PerformanceMetrics;
  onMetricUpdate(callback: (metrics: PerformanceMetrics) => void): void;
  onThresholdExceeded(callback: (metric: string, value: number, threshold: number) => void): void;
}

export interface PerformanceThresholds {
  fcp?: { good: number; needsImprovement: number };
  lcp?: { good: number; needsImprovement: number };
  fid?: { good: number; needsImprovement: number };
  cls?: { good: number; needsImprovement: number };
  ttfb?: { good: number; needsImprovement: number };
  tti?: { good: number; needsImprovement: number };
  si?: { good: number; needsImprovement: number };
  custom?: Record<string, { good: number; needsImprovement: number }>;
}

export const DEFAULT_PERFORMANCE_CONFIG: Partial<PerformanceConfig> = {
  device: "desktop",
  viewport: { width: 1920, height: 1080 },
  throttling: { type: "none" },
  iterations: 1,
  timeout: 30000,
  cacheDisabled: false,
  lighthouse: {
    categories: ["performance", "accessibility", "best-practices", "seo"]
  }
};

export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  fcp: { good: 1800, needsImprovement: 3000 },
  lcp: { good: 2500, needsImprovement: 4000 },
  fid: { good: 100, needsImprovement: 300 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  ttfb: { good: 800, needsImprovement: 1800 },
  tti: { good: 3800, needsImprovement: 7300 },
  si: { good: 3400, needsImprovement: 5800 }
};

export type PerformanceAnalyzer = {
  analyzeMetrics(metrics: PerformanceMetrics): {
    score: number;
    grade: string;
    issues: Array<{ metric: string; value: number; threshold: number; severity: string }>;
  };
  
  compareResults(baseline: PerformanceTestResult, current: PerformanceTestResult): {
    improvements: Array<{ metric: string; improvement: number; percentage: number }>;
    regressions: Array<{ metric: string; regression: number; percentage: number }>;
    summary: { better: number; worse: number; same: number };
  };
  
  generateRecommendations(result: PerformanceTestResult): Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
  }>;
};

// 类型不需要默认导出
