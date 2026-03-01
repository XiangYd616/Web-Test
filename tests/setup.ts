/**
 * Jest测试设置文件
 */

import { jest } from '@jest/globals';

// 设置测试超时
jest.setTimeout(30000);

// 模拟浏览器环境
globalThis.window = globalThis;
globalThis.document = {
  createElement: jest.fn(() => ({ style: {}, addEventListener: jest.fn() })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
globalThis.navigator = {
  userAgent: 'jest',
};
globalThis.testUtils = {
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  mockFetch(response) {
    globalThis.mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json() {
        return Promise.resolve(response);
      },
      text() {
        return Promise.resolve(JSON.stringify(response));
      },
    });
  },
  restoreFetch() {
    globalThis.mockFetch = undefined;
  },
};

// 测试前后钩子
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  if (globalThis.testUtils) {
    globalThis.testUtils.restoreFetch();
  }
});

export {};
