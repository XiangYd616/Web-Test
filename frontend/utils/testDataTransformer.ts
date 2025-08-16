/**
 * 测试数据转换工具
 * 处理前后端数据格式不匹配问题
 */

export interface BackendTestRecord {
  id: string;
  session_id?: string;
  test_name: string;
  test_type: string;
  url: string;
  target_url?: string;
  status: string;
  overall_score?: number;
  score?: number;
  duration?: number;
  created_at: string;
  updated_at: string;
  config: string | object;
  results: string | object;
  total_issues?: number;
  critical_issues?: number;
  major_issues?: number;
  minor_issues?: number;
  start_time?: string;
  end_time?: string;
  grade?: string;
  environment?: string;
  tags?: string[];
  description?: string;
}

export interface FrontendTestResult {
  testId: string;
  testType: string;
  url: string;
  timestamp: string;
  totalTime: number;
  summary: {
    score: number;
    totalChecks?: number;
    passed?: number;
    failed?: number;
    warnings?: number;
    grade?: string;
  };
  checks?: Record<string, any>;
  config: any;
  status: 'completed' | 'failed' | 'running' | 'cancelled';
  metadata?: {
    environment?: string;
    tags?: string[];
    description?: string;
    startTime?: string;
    endTime?: string;
  };
}

export interface TestHistoryItem {
  id: string;
  testName: string;
  testType: string;
  url: string;
  status: 'completed' | 'failed' | 'running' | 'cancelled';
  score?: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
  config: any;
  results: any;
  summary?: {
    totalChecks?: number;
    passed?: number;
    failed?: number;
    warnings?: number;
    grade?: string;
  };
}

export class TestDataTransformer {
  /**
   * 转换后端测试记录为前端TestResult格式
   */
  static transformBackendToFrontend(backendRecord: BackendTestRecord): FrontendTestResult {
    const results = this.parseResults(backendRecord.results);
    const config = this.parseConfig(backendRecord.config);

    return {
      testId: backendRecord.id || backendRecord.session_id || '',
      testType: backendRecord.test_type,
      url: backendRecord.url || backendRecord.target_url || '',
      timestamp: backendRecord.created_at,
      totalTime: backendRecord.duration || this.calculateDuration(backendRecord.start_time, backendRecord.end_time),
      summary: {
        score: backendRecord.overall_score || backendRecord.score || 0,
        totalChecks: backendRecord.total_issues || this.calculateTotalChecks(results),
        passed: this.calculatePassedChecks(results),
        failed: (backendRecord.critical_issues || 0) + (backendRecord.major_issues || 0),
        warnings: backendRecord.minor_issues || 0,
        grade: backendRecord.grade
      },
      checks: this.extractChecks(results),
      config,
      status: this.normalizeStatus(backendRecord.status),
      metadata: {
        environment: backendRecord.environment,
        tags: backendRecord.tags,
        description: backendRecord.description,
        startTime: backendRecord.start_time,
        endTime: backendRecord.end_time
      }
    };
  }

  /**
   * 转换后端记录为历史项格式
   */
  static transformToHistoryItem(backendRecord: BackendTestRecord): TestHistoryItem {
    const results = this.parseResults(backendRecord.results);
    const config = this.parseConfig(backendRecord.config);

    return {
      id: backendRecord.id || backendRecord.session_id || '',
      testName: backendRecord.test_name || '未命名测试',
      testType: backendRecord.test_type,
      url: backendRecord.url || backendRecord.target_url || '',
      status: this.normalizeStatus(backendRecord.status),
      score: backendRecord.overall_score || backendRecord.score,
      duration: backendRecord.duration || this.calculateDuration(backendRecord.start_time, backendRecord.end_time),
      createdAt: backendRecord.created_at,
      updatedAt: backendRecord.updated_at,
      config,
      results,
      summary: {
        totalChecks: backendRecord.total_issues || this.calculateTotalChecks(results),
        passed: this.calculatePassedChecks(results),
        failed: (backendRecord.critical_issues || 0) + (backendRecord.major_issues || 0),
        warnings: backendRecord.minor_issues || 0,
        grade: backendRecord.grade
      }
    };
  }

  /**
   * 批量转换历史记录
   */
  static transformHistoryList(backendRecords: BackendTestRecord[]): TestHistoryItem[] {
    return backendRecords.map(record => this.transformToHistoryItem(record));
  }

