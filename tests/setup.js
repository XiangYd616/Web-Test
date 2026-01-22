/**
 * Jest 测试设置文件（JS 版本）
 */

jest.setTimeout(30000);

global.window = global;
global.document = {
  createElement: jest.fn(() => ({ style: {}, addEventListener: jest.fn() })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

global.navigator = {
  userAgent: 'jest',
};

global.testUtils = {
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  mockFetch(response) {
    global.mockFetch = jest.fn().mockResolvedValue({
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
    global.mockFetch = undefined;
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  if (global.testUtils) {
    global.testUtils.restoreFetch();
  }
});
