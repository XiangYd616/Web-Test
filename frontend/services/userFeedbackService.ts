
// 反馈类型枚举
export enum FeedbackType {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  USABILITY_FEEDBACK = 'usability_feedback',
  PERFORMANCE_ISSUE = 'performance_issue',
  UI_UX_FEEDBACK = 'ui_ux_feedback',
  GENERAL_FEEDBACK = 'general_feedback'
}

// 页面类型枚举
export enum PageType {
  SEO_TEST = 'seo_test',
  SECURITY_TEST = 'security_test',
  PERFORMANCE_TEST = 'performance_test',
  STRESS_TEST = 'stress_test',
  DASHBOARD = 'dashboard',
  OTHER = 'other'
}

// 反馈严重程度
export enum FeedbackSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 用户反馈接口
export interface UserFeedback {
  id?: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  type: FeedbackType;
  severity: FeedbackSeverity;
  page: PageType;
  title: string;
  description: string;
  steps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  browserInfo: BrowserInfo;
  userAgent: string;
  url: string;
  screenshot?: string;
  additionalData?: any;
}

// 浏览器信息接口
export interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  screenResolution: string;
  viewport: string;
  language: string;
  timezone: string;
}

// 使用统计接口
export interface UsageStats {
  sessionId: string;
  userId?: string;
  timestamp: number;
  page: PageType;
  action: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
  additionalData?: any;
}

// 页面性能指标接口
export interface PagePerformanceMetrics {
  sessionId: string;
  page: PageType;
  timestamp: number;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage?: number;
  networkRequests: number;
}

export class UserFeedbackService {
  private static instance: UserFeedbackService;
  private feedbackQueue: UserFeedback[] = [];
  private usageStatsQueue: UsageStats[] = [];
  private performanceQueue: PagePerformanceMetrics[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceMonitoring();
    this.setupAutoSubmit();
  }

  static getInstance(): UserFeedbackService {
    if (!UserFeedbackService.instance) {
      UserFeedbackService.instance = new UserFeedbackService();
    }
    return UserFeedbackService.instance;
  }

  /**
   * 提交用户反馈
   */
  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'sessionId' | 'timestamp' | 'browserInfo' | 'userAgent' | 'url'>): Promise<void> {
    try {
      const completeFeedback: UserFeedback = {
        ...feedback,
        id: this.generateId(),
        sessionId: this.sessionId,
        timestamp: Date.now(),
        browserInfo: this.getBrowserInfo(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      this.feedbackQueue.push(completeFeedback);

      // 立即提交高优先级反馈
      if (feedback.severity === FeedbackSeverity.HIGH || feedback.severity === FeedbackSeverity.CRITICAL) {
        await this.submitQueuedFeedback();
      }

    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }

  /**
   * 记录使用统计
   */
  recordUsageStats(stats: Omit<UsageStats, 'sessionId' | 'timestamp'>): void {
    try {
      const completeStats: UsageStats = {
        ...stats,
        sessionId: this.sessionId,
        timestamp: Date.now()
      };

      this.usageStatsQueue.push(completeStats);
    } catch (error) {
      console.error('Failed to record usage stats:', error);
    }
  }

  /**
   * 记录页面性能指标
   */
  recordPagePerformance(page: PageType): void {
    try {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        const metrics: PagePerformanceMetrics = {
          sessionId: this.sessionId,
          page,
          timestamp: Date.now(),
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          largestContentfulPaint: 0, // 需要使用 PerformanceObserver 获取
          cumulativeLayoutShift: 0, // 需要使用 PerformanceObserver 获取
          firstInputDelay: 0, // 需要使用 PerformanceObserver 获取
          networkRequests: performance.getEntriesByType('resource').length
        };

        // 获取内存使用情况（如果支持）
        if ('memory' in performance) {
          metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
        }

        this.performanceQueue.push(metrics);
      }
    } catch (error) {
      console.error('Failed to record performance metrics:', error);
    }
  }

  /**
   * 快速反馈方法
   */
  quickFeedback(type: FeedbackType, page: PageType, message: string, severity: FeedbackSeverity = FeedbackSeverity.MEDIUM): void {
    this.submitFeedback({
      type,
      severity,
      page,
      title: `Quick ${type} feedback`,
      description: message
    });
  }

  /**
   * 报告错误
   */
  reportError(page: PageType, error: Error, additionalData?: any): void {
    this.submitFeedback({
      type: FeedbackType.BUG_REPORT,
      severity: FeedbackSeverity.HIGH,
      page,
      title: `Error: ${error.name}`,
      description: error.message,
      actualBehavior: error.stack,
      additionalData: {
        ...additionalData,
        errorName: error.name,
        errorStack: error.stack
      }
    });
  }

  /**
   * 获取浏览器信息
   */
  private getBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    // 检测浏览器
    if (ua.includes('Chrome')) {
      browserName = 'Chrome';
      browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari')) {
      browserName = 'Safari';
      browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edge')) {
      browserName = 'Edge';
      browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown';
    }

    // 检测操作系统
    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    return {
      name: browserName,
      version: browserVersion,
      os,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初始化性能监控
   */
  private initializePerformanceMonitoring(): void {
    // 监控页面加载性能
    if ('PerformanceObserver' in window) {
      try {
        // 监控 LCP
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // 监控 CLS
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // 监控 FID
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('Performance monitoring not fully supported:', error);
      }
    }
  }

  /**
   * 设置自动提交
   */
  private setupAutoSubmit(): void {
    // 每5分钟自动提交一次队列中的数据
    setInterval(() => {
      this.submitQueuedData();
    }, 5 * 60 * 1000);

    // 页面卸载时提交数据
    window.addEventListener('beforeunload', () => {
      this.submitQueuedData();
    });

    // 页面隐藏时提交数据
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.submitQueuedData();
      }
    });
  }

  /**
   * 提交队列中的反馈
   */
  private async submitQueuedFeedback(): Promise<void> {
    if (this.feedbackQueue.length === 0) return;

    try {
      // 这里应该调用实际的API端点

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 清空队列
      this.feedbackQueue = [];
    } catch (error) {
      console.error('Failed to submit feedback queue:', error);
    }
  }

  /**
   * 提交所有队列中的数据
   */
  private async submitQueuedData(): Promise<void> {
    try {
      await Promise.all([
        this.submitQueuedFeedback(),
        this.submitUsageStats(),
        this.submitPerformanceMetrics()
      ]);
    } catch (error) {
      console.error('Failed to submit queued data:', error);
    }
  }

  /**
   * 提交使用统计
   */
  private async submitUsageStats(): Promise<void> {
    if (this.usageStatsQueue.length === 0) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.usageStatsQueue = [];
    } catch (error) {
      console.error('Failed to submit usage stats:', error);
    }
  }

  /**
   * 提交性能指标
   */
  private async submitPerformanceMetrics(): Promise<void> {
    if (this.performanceQueue.length === 0) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.performanceQueue = [];
    } catch (error) {
      console.error('Failed to submit performance metrics:', error);
    }
  }
}

// 导出单例实例
export const userFeedbackService = UserFeedbackService.getInstance();
