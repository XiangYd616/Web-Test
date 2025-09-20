# BaseService API 文档

## 概览

`BaseService` 是所有共享服务的基类，提供统一的服务管理、错误处理和性能监控能力。经过重构升级到v2.0.0，集成了智能错误处理器和监控功能。

## 类定义

```javascript
import BaseService from './backend/engines/shared/services/BaseService.enhanced.js';

class MyService extends BaseService {
  constructor() {
    super('MyService');
    // 初始化逻辑
  }
}
```

## 构造函数

### `constructor(serviceName)`

创建一个新的服务实例。

**参数:**
- `serviceName` (string): 服务名称，用于日志和监控

**示例:**
```javascript
class MyService extends BaseService {
  constructor() {
    super('MyService');
  }
}
```

## 核心方法

### `async initialize()`

初始化服务，包括依赖检查和服务启动。

**返回值:** `Promise<boolean>` - 初始化是否成功

**示例:**
```javascript
const service = new MyService();
const success = await service.initialize();
if (success) {
  console.log('Service initialized successfully');
}
```

**特性:**
- 自动依赖检查
- 智能错误处理和重试
- 性能监控集成

### `checkAvailability()`

检查服务当前可用性状态。

**返回值:** `Object` - 服务状态信息
```javascript
{
  available: boolean,
  name: string,
  version: string,
  dependencies: Array,
  lastError: string | null,
  status: 'ready' | 'not_ready',
  errorStats: {
    totalErrors: number,
    recoverySuccessRate: number,
    criticalErrors: number
  }
}
```

**示例:**
```javascript
const status = service.checkAvailability();
console.log(`Service ${status.name} is ${status.status}`);
```

### `validateConfig(config, schema)`

验证配置参数的有效性。

**参数:**
- `config` (Object): 要验证的配置对象
- `schema` (Object, 可选): 验证模式

**返回值:** `Object` - 验证后的配置

**抛出异常:**
- `ServiceError` (ErrorCode.CONFIG_MISSING): 配置缺失
- `ServiceError` (ErrorCode.CONFIG_INVALID): 配置无效

**示例:**
```javascript
try {
  const validConfig = service.validateConfig({
    url: 'https://example.com',
    timeout: 5000
  });
} catch (error) {
  console.error('Config validation failed:', error.message);
}
```

## 错误处理方法

### `async executeWithErrorHandling(operation, context)`

安全执行操作，自动处理错误和恢复。

**参数:**
- `operation` (Function): 要执行的异步操作
- `context` (Object): 上下文信息，包含恢复策略

**返回值:** `Promise<any>` - 操作结果或恢复结果

**示例:**
```javascript
const result = await service.executeWithErrorHandling(async () => {
  return await riskyOperation();
}, {
  operationName: 'risky-operation',
  retryFunction: async () => await fallbackOperation(),
  fallbackFunction: async () => ({ fallback: true }),
  degradeFunction: async () => ({ degraded: true })
});
```

### `createError(code, details, cause)`

创建标准化的服务错误。

**参数:**
- `code` (number): 错误代码 (来自 ErrorCode)
- `details` (Object): 错误详细信息
- `cause` (Error, 可选): 原始错误

**返回值:** `ServiceError` - 标准化错误对象

**示例:**
```javascript
const error = service.createError(
  ErrorCode.VALIDATION_FAILED,
  { field: 'email', value: 'invalid-email' },
  originalError
);
throw error;
```

### `async safeExecute(operation, context)`

安全执行操作，返回标准响应格式。

**参数:**
- `operation` (Function): 要执行的操作
- `context` (string): 操作上下文描述

**返回值:** `Promise<Object>` - 标准响应格式
```javascript
{
  success: boolean,
  service: string,
  timestamp: string,
  data?: any,
  error?: string,
  code?: number
}
```

**示例:**
```javascript
const response = await service.safeExecute(async () => {
  return await complexOperation();
}, 'complex-operation');

if (response.success) {
  console.log('Operation succeeded:', response.data);
} else {
  console.error('Operation failed:', response.error);
}
```

## 性能监控方法

### `measurePerformance(label, fn)`

包装函数以监控其性能。

**参数:**
- `label` (string): 操作标识
- `fn` (Function): 要监控的函数

