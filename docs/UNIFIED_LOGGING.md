# 📝 统一日志系统指南

## 📋 概述

Test Web App 采用统一的日志系统，提供前后端一致的日志管理机制，支持分级日志、结构化记录、性能监控和错误追踪，为系统监控和问题诊断提供强有力的支持。

## 🌟 核心特性

### 1. **前后端统一**
- **一致的日志格式**: 前后端使用相同的日志结构
- **统一的日志级别**: ERROR、WARN、INFO、DEBUG四级日志
- **相同的元数据**: 时间戳、用户ID、请求ID等统一字段

### 2. **结构化日志**
- **JSON格式**: 便于解析和分析的结构化格式
- **标准字段**: 时间、级别、消息、上下文等标准字段
- **自定义元数据**: 支持添加业务相关的自定义字段

### 3. **智能分类**
- **HTTP请求日志**: API调用和响应时间记录
- **数据库操作日志**: SQL查询和执行时间
- **用户操作日志**: 用户行为和操作记录
- **系统事件日志**: 系统启动、配置变更等事件
- **错误日志**: 详细的错误信息和堆栈跟踪

## 🚀 快速开始

### 前端日志使用

```typescript
import { logger } from '@/utils/logger';

// 基础日志记录
logger.info('用户登录成功', { userId: '123', ip: '192.168.1.1' });
logger.warn('API响应时间较长', { endpoint: '/api/test', responseTime: 3000 });
logger.error('网络请求失败', new Error('Connection timeout'));

// 用户操作日志
logger.user('user-123', 'start_test', '开始压力测试', {
  testType: 'stress',
  url: 'https://example.com'
});

// 性能日志
logger.performance('page_load', 2500, {
  page: '/stress-test',
  resources: 15
});
```

### 后端日志使用

```javascript
const Logger = require('./utils/logger');

// 基础日志记录
Logger.info('服务器启动成功', { port: 3001, env: 'production' });
Logger.warn('数据库连接池使用率较高', { usage: 85, max: 100 });
Logger.error('数据库查询失败', error, { query: 'SELECT * FROM tests' });

// HTTP请求日志
Logger.http('GET', '/api/test/stress', 200, 150, { userId: 'user-123' });

// 数据库操作日志
Logger.db('SELECT', 'test_records', 45, { rows: 100 });

// API调用日志
Logger.api('/api/integrations/slack', 'POST', 200, 250, 'user-123');
```

## 📊 日志级别详解

### ERROR (错误)
- **用途**: 记录系统错误和异常
- **包含**: 错误消息、堆栈跟踪、上下文信息
- **示例**: 数据库连接失败、API调用异常、用户认证错误

```json
{
  "timestamp": "2025-08-03T12:30:00.000Z",
  "level": "error",
  "message": "数据库连接失败",
  "error": {
    "name": "ConnectionError",
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n    at ..."
  },
  "context": {
    "database": "testweb_prod",
    "host": "localhost",
    "port": 5432
  }
}
```

### WARN (警告)
- **用途**: 记录潜在问题和异常情况
- **包含**: 警告消息、相关指标、建议操作
- **示例**: 响应时间过长、资源使用率高、配置不当

```json
{
  "timestamp": "2025-08-03T12:30:00.000Z",
  "level": "warn",
  "message": "API响应时间超过阈值",
  "context": {
    "endpoint": "/api/test/stress",
    "responseTime": 3500,
    "threshold": 2000,
    "userId": "user-123"
  }
}
```

### INFO (信息)
- **用途**: 记录重要的业务事件和状态变化
- **包含**: 事件描述、相关数据、操作结果
- **示例**: 用户登录、测试开始、配置更新

```json
{
  "timestamp": "2025-08-03T12:30:00.000Z",
  "level": "info",
  "message": "用户开始压力测试",
  "context": {
    "userId": "user-123",
    "testType": "stress",
    "url": "https://example.com",
    "config": {
      "users": 100,
      "duration": "5m"
    }
  }
}
```

### DEBUG (调试)
- **用途**: 记录详细的调试信息
- **包含**: 函数调用、变量值、执行流程
- **示例**: 函数参数、中间结果、状态变化

