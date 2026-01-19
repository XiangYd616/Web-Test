/**
 * Jest测试设置文件
 */

import { jest } from '@jest/globals';

// 设置测试超时
jest.setTimeout(30000);

// 模拟浏览器环境
declare global {
  var window: Window & typeof globalThis;
  var document: Document;
  var navigator: Navigator;
  var testUtils: TestUtils;
  var mockFetch:
    | jest.MockedFunction<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>
    | undefined;
}

interface TestUtils {
  delay: (ms: number) => Promise<void>;
  mockFetch: (response: unknown) => void;
  restoreFetch: () => void;
}

// 创建模拟对象
const mockWindow = Object.create(window);
const mockDocument = Object.create(document);
const mockNavigator: Partial<Navigator> = {
  userAgent: 'jest',
  platform: 'jest',
  language: 'en-US',
};

global.window = mockWindow;
global.document = mockDocument;
global.navigator = mockNavigator as Navigator;

// 设置环境变量
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = ':memory:';

// 全局测试工具
global.testUtils = {
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  mockFetch: (response: unknown): void => {
    const mockFn = jest.fn((input: string | URL | Request, init?: RequestInit) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        clone: () => mockFn(input, init),
        body: null,
        bodyUsed: false,
        redirected: false,
        url: typeof input === 'string' ? input : input.toString(),
        type: 'application/json',
        bytes: () => Promise.resolve(new Uint8Array()),
        formData: () => Promise.resolve(new FormData()),
      } as unknown as Response);
    });

    global.mockFetch = mockFn as jest.MockedFunction<
      (input: string | URL | Request, init?: RequestInit) => Promise<Response>
    >;
  },

  restoreFetch: (): void => {
    if (global.mockFetch && global.mockFetch.mockRestore) {
      global.mockFetch.mockRestore();
    }
  },
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

export {};
