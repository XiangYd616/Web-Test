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

// 模拟数据库查询
const mockQuery = jest.fn();
jest.mock('../../../config/database', () => ({
  query: mockQuery,
}));

// 模拟ApiError
const mockApiError = jest.fn();
jest.mock('../../../middleware/errorHandler', () => ({
  ApiError: mockApiError,
}));

// 模拟UserTestManager
const mockCreateUserTest = jest.fn();
const mockGetRunningTestCount = jest.fn().mockResolvedValue(0);
jest.mock('../UserTestManager', () => ({
  createUserTest: jest.fn(() => ({
    executeTest: jest.fn().mockResolvedValue({}),
  })),
  getRunningTestCount: mockGetRunningTestCount,
}));

// 导入被测试的模块
const TestBusinessService = require('../TestBusinessService');

describe('TestBusinessService - 格式验证', () => {
  let service: any;

  beforeEach(() => {
    service = new TestBusinessService();
    jest.clearAllMocks();
  });

  describe('URL格式验证', () => {
    test('应该接受有效的HTTP URL', () => {
      const validUrls = [
        'http://example.com',
        'https://www.example.com',
        'https://example.com/path',
        'http://localhost:3000',
        'https://api.example.com/v1/users',
      ];

      validUrls.forEach(url => {
        expect(() => service.validateUrl(url)).not.toThrow();
      });
    });

    test('应该拒绝无效的URL', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        '',
        null,
        undefined,
      ];

      invalidUrls.forEach(url => {
        expect(() => service.validateUrl(url)).toThrow();
      });
    });

    test('应该拒绝包含恶意脚本的URL', () => {
      const maliciousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
      ];

      maliciousUrls.forEach(url => {
        expect(() => service.validateUrl(url)).toThrow();
      });
    });
  });

  describe('并发数验证', () => {
    test('应该接受有效的并发数', () => {
      const validConcurrencies = [1, 5, 10, 50, 100];

      validConcurrencies.forEach(concurrency => {
        expect(() => service.validateConcurrency(concurrency)).not.toThrow();
      });
    });

    test('应该拒绝无效的并发数', () => {
      const invalidConcurrencies = [0, -1, 1001, NaN, Infinity];

      invalidConcurrencies.forEach(concurrency => {
        expect(() => service.validateConcurrency(concurrency)).toThrow();
      });
    });
  });

  describe('测试时长验证', () => {
    test('应该接受有效的测试时长', () => {
      const validDurations = [1, 60, 300, 3600]; // 1秒到1小时

      validDurations.forEach(duration => {
        expect(() => service.validateDuration(duration)).not.toThrow();
      });
    });

    test('应该拒绝无效的测试时长', () => {
      const invalidDurations = [0, -1, 86401, NaN, Infinity]; // 超过24小时

      invalidDurations.forEach(duration => {
        expect(() => service.validateDuration(duration)).toThrow();
      });
    });
  });
});

describe('TestBusinessService - 业务规则验证', () => {
  let service: any;

  beforeEach(() => {
    service = new TestBusinessService();
    jest.clearAllMocks();
  });

  describe('配额检查', () => {
    test('应该允许未超出配额的用户创建测试', async () => {
      const userId = 'user123';
      const userQuota = 10;
      const runningTests = 5;

      mockQuery.mockResolvedValue([{ quota: userQuota }]);
      mockGetRunningTestCount.mockResolvedValue(runningTests);

      const result = await service.checkUserQuota(userId);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith('SELECT quota FROM user_quotas WHERE user_id = ?', [
        userId,
      ]);
      expect(mockGetRunningTestCount).toHaveBeenCalledWith(userId);
    });

    test('应该拒绝超出配额的用户创建测试', async () => {
      const userId = 'user123';
      const userQuota = 5;
      const runningTests = 5;

      mockQuery.mockResolvedValue([{ quota: userQuota }]);
      mockGetRunningTestCount.mockResolvedValue(runningTests);

      await expect(service.checkUserQuota(userId)).rejects.toThrow();
    });

    test('应该处理没有配额记录的用户', async () => {
      const userId = 'user123';

      mockQuery.mockResolvedValue([]);
      mockGetRunningTestCount.mockResolvedValue(0);

      const result = await service.checkUserQuota(userId);

      expect(result).toBe(true); // 默认配额
    });
  });

  describe('权限控制', () => {
    test('应该允许有权限的用户创建测试', async () => {
      const userId = 'user123';
      const testType = 'performance';

      mockQuery.mockResolvedValue([{ can_create_performance: true }]);

      const result = await service.checkUserPermission(userId, testType);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT can_create_performance FROM user_permissions WHERE user_id = ?',
        [userId]
      );
    });

    test('应该拒绝没有权限的用户创建测试', async () => {
      const userId = 'user123';
      const testType = 'security';

      mockQuery.mockResolvedValue([{ can_create_security: false }]);

      await expect(service.checkUserPermission(userId, testType)).rejects.toThrow();
    });

    test('应该处理没有权限记录的用户', async () => {
      const userId = 'user123';
      const testType = 'seo';

      mockQuery.mockResolvedValue([]);

      await expect(service.checkUserPermission(userId, testType)).rejects.toThrow();
    });
  });
});

