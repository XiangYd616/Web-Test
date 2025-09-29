/**
 * Vitest 测试环境设置文件
 * 配置全局测试环境和模拟对象
 */

import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// 扩展expect匹配器
expect.extend(matchers);

// 每个测试后清理
afterEach(() => {
  cleanup();
});

// 模拟环境变量
beforeAll(() => {
  Object.defineProperty(window, 'process', {
    value: {
      env: {
        NODE_ENV: 'test',
        VITE_DEV_PORT: '5174',
        REACT_APP_API_URL: 'http://localhost:3001/api'
      }
    }
  });

  // 模拟localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // 模拟sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
  });

  // 模拟window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:5174/',
      origin: 'http://localhost:5174',
      protocol: 'http:',
      host: 'localhost:5174',
      hostname: 'localhost',
      port: '5174',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
  });

  // 模拟matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // 模拟ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // 模拟IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
  }));

  // 模拟fetch
  global.fetch = vi.fn();

  // 模拟WebSocket
  global.WebSocket = vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    send: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  }));

  // 模拟console方法以避免测试输出噪音
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});

  // 模拟performance
  Object.defineProperty(window, 'performance', {
    value: {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
    }
  });

  // 模拟requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
  global.cancelAnimationFrame = vi.fn();

  // 模拟URL构造函数
  global.URL = class URL {
    constructor(url: string, base?: string) {
      return new window.URL(url, base);
    }
  };
});

// 全局测试清理
afterAll(() => {
  vi.restoreAllMocks();
});

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Global error in test:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in test:', event.reason);
});

// 导出测试工具函数
export const createMockApiResponse = <T>(data: T, success = true) => {
  return {
    success,
    data: success ? data : undefined,
    error: success ? undefined : { code: 'TEST_ERROR', message: 'Test error' },
    timestamp: new Date().toISOString()
  };
};

export const createMockUser = () => ({
  id: 'test-user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user' as const,
  status: 'active' as const,
  permissions: [],
  profile: {
    firstName: 'Test',
    lastName: 'User',
    timezone: 'UTC'
  },
  preferences: {
    theme: 'light' as const,
    language: 'zh-CN' as const,
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD' as const,
    timeFormat: '24h' as const,
    notifications: {
      email: true,
      sms: false,
      push: true,
      browser: true,
      testComplete: true,
      testFailed: true,
      weeklyReport: false,
      securityAlert: true
    }
  },
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));