**返回值:** `Function` - 包装后的函数

**示例:**
```javascript
const monitoredFunction = service.measurePerformance(
  'database-query',
  async (query) => {
    return await database.query(query);
  }
);

const result = await monitoredFunction('SELECT * FROM users');
```

### `getErrorStats()`

获取服务的错误统计信息。

**返回值:** `Object` - 错误统计数据
```javascript
{
  total: number,
  bySeverity: Object,
  byCategory: Object,
  byCode: Object,
  recoverySuccess: number,
  recoveryFailed: number,
  service: string,
  timestamp: string
}
```

### `resetErrorStats()`

重置错误统计数据。

**示例:**
```javascript
service.resetErrorStats();
console.log('Error statistics reset');
```

## 响应格式方法

### `createSuccessResponse(data, metadata)`

创建成功响应格式。

**参数:**
- `data` (any): 响应数据
- `metadata` (Object, 可选): 元数据

**返回值:** `Object` - 标准成功响应

### `createErrorResponse(error, context)`

创建错误响应格式。

**参数:**
- `error` (Error): 错误对象
- `context` (string): 错误上下文

**返回值:** `Object` - 标准错误响应

## 服务信息方法

### `getServiceInfo()`

获取完整的服务信息。

**返回值:** `Object` - 服务详细信息
```javascript
{
  name: string,
  version: string,
  initialized: boolean,
  capabilities: Array,
  dependencies: Array,
  errorHandler: {
    stats: Object,
    hasRecoveryStrategies: boolean
  }
}
```

### `getCapabilities()`

获取服务能力列表（子类应重写）。

**返回值:** `Array<string>` - 服务能力列表

默认返回：
```javascript
['error-handling', 'recovery', 'performance-monitoring']
```

## 生命周期方法

### `async cleanup()`

清理服务资源，关闭连接等。

**示例:**
```javascript
await service.cleanup();
console.log('Service cleaned up');
```

## 事件处理

### `onError(error, context)`

错误事件处理器（可被子类重写）。

**参数:**
- `error` (ServiceError): 错误对象
- `context` (Object): 错误上下文

**示例:**
```javascript
class MyService extends BaseService {
  onError(error, context) {
    super.onError(error, context);
    
    // 自定义错误处理逻辑
    if (error.severity === 'critical') {
      this.notifyAdministrator(error);
    }
  }
}
```

## 配置选项

BaseService支持以下配置选项（通过ErrorHandler）：

```javascript
{
  enableLogging: true,        // 启用日志
  enableRecovery: true,       // 启用错误恢复
  enableMetrics: true,        // 启用指标收集
  maxRetryAttempts: 3,        // 最大重试次数
  retryDelayMs: 1000         // 重试延迟时间
}
```

## 最佳实践

### 1. 服务初始化
```javascript
class MyService extends BaseService {
  async performInitialization() {
    // 检查外部依赖
    await this.checkExternalDependencies();
    
    // 初始化内部状态
    this.initializeInternalState();
    
    // 设置定时任务
    this.startPeriodicTasks();
  }
}
```

### 2. 错误处理
```javascript
class MyService extends BaseService {
  async doComplexOperation() {
    return await this.executeWithErrorHandling(async () => {
      return await this.actualOperation();
    }, {
      operationName: 'complex-operation',
      retryFunction: async () => await this.retryLogic(),
      fallbackFunction: async () => await this.fallbackLogic()
    });
  }
}
```

### 3. 性能监控
```javascript
class MyService extends BaseService {
  constructor() {
    super('MyService');
    this.queryDB = this.measurePerformance('db-query', this.queryDB.bind(this));
  }
  
  async queryDB(sql) {
    // 实际数据库查询逻辑
  }
}
```

## 注意事项

1. **初始化顺序**: 总是先调用 `await super.initialize()` 
2. **错误处理**: 使用 `createError()` 创建标准化错误
3. **性能监控**: 对关键操作使用 `measurePerformance()`
4. **资源清理**: 在 `cleanup()` 方法中清理所有资源
5. **配置验证**: 始终验证输入配置的有效性

## 相关文档

- [Error Handling Guide](../errors/ErrorHandling.md)
- [Monitoring Integration](../monitoring/MonitoringService.md)
- [Best Practices](../guides/BestPractices.md)
