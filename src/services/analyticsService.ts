// 真实数据分析服务
export interface AnalyticsData {
  totalTests: number;
  avgPerformanceScore: number;
  securityIssues: number;
  accessibilityScore: number;
  trends: {
    performance: number;
    security: number;
    accessibility: number;
  };
  insights: AnalyticsInsight[];
  recommendations: SmartRecommendation[];
  coreWebVitals: {
    lcp: { value: number; rating: string; change: number };
    fid: { value: number; rating: string; change: number };
    cls: { value: number; rating: string; change: number };
  };
  testsByType?: Record<string, number>;
  timeRange?: string;
  lastUpdated?: string;
}

export interface AnalyticsInsight {
  id: string;
  type: 'performance' | 'security' | 'accessibility' | 'seo' | 'user-experience';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  impact: string;
  evidence: any[];
  relatedMetrics: string[];
  confidence: number;
}

export interface SmartRecommendation {
  id: string;
  category: 'performance' | 'security' | 'accessibility' | 'seo' | 'user-experience';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  solution: {
    steps: string[];
    estimatedEffort: 'low' | 'medium' | 'high';
    estimatedImpact: 'low' | 'medium' | 'high';
    resources: { title: string; url: string }[];
  };
  metrics: {
    currentValue: number;
    targetValue: number;
    potentialImprovement: number;
  };
  dependencies: string[];
  tags: string[];
}

export interface DetailedAnalysis {
  testId: string;
  url: string;
  testType: string;
  timestamp: string;
  duration: number;
  overallScore: number;
  results: any;
  insights: AnalyticsInsight[];
  recommendations: SmartRecommendation[];
  metrics: any;
}

export class AnalyticsService {
  private static readonly BASE_URL = '/api/test';

  // 获取分析数据
  static async getAnalytics(timeRange: string = '30d'): Promise<AnalyticsData> {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

      // 构建请求头，如果有token则添加认证头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.BASE_URL}/analytics?timeRange=${timeRange}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('用户认证失败，请重新登录');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // 处理后端返回的包装格式
      const data = result.success ? result.data : result;
      return this.transformAnalyticsData(data);

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw error;
    }
  }

  // 获取详细分析报告
  static async getDetailedAnalysis(testId: string): Promise<DetailedAnalysis> {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const response = await fetch(`${this.BASE_URL}/analytics/detailed/${testId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to fetch detailed analysis:', error);
      throw error;
    }
  }

  // 转换后端数据格式
  private static transformAnalyticsData(backendData: any): AnalyticsData {
    return {
      totalTests: backendData.totalTests || 0,
      avgPerformanceScore: backendData.avgPerformanceScore || 0,
      securityIssues: backendData.securityIssues || 0,
      accessibilityScore: backendData.accessibilityScore || 0,
      trends: {
        performance: backendData.trends?.performance || 0,
        security: backendData.trends?.security || 0,
        accessibility: backendData.trends?.accessibility || 0
      },
      insights: this.transformInsights(backendData.insights || []),
      recommendations: this.transformRecommendations(backendData.recommendations || []),
      coreWebVitals: {
        lcp: backendData.coreWebVitals?.lcp || { value: 2.5, rating: 'good', change: 0 },
        fid: backendData.coreWebVitals?.fid || { value: 100, rating: 'good', change: 0 },
        cls: backendData.coreWebVitals?.cls || { value: 0.1, rating: 'good', change: 0 }
      },
      testsByType: backendData.testsByType || {
        performance: backendData.totalTests ? Math.floor(backendData.totalTests * 0.4) : 0,
        security: backendData.totalTests ? Math.floor(backendData.totalTests * 0.2) : 0,
        accessibility: backendData.totalTests ? Math.floor(backendData.totalTests * 0.2) : 0,
        seo: backendData.totalTests ? Math.floor(backendData.totalTests * 0.2) : 0
      },
      timeRange: backendData.timeRange || '30d',
      lastUpdated: backendData.lastUpdated || new Date().toISOString()
    };
  }

  // 转换洞察数据
  private static transformInsights(insights: any[]): AnalyticsInsight[] {
    return insights.map(insight => ({
      id: insight.id || `insight-${Date.now()}`,
      type: insight.type || 'performance',
      severity: insight.severity || 'medium',
      title: insight.title || '未知洞察',
      description: insight.description || '',
      impact: insight.impact || '',
      evidence: insight.evidence || [],
      relatedMetrics: insight.relatedMetrics || [],
      confidence: insight.confidence || 50
    }));
  }

  // 转换建议数据
  private static transformRecommendations(recommendations: any[]): SmartRecommendation[] {
    return recommendations.map(rec => ({
      id: rec.id || `rec-${Date.now()}`,
      category: rec.category || 'performance',
      priority: rec.priority || 'medium',
      title: rec.title || '未知建议',
      description: rec.description || '',
      solution: {
        steps: rec.solution?.steps || [],
        estimatedEffort: rec.solution?.estimatedEffort || 'medium',
        estimatedImpact: rec.solution?.estimatedImpact || 'medium',
        resources: rec.solution?.resources || []
      },
      metrics: {
        currentValue: rec.metrics?.currentValue || 0,
        targetValue: rec.metrics?.targetValue || 0,
        potentialImprovement: rec.metrics?.potentialImprovement || 0
      },
      dependencies: rec.dependencies || [],
      tags: rec.tags || []
    }));
  }

  // 生成分析报告
  static async generateReport(testIds: string[]): Promise<Blob> {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const response = await fetch(`${this.BASE_URL}/analytics/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testIds })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();

    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  // 导出分析数据
  static async exportData(format: 'json' | 'csv' | 'excel', timeRange: string = '30d'): Promise<Blob> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const response = await fetch(`${this.BASE_URL}/analytics/export?format=${format}&timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();

    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  // 获取趋势数据
  static async getTrendData(metric: string, timeRange: string = '30d'): Promise<any[]> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const response = await fetch(`${this.BASE_URL}/analytics/trends?metric=${metric}&timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to fetch trend data:', error);
      throw error;
    }
  }

  // 获取比较数据
  static async getComparisonData(testId1: string, testId2: string): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('用户未登录');
      }

      const response = await fetch(`${this.BASE_URL}/analytics/compare?test1=${testId1}&test2=${testId2}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Failed to fetch comparison data:', error);
      throw error;
    }
  }
}
