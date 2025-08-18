import type { DownloadRequest, FAQFeedback, FeedbackSubmission, SearchResult  } from '../types/common';class HelpService {
  // 监控和指标收集
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    errorsByType: new Map<string, number>()
  };
  
  private logSuccess(info: any): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    
    // 更新平均响应时间
    const responseTime = info.responseTime || 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }
  
  private logError(error: Error, context: any): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    
    const errorType = error.name || 'UnknownError'
    this.metrics.errorsByType.set(
      errorType, 
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );
    
    // 发送错误到监控系统
    this.sendErrorToMonitoring(error, context);
  }
  
  private logMetrics(info: any): void {
    // 记录请求指标
    console.debug('API Metrics: ', {
      url: info.url,
      method: info.method,
      status: info.status,
      responseTime: info.responseTime
    });
  }
  
  getMetrics(): any {
    return {
      ...this.metrics,
      errorsByType: Object.fromEntries(this.metrics.errorsByType),
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }
  private async retryRequest(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {>
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`请求失败，第${attempt}次重试:`, error.message);`
    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
  }
}
  }
  private baseUrl = "/api/help";``
  // 搜索帮助内容
  async searchContent(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {`
        method: "GET','`"`
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('搜索失败");"
      }

      return await response.json();
    } catch (error) {
      console.error('搜索内容失败:', error);
      throw error;
    }
  }

  // 提交FAQ反馈
  async submitFAQFeedback(feedback: FAQFeedback): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/faq/feedback`, {`
        method: "POST','`"`
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error('反馈提交失败");"
      }
    } catch (error) {
      console.error("提交FAQ反馈失败:', error);"
      throw error;
    }
  }

  // 提交用户反馈
  async submitFeedback(feedback: FeedbackSubmission): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/feedback`, {`
        method: "POST','`"`
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error('反馈提交失败");"
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      throw error;
    }
  }

  // 记录下载
  async recordDownload(request: DownloadRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/download`, {`
        method: "POST','`"`
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('下载记录失败");"
      }

      const result = await response.json();
      return result.downloadUrl;
    } catch (error) {
      console.error("记录下载失败:', error);"
      throw error;
    }
  }

  // 获取FAQ统计
  async getFAQStats(faqId: string): Promise<{ helpful: number; notHelpful: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/faq/${faqId}/stats`, {`
        method: "GET','`"`
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('获取FAQ统计失败");"
      }

      return await response.json();
    } catch (error) {
      console.error('获取FAQ统计失败:', error);
      throw error;
    }
  }

  // 获取视频观看统计
  async recordVideoView(videoId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/video/${videoId}/view`, {`
        method: "POST','`"`
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('记录视频观看失败");"
      }
    } catch (error) {
      console.error("记录视频观看失败:', error);"
      throw error;
    }
  }

  // 获取热门搜索关键词
  async getPopularSearchTerms(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/popular`, {`
        method: "GET','`"`
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('获取热门搜索失败");"
      }

      return await response.json();
    } catch (error) {
      console.error('获取热门搜索失败:', error);
      return [];
    }
  }

  // 获取用户帮助偏好
  async getUserPreferences(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/preferences`, {`
        method: "GET','`"`
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('获取用户偏好失败");"
      }

      return await response.json();
    } catch (error) {
      console.error("获取用户偏好失败:', error);"
      return {};
    }
  }

  // 更新用户帮助偏好
  async updateUserPreferences(preferences: any): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/preferences`, {`
        method: "PUT','`"`
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('更新用户偏好失败");"
      }
    } catch (error) {
      console.error('更新用户偏好失败:', error);
      throw error;
    }
  }
}

export const helpService = new HelpService();
export type { DownloadRequest, FAQFeedback, FeedbackSubmission, SearchResult };

