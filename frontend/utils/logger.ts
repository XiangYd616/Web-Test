
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

class FrontendLogger {
  private static instance: FrontendLogger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  static getInstance(): FrontendLogger {
    if (!FrontendLogger.instance) {
      FrontendLogger.instance = new FrontendLogger();
    }
    return FrontendLogger.instance;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const formattedMessage = this.formatMessage('error', message, context);

    if (error instanceof Error) {
      console.error(formattedMessage, error);
    } else if (error) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }

    // 在生产环境中，可以发送错误到监控服务
    if (!this.isDevelopment) {
      this.sendToMonitoring('error', message, { error, context });
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage('warn', message, context));
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(this.formatMessage('info', message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
  }

  // 用户操作日志
  userAction(action: string, details?: unknown, context?: LogContext): void {
    this.info(`User action: ${action}`, {
      ...context,
      action,
      details,
      type: 'user_action'
    });
  }

  // API调用日志
  apiCall(endpoint: string, method: string, status?: number, context?: LogContext): void {
    const message = `API ${method} ${endpoint}${status ? ` - ${status}` : ''}`;
    if (status && status >= 400) {
      this.error(message, undefined, { ...context, endpoint, method, status, type: 'api_error' });
    } else {
      this.debug(message, { ...context, endpoint, method, status, type: 'api_call' });
    }
  }

  // 性能日志
  performance(operation: string, duration: number, context?: LogContext): void {
    this.debug(`Performance: ${operation} took ${duration}ms`, {
      ...context,
      operation,
      duration,
      type: 'performance'
    });
  }

  private sendToMonitoring(level: string, message: string, data: unknown): void {
    // 在生产环境中实现错误监控
    // 例如发送到 Sentry, LogRocket 等服务
    try {
      // 这里可以集成第三方监控服务
      // window.gtag?.('event', 'exception', { description: message, fatal: level === 'error' });
    } catch (e) {
      // 静默处理监控服务错误
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// 导出单例实例
const Logger = FrontendLogger.getInstance();

export default Logger;
