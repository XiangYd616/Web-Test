/**
 * 错误日志聚合系统
 * 统一收集、存储和管理错误日志
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const { configCenter } = require('../config/ConfigCenter');

/**
 * 日志级别
 */
const LogLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * 日志输出器接口
 */
class LogOutput {
  async write(logEntry) {
    throw new Error('write method must be implemented');
  }
  
  async close() {
    // 可选实现
  }
}

/**
 * 控制台日志输出器
 */
class ConsoleLogOutput extends LogOutput {
  constructor(options = {}) {
    super();
    this.colorize = options.colorize !== false;
    this.colors = {
      error: '\x1b[31m',   // 红色
      warn: '\x1b[33m',    // 黄色
      info: '\x1b[36m',    // 青色
      debug: '\x1b[37m',   // 白色
      reset: '\x1b[0m'     // 重置
    };
  }

  async write(logEntry) {
    const timestamp = new Date(logEntry.timestamp).toLocaleString();
    const level = logEntry.level.toUpperCase();
    const message = logEntry.message;
    
    let output = `[${timestamp}] [${level}] ${message}`;
    
    if (logEntry.details && Object.keys(logEntry.details).length > 0) {
      output += '\n' + JSON.stringify(logEntry.details, null, 2);
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
class FileLogOutput extends LogOutput {
  constructor(options = {}) {
    super();
    this.logDir = options.logDir || './logs';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 10;
    this.currentFile = null;
    this.currentFileSize = 0;
    this.fileHandles = new Map();
  }

  async initialize() {
    // 确保日志目录存在
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('创建日志目录失败:', error);
    }
  }

  async write(logEntry) {
    try {
      const fileName = this.getLogFileName(logEntry);
      const filePath = path.join(this.logDir, fileName);
      
      // 检查文件大小，必要时轮转
      await this.checkFileRotation(filePath);
      
      const logLine = this.formatLogEntry(logEntry) + '\n';
      
      await fs.appendFile(filePath, logLine);
      this.currentFileSize += Buffer.byteLength(logLine);
      
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  getLogFileName(logEntry) {
    const date = new Date(logEntry.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    return `${logEntry.level}-${dateStr}.log`;
  }

  formatLogEntry(logEntry) {
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
      stack: logEntry.stack
    });
  }

  async checkFileRotation(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.maxFileSize) {
        await this.rotateFile(filePath);
      }
    } catch (error) {
      // 文件不存在，无需轮转
      this.currentFileSize = 0;
    }
  }

  async rotateFile(filePath) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    
    // 轮转现有文件
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const oldFile = path.join(dir, `${base}.${i}${ext}`);
      const newFile = path.join(dir, `${base}.${i + 1}${ext}`);
      
      try {
        await fs.rename(oldFile, newFile);
      } catch (error) {
        // 文件不存在，忽略错误
      }
    }
    
    // 重命名当前文件
    const rotatedFile = path.join(dir, `${base}.1${ext}`);
    try {
      await fs.rename(filePath, rotatedFile);
      this.currentFileSize = 0;
    } catch (error) {
      console.error('文件轮转失败:', error);
    }
  }

  async close() {
    // 关闭所有文件句柄
    for (const handle of this.fileHandles.values()) {
      try {
        await handle.close();
      } catch (error) {
        console.error('关闭文件句柄失败:', error);
      }
    }
    this.fileHandles.clear();
  }
}

/**
 * 远程日志输出器（用于集成ELK等）
 */
class RemoteLogOutput extends LogOutput {
  constructor(options = {}) {
    super();
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 5000;
    this.buffer = [];
    this.flushTimer = null;
    
    this.startFlushTimer();
  }

  async write(logEntry) {
    this.buffer.push(logEntry);
    
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  startFlushTimer() {
    this.flushTimer = setInterval(async () => {
      if (this.buffer.length > 0) {
        await this.flush();
      }
    }, this.flushInterval);
  }

  async flush() {
    if (this.buffer.length === 0) return;
    
    const batch = this.buffer.splice(0);
    
    try {
      // 发送到远程日志服务
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ logs: batch })
      });
      
      if (!response.ok) {
        throw new Error(`远程日志服务响应错误: ${response.status}`);
      }
      
    } catch (error) {
      console.error('发送远程日志失败:', error);
      // 将失败的日志重新加入缓冲区（可选）
      // this.buffer.unshift(...batch);
    }
  }

  async close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // 刷新剩余日志
    await this.flush();
  }
}

/**
 * 错误日志聚合器
 */
class ErrorLogAggregator extends EventEmitter {
  constructor() {
    super();
    this.outputs = [];
    this.isInitialized = false;
    this.logQueue = [];
    this.processing = false;
    
    // 配置
    this.config = {
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      logLevel: LogLevels.ERROR,
      maxQueueSize: 1000,
      batchSize: 10,
      flushInterval: 1000
    };
  }

  /**
   * 初始化聚合器
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // 从配置中心加载配置
      this.loadConfiguration();
      
      // 设置日志输出器
      await this.setupOutputs();
      
      // 启动日志处理
      this.startLogProcessing();
      
      this.isInitialized = true;
      console.log('✅ 错误日志聚合器初始化完成');
      
    } catch (error) {
      console.error('❌ 错误日志聚合器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 从配置中心加载配置
   */
  loadConfiguration() {
    this.config.enableConsole = configCenter.get('logging.enableConsole', true);
    this.config.enableFile = configCenter.get('logging.enableFile', false);
    this.config.logLevel = configCenter.get('logging.level', LogLevels.ERROR);
    
    // 监听配置变更
    configCenter.watch('logging.enableConsole', (newValue) => {
      this.config.enableConsole = newValue;
      this.reconfigureOutputs();
    });
    
    configCenter.watch('logging.enableFile', (newValue) => {
      this.config.enableFile = newValue;
      this.reconfigureOutputs();
    });
    
    configCenter.watch('logging.level', (newValue) => {
      this.config.logLevel = newValue;
    });
  }

