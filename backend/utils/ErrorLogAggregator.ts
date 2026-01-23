/**
 * 错误日志聚合系统
 * 统一收集、存储和管理错误日志
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import https from 'https';
import path from 'path';
import { configCenter } from '../config/ConfigCenter';
import Logger from './logger';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  errorId?: string;
  type?: string;
  severity?: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  details?: Record<string, unknown>;
  context?: Record<string, unknown>;
  stack?: string;
  retryable?: boolean;
}

interface LogCriteria {
  level?: LogLevel;
  type?: string;
  severity?: string;
  userId?: string;
  startTime?: string;
  endTime?: string;
  message?: string;
}

interface LogConfig {
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  logLevel: LogLevel;
  maxQueueSize: number;
  batchSize: number;
  flushInterval: number;
}

/**
 * 日志级别
 */
export const LogLevels: Record<string, LogLevel> = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

/**
 * 日志输出器接口
 */
export class LogOutput {
  async write(_logEntry: LogEntry): Promise<void> {
    throw new Error('write method must be implemented');
  }

  async close(): Promise<void> {
    // 可选实现
  }
}

/**
 * 控制台日志输出器
 */
export class ConsoleLogOutput extends LogOutput {
  private colorize: boolean;

  private colors: Record<LogLevel | 'reset', string>;

  constructor(options: { colorize?: boolean } = {}) {
    super();
    this.colorize = options.colorize !== false;
    this.colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[37m',
      reset: '\x1b[0m',
    };
  }

  async write(logEntry: LogEntry): Promise<void> {
    const timestamp = new Date(logEntry.timestamp).toLocaleString();
    const level = logEntry.level.toUpperCase();
    const message = logEntry.message;

    let output = `[${timestamp}] [${level}] ${message}`;

    if (logEntry.details && Object.keys(logEntry.details).length > 0) {
      output += `\n${JSON.stringify(logEntry.details, null, 2)}`;
    }

    if (this.colorize && this.colors[logEntry.level]) {
      output = this.colors[logEntry.level] + output + this.colors.reset;
    }

    console.log(output);
  }
}

/**
 * 文件日志输出器
 */
export class FileLogOutput extends LogOutput {
  private logDir: string;

  private maxFileSize: number;

  private maxFiles: number;

  private currentFileSize = 0;

  constructor(options: { logDir?: string; maxFileSize?: number; maxFiles?: number } = {}) {
    super();
    this.logDir = options.logDir || './logs';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
    this.maxFiles = options.maxFiles || 10;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('创建日志目录失败:', error);
    }
  }

  async write(logEntry: LogEntry): Promise<void> {
    try {
      const fileName = this.getLogFileName(logEntry);
      const filePath = path.join(this.logDir, fileName);

      await this.checkFileRotation(filePath);

      const logLine = `${this.formatLogEntry(logEntry)}\n`;

      await fs.appendFile(filePath, logLine);
      this.currentFileSize += Buffer.byteLength(logLine);
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  private getLogFileName(logEntry: LogEntry): string {
    const date = new Date(logEntry.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    return `${logEntry.level}-${dateStr}.log`;
  }

  private formatLogEntry(logEntry: LogEntry): string {
    return JSON.stringify({
      timestamp: logEntry.timestamp,
      level: logEntry.level,
      message: logEntry.message,
      errorId: logEntry.errorId,
      type: logEntry.type,
      severity: logEntry.severity,
      requestId: logEntry.requestId,
      userId: logEntry.userId,
      details: logEntry.details,
      context: logEntry.context,
      stack: logEntry.stack,
    });
  }

  private async checkFileRotation(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.maxFileSize) {
        await this.rotateFile(filePath);
      }
    } catch {
      this.currentFileSize = 0;
    }
  }

  private async rotateFile(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);

    for (let i = this.maxFiles - 1; i > 0; i -= 1) {
      const oldFile = path.join(dir, `${base}.${i}${ext}`);
      const newFile = path.join(dir, `${base}.${i + 1}${ext}`);

      try {
        await fs.rename(oldFile, newFile);
      } catch {
        // ignore
      }
    }

    const rotatedFile = path.join(dir, `${base}.1${ext}`);
    try {
      await fs.rename(filePath, rotatedFile);
      this.currentFileSize = 0;
    } catch (error) {
      console.error('文件轮转失败:', error);
    }
  }

  async close(): Promise<void> {
    // no-op for now
  }
}

/**
 * 远程日志输出器（用于集成ELK等）
 */
export class RemoteLogOutput extends LogOutput {
  private endpoint?: string;