describe('TestBusinessService - 测试配置规范化', () => {
  let service: any;

  beforeEach(() => {
    service = new TestBusinessService();
    jest.clearAllMocks();
  });

  test('应该规范化测试配置', () => {
    const rawConfig = {
      url: 'https://example.com',
      concurrency: 10,
      duration: 60,
      testType: 'performance',
      options: {
        timeout: 5000,
        retries: 3,
      },
    };

    const normalizedConfig = service.normalizeConfig(rawConfig);

    expect(normalizedConfig).toEqual({
      url: 'https://example.com',
      concurrency: 10,
      duration: 60,
      testType: 'performance',
      options: {
        timeout: 5000,
        retries: 3,
        normalizedAt: expect.any(Date),
      },
      metadata: {
        createdAt: expect.any(Date),
        version: '1.0',
      },
    });
  });

  test('应该设置默认值', () => {
    const rawConfig = {
      url: 'https://example.com',
    };

    const normalizedConfig = service.normalizeConfig(rawConfig);

    expect(normalizedConfig.concurrency).toBe(1);
    expect(normalizedConfig.duration).toBe(60);
    expect(normalizedConfig.testType).toBe('performance');
    expect(normalizedConfig.options).toEqual({});
  });

  test('应该验证配置的完整性', () => {
    const incompleteConfig = {
      // 缺少必需的url字段
      concurrency: 10,
    };

    expect(() => service.normalizeConfig(incompleteConfig)).toThrow();
  });
});

describe('TestBusinessService - 测试创建和启动流程', () => {
  let service: any;

  beforeEach(() => {
    service = new TestBusinessService();
    jest.clearAllMocks();
  });

  test('应该成功创建并启动测试', async () => {
    const userId = 'user123';
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 60,
      testType: 'performance',
    };

    // Mock配额和权限检查
    jest.spyOn(service, 'checkUserQuota').mockResolvedValue(true);
    jest.spyOn(service, 'checkUserPermission').mockResolvedValue(true);
    jest.spyOn(service, 'normalizeConfig').mockReturnValue(testConfig);

    // Mock测试创建
    const mockTest = {
      id: 'test123',
      executeTest: jest.fn().mockResolvedValue({ success: true }),
    };
    mockCreateUserTest.mockReturnValue(mockTest);

    const result = await service.createAndStartTest(userId, testConfig);

    expect(result).toEqual({
      success: true,
      testId: 'test123',
    });

    expect(service.checkUserQuota).toHaveBeenCalledWith(userId);
    expect(service.checkUserPermission).toHaveBeenCalledWith(userId, testConfig.testType);
    expect(service.normalizeConfig).toHaveBeenCalledWith(testConfig);
    expect(mockCreateUserTest).toHaveBeenCalledWith(userId, testConfig);
    expect(mockTest.executeTest).toHaveBeenCalled();
  });

  test('应该在配额检查失败时抛出错误', async () => {
    const userId = 'user123';
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 60,
      testType: 'performance',
    };

    jest.spyOn(service, 'checkUserQuota').mockRejectedValue(new Error('Quota exceeded'));

    await expect(service.createAndStartTest(userId, testConfig)).rejects.toThrow('Quota exceeded');
  });

  test('应该在权限检查失败时抛出错误', async () => {
    const userId = 'user123';
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 60,
      testType: 'performance',
    };

    jest.spyOn(service, 'checkUserQuota').mockResolvedValue(true);
    jest.spyOn(service, 'checkUserPermission').mockRejectedValue(new Error('Permission denied'));

    await expect(service.createAndStartTest(userId, testConfig)).rejects.toThrow(
      'Permission denied'
    );
  });
});

