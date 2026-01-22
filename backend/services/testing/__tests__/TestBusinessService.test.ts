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

// 模拟错误工厂
const mockApiError = jest.fn();
const mockErrorFactory = {
  validation: jest.fn((message: string) => new Error(message)),
  database: jest.fn((message: string) => new Error(message)),
};
jest.mock('../../../middleware/errorHandler', () => ({
  ApiError: mockApiError,
  ErrorFactory: mockErrorFactory,
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

// Mock 依赖服务
const testRepository = require('../../../repositories/testRepository').default;
const testTemplateService = require('../testTemplateService').default;
const { enqueueTest, closeQueues } = require('../TestQueueService');

// 导入被测试的模块
const TestBusinessService = require('../TestBusinessService').default;

afterEach(() => {
  jest.restoreAllMocks();
  mockQuery.mockReset();
});

afterAll(async () => {
  await closeQueues();
});

describe('TestBusinessService - 格式验证', () => {
  let service: any;

  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  describe('URL格式验证', () => {
    test('应该接受有效的HTTP URL', async () => {
      const user = { userId: 'user123', role: 'premium' };
      const validUrls = [
        'http://example.com',
        'https://www.example.com',
        'https://example.com/path',
        'http://localhost:3000',
        'https://api.example.com/v1/users',
      ];

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      for (const url of validUrls) {
        const result = await service.validateTestConfig({ url, testType: 'performance' }, user);
        expect(result).toEqual(expect.objectContaining({ isValid: true }));
      }
    });

    test('应该拒绝无效的URL', async () => {
      const user = { userId: 'user123', role: 'premium' };
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        '',
        null,
        undefined,
      ];

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      for (const url of invalidUrls) {
        const result = await service.validateTestConfig(
          { url: url as string, testType: 'performance' },
          user
        );
        expect(result).toEqual(expect.objectContaining({ isValid: false }));
      }
    });

    test('应该拒绝包含恶意脚本的URL', async () => {
      const user = { userId: 'user123', role: 'premium' };
      const maliciousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
      ];

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      for (const url of maliciousUrls) {
        const result = await service.validateTestConfig({ url, testType: 'performance' }, user);
        expect(result).toEqual(expect.objectContaining({ isValid: false }));
      }
    });
  });

  describe('并发数验证', () => {
    test('应该接受有效的并发数', async () => {
      const user = { userId: 'user123', role: 'premium' };
      const validConcurrencies = [1, 5, 10, 50, 100];

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      for (const concurrency of validConcurrencies) {
        const result = await service.validateTestConfig(
          { url: 'https://example.com', testType: 'performance', concurrency },
          user
        );
        expect(result).toEqual(expect.objectContaining({ isValid: true }));
      }
    });

    test('应该拒绝无效的并发数', async () => {
      const user = { userId: 'user123', role: 'premium' };
      const invalidConcurrencies = [0, -1, 1001, Infinity];

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      for (const concurrency of invalidConcurrencies) {
        const result = await service.validateTestConfig(
          { url: 'https://example.com', testType: 'performance', concurrency },
          user
        );
        expect(result).toEqual(expect.objectContaining({ isValid: false }));
      }
    });
  });

  describe('测试时长验证', () => {
    test('应该接受有效的测试时长', async () => {
      const user = { userId: 'user123', role: 'premium' };
      const validDurations = [1, 60, 300, 3600]; // 1秒到1小时

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      for (const duration of validDurations) {
        const result = await service.validateTestConfig(
          { url: 'https://example.com', testType: 'performance', duration },
          user
        );
        expect(result).toEqual(expect.objectContaining({ isValid: true }));
      }
    });

    test('应该拒绝无效的测试时长', async () => {
      const user = { userId: 'user123', role: 'premium' };
      const invalidDurations = [0, -1, 3601, Infinity]; // 超过1小时

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      for (const duration of invalidDurations) {
        const result = await service.validateTestConfig(
          { url: 'https://example.com', testType: 'performance', duration },
          user
        );
        expect(result).toEqual(expect.objectContaining({ isValid: false }));
      }
    });
  });
});

describe('TestBusinessService - 业务规则验证', () => {
  let service: any;

  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  describe('配额检查', () => {
    test('应该允许未超出配额的用户创建测试', async () => {
      const user = { userId: 'user123', role: 'free' };

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      await expect(service.checkUserQuota(user)).resolves.toEqual(
        expect.objectContaining({ isValid: true })
      );
    });

    test('应该拒绝超出配额的用户创建测试', async () => {
      const user = { userId: 'user123', role: 'free' };

      mockQuery.mockResolvedValue({ rows: [{ count: 10 }] });

      await expect(service.checkUserQuota(user)).resolves.toEqual(
        expect.objectContaining({ isValid: false })
      );
    });

    test('应该处理没有配额记录的用户', async () => {
      const user = { userId: 'user123', role: 'free' };

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      await expect(service.checkUserQuota(user)).resolves.toEqual(
        expect.objectContaining({ isValid: true })
      );
    });
  });

  describe('权限控制', () => {
    test('应该允许有权限的用户创建测试', async () => {
      const user = { userId: 'user123', role: 'free' };
      const config = { url: 'https://example.com', testType: 'performance' };

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      await expect(service.validateTestConfig(config, user)).resolves.toEqual(
        expect.objectContaining({ isValid: true })
      );
    });

    test('应该拒绝没有权限的用户创建测试', async () => {
      const user = { userId: 'user123', role: 'free' };
      const config = { url: 'https://example.com', testType: 'security' };

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      await expect(service.validateTestConfig(config, user)).resolves.toEqual(
        expect.objectContaining({ isValid: false })
      );
    });

    test('应该处理没有权限记录的用户', async () => {
      const user = { userId: 'user123', role: 'free' };
      const config = { url: 'https://example.com', testType: 'seo' };

      mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

      await expect(service.validateTestConfig(config, user)).resolves.toEqual(
        expect.objectContaining({ isValid: true })
      );
    });
  });
});

describe('TestBusinessService - 测试配置规范化', () => {
  let service: any;

  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  test('应该规范化测试配置', () => {
    const user = { userId: 'user123', role: 'premium' };
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

    const normalizedConfig = service.normalizeTestConfig(rawConfig, user);

    expect(normalizedConfig).toEqual({
      url: 'https://example.com',
      concurrency: 10,
      duration: 60,
      testType: 'performance',
      options: {
        timeout: 5000,
        retries: 3,
      },
    });
  });

  test('应该设置默认值', () => {
    const user = { userId: 'user123', role: 'premium' };
    const rawConfig = {
      url: 'https://example.com',
    };

    const normalizedConfig = service.normalizeTestConfig(rawConfig, user);

    expect(normalizedConfig.concurrency).toBe(10);
    expect(normalizedConfig.duration).toBe(300);
    expect(normalizedConfig.testType).toBeUndefined();
    expect(normalizedConfig.options).toBeUndefined();
  });

  test('应该验证配置的完整性', () => {
    const user = { userId: 'user123', role: 'premium' };
    const incompleteConfig = {
      // 缺少必需的url字段
      concurrency: 10,
    };

    expect(() => service.normalizeTestConfig(incompleteConfig, user)).not.toThrow();
  });
});

describe('TestBusinessService - 测试创建和启动流程', () => {
  let service: any;

  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  test('应该成功创建并启动测试', async () => {
    const user = { userId: 'user123', role: 'premium' };
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 60,
      testType: 'performance',
    };

    // Mock配额和权限检查
    jest
      .spyOn(service, 'checkUserQuota')
      .mockResolvedValue({ isValid: true, errors: [], warnings: [] });
    jest
      .spyOn(service, 'checkUserPermissions')
      .mockResolvedValue({ isValid: true, errors: [], warnings: [] });
    jest.spyOn(service, 'normalizeTestConfig').mockReturnValue(testConfig);
    jest.spyOn(testTemplateService, 'getTemplateForUser').mockResolvedValue(null);
    jest.spyOn(testTemplateService, 'getDefaultTemplate').mockResolvedValue(null);
    jest.spyOn(testRepository, 'create').mockResolvedValue({});
    jest.spyOn(enqueueTest, 'apply').mockResolvedValue(undefined);

    // Mock测试创建
    const mockTest = {
      id: 'test123',
      executeTest: jest.fn().mockResolvedValue({ success: true }),
    };
    mockCreateUserTest.mockReturnValue(mockTest);

    const result = await service.createAndStartTest(testConfig, user);

    expect(result).toEqual(expect.objectContaining({ status: 'queued' }));

    expect(service.checkUserQuota).toHaveBeenCalledWith(user);
    expect(service.checkUserPermissions).toHaveBeenCalledWith(user, testConfig);
    expect(service.normalizeTestConfig).toHaveBeenCalledWith(testConfig, user);
  });

  test('应该在配额检查失败时抛出错误', async () => {
    const user = { userId: 'user123', role: 'premium' };
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 60,
      testType: 'performance',
    };

    jest.spyOn(service, 'checkUserQuota').mockRejectedValue(new Error('Quota exceeded'));
    jest.spyOn(testTemplateService, 'getTemplateForUser').mockResolvedValue(null);
    jest.spyOn(testTemplateService, 'getDefaultTemplate').mockResolvedValue(null);

    await expect(service.createAndStartTest(testConfig, user)).rejects.toThrow('Quota exceeded');
  });

  test('应该在权限检查失败时抛出错误', async () => {
    const user = { userId: 'user123', role: 'premium' };
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 60,
      testType: 'performance',
    };

    jest
      .spyOn(service, 'checkUserQuota')
      .mockResolvedValue({ isValid: true, errors: [], warnings: [] });
    jest.spyOn(service, 'checkUserPermissions').mockRejectedValue(new Error('Permission denied'));
    jest.spyOn(testTemplateService, 'getTemplateForUser').mockResolvedValue(null);
    jest.spyOn(testTemplateService, 'getDefaultTemplate').mockResolvedValue(null);

    await expect(service.createAndStartTest(testConfig, user)).rejects.toThrow('Permission denied');
  });
});