  private apiKey?: string;

  private batchSize: number;

  private flushInterval: number;

  private buffer: LogEntry[] = [];

  private flushTimer?: NodeJS.Timeout;

  constructor(
    options: { endpoint?: string; apiKey?: string; batchSize?: number; flushInterval?: number } = {}
  ) {
    super();
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 5000;

    this.startFlushTimer();
  }

  async write(logEntry: LogEntry): Promise<void> {
    this.buffer.push(logEntry);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      if (this.buffer.length > 0) {
        await this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.endpoint) return;

    const batch = this.buffer.splice(0);

    try {
      await new Promise<void>((resolve, reject) => {
        const url = new URL(this.endpoint as string);
        const data = JSON.stringify({ logs: batch });

        const request = https.request(
          {
            method: 'POST',
            hostname: url.hostname,
            port: url.port || 443,
            path: `${url.pathname}${url.search}`,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
              Authorization: `Bearer ${this.apiKey ?? ''}`,
            },
          },
          res => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`远程日志服务响应错误: ${res.statusCode}`));
              return;
            }
            res.on('data', () => undefined);
            res.on('end', () => resolve());
          }
        );

        request.on('error', reject);
        request.write(data);
        request.end();
      });
    } catch (error) {
      console.error('发送远程日志失败:', error);
    }
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    await this.flush();
  }
}

/**
 * 错误日志聚合器
 */
export class ErrorLogAggregator extends EventEmitter {
  private outputs: LogOutput[] = [];

  private isInitialized = false;

  private logQueue: LogEntry[] = [];

  private processing = false;

  private config: LogConfig = {
    enableConsole: true,
    enableFile: false,
    enableRemote: false,
    logLevel: LogLevels.ERROR,
    maxQueueSize: 1000,
    batchSize: 10,
    flushInterval: 1000,
  };

  /**
   * 初始化聚合器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.loadConfiguration();
      await this.setupOutputs();
      this.startLogProcessing();

      this.isInitialized = true;
      Logger.system('error_log_aggregator_initialized', '错误日志聚合器初始化完成');
    } catch (error) {
      Logger.error('错误日志聚合器初始化失败', error);
      throw error;
    }
  }

  /**
   * 从配置中心加载配置
   */
  private loadConfiguration(): void {
    this.config.enableConsole = Boolean(configCenter.get('logging.enableConsole', true));
    this.config.enableFile = Boolean(configCenter.get('logging.enableFile', false));
    this.config.logLevel =
      (configCenter.get('logging.level', LogLevels.ERROR) as LogLevel) ?? LogLevels.ERROR;

    configCenter.watch('logging.enableConsole', newValue => {
      this.config.enableConsole = Boolean(newValue);
      void this.reconfigureOutputs();
    });

    configCenter.watch('logging.enableFile', newValue => {
      this.config.enableFile = Boolean(newValue);
      void this.reconfigureOutputs();
    });

    configCenter.watch('logging.level', newValue => {
      this.config.logLevel = (newValue as LogLevel) ?? LogLevels.ERROR;
    });
  }

  /**
   * 设置日志输出器
   */
  private async setupOutputs(): Promise<void> {
    this.outputs = [];

    if (this.config.enableConsole) {
      this.outputs.push(
        new ConsoleLogOutput({
          colorize: process.env.NODE_ENV !== 'production',
        })
      );
    }

    if (this.config.enableFile) {
      const fileOutput = new FileLogOutput({
        logDir: String(configCenter.get('storage.logsDir', './logs')),
        maxFileSize: 10 * 1024 * 1024,
        maxFiles: 10,
      });

      await fileOutput.initialize();
      this.outputs.push(fileOutput);
    }

    const remoteEndpoint = configCenter.get('logging.remoteEndpoint');
    if (this.config.enableRemote && remoteEndpoint) {
      this.outputs.push(
        new RemoteLogOutput({
          endpoint: String(remoteEndpoint),
          apiKey: String(configCenter.get('logging.remoteApiKey')),
          batchSize: 50,
          flushInterval: 5000,
        })
      );
    }
  }

  /**
   * 重新配置输出器
   */
  private async reconfigureOutputs(): Promise<void> {
    for (const output of this.outputs) {
      await output.close();
    }

    await this.setupOutputs();
  }

  /**
   * 启动日志处理
   */
  private startLogProcessing(): void {
    setInterval(async () => {
      if (!this.processing && this.logQueue.length > 0) {
        await this.processLogQueue();
      }
    }, this.config.flushInterval);
  }