describe('TestBusinessService - 评分计算逻辑', () => {
  let service: any;

  beforeEach(() => {
    service = new TestBusinessService();
    jest.clearAllMocks();
  });

  test('应该正确计算性能测试评分', () => {
    const testResults = {
      responseTime: 200, // ms
      throughput: 1000, // requests/second
      errorRate: 0.01, // 1%
      availability: 99.9, // %
    };

    const score = service.calculatePerformanceScore(testResults);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);

    // 验证评分逻辑
    const expectedScore =
      (100 - testResults.responseTime / 10) * 0.3 + // 响应时间权重30%
      (testResults.throughput / 10) * 0.4 + // 吞吐量权重40%
      (100 - testResults.errorRate * 100) * 0.2 + // 错误率权重20%
      testResults.availability * 0.1; // 可用性权重10%

    expect(Math.abs(score - expectedScore)).toBeLessThan(0.01);
  });

  test('应该正确计算安全测试评分', () => {
    const securityResults = {
      vulnerabilities: {
        high: 0,
        medium: 1,
        low: 3,
      },
      securityHeaders: {
        implemented: 8,
        total: 10,
      },
      httpsEnabled: true,
      certificateValid: true,
    };

    const score = service.calculateSecurityScore(securityResults);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('应该正确计算SEO测试评分', () => {
    const seoResults = {
      titleOptimization: 90,
      metaDescription: 85,
      headingStructure: 80,
      imageOptimization: 75,
      internalLinks: 70,
      pageSpeed: 85,
    };

    const score = service.calculateSEOScore(seoResults);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);

    // 验证平均分计算
    const expectedScore =
      (seoResults.titleOptimization +
        seoResults.metaDescription +
        seoResults.headingStructure +
        seoResults.imageOptimization +
        seoResults.internalLinks +
        seoResults.pageSpeed) /
      6;

    expect(Math.abs(score - expectedScore)).toBeLessThan(0.01);
  });

  test('应该处理空结果', () => {
    const emptyResults = {};

    expect(() => service.calculatePerformanceScore(emptyResults)).toThrow();
    expect(() => service.calculateSecurityScore(emptyResults)).toThrow();
    expect(() => service.calculateSEOScore(emptyResults)).toThrow();
  });
});

describe('TestBusinessService - 边界情况测试', () => {
  let service: any;

  beforeEach(() => {
    service = new TestBusinessService();
    jest.clearAllMocks();
  });

  test('应该处理数据库连接错误', async () => {
    const userId = 'user123';

    mockQuery.mockRejectedValue(new Error('Database connection failed'));

    await expect(service.checkUserQuota(userId)).rejects.toThrow('Database connection failed');
  });

  test('应该处理测试执行失败', async () => {
    const userId = 'user123';
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 60,
      testType: 'performance',
    };

    jest.spyOn(service, 'checkUserQuota').mockResolvedValue(true);
    jest.spyOn(service, 'checkUserPermission').mockResolvedValue(true);
    jest.spyOn(service, 'normalizeConfig').mockReturnValue(testConfig);

    const mockTest = {
      id: 'test123',
      executeTest: jest.fn().mockRejectedValue(new Error('Test execution failed')),
    };
    mockCreateUserTest.mockReturnValue(mockTest);

    await expect(service.createAndStartTest(userId, testConfig)).rejects.toThrow(
      'Test execution failed'
    );
  });

  test('应该处理并发限制', async () => {
    const userId = 'user123';
    const testConfig = {
      url: 'https://example.com',
      concurrency: 1000, // 超出限制
      duration: 60,
      testType: 'performance',
    };

    expect(() => service.normalizeConfig(testConfig)).toThrow();
  });

  test('应该处理超长测试时长', async () => {
    const userId = 'user123';
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 86400 * 7, // 7天，超出限制
      testType: 'performance',
    };

    expect(() => service.normalizeConfig(testConfig)).toThrow();
  });
});

describe('TestBusinessService - 性能测试', () => {
  let service: any;

  beforeEach(() => {
    service = new TestBusinessService();
    jest.clearAllMocks();
  });

  test('应该快速处理大量并发请求', async () => {
    const userId = 'user123';
    const testConfigs = Array.from({ length: 100 }, (_, i) => ({
      url: `https://example${i}.com`,
      concurrency: 1,
      duration: 10,
      testType: 'performance',
    }));

    jest.spyOn(service, 'checkUserQuota').mockResolvedValue(true);
    jest.spyOn(service, 'checkUserPermission').mockResolvedValue(true);
    jest.spyOn(service, 'normalizeConfig').mockImplementation(config => config);

    const startTime = Date.now();

    const promises = testConfigs.map(config =>
      service.createAndStartTest(userId, config).catch(() => ({ success: false }))
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    expect(results).toHaveLength(100);
  });

  test('应该高效计算评分', () => {
    const testResults = {
      responseTime: 200,
      throughput: 1000,
      errorRate: 0.01,
      availability: 99.9,
    };

    const iterations = 10000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      service.calculatePerformanceScore(testResults);
    }

    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成10000次计算
  });
});
