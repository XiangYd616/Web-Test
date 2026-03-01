/**
 * 测试事件通道 — 策略模式抽象
 *
 * 统一桌面端（IPC）和 Web 端（WebSocket）的事件订阅接口，
 * 让 TestProvider 不再关心底层传输方式。
 */

import type { TestProgressInfo, TestStatus } from '../context/TestContext';
import { isDesktop } from '../utils/environment';
import { getSocket, waitForConnection } from './socketService';

// ── 回调接口 ──

export interface TestEventHandlers {
  onProgress: (info: TestProgressInfo) => void;
  onLog: (log: {
    level: 'info' | 'warn' | 'error';
    message: string;
    timestamp?: string;
    context?: Record<string, unknown>;
  }) => void;
  onCompleted: (testId: string) => void;
  onError: (testId: string, errorMessage?: string) => void;
}

export interface TestEventSubscription {
  unsubscribe: () => void;
}

// ── 桌面端 IPC 通道 ──

function subscribeIpc(testId: string, handlers: TestEventHandlers): TestEventSubscription {
  const engine = window.electronAPI?.testEngine;
  let removeListener: (() => void) | null = null;

  if (engine?.onTestEvent) {
    removeListener = engine.onTestEvent((event, data) => {
      if (String(data.testId) !== testId) return;

      if (event === 'test-progress') {
        const step = data.currentStep ?? data.message;
        const statsRaw = data.stats;
        const stats =
          statsRaw && typeof statsRaw === 'object' && !Array.isArray(statsRaw)
            ? (statsRaw as TestProgressInfo['stats'])
            : undefined;
        handlers.onProgress({
          progress: Number(data.progress ?? 0),
          status: data.status ? (String(data.status) as TestStatus) : undefined,
          currentStep: step ? String(step) : undefined,
          stats,
        });
      } else if (event === 'test-log') {
        handlers.onLog({
          level: (data.level as 'info' | 'warn' | 'error') || 'info',
          message: String(data.message || ''),
          timestamp: data.timestamp ? String(data.timestamp) : undefined,
          context:
            data.context && typeof data.context === 'object' && !Array.isArray(data.context)
              ? (data.context as Record<string, unknown>)
              : undefined,
        });
      } else if (event === 'test-completed') {
        handlers.onCompleted(testId);
      } else if (event === 'test-error') {
        handlers.onError(testId, data.errorMessage ? String(data.errorMessage) : undefined);
      }
    });
  }

  return {
    unsubscribe: () => {
      removeListener?.();
    },
  };
}

// ── Web 端 WebSocket 通道 ──

function subscribeWebSocket(testId: string, handlers: TestEventHandlers): TestEventSubscription {
  const socket = getSocket();

  const progressHandler = (data: Record<string, unknown>) => {
    if (String(data.testId) !== testId) return;
    const statsRaw =
      data.stats ??
      (data.extra && typeof data.extra === 'object' && !Array.isArray(data.extra)
        ? (data.extra as Record<string, unknown>).stats
        : undefined);
    const stats =
      statsRaw && typeof statsRaw === 'object' && !Array.isArray(statsRaw)
        ? (statsRaw as TestProgressInfo['stats'])
        : undefined;
    const step = data.currentStep ?? data.message;
    handlers.onProgress({
      progress: Number(data.progress ?? 0),
      status: data.status ? (String(data.status) as TestStatus) : undefined,
      currentStep: step ? String(step) : undefined,
      stats,
    });
  };

  const logHandler = (data: Record<string, unknown>) => {
    if (String(data.testId) !== testId) return;
    handlers.onLog({
      level: (data.level as 'info' | 'warn' | 'error') || 'info',
      message: String(data.message || ''),
      timestamp: data.timestamp ? String(data.timestamp) : undefined,
      context:
        data.context && typeof data.context === 'object' && !Array.isArray(data.context)
          ? (data.context as Record<string, unknown>)
          : undefined,
    });
  };

  const completedHandler = (data: Record<string, unknown>) => {
    if (String(data.testId) === testId) handlers.onCompleted(testId);
  };

  const errorHandler = (data: Record<string, unknown>) => {
    if (String(data.testId) === testId) {
      handlers.onError(testId, data.errorMessage ? String(data.errorMessage) : undefined);
    }
  };

  socket.on('test-progress', progressHandler);
  socket.on('test-log', logHandler);
  socket.on('test-completed', completedHandler);
  socket.on('test-error', errorHandler);

  return {
    unsubscribe: () => {
      socket.off('test-progress', progressHandler);
      socket.off('test-log', logHandler);
      socket.off('test-completed', completedHandler);
      socket.off('test-error', errorHandler);
    },
  };
}

// ── 公共 API ──

/**
 * 等待事件通道就绪（Web 端等待 WS 连接，桌面端立即返回）
 */
export async function waitChannelReady(): Promise<void> {
  if (!isDesktop()) {
    await waitForConnection();
  }
}

/**
 * 订阅测试事件（自动选择 IPC 或 WebSocket 通道）
 */
export function subscribe(testId: string, handlers: TestEventHandlers): TestEventSubscription {
  if (isDesktop()) {
    return subscribeIpc(testId, handlers);
  }
  return subscribeWebSocket(testId, handlers);
}

/**
 * 获取当前环境的保底轮询间隔
 * 桌面端 IPC 为主，3s 轮询兜底；Web 端 WS 为主，15s 轮询兜底
 */
export function getPollInterval(): number {
  return isDesktop() ? 3000 : 5000;
}