  /**
   * 处理日志队列
   */
  private async processLogQueue(): Promise<void> {
    if (this.processing || this.logQueue.length === 0) return;

    this.processing = true;

    try {
      const batch = this.logQueue.splice(0, this.config.batchSize);

      for (const logEntry of batch) {
        await this.writeToOutputs(logEntry);
      }
    } catch (error) {
      Logger.error('处理日志队列失败', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * 写入到所有输出器
   */
  private async writeToOutputs(logEntry: LogEntry): Promise<void> {
    const writePromises = this.outputs.map(async output => {
      try {
        await output.write(logEntry);
      } catch (error) {
        Logger.error('日志输出器写入失败', error);
      }
    });

    await Promise.allSettled(writePromises);
  }

  /**
   * 记录日志
   */
  async log(logData: Partial<LogEntry>): Promise<void> {
    if (!this.shouldLog(logData.level ?? LogLevels.ERROR)) {
      return;
    }

    const logEntry = this.normalizeLogEntry(logData);

    if (this.logQueue.length < this.config.maxQueueSize) {
      this.logQueue.push(logEntry);
    } else {
      Logger.warn('日志队列已满，丢弃日志条目', { maxQueueSize: this.config.maxQueueSize });
    }

    this.emit('log', logEntry);
  }

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = [LogLevels.ERROR, LogLevels.WARN, LogLevels.INFO, LogLevels.DEBUG];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);

    return logLevelIndex <= currentLevelIndex;
  }

  /**
   * 标准化日志条目
   */
  private normalizeLogEntry(logData: Partial<LogEntry>): LogEntry {
    return {
      timestamp: logData.timestamp ?? new Date().toISOString(),
      level: logData.level ?? LogLevels.ERROR,
      message: logData.message ?? '未知错误',
      errorId: logData.errorId,
      type: logData.type,
      severity: logData.severity,
      code: logData.code,
      statusCode: logData.statusCode,
      requestId: logData.requestId,
      userId: logData.userId,
      sessionId: logData.sessionId,
      correlationId: logData.correlationId,
      details: logData.details ?? {},
      context: logData.context ?? {},
      stack: logData.stack,
      retryable: logData.retryable,
    };
  }

  /**
   * 搜索日志
   */
  async searchLogs(criteria: LogCriteria = {}): Promise<LogEntry[]> {
    const results: LogEntry[] = [];

    if (this.config.enableFile) {
      try {
        const logDir = String(configCenter.get('storage.logsDir', './logs'));
        const files = await fs.readdir(logDir);

        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(logDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());

            for (const line of lines) {
              try {
                const logEntry = JSON.parse(line) as LogEntry;
                if (this.matchesCriteria(logEntry, criteria)) {
                  results.push(logEntry);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        Logger.error('搜索日志失败', error);
      }
    }

    return results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * 检查日志条目是否匹配搜索条件
   */
  private matchesCriteria(logEntry: LogEntry, criteria: LogCriteria): boolean {
    if (criteria.level && logEntry.level !== criteria.level) {
      return false;
    }

    if (criteria.type && logEntry.type !== criteria.type) {
      return false;
    }

    if (criteria.severity && logEntry.severity !== criteria.severity) {
      return false;
    }

    if (criteria.userId && logEntry.userId !== criteria.userId) {
      return false;
    }

    if (criteria.startTime && new Date(logEntry.timestamp) < new Date(criteria.startTime)) {
      return false;
    }

    if (criteria.endTime && new Date(logEntry.timestamp) > new Date(criteria.endTime)) {
      return false;
    }

    if (criteria.message && !logEntry.message.includes(criteria.message)) {
      return false;
    }

    return true;
  }

  /**
   * 获取聚合器状态
   */
  getStatus(): Record<string, unknown> {
    return {
      initialized: this.isInitialized,
      config: this.config,
      queueSize: this.logQueue.length,
      outputsCount: this.outputs.length,
      processing: this.processing,
    };
  }

  /**
   * 关闭聚合器
   */
  async close(): Promise<void> {
    await this.processLogQueue();

    for (const output of this.outputs) {
      await output.close();
    }

    this.outputs = [];
    this.isInitialized = false;
  }
}

// 创建全局实例
export const errorLogAggregator = new ErrorLogAggregator();

// 兼容 CommonJS require
module.exports = {
  ErrorLogAggregator,
  LogLevels,
  ConsoleLogOutput,
  FileLogOutput,
  RemoteLogOutput,
  errorLogAggregator,
};