  /**
   * 设置日志输出器
   */
  async setupOutputs() {
    this.outputs = [];
    
    // 控制台输出
    if (this.config.enableConsole) {
      this.outputs.push(new ConsoleLogOutput({
        colorize: process.env.NODE_ENV !== 'production'
      }));
    }
    
    // 文件输出
    if (this.config.enableFile) {
      const fileOutput = new FileLogOutput({
        logDir: configCenter.get('storage.logsDir', './logs'),
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10
      });
      
      await fileOutput.initialize();
      this.outputs.push(fileOutput);
    }
    
    // 远程输出（如果配置了）
    const remoteEndpoint = configCenter.get('logging.remoteEndpoint');
    if (this.config.enableRemote && remoteEndpoint) {
      this.outputs.push(new RemoteLogOutput({
        endpoint: remoteEndpoint,
        apiKey: configCenter.get('logging.remoteApiKey'),
        batchSize: 50,
        flushInterval: 5000
      }));
    }
  }

  /**
   * 重新配置输出器
   */
  async reconfigureOutputs() {
    // 关闭现有输出器
    for (const output of this.outputs) {
      if (output.close) {
        await output.close();
      }
    }
    
    // 重新设置输出器
    await this.setupOutputs();
  }

  /**
   * 启动日志处理
   */
  startLogProcessing() {
    setInterval(async () => {
      if (!this.processing && this.logQueue.length > 0) {
        await this.processLogQueue();
      }
    }, this.config.flushInterval);
  }

  /**
   * 处理日志队列
   */
  async processLogQueue() {
    if (this.processing || this.logQueue.length === 0) return;
    
    this.processing = true;
    
    try {
      const batch = this.logQueue.splice(0, this.config.batchSize);
      
      for (const logEntry of batch) {
        await this.writeToOutputs(logEntry);
      }
      
    } catch (error) {
      console.error('处理日志队列失败:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * 写入到所有输出器
   */
  async writeToOutputs(logEntry) {
    const writePromises = this.outputs.map(async (output) => {
      try {
        await output.write(logEntry);
      } catch (error) {
        console.error('日志输出器写入失败:', error);
      }
    });
    
    await Promise.allSettled(writePromises);
  }

  /**
   * 记录日志
   */
  async log(logData) {
    // 检查日志级别
    if (!this.shouldLog(logData.level || LogLevels.ERROR)) {
      return;
    }
    
    // 标准化日志条目
    const logEntry = this.normalizeLogEntry(logData);
    
    // 添加到队列
    if (this.logQueue.length < this.config.maxQueueSize) {
      this.logQueue.push(logEntry);
    } else {
      console.warn('日志队列已满，丢弃日志条目');
    }
    
    // 触发事件
    this.emit('log', logEntry);
  }

  /**
   * 检查是否应该记录日志
   */
  shouldLog(level) {
    const levels = [LogLevels.ERROR, LogLevels.WARN, LogLevels.INFO, LogLevels.DEBUG];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex <= currentLevelIndex;
  }

  /**
   * 标准化日志条目
   */
  normalizeLogEntry(logData) {
    return {
      timestamp: logData.timestamp || new Date().toISOString(),
      level: logData.level || LogLevels.ERROR,
      message: logData.message || '未知错误',
      errorId: logData.errorId,
      type: logData.type,
      severity: logData.severity,
      code: logData.code,
      statusCode: logData.statusCode,
      requestId: logData.requestId,
      userId: logData.userId,
      sessionId: logData.sessionId,
      correlationId: logData.correlationId,
      details: logData.details || {},
      context: logData.context || {},
      stack: logData.stack,
      retryable: logData.retryable
    };
  }

  /**
   * 搜索日志
   */
  async searchLogs(criteria = {}) {
    // 这里可以实现日志搜索功能
    // 对于文件日志，可以读取文件并过滤
    // 对于远程日志，可以调用远程API
    
    const results = [];
    
    // 简单的文件搜索实现
    if (this.config.enableFile) {
      try {
        const logDir = configCenter.get('storage.logsDir', './logs');
        const files = await fs.readdir(logDir);
        
        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(logDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const logEntry = JSON.parse(line);
                if (this.matchesCriteria(logEntry, criteria)) {
                  results.push(logEntry);
                }
              } catch (error) {
                // 忽略解析错误
              }
            }
          }
        }
      } catch (error) {
        console.error('搜索日志失败:', error);
      }
    }
    
    return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * 检查日志条目是否匹配搜索条件
   */
  matchesCriteria(logEntry, criteria) {
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
  getStatus() {
    return {
      initialized: this.isInitialized,
      config: this.config,
      queueSize: this.logQueue.length,
      outputsCount: this.outputs.length,
      processing: this.processing
    };
  }

  /**
   * 关闭聚合器
   */
  async close() {
    // 处理剩余日志
    await this.processLogQueue();
    
    // 关闭所有输出器
    for (const output of this.outputs) {
      if (output.close) {
        await output.close();
      }
    }
    
    this.outputs = [];
    this.isInitialized = false;
    
    console.log('📝 错误日志聚合器已关闭');
  }
}

// 创建全局实例
const errorLogAggregator = new ErrorLogAggregator();

module.exports = {
  ErrorLogAggregator,
  LogLevels,
  ConsoleLogOutput,
  FileLogOutput,
  RemoteLogOutput,
  errorLogAggregator
};