  /**
   * 解析结果数据
   */
  private static parseResults(results: string | object): any {
    if (typeof results === 'string') {
      try {
        return JSON.parse(results);
      } catch (error) {
        console.warn('Failed to parse results JSON:', error);
        return {};
      }
    }
    return results || {};
  }

  /**
   * 解析配置数据
   */
  private static parseConfig(config: string | object): any {
    if (typeof config === 'string') {
      try {
        return JSON.parse(config);
      } catch (error) {
        console.warn('Failed to parse config JSON:', error);
        return {};
      }
    }
    return config || {};
  }

  /**
   * 标准化状态值
   */
  private static normalizeStatus(status: string): 'completed' | 'failed' | 'running' | 'cancelled' {
    const normalizedStatus = status?.toLowerCase();
    
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
      case 'passed':
        return 'completed';
      case 'failed':
      case 'error':
      case 'failure':
        return 'failed';
      case 'running':
      case 'pending':
      case 'in_progress':
        return 'running';
      case 'cancelled':
      case 'canceled':
      case 'aborted':
        return 'cancelled';
      default:
        return 'completed'; // 默认为完成状态
    }
  }

  /**
   * 计算测试持续时间
   */
  private static calculateDuration(startTime?: string, endTime?: string): number {
    if (!startTime || !endTime) return 0;
    
    try {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      return Math.max(0, end - start);
    } catch (error) {
      return 0;
    }
  }

  /**
   * 从结果中提取检查项
   */
  private static extractChecks(results: any): Record<string, any> {
    if (!results) return {};

    // 尝试不同的结果结构
    if (results.checks) return results.checks;
    if (results.tests) return results.tests;
    if (results.audits) return results.audits;
    
    // 如果结果本身就是检查项对象
    if (typeof results === 'object' && !Array.isArray(results)) {
      const checks: Record<string, any> = {};
      
      // 过滤出看起来像检查项的属性
      Object.keys(results).forEach(key => {
        const value = results[key];
        if (value && typeof value === 'object' && (value.status || value.score !== undefined)) {
          checks[key] = value;
        }
      });
      
      return checks;
    }

    return {};
  }

  /**
   * 计算总检查项数
   */
  private static calculateTotalChecks(results: any): number {
    const checks = this.extractChecks(results);
    return Object.keys(checks).length;
  }

  /**
   * 计算通过的检查项数
   */
  private static calculatePassedChecks(results: any): number {
    const checks = this.extractChecks(results);
    let passed = 0;

    Object.values(checks).forEach((check: any) => {
      if (check && (
        check.status === 'passed' ||
        check.status === 'success' ||
        (check.score !== undefined && check.score >= 80)
      )) {
        passed++;
      }
    });

    return passed;
  }

  /**
   * 转换测试类型显示名称
   */
  static getTestTypeDisplayName(testType: string): string {
    const typeNames: Record<string, string> = {
      'api': 'API测试',
      'performance': '性能测试',
      'security': '安全测试',
      'seo': 'SEO测试',
      'stress': '压力测试',
      'infrastructure': '基础设施测试',
      'ux': 'UX测试',
      'compatibility': '兼容性测试',
      'website': '网站综合测试'
    };

    return typeNames[testType] || testType;
  }

  /**
   * 获取状态显示信息
   */
  static getStatusDisplayInfo(status: string): { label: string; color: string; icon: string } {
    const statusInfo: Record<string, { label: string; color: string; icon: string }> = {
      'completed': { label: '已完成', color: 'text-green-600', icon: '✅' },
      'failed': { label: '失败', color: 'text-red-600', icon: '❌' },
      'running': { label: '运行中', color: 'text-blue-600', icon: '🔄' },
      'cancelled': { label: '已取消', color: 'text-gray-600', icon: '⏹️' }
    };

    return statusInfo[status] || { label: status, color: 'text-gray-600', icon: '❓' };
  }

  /**
   * 格式化分数显示
   */
  static formatScore(score?: number): string {
    if (score === undefined || score === null) return '-';
    return Math.round(score).toString();
  }

  /**
   * 格式化持续时间显示
   */
  static formatDuration(duration: number): string {
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}min`;
  }

  /**
   * 格式化日期显示
   */
  static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }
}

export default TestDataTransformer;
