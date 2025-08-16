/**
 * Jest测试设置文件
 */

// 设置测试超时
jest.setTimeout(30000);

// 模拟浏览器环境
global.window = {};
global.document = {};
global.navigator = {
  userAgent: 'jest'
};

// 设置环境变量
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = ':memory:';

// 全局测试工具
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  mockFetch: (response) => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
      })
    );
  },
  
  restoreFetch: () => {
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  }
};

// 测试前后钩子
beforeEach(() => {
  // 清理模拟
  jest.clearAllMocks();
});

afterEach(() => {
  // 恢复模拟
  global.testUtils.restoreFetch();
});