```json
{
  "timestamp": "2025-08-03T12:30:00.000Z",
  "level": "debug",
  "message": "处理测试配置",
  "context": {
    "function": "processTestConfig",
    "input": { "users": 100, "duration": "5m" },
    "output": { "virtualUsers": 100, "durationMs": 300000 }
  }
}
```

## 🔧 配置管理

### 前端日志配置

```typescript
// src/utils/logger.ts
const loggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: '/api/logs',
  batchSize: 10,
  flushInterval: 5000
};
```

### 后端日志配置

```javascript
// server/utils/logger.js
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL === 'debug' ? LOG_LEVELS.DEBUG :
  process.env.LOG_LEVEL === 'info' ? LOG_LEVELS.INFO :
  process.env.LOG_LEVEL === 'warn' ? LOG_LEVELS.WARN :
  LOG_LEVELS.ERROR;
```

### 环境变量配置

```env
# 日志级别设置
LOG_LEVEL=info

# 日志文件配置
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=10MB
LOG_MAX_FILES=5

# 远程日志配置
REMOTE_LOGGING_ENABLED=true
REMOTE_LOG_ENDPOINT=https://logs.company.com/api/ingest
```

## 📈 性能监控日志

### HTTP请求监控
```javascript
// 自动记录所有HTTP请求
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.http(req.method, req.path, res.statusCode, duration, {
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});
```

### 数据库查询监控
```javascript
// 数据库查询性能监控
const originalQuery = db.query;
db.query = function(sql, params) {
  const start = Date.now();
  
  return originalQuery.call(this, sql, params).then(result => {
    const duration = Date.now() - start;
    Logger.db('QUERY', getTableName(sql), duration, {
      sql: sql.substring(0, 100),
      rows: result.rowCount
    });
    return result;
  });
};
```

## 🔍 错误追踪

### 错误上下文收集
```typescript
// 前端错误处理
window.addEventListener('error', (event) => {
  logger.error('JavaScript运行时错误', event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    url: window.location.href,
    userAgent: navigator.userAgent
  });
});

// React错误边界
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logger.error('React组件错误', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    });
  }
}
```

### 后端错误处理
```javascript
// 全局错误处理中间件
app.use((error, req, res, next) => {
  Logger.error('未处理的请求错误', error, {
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    body: req.body,
    headers: req.headers
  });
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    errorId: generateErrorId()
  });
});
```

## 📊 日志分析和监控

### 日志聚合查询
```javascript
// 获取错误统计
GET /api/logs/stats?level=error&timeRange=24h

// 获取性能指标
GET /api/logs/performance?metric=responseTime&groupBy=endpoint

// 获取用户操作统计
GET /api/logs/users?action=start_test&timeRange=7d
```

### 实时监控告警
```javascript
// 错误率监控
const errorRateMonitor = {
  threshold: 5, // 5%
  window: '5m',
  action: 'alert'
};

// 响应时间监控
const responseTimeMonitor = {
  threshold: 2000, // 2秒
  percentile: 95,
  action: 'notify'
};
```

## 🛠️ 日志工具和集成

### 日志轮转
```javascript
// Winston日志轮转配置
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
});
```

### 第三方集成
```javascript
// ELK Stack集成
const elasticsearchTransport = new winston.transports.Elasticsearch({
  level: 'info',
  clientOpts: {
    host: 'http://localhost:9200'
  },
  index: 'testweb-logs'
});

// Sentry集成
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });

Logger.error = (message, error, context) => {
  console.error(formatLogMessage('error', message, context));
  Sentry.captureException(error, { extra: context });
};
```

## 🎯 最佳实践

### 1. **日志内容**
- 记录关键业务事件和状态变化
- 包含足够的上下文信息便于问题诊断
- 避免记录敏感信息（密码、Token等）
- 使用结构化格式便于分析

### 2. **性能考虑**
- 合理设置日志级别避免过多输出
- 使用异步日志记录避免阻塞主流程
- 定期清理旧日志文件释放存储空间
- 考虑使用日志缓冲减少I/O操作

### 3. **监控和告警**
- 建立日志监控和告警机制
- 定期分析日志发现潜在问题
- 建立日志分析仪表板
- 制定日志保留和归档策略

---

**更多信息**: 如需更详细的配置说明，请参考系统配置文档或联系技术支持。
