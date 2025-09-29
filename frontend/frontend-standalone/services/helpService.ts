/**
 * helpService.ts - 业务服务层
 * 
 * 文件路径: frontend\services\helpService.ts
 * 创建时间: 2025-09-25
 */

interface FAQFeedback {
  faqId: string;
  isHelpful: boolean;
  userId?: string;
}

interface FeedbackSubmission {
  type: 'bug' | 'feature' | 'improvement' | 'question';
  title: string;
  description: string;
  email: string;
  priority: 'low' | 'medium' | 'high';
  userId?: string;
}

interface SearchResult {
  id: string;
  type: 'faq' | 'guide' | 'video' | 'download';
  title: string;
  description: string;
  relevance: number;
  url?: string;
}

interface DownloadRequest {
  resourceId: string;
  userId?: string;
}

class HelpService {
  private baseUrl = '/api/help';

  // 搜索帮助内容
  async searchContent(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('搜索失败');
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
      const response = await fetch(`${this.baseUrl}/faq/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error('反馈提交失败');
      }
    } catch (error) {
      console.error('提交FAQ反馈失败:', error);
      throw error;
    }
  }

  // 提交用户反馈
  async submitFeedback(feedback: FeedbackSubmission): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error('反馈提交失败');
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      throw error;
    }
  }

  // 记录下载
  async recordDownload(request: DownloadRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('下载记录失败');
      }

      const result = await response.json();
      return result.downloadUrl;
    } catch (error) {
      console.error('记录下载失败:', error);
      throw error;
    }
  }

  // 获取FAQ统计
  async getFAQStats(faqId: string): Promise<{ helpful: number; notHelpful: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/faq/${faqId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('获取FAQ统计失败');
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
      const response = await fetch(`${this.baseUrl}/video/${videoId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('记录视频观看失败');
      }
    } catch (error) {
      console.error('记录视频观看失败:', error);
      throw error;
    }
  }

  // 获取热门搜索关键词
  async getPopularSearchTerms(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/popular`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('获取热门搜索失败');
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
      const response = await fetch(`${this.baseUrl}/preferences`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('获取用户偏好失败');
      }

      return await response.json();
    } catch (error) {
      console.error('获取用户偏好失败:', error);
      return {};
    }
  }

  // 更新用户帮助偏好
  async updateUserPreferences(preferences: unknown): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('更新用户偏好失败');
      }
    } catch (error) {
      console.error('更新用户偏好失败:', error);
      throw error;
    }
  }
}

export const helpService = new HelpService();
export type { FAQFeedback, FeedbackSubmission, SearchResult, DownloadRequest };
