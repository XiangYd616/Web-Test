/**
 * 全局 Console 日志存储
 * 独立于组件，方便在任意模块中写入日志
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export type ConsoleEntry = {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  detail?: string;
  // 扩展字段：支持测试相关信息
  metadata?: {
    testId?: string;
    testType?: string;
    url?: string;
    duration?: number;
    status?: string;
  };
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: unknown;
    time?: number;
  };
  stack?: string;
};

let entries: ConsoleEntry[] = [];
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(fn => fn());

export const consoleLog = (
  level: LogLevel,
  message: string,
  detail?: string,
  extra?: Partial<Omit<ConsoleEntry, 'id' | 'timestamp' | 'level' | 'message' | 'detail'>>
) => {
  entries = [
    ...entries,
    {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      level,
      message,
      detail,
      ...extra,
    },
  ].slice(-500);
  notify();
};

export const consoleClear = () => {
  entries = [];
  notify();
};

export const getConsoleEntries = () => entries;

export const subscribeConsole = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
