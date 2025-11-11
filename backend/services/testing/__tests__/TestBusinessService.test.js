/**
 * TestBusinessService单元测试
 * 
 * 测试内容:
 * 1. 格式验证(URL、并发数、测试时长等)
 * 2. 业务规则验证(配额检查、权限控制)
 * 3. 测试配置规范化
 * 4. 测试创建和启动流程
 * 5. 评分计算逻辑
 */

const TestBusinessService = require('../TestBusinessService');
const { query } = require('../../../config/database');
const {
  ValidationError,
  QuotaExceededError,
  UnauthorizedError,
  NotFoundError,
  PermissionError
} = require('../../../utils/errors');

// Mock数据库查询
jest.mock('../../../config/database', () => ({
  query: jest.fn()
}));

// Mock UserTestManager
jest.mock('../UserTestManager', () => ({
  createUserTest: jest.fn(() => ({
    executeTest: jest.fn().mockResolvedValue({})
  })),
  getRunningTestCount: jest.fn().mockResolvedValue(0)
}));

describe('TestBusinessService - 格式验证', () => {
  let service;
  
  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  describe('validateFormat()', () => {
    test('应该接受有效的URL', () => {
      const config = { url: 'https://example.com' };
      const result = service.validateFormat(config);
      
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('应该拒绝空URL', () => {
      const config = { url: '' };
      const result = service.validateFormat(config);
      
      expect(result.errors).toContain('URL不能为空');
    });

    test('应该拒绝无效的URL格式', () => {
      const config = { url: 'not-a-url' };
      const result = service.validateFormat(config);
      
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该拒绝没有http(s)协议的URL', () => {
      const config = { url: 'ftp://example.com' };
      const result = service.validateFormat(config);
      
      expect(result.errors).toContain('URL格式不正确,需要以http://或https://开头');
    });

    test('应该拒绝无效的并发数', () => {
      const config = { 
        url: 'https://example.com',
        concurrent: 0
      };
      const result = service.validateFormat(config);
      
      expect(result.errors).toContain('并发数必须是大于0的数字');
    });

    test('应该拒绝无效的测试时长', () => {
      const config = { 
        url: 'https://example.com',
        duration: -1
      };
      const result = service.validateFormat(config);
      
      expect(result.errors).toContain('测试时长必须是大于0的数字');
    });

    test('应该拒绝无效的测试类型', () => {
      const config = { 
        url: 'https://example.com',
        testType: 'invalid-type'
      };
      const result = service.validateFormat(config);
      
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该拒绝无效的HTTP方法', () => {
      const config = { 
        url: 'https://example.com',
        method: 'INVALID'
      };
      const result = service.validateFormat(config);
      
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('TestBusinessService - 业务规则验证', () => {
  let service;
  
  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  describe('validateBusinessRules()', () => {
    test('应该拒绝超出最大并发数', async () => {
      const config = { 
        url: 'https://example.com',
        concurrent: 1001 // 超过最大值1000
      };
      const user = { userId: '1', role: 'free' };
      
      const result = await service.validateBusinessRules(config, user);
      
      expect(result.errors.some(e => e.includes('并发数不能超过'))).toBe(true);
    });

    test('应该拒绝超出用户套餐限制的并发数', async () => {
      const config = { 
        url: 'https://example.com',
        concurrent: 100 // 免费用户限制50
      };
      const user = { userId: '1', role: 'free' };
      
      const result = await service.validateBusinessRules(config, user);
      
      expect(result.errors.some(e => e.includes('套餐最多支持'))).toBe(true);
    });

    test('应该在并发数过高时给出警告', async () => {
      const config = { 
        url: 'https://example.com',
        concurrent: 200 // 超过推荐值100
      };
      const user = { userId: '1', role: 'enterprise' };
      
      const result = await service.validateBusinessRules(config, user);
      
      expect(result.warnings.some(w => w.includes('并发数较高'))).toBe(true);
    });

    test('应该拒绝超出最大测试时长', async () => {
      const config = { 
        url: 'https://example.com',
        duration: 3700 // 超过最大值3600秒
      };
      const user = { userId: '1', role: 'free' };
      
      const result = await service.validateBusinessRules(config, user);
      
      expect(result.errors.some(e => e.includes('测试时长不能超过'))).toBe(true);
    });

    test('应该拒绝加压时间大于测试时长', async () => {
      const config = { 
        url: 'https://example.com',
        duration: 60,
        rampUpTime: 70
      };
      const user = { userId: '1', role: 'free' };
      
      const result = await service.validateBusinessRules(config, user);
      
      expect(result.errors.some(e => e.includes('加压时间不能大于或等于测试时长'))).toBe(true);
    });

    test('应该检查超时时间限制', async () => {
      const config = { 
        url: 'https://example.com',
        timeout: 100 // 超过最大值60秒
      };
      const user = { userId: '1', role: 'free' };
      
      const result = await service.validateBusinessRules(config, user);
      
      expect(result.errors.some(e => e.includes('超时时间不能超过'))).toBe(true);
    });

    test('应该检查运行中的测试数量', async () => {
      query.mockResolvedValue({ rows: [{ count: '5' }] });
      
      const config = { url: 'https://example.com' };
      const user = { userId: '1', role: 'free' }; // 免费用户限制2个并发测试
      
      const result = await service.validateBusinessRules(config, user);
      
      expect(result.errors.some(e => e.includes('已达到最大并发数'))).toBe(true);
    });

    test('应该检查每日测试次数限制', async () => {
      query.mockResolvedValue({ rows: [{ count: '15' }] });
      
      const config = { url: 'https://example.com' };
      const user = { userId: '1', role: 'free' }; // 免费用户每日限制10个
      
      const result = await service.validateBusinessRules(config, user);
      
      expect(result.errors.some(e => e.includes('已达到每日限额'))).toBe(true);
    });

    test('管理员应该有无限每日测试次数', async () => {
      query.mockResolvedValue({ rows: [{ count: '1000' }] });
      
      const config = { url: 'https://example.com' };
      const user = { userId: '1', role: 'admin' };
      
      const result = await service.validateBusinessRules(config, user);
      
      // 管理员不应该有每日限额错误
      expect(result.errors.some(e => e.includes('每日限额'))).toBe(false);
    });
  });
});

describe('TestBusinessService - 配置规范化', () => {
  let service;
  
  beforeEach(() => {
    service = TestBusinessService;
  });

  test('应该添加默认值', () => {
    const config = { url: 'https://example.com' };
    const normalized = service.normalizeTestConfig(config);
    
    expect(normalized.testType).toBe('load');
    expect(normalized.concurrent).toBe(10);
    expect(normalized.duration).toBe(60);
    expect(normalized.method).toBe('GET');
  });

  test('应该保留用户提供的值', () => {
    const config = { 
      url: 'https://example.com',
      testType: 'stress',
      concurrent: 50,
      duration: 120
    };
    const normalized = service.normalizeTestConfig(config);
    
    expect(normalized.testType).toBe('stress');
    expect(normalized.concurrent).toBe(50);
    expect(normalized.duration).toBe(120);
  });

  test('应该修剪URL空白', () => {
    const config = { url: '  https://example.com  ' };
    const normalized = service.normalizeTestConfig(config);
    
    expect(normalized.url).toBe('https://example.com');
  });

  test('应该添加normalizedAt时间戳', () => {
    const config = { url: 'https://example.com' };
    const normalized = service.normalizeTestConfig(config);
    
    expect(normalized.metadata.normalizedAt).toBeDefined();
  });
});

describe('TestBusinessService - 用户配额', () => {
  let service;
  
  beforeEach(() => {
    service = TestBusinessService;
  });

  test('应该返回正确的免费用户配额', () => {
    const user = { userId: '1', role: 'free' };
    const quota = service.getUserQuota(user);
    
    expect(quota.maxConcurrentTests).toBe(2);
    expect(quota.maxTestsPerDay).toBe(10);
    expect(quota.maxConcurrentPerTest).toBe(50);
  });

  test('应该返回正确的高级用户配额', () => {
    const user = { userId: '1', role: 'premium' };
    const quota = service.getUserQuota(user);
    
    expect(quota.maxConcurrentTests).toBe(10);
    expect(quota.maxTestsPerDay).toBe(100);
    expect(quota.maxConcurrentPerTest).toBe(500);
  });

  test('应该返回正确的企业用户配额', () => {
    const user = { userId: '1', role: 'enterprise' };
    const quota = service.getUserQuota(user);
    
    expect(quota.maxConcurrentTests).toBe(50);
    expect(quota.maxTestsPerDay).toBe(1000);
    expect(quota.maxConcurrentPerTest).toBe(1000);
  });

  test('应该返回正确的管理员配额', () => {
    const user = { userId: '1', role: 'admin' };
    const quota = service.getUserQuota(user);
    
    expect(quota.maxConcurrentTests).toBe(100);
    expect(quota.maxTestsPerDay).toBe(-1); // 无限制
    expect(quota.maxConcurrentPerTest).toBe(1000);
  });

  test('未知角色应该使用免费配额', () => {
    const user = { userId: '1', role: 'unknown' };
    const quota = service.getUserQuota(user);
    
    expect(quota.maxConcurrentTests).toBe(2);
  });
});

describe('TestBusinessService - 测试ID生成', () => {
  let service;
  
  beforeEach(() => {
    service = TestBusinessService;
  });

  test('应该生成包含测试类型的ID', () => {
    const testId = service.generateTestId('load');
    expect(testId).toMatch(/^load_\d+_[a-z0-9]+$/);
  });

  test('应该生成唯一的ID', () => {
    const id1 = service.generateTestId('load');
    const id2 = service.generateTestId('load');
    
    expect(id1).not.toBe(id2);
  });

  test('应该使用默认测试类型', () => {
    const testId = service.generateTestId();
    expect(testId).toMatch(/^load_/);
  });
});

describe('TestBusinessService - 评分计算', () => {
  let service;
  
  beforeEach(() => {
    service = TestBusinessService;
  });

  test('应该计算基于成功率的评分', () => {
    const results = {
      metrics: {
        totalRequests: 100,
        failedRequests: 10,
        avgResponseTime: 200
      }
    };
    
    const score = service.calculateOverallScore(results);
    
    // 成功率 90%, 响应时间200ms(性能得分80)
    // 评分 = 90 * 0.7 + 80 * 0.3 = 63 + 24 = 87
    expect(score).toBe(87);
  });

  test('应该根据响应时间计算性能得分', () => {
    const testCases = [
      { avgResponseTime: 50, expectedPerf: 100 },
      { avgResponseTime: 300, expectedPerf: 80 },
      { avgResponseTime: 800, expectedPerf: 60 },
      { avgResponseTime: 1500, expectedPerf: 40 },
      { avgResponseTime: 3000, expectedPerf: 20 }
    ];

    testCases.forEach(({ avgResponseTime, expectedPerf }) => {
      const results = {
        metrics: {
          totalRequests: 100,
          failedRequests: 0,
          avgResponseTime
        }
      };
      
      const score = service.calculateOverallScore(results);
      const expectedScore = Math.round(100 * 0.7 + expectedPerf * 0.3);
      
      expect(score).toBe(expectedScore);
    });
  });

  test('应该处理全部失败的情况', () => {
    const results = {
      metrics: {
        totalRequests: 100,
        failedRequests: 100,
        avgResponseTime: 500
      }
    };
    
    const score = service.calculateOverallScore(results);
    
    // 成功率 0%, 响应时间500ms(性能得分80)
    // 评分 = 0 * 0.7 + 80 * 0.3 = 24
    expect(score).toBe(24);
  });

  test('应该使用已有的评分', () => {
    const results = {
      overallScore: 95,
      metrics: {
        totalRequests: 100,
        failedRequests: 50
      }
    };
    
    const score = service.calculateOverallScore(results);
    
    expect(score).toBe(95);
  });

  test('应该为空结果返回默认评分', () => {
    const score = service.calculateOverallScore(null);
    expect(score).toBe(0);
    
    const score2 = service.calculateOverallScore({});
    expect(score2).toBe(50);
  });
});

describe('TestBusinessService - 权限检查', () => {
  let service;
  
  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  test('应该允许测试所有者访问', async () => {
    query.mockResolvedValue({ 
      rows: [{ user_id: '123' }] 
    });
    
    const hasPermission = await service.checkTestPermission('test_1', '123');
    
    expect(hasPermission).toBe(true);
  });

  test('应该拒绝非所有者访问', async () => {
    query.mockResolvedValue({ 
      rows: [{ user_id: '123' }] 
    });
    
    const hasPermission = await service.checkTestPermission('test_1', '456');
    
    expect(hasPermission).toBe(false);
  });

  test('应该拒绝不存在的测试', async () => {
    query.mockResolvedValue({ rows: [] });
    
    const hasPermission = await service.checkTestPermission('invalid_test', '123');
    
    expect(hasPermission).toBe(false);
  });

  test('应该处理数据库错误', async () => {
    query.mockRejectedValue(new Error('Database error'));
    
    const hasPermission = await service.checkTestPermission('test_1', '123');
    
    expect(hasPermission).toBe(false);
  });
});

describe('TestBusinessService - 完整流程', () => {
  let service;
  
  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  test('应该拒绝未登录用户', async () => {
    const config = { url: 'https://example.com' };
    
    await expect(service.createAndStartTest(config, null))
      .rejects.toThrow(UnauthorizedError);
  });

  test('应该拒绝无效配置', async () => {
    const config = { url: 'invalid-url' };
    const user = { userId: '1', role: 'free' };
    
    await expect(service.createAndStartTest(config, user))
      .rejects.toThrow(ValidationError);
  });

  test('应该成功创建并启动测试', async () => {
    const config = { 
      url: 'https://example.com',
      concurrent: 10
    };
    const user = { userId: '1', role: 'free' };
    
    // Mock数据库查询
    query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // 运行中的测试数量
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // 今日测试次数
      .mockResolvedValueOnce({ rows: [] }) // INSERT测试
      .mockResolvedValueOnce({ rows: [{ user_id: '1' }] }) // 权限检查
      .mockResolvedValueOnce({ 
        rows: [{ 
          config: JSON.stringify(config),
          test_type: 'load',
          url: 'https://example.com'
        }] 
      }) // 获取测试配置
      .mockResolvedValueOnce({ rows: [] }); // UPDATE状态
    
    const result = await service.createAndStartTest(config, user);
    
    expect(result.testId).toBeDefined();
    expect(result.status).toBe('running');
    expect(result.startedAt).toBeDefined();
  });

  test('应该包含警告信息', async () => {
    const config = { 
      url: 'https://example.com',
      concurrent: 200, // 会触发警告
      duration: 700    // 会触发警告
    };
    const user = { userId: '1', role: 'enterprise' };
    
    // Mock数据库查询
    query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ user_id: '1' }] })
      .mockResolvedValueOnce({ 
        rows: [{ 
          config: JSON.stringify(config),
          test_type: 'load',
          url: 'https://example.com'
        }] 
      })
      .mockResolvedValueOnce({ rows: [] });
    
    const result = await service.createAndStartTest(config, user);
    
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
