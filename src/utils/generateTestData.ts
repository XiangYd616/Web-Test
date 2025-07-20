/**
 * 生成测试数据工具
 * 用于创建压力测试历史记录的测试数据
 */

export interface TestDataOptions {
  count?: number;
  timeRange?: 'recent' | 'week' | 'month' | 'year';
  includeRunning?: boolean;
  includeFailed?: boolean;
}

export const generateStressTestData = (options: TestDataOptions = {}) => {
  const {
    count = 10,
    timeRange = 'week',
    includeRunning = true,
    includeFailed = true
  } = options;

  const testData = [];
  const now = new Date();
  
  // 时间范围设置
  const timeRanges = {
    recent: 24 * 60 * 60 * 1000, // 24小时
    week: 7 * 24 * 60 * 60 * 1000, // 7天
    month: 30 * 24 * 60 * 60 * 1000, // 30天
    year: 365 * 24 * 60 * 60 * 1000 // 365天
  };

  const maxTimeBack = timeRanges[timeRange];
  
  const urls = [
    'https://www.baidu.com',
    'https://www.google.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://www.npmjs.com',
    'https://developer.mozilla.org',
    'https://www.w3schools.com',
    'https://reactjs.org',
    'https://nodejs.org',
    'https://www.typescriptlang.org'
  ];

  const statuses = ['completed', 'failed', 'running', 'cancelled'];
  const testTypes = ['gradual', 'spike', 'constant', 'step'];

  for (let i = 0; i < count; i++) {
    // 生成随机时间（在指定范围内）
    const randomTimeBack = Math.random() * maxTimeBack;
    const createdAt = new Date(now.getTime() - randomTimeBack);
    const startTime = new Date(createdAt.getTime() + Math.random() * 60000); // 开始时间稍晚一点
    
    // 随机选择状态
    let status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // 根据选项过滤状态
    if (!includeRunning && status === 'running') {
      status = 'completed';
    }
    if (!includeFailed && status === 'failed') {
      status = 'completed';
    }

    // 生成结束时间（如果已完成或失败）
    let endTime = null;
    let completedAt = null;
    let actualDuration = null;
    
    if (status === 'completed' || status === 'failed') {
      const duration = 30 + Math.random() * 300; // 30-330秒
      endTime = new Date(startTime.getTime() + duration * 1000);
      completedAt = endTime;
      actualDuration = Math.floor(duration);
    }

    const url = urls[Math.floor(Math.random() * urls.length)];
    const users = Math.floor(Math.random() * 100) + 1;
    const testType = testTypes[Math.floor(Math.random() * testTypes.length)];

    // 生成性能指标（如果已完成）
    let results = null;
    let overallScore = null;
    
    if (status === 'completed') {
      const totalRequests = users * (10 + Math.random() * 50);
      const successRate = 0.8 + Math.random() * 0.2; // 80-100%
      const successfulRequests = Math.floor(totalRequests * successRate);
      const failedRequests = totalRequests - successfulRequests;
      const avgResponseTime = 50 + Math.random() * 500; // 50-550ms
      
      results = {
        metrics: {
          totalRequests,
          successfulRequests,
          failedRequests,
          averageResponseTime: Math.floor(avgResponseTime),
          minResponseTime: Math.floor(avgResponseTime * 0.3),
          maxResponseTime: Math.floor(avgResponseTime * 2.5),
          throughput: Math.floor(totalRequests / actualDuration!),
          requestsPerSecond: Math.floor(totalRequests / actualDuration!),
          rps: Math.floor(totalRequests / actualDuration!),
          errorRate: Math.floor((1 - successRate) * 100),
          p95ResponseTime: Math.floor(avgResponseTime * 1.5),
          p99ResponseTime: Math.floor(avgResponseTime * 2)
        },
        realTimeData: generateRealTimeData(actualDuration!, users)
      };
      
      // 计算评分（基于响应时间和成功率）
      const responseTimeScore = Math.max(0, 100 - avgResponseTime / 10);
      const successRateScore = successRate * 100;
      overallScore = Math.floor((responseTimeScore + successRateScore) / 2);
    }

    const testRecord = {
      id: `test_${Date.now()}_${i}`,
      testName: `压力测试 - ${new URL(url).hostname}`,
      testType: 'stress',
      url,
      status,
      startTime: startTime.toISOString(),
      endTime: endTime?.toISOString() || null,
      createdAt: createdAt.toISOString(),
      updatedAt: (endTime || startTime).toISOString(),
      completedAt: completedAt?.toISOString() || null,
      timestamp: createdAt.toISOString(), // 兼容字段
      savedAt: createdAt.toISOString(), // 兼容字段
      actualDuration,
      overallScore,
      config: {
        users,
        duration: 30 + Math.random() * 300,
        rampUpTime: 5 + Math.random() * 20,
        testType,
        method: 'GET',
        timeout: 10,
        thinkTime: 1
      },
      results,
      error: status === 'failed' ? generateRandomError() : null
    };

    testData.push(testRecord);
  }

  // 按时间排序（最新的在前）
  testData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return testData;
};

// 生成实时数据
const generateRealTimeData = (duration: number, users: number) => {
  const data = [];
  const points = Math.min(duration, 60); // 最多60个数据点
  const interval = duration / points;

  for (let i = 0; i < points; i++) {
    const timestamp = Date.now() - (duration - i * interval) * 1000;
    const phase = i < points * 0.2 ? 'ramp-up' : 
                  i > points * 0.8 ? 'ramp-down' : 'steady';
    
    data.push({
      timestamp,
      responseTime: 100 + Math.random() * 300,
      throughput: Math.floor(users * (0.8 + Math.random() * 0.4)),
      activeUsers: Math.floor(users * (phase === 'ramp-up' ? i / (points * 0.2) : 
                                      phase === 'ramp-down' ? (points - i) / (points * 0.2) : 1)),
      errors: Math.floor(Math.random() * 5),
      errorRate: Math.random() * 10,
      phase
    });
  }

  return data;
};

// 生成随机错误信息
const generateRandomError = () => {
  const errors = [
    '连接超时：无法连接到目标服务器',
    'HTTP 500: 内部服务器错误',
    'HTTP 404: 页面未找到',
    '网络错误：请求被拒绝',
    'DNS 解析失败',
    '证书验证失败',
    '请求超时',
    '服务器过载',
    '连接被重置',
    '代理服务器错误'
  ];
  
  return errors[Math.floor(Math.random() * errors.length)];
};

// 将测试数据保存到 localStorage（用于测试）
export const saveTestDataToLocalStorage = (data: any[]) => {
  try {
    localStorage.setItem('stress_test_history_mock', JSON.stringify(data));
    console.log(`✅ 已保存 ${data.length} 条测试数据到 localStorage`);
  } catch (error) {
    console.error('❌ 保存测试数据失败:', error);
  }
};

// 从 localStorage 加载测试数据
export const loadTestDataFromLocalStorage = () => {
  try {
    const data = localStorage.getItem('stress_test_history_mock');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ 加载测试数据失败:', error);
    return [];
  }
};

// 清除测试数据
export const clearTestData = () => {
  localStorage.removeItem('stress_test_history_mock');
  console.log('🗑️ 已清除测试数据');
};

// 快速生成并保存测试数据的便捷函数
export const quickGenerateTestData = (options?: TestDataOptions) => {
  const data = generateStressTestData(options);
  saveTestDataToLocalStorage(data);
  return data;
};

// 导出默认配置
export const defaultTestDataOptions: TestDataOptions = {
  count: 15,
  timeRange: 'week',
  includeRunning: true,
  includeFailed: true
};
