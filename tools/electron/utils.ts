import { app } from 'electron';
import * as winston from 'winston';
import { join } from 'path';

// 检查是否为开发环境
export const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 创建日志记录器
const logDir = isDev ? join(process.cwd(), 'logs') : join(app.getPath('userData'), 'logs');

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'electron-main' },
  transports: [
    // 写入所有日志到 combined.log
    new winston.transports.File({ 
      filename: join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 写入错误日志到 error.log
    new winston.transports.File({ 
      filename: join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
  ],
});

// 如果是开发环境，也输出到控制台
if (isDev) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 导出工具函数
export const utils = {
  isDev,
  logger,
  
  // 格式化字节大小
  formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // 格式化时间
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },

  // 安全的JSON解析
  safeJsonParse<T>(str: string, defaultValue: T): T {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  },

  // 延迟函数
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

export default utils;
