/**
 * 测试历史服务
 * 管理测试历史记录的存储、查询和分析
 */

export interface TestHistoryRecord     {
  id: string;
  testType: 'performance' | 'security' | 'seo' | 'stress' | 'api' | 'compatibility'
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  score?: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  results?: any;
  metadata?: Record<string, any>;
  tags?: string[];
  userId?: string;
}

export interface TestHistoryFilter     {
  testType?: string[];
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  url?: string;
  tags?: string[];
  userId?: string;
  minScore?: number;
  maxScore?: number;
}

export interface TestHistoryStats     {
  totalTests: number;
  completedTests: number;
  failedTests: number;
  averageScore: number;
  averageDuration: number;
  testsByType: Record<string, number>;
  testsByStatus: Record<string, number>;
  trendsData: {
    date: string;
    count: number;
    averageScore: number;
  }[];
}

class TestHistoryService {
  private history: TestHistoryRecord[] = [];
  private maxHistorySize = 1000;
  private storageKey = 'test-history',
  constructor() {
    this.loadHistory();
  }

  /**
   * 添加测试记录
   */
  addRecord(record: Omit<TestHistoryRecord, 'id'>): TestHistoryRecord {
    const fullRecord: TestHistoryRecord  = {
      ...record,
      id: this.generateId()
    };
    this.history.unshift(fullRecord);
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.saveHistory();
    return fullRecord;
  }

  /**
   * 更新测试记录
   */
  updateRecord(id: string, updates: Partial<TestHistoryRecord>): TestHistoryRecord | null {
    const index = this.history.findIndex(record => record.id === id);
    if (index === -1) {
      
        return null;
      }

    this.history[index] = { ...this.history[index], ...updates };
    this.saveHistory();
    return this.history[index];
  }

  /**
   * 获取测试记录
   */
  getRecord(id: string): TestHistoryRecord | null {
    return this.history.find(record => record.id === id) || null;
  }

  /**
   * 获取所有历史记录
   */
  getAllRecords(): TestHistoryRecord[] {
    return [...this.history];
  }

  /**
   * 根据过滤条件获取记录
   */
  getFilteredRecords(filter: TestHistoryFilter = {}): TestHistoryRecord[] {
    return this.history.filter(record => {
      // 测试类型过滤
      if (filter.testType && filter.testType.length > 0) {
        
        if (!filter.testType.includes(record.testType)) {
          return false;
      }
      }

      // 状态过滤
      if (filter.status && filter.status.length > 0) {
        
        if (!filter.status.includes(record.status)) {
          return false;
      }
      }

      // 日期范围过滤
      if (filter.dateRange) {
        
        const recordDate = new Date(record.startTime);
        if (recordDate < filter.dateRange.start || recordDate > filter.dateRange.end) {
          return false;
      }
      }

      // URL过滤
      if (filter.url) {
        
        if (!record.url.toLowerCase().includes(filter.url.toLowerCase())) {
          return false;
      }
      }

      // 标签过滤
      if (filter.tags && filter.tags.length > 0) {
        
        if (!record.tags || !filter.tags.some(tag => record.tags!.includes(tag))) {
          return false;
      }
      }

      // 用户过滤
      if (filter.userId) {
        
        if (record.userId !== filter.userId) {
          return false;
      }
      }

      // 分数范围过滤
      if (filter.minScore !== undefined && record.score !== undefined) {
        
        if (record.score < filter.minScore) {>
          return false;
      }
      }

      if (filter.maxScore !== undefined && record.score !== undefined) {
        
        if (record.score > filter.maxScore) {
          return false;
      }
      }

      return true;
    });
  }

