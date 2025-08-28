/**
 * Vitest测试环境设置
 * 配置全局测试环境和模拟
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// 扩展expect匹配器
// expect.extend(matchers); // 临时注释掉，因为matchers未定义

// 每个测试后清理
afterEach(() => {
    cleanup();
});

// 模拟环境变量
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
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
}));

// 模拟fetch
global.fetch = vi.fn();

// 模拟localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// 模拟sessionStorage
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

// 模拟console方法以避免测试输出污染
global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

// 模拟URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// 模拟WebSocket
const MockWebSocket = vi.fn().mockImplementation(() => ({
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

// 添加静态属性
(MockWebSocket as any).CONNECTING = 0;
(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CLOSING = 2;
(MockWebSocket as any).CLOSED = 3;
(MockWebSocket as any).prototype = {};

global.WebSocket = MockWebSocket as any;

// 设置测试超时
vi.setConfig({ testTimeout: 10000 });