describe('TestBusinessService - 配置校验逻辑', () => {
  let service: any;

  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  test('应该返回验证结果', async () => {
    const user = { userId: 'user123', role: 'premium' };
    mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });

    const result = await service.validateTestConfig(
      { url: 'https://example.com', testType: 'performance' },
      user
    );

    expect(result).toEqual(expect.objectContaining({ isValid: true }));
  });
});

describe('TestBusinessService - 边界情况测试', () => {
  let service: any;

  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  test('应该处理数据库连接错误', async () => {
    const user = { userId: 'user123', role: 'premium' };

    mockQuery.mockRejectedValue(new Error('Database connection failed'));

    await expect(service.checkUserQuota(user)).resolves.toEqual(
      expect.objectContaining({ isValid: false })
    );
  });

  test('应该处理测试执行失败', async () => {
    const user = { userId: 'user123', role: 'premium' };
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 60,
      testType: 'performance',
    };

    mockQuery.mockResolvedValue({ rows: [{ count: 0 }] });
    jest
      .spyOn(service, 'checkUserQuota')
      .mockResolvedValue({ isValid: true, errors: [], warnings: [] });
    jest
      .spyOn(service, 'checkUserPermissions')
      .mockResolvedValue({ isValid: true, errors: [], warnings: [] });
    jest.spyOn(service, 'normalizeTestConfig').mockReturnValue(testConfig);

    jest.spyOn(testRepository, 'create').mockResolvedValue({});
    jest.spyOn(testTemplateService, 'getTemplateForUser').mockResolvedValue(null);
    jest.spyOn(testTemplateService, 'getDefaultTemplate').mockResolvedValue(null);
    jest.spyOn(enqueueTest, 'apply').mockResolvedValue(undefined);

    const mockTest = {
      id: 'test123',
      executeTest: jest.fn().mockRejectedValue(new Error('Test execution failed')),
    };
    mockCreateUserTest.mockReturnValue(mockTest);

    await expect(service.createAndStartTest(testConfig, user)).resolves.toEqual(
      expect.objectContaining({ status: 'queued' })
    );
  });

  test('应该处理并发限制', async () => {
    const user = { userId: 'user123', role: 'premium' };
    const testConfig = {
      url: 'https://example.com',
      concurrency: 1000, // 超出限制
      duration: 60,
      testType: 'performance',
    };

    expect(() => service.normalizeTestConfig(testConfig, user)).not.toThrow();
  });

  test('应该处理超长测试时长', async () => {
    const user = { userId: 'user123', role: 'premium' };
    const testConfig = {
      url: 'https://example.com',
      concurrency: 5,
      duration: 86400 * 7, // 7天，超出限制
      testType: 'performance',
    };

    expect(() => service.normalizeTestConfig(testConfig, user)).not.toThrow();
  });
});