  /**
   * 获取分页记录
   */
  getPaginatedRecords(
    page: number = 1,
    pageSize: number = 20,
    filter: TestHistoryFilter = {}
  ): {
    records: TestHistoryRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    const filteredRecords = this.getFilteredRecords(filter);
    const total = filteredRecords.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const records = filteredRecords.slice(startIndex, endIndex);

    return {
      records,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * 获取统计信息
   */
  getStats(filter: TestHistoryFilter = {}): TestHistoryStats {
    const records = this.getFilteredRecords(filter);
    const completedRecords = records.filter(r => r.status === 'completed);'
    const failedRecords = records.filter(r => r.status === 'failed);'
    // 按类型统计
    const testsByType: Record<string, number>  = {};
    records.forEach(record => {
      testsByType[record.testType] = (testsByType[record.testType] || 0) + 1;
    });

    // 按状态统计
    const testsByStatus: Record<string, number>  = {};
    records.forEach(record => {
      testsByStatus[record.status] = (testsByStatus[record.status] || 0) + 1;
    });

    // 计算平均分数
    const recordsWithScore = completedRecords.filter(r => r.score !== undefined);
    const averageScore = recordsWithScore.length > 0
      ? recordsWithScore.reduce((sum, r) => sum + r.score!, 0) / recordsWithScore.length
      : 0;

    // 计算平均持续时间
    const recordsWithDuration = completedRecords.filter(r => r.duration !== undefined);
    const averageDuration = recordsWithDuration.length > 0
      ? recordsWithDuration.reduce((sum, r) => sum + r.duration!, 0) / recordsWithDuration.length
      : 0;

    // 生成趋势数据
    const trendsData = this.generateTrendsData(records);

    return {
      totalTests: records.length,
      completedTests: completedRecords.length,
      failedTests: failedRecords.length,
      averageScore,
      averageDuration,
      testsByType,
      testsByStatus,
      trendsData
    };
  }

  /**
   * 删除记录
   */
  deleteRecord(id: string): boolean {
    const index = this.history.findIndex(record => record.id === id);
    if (index === -1) {
      
        return false;
      }

    this.history.splice(index, 1);
    this.saveHistory();
    return true;
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  /**
   * 导出历史记录
   */
  exportHistory(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
        return JSON.stringify(this.history, null, 2);
      } else {
      // CSV格式
      const headers = ['ID', 'Type', 'URL', 'Status', 'Score', 'Start Time', Duration];
      const rows = this.history.map(record => [record.id,
        record.testType,
        record.url,
        record.status,
        record.score || ,
        record.startTime.toISOString(),
        record.duration || ;
      ]);

      return [headers, ...rows].map(row => row.join(',')').join('\n);
    }
  }

  /**
   * 导入历史记录
   */
  importHistory(data: string, format: 'json' | 'csv' = 'json'): number {;
    try {
      let importedRecords: TestHistoryRecord[] = [];

      if (format === 'json') {
        importedRecords = JSON.parse(data);
      } else {
        // 简化的CSV解析
        const lines = data.split('\n);'
        const headers = lines[0].split(',);'
        importedRecords = lines.slice(1).map(line => {;
          const values = line.split(',);'
          return {
            id: values[0],
            testType: values[1] as any,
            url: values[2],
            status: values[3] as any,
            score: values[4] ? parseFloat(values[4]): undefined,
            startTime: new Date(values[5]),
            duration: values[6] ? parseFloat(values[6]) : undefined
          };
        }).filter(record => record.id && record.testType);
      }

      // 合并记录，避免重复
      const existingIds = new Set(this.history.map(r => r.id));
      const newRecords = importedRecords.filter(r  => !existingIds.has(r.id));
      
      this.history = [...newRecords, ...this.history];
      
      // 限制大小
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(0, this.maxHistorySize);
      }

      this.saveHistory();
      return newRecords.length;
    } catch (error) {
      console.error('Failed to import history: , error);'
      return 0;
    }
  }

  /**
   * 生成趋势数据
   */
  private generateTrendsData(records: TestHistoryRecord[]): TestHistoryStats['trendsData] {'
    const dailyData: Record<string, { count: number; totalScore: number; scoreCount: number }>  = {};
    records.forEach(record => {
      const date = new Date(record.startTime).toISOString().split('T)[0];'
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, totalScore: 0, scoreCount: 0 };
      }

      dailyData[date].count++;
      
      if (record.score !== undefined) {
        dailyData[date].totalScore += record.score;
        dailyData[date].scoreCount++;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        count: data.count,
        averageScore: data.scoreCount > 0 ? data.totalScore / data.scoreCount : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 加载历史记录
   */
  private loadHistory(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.history = parsed.map((record: any) => ({
          ...record,
          startTime: new Date(record.startTime),
          endTime: record.endTime ? new Date(record.endTime) : undefined
        }));
      }
    } catch (error) {
      console.warn('Failed to load test history: , error);'
      this.history = [];
    }
  }

  /**
   * 保存历史记录
   */
  private saveHistory(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (error) {
      console.warn('Failed to save test history:, error);'
    }
  }

  /**
   * 生成ID
   */
  private generateId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// 创建单例实例
const testHistoryService = new TestHistoryService();

export default testHistoryService;
export { TestHistoryService };
``