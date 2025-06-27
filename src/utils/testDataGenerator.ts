import { format, subDays } from 'date-fns';

export interface TestRecord {
  id: string;
  url: string;
  testType: 'website' | 'security' | 'stress' | 'api';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  savedAt: string;
  overallScore?: number;
  scores?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    security?: number;
  };
  results?: any;
  error?: string;
}

/**
 * 生成测试数据用于演示
 */
export class TestDataGenerator {
  /**
   * 生成示例测试记录
   */
  static generateSampleTestRecords(count: number = 50): TestRecord[] {
    const records: TestRecord[] = [];
    const testTypes: Array<'website' | 'security' | 'stress' | 'api'> = ['website', 'security', 'stress', 'api'];
    const urls = [
      'https://www.google.com',
      'https://www.github.com',
      'https://www.stackoverflow.com',
      'https://www.npmjs.com',
      'https://www.mozilla.org',
      'https://www.w3.org',
      'https://developer.mozilla.org',
      'https://www.cloudflare.com'
    ];

    for (let i = 0; i < count; i++) {
      const testType = testTypes[Math.floor(Math.random() * testTypes.length)];
      const url = urls[Math.floor(Math.random() * urls.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const startTime = subDays(new Date(), daysAgo);
      const endTime = new Date(startTime.getTime() + Math.random() * 300000); // 0-5分钟后完成

      const record: TestRecord = {
        id: `test_${Date.now()}_${i}`,
        url,
        testType,
        status: Math.random() > 0.1 ? 'completed' : 'failed',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        savedAt: endTime.toISOString(),
        overallScore: Math.random() * 100,
        scores: this.generateScores(testType),
        results: this.generateResults(testType)
      };

      if (record.status === 'failed') {
        record.error = 'Network timeout';
        delete record.overallScore;
        delete record.scores;
      }

      records.push(record);
    }

    return records.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  /**
   * 根据测试类型生成分数
   */
  private static generateScores(testType: string) {
    switch (testType) {
      case 'website':
        return {
          performance: Math.random() * 100,
          accessibility: Math.random() * 100,
          bestPractices: Math.random() * 100,
          seo: Math.random() * 100
        };
      case 'security':
        return {
          security: Math.random() * 100
        };
      default:
        return {};
    }
  }

  /**
   * 根据测试类型生成结果
   */
  private static generateResults(testType: string) {
    switch (testType) {
      case 'website':
        return {
          metrics: {
            firstContentfulPaint: Math.random() * 3000,
            largestContentfulPaint: Math.random() * 5000,
            cumulativeLayoutShift: Math.random() * 0.3,
            timeToInteractive: Math.random() * 6000
          },
          opportunities: [
            { title: '优化图片', impact: 'High' },
            { title: '启用压缩', impact: 'Medium' }
          ]
        };
      case 'security':
        return {
          vulnerabilities: [
            { type: 'XSS', severity: 'Medium', count: Math.floor(Math.random() * 5) },
            { type: 'CSRF', severity: 'Low', count: Math.floor(Math.random() * 3) }
          ],
          headers: {
            'Content-Security-Policy': Math.random() > 0.5,
            'X-Frame-Options': Math.random() > 0.3,
            'X-XSS-Protection': Math.random() > 0.7
          }
        };
      case 'stress':
        return {
          requests: Math.floor(Math.random() * 10000) + 1000,
          duration: Math.floor(Math.random() * 300) + 60,
          avgResponseTime: Math.random() * 1000,
          errorRate: Math.random() * 10
        };
      case 'api':
        return {
          endpoints: Math.floor(Math.random() * 20) + 5,
          successRate: 90 + Math.random() * 10,
          avgResponseTime: Math.random() * 500
        };
      default:
        return {};
    }
  }

  /**
   * 保存测试数据到localStorage
   */
  static saveTestDataToLocalStorage(records: TestRecord[]): void {
    try {
      localStorage.setItem('test_results', JSON.stringify({
        success: true,
        data: records,
        timestamp: new Date().toISOString()
      }));
      console.log(`已保存 ${records.length} 条测试记录到本地存储`);
    } catch (error) {
      console.error('保存测试数据失败:', error);
    }
  }

  /**
   * 从localStorage加载测试数据
   */
  static loadTestDataFromLocalStorage(): TestRecord[] {
    try {
      const stored = localStorage.getItem('test_results');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.success && Array.isArray(data.data)) {
          return data.data;
        }
      }
    } catch (error) {
      console.error('加载测试数据失败:', error);
    }
    return [];
  }

  /**
   * 初始化示例数据
   */
  static initializeSampleData(): void {
    const existingData = this.loadTestDataFromLocalStorage();
    
    if (existingData.length === 0) {
      console.log('未找到现有测试数据，生成示例数据...');
      const sampleData = this.generateSampleTestRecords(100);
      this.saveTestDataToLocalStorage(sampleData);
      console.log('示例数据初始化完成');
    } else {
      console.log(`已加载 ${existingData.length} 条现有测试记录`);
    }
  }

  /**
   * 清除所有测试数据
   */
  static clearAllTestData(): void {
    try {
      localStorage.removeItem('test_results');
      localStorage.removeItem('monitoring_sites');
      localStorage.removeItem('generated_reports');
      console.log('所有测试数据已清除');
    } catch (error) {
      console.error('清除数据失败:', error);
    }
  }

  /**
   * 添加新的测试记录
   */
  static addTestRecord(record: Omit<TestRecord, 'id' | 'savedAt'>): TestRecord {
    const newRecord: TestRecord = {
      ...record,
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      savedAt: new Date().toISOString()
    };

    const existingData = this.loadTestDataFromLocalStorage();
    existingData.unshift(newRecord);
    this.saveTestDataToLocalStorage(existingData);

    return newRecord;
  }

  /**
   * 获取统计信息
   */
  static getDataStatistics(): {
    totalRecords: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    dateRange: { earliest: string; latest: string };
  } {
    const data = this.loadTestDataFromLocalStorage();
    
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let earliest = new Date();
    let latest = new Date(0);

    data.forEach(record => {
      // 按类型统计
      byType[record.testType] = (byType[record.testType] || 0) + 1;
      
      // 按状态统计
      byStatus[record.status] = (byStatus[record.status] || 0) + 1;
      
      // 日期范围
      const recordDate = new Date(record.startTime);
      if (recordDate < earliest) earliest = recordDate;
      if (recordDate > latest) latest = recordDate;
    });

    return {
      totalRecords: data.length,
      byType,
      byStatus,
      dateRange: {
        earliest: data.length > 0 ? earliest.toISOString() : '',
        latest: data.length > 0 ? latest.toISOString() : ''
      }
    };
  }
}

// 自动初始化示例数据
if (typeof window !== 'undefined') {
  // 延迟初始化，避免阻塞页面加载
  setTimeout(() => {
    TestDataGenerator.initializeSampleData();
  }, 1000);
}