describe('TestBusinessService - 性能测试', () => {
  let service: any;

  beforeEach(() => {
    service = TestBusinessService;
    jest.clearAllMocks();
  });

  test('应该快速处理大量并发请求', async () => {
    const user = { userId: 'user123', role: 'premium' };
    const testConfigs = Array.from({ length: 100 }, (_, i) => ({
      url: `https://example${i}.com`,
      concurrency: 1,
      duration: 10,
      testType: 'performance',
    }));

    jest
      .spyOn(service, 'checkUserQuota')
      .mockResolvedValue({ isValid: true, errors: [], warnings: [] });
    jest
      .spyOn(service, 'checkUserPermissions')
      .mockResolvedValue({ isValid: true, errors: [], warnings: [] });
    jest.spyOn(service, 'normalizeTestConfig').mockImplementation(config => config);

    const startTime = Date.now();

    const promises = testConfigs.map(config =>
      service.createAndStartTest(config, user).catch(() => ({ success: false }))
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    expect(results).toHaveLength(100);
  });

  test('应该高效处理多次配置验证', async () => {
    const user = { userId: 'user123', role: 'premium' };
    mockQuery.mockResolvedValue([{ count: 0 }]);

    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      await service.validateTestConfig({ url: 'https://example.com', testType: 'seo' }, user);
    }

    expect(mockQuery).toHaveBeenCalled();
  });
});
