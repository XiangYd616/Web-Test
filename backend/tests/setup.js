/**
 * Jest测试环境设置
 * 在所有测试运行前执行
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '10';

// 设置数据库环境变量(测试数据库)
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'testweb_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// 全局测试工具
global.testUtils = {
  // 模拟用户数据
  mockUser: {
    id: 'test-user-id-123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test@12345',
    role: 'user',
    is_active: true
  },

  // 模拟管理员数据
  mockAdmin: {
    id: 'test-admin-id-456',
    username: 'testadmin',
    email: 'admin@example.com',
    password: 'Admin@12345',
    role: 'admin',
    is_active: true
  },

  // 生成模拟JWT token
  generateMockToken: (userId = 'test-user-id-123') => {
    return `mock-jwt-token-${userId}`;
  },

  // 模拟请求对象
  mockRequest: (options = {}) => ({
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user || null,
    ...options
  }),

  // 模拟响应对象
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.sendStatus = jest.fn().mockReturnValue(res);
    res.success = jest.fn().mockReturnValue(res);
    res.error = jest.fn().mockReturnValue(res);
    res.validationError = jest.fn().mockReturnValue(res);
    res.unauthorized = jest.fn().mockReturnValue(res);
    res.forbidden = jest.fn().mockReturnValue(res);
    res.notFound = jest.fn().mockReturnValue(res);
    res.conflict = jest.fn().mockReturnValue(res);
    res.serverError = jest.fn().mockReturnValue(res);
    return res;
  },

  // 模拟next函数
  mockNext: () => jest.fn(),

  // 等待异步操作
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
};

// 配置Jest匹配器扩展
expect.extend({
  toBeValidToken(received) {
    const pass = typeof received === 'string' && received.length > 20;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid token`
          : `expected ${received} to be a valid token`
    };
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`
    };
  }
});

// 全局测试钩子
beforeAll(() => {
  console.log('🧪 开始运行测试...\n');
});

afterAll(() => {
  console.log('\n✅ 所有测试完成!\n');
});

