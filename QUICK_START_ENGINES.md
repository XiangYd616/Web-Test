# 测试引擎系统快速开始指南

## 🚀 5分钟快速上手

### 1. 查看可用引擎

```bash
# 启动服务器
npm run dev

# 在另一个终端，获取引擎列表
curl http://localhost:3001/api/engines
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "name": "api",
      "displayName": "API测试",
      "version": "3.0.0",
      "available": true,
      "stats": {
        "executions": 0,
        "failures": 0,
        "successRate": "0",
        "lastExecuted": null
      }
    },
    {
      "name": "stress",
      "displayName": "压力测试",
      "version": "3.0.0",
      "available": true,
      ...
    }
  ],
  "total": 9
}
```

### 2. 执行API测试

```bash
curl -X POST http://localhost:3001/api/engines/api/test \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "method": "GET",
    "assertions": [
      {"type": "status", "expected": 200},
      {"type": "responseTime", "max": 3000}
    ]
  }'
```

### 3. 执行压力测试

```bash
curl -X POST http://localhost:3001/api/engines/stress/test \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://jsonplaceholder.typicode.com/posts",
    "duration": 10,
    "concurrency": 5
  }'
```

### 4. 运行验证脚本

```bash
# 测试所有引擎功能
node backend/scripts/testEngines.js
```

## 📡 WebSocket实时通知

### 前端接入示例

```javascript
import io from 'socket.io-client';

// 连接WebSocket
const socket = io('http://localhost:3001');

// 监听测试进度
socket.on('test:progress', (data) => {
  console.log(`进度: ${data.progress}% - ${data.message}`);
});

// 监听测试完成
socket.on('test:complete', (data) => {
  console.log('测试完成:', data);
});

// 监听测试错误
socket.on('test:error', (data) => {
  console.error('测试错误:', data.error);
});

// 发起测试
fetch('/api/engines/api/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://api.example.com',
    testId: 'my-test-001'
  })
});
```

## 🎯 常用测试场景

### 场景1: API端点健康检查

```javascript
const testConfig = {
  url: 'https://api.example.com/health',
  method: 'GET',
  assertions: [
    { type: 'status', expected: 200 },
    { type: 'responseTime', max: 1000 },
    { type: 'json', path: '$.status', expected: 'ok' }
  ]
};

const result = await fetch('/api/engines/api/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testConfig)
}).then(r => r.json());

console.log(result);
```

### 场景2: 批量API测试

```javascript
const batchTests = {
  tests: [
    {
      type: 'api',
      config: {
        url: 'https://api.example.com/users',
        method: 'GET'
      }
    },
    {
      type: 'api',
      config: {
        url: 'https://api.example.com/products',
        method: 'GET'
      }
    }
  ]
};

const result = await fetch('/api/engines/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(batchTests)
}).then(r => r.json());

console.log(`成功: ${result.data.successful}/${result.data.total}`);
```

### 场景3: 压力测试不同负载

```javascript
// 轻量级压力测试
const lightLoad = {
  url: 'https://api.example.com',
  duration: 30,    // 30秒
  concurrency: 5   // 5个并发
};

// 中等压力测试
const mediumLoad = {
  url: 'https://api.example.com',
  duration: 60,    // 60秒
  concurrency: 20  // 20个并发
};

// 高压力测试
const heavyLoad = {
  url: 'https://api.example.com',
  duration: 120,   // 120秒
  concurrency: 50  // 50个并发
};
```

## 📊 结果分析示例

### API测试结果

```json
{
  "success": true,
  "testId": "api-test-001",
  "url": "https://jsonplaceholder.typicode.com/posts/1",
  "method": "GET",
  "duration": 234,
  "result": {
    "responseTime": 234,
    "validations": {
      "passed": true,
      "total": 2,
      "passedCount": 2,
      "failedCount": 0,
      "results": [
        { "passed": true, "message": "状态码为 200" },
        { "passed": true, "message": "响应时间小于 3000ms" }
      ]
    },
    "analysis": {
      "status": {
        "code": 200,
        "category": "success"
      },
      "performance": {
        "responseTime": 234,
        "category": "excellent"
      }
    }
  }
}
```

### 压力测试结果

```json
{
  "success": true,
  "testId": "stress-test-001",
  "url": "https://jsonplaceholder.typicode.com/posts",
  "duration": 10234,
  "result": {
    "results": {
      "totalRequests": 150,
      "successfulRequests": 148,
      "failedRequests": 2,
      "avgResponseTime": 456,
      "requestsPerSecond": 14.7
    },
    "analysis": {
      "performance": "good",
      "issues": [],
      "recommendations": [
        "API响应正常，无需特别优化"
      ]
    }
  }
}
```

## 🔧 高级配置

### 自定义断言

```javascript
const advancedTest = {
  url: 'https://api.example.com/users',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json'
  },
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  assertions: [
    // 状态码断言
    { type: 'status', expected: 201 },
    
    // 响应时间断言
    { type: 'responseTime', max: 2000 },
    
    // 响应头断言
    { 
      type: 'header', 
      name: 'Content-Type', 
      value: 'application/json' 
    },
    
    // JSON路径断言
    { 
      type: 'json', 
      path: '$.id', 
      expected: 1 
    },
    { 
      type: 'json', 
      path: '$.name', 
      expected: 'John Doe' 
    }
  ]
};
```

### 压力测试高级选项

```javascript
const advancedStressTest = {
  url: 'https://api.example.com',
  duration: 60,        // 测试持续时间(秒)
  concurrency: 10,     // 并发用户数
  rampUp: 5,          // 加压时间(秒)
  timeout: 30000,     // 请求超时(毫秒)
  method: 'GET',
  headers: {
    'Authorization': 'Bearer token123'
  },
  // 进度回调(自动注入)
  onProgress: (progress) => {
    console.log(`完成 ${progress.percentage}%`);
  }
};
```

## 🚨 告警配置

引擎会自动检查以下告警条件：

### API测试告警
- ✅ 响应时间 > 3000ms
- ✅ 状态码 >= 500
- ✅ 断言失败

### 压力测试告警
- ✅ 平均响应时间 > 3000ms
- ✅ 错误率 > 5%
- ✅ 性能评级为 "poor"

### 配置告警处理器

```javascript
const { getAlertManager } = require('./backend/alert/AlertManager');
const alertManager = getAlertManager();

// 注册自定义告警处理器
alertManager.registerHandler('RESPONSE_TIME_THRESHOLD', async (alert) => {
  console.log('响应时间告警:', alert);
  // 发送邮件、Slack通知等
});
```

## 📈 监控引擎状态

```bash
# 获取引擎统计
curl http://localhost:3001/api/engines/statistics

# 响应
{
  "success": true,
  "data": {
    "totalEngines": 9,
    "loadedEngines": 9,
    "failedEngines": 0,
    "totalExecutions": 156,
    "totalFailures": 3,
    "successRate": "98.08"
  }
}
```

## 🔄 引擎热重载

```bash
# 重新加载指定引擎
curl -X POST http://localhost:3001/api/engines/api/reload
```

## 🐛 调试技巧

### 1. 查看详细日志

```bash
# 设置日志级别
export LOG_LEVEL=debug

# 启动服务器
npm run dev
```

### 2. 测试单个引擎

```javascript
const { getTestEngineManager } = require('./backend/engines/TestEngineManager');
const engineManager = getTestEngineManager();

// 测试API引擎
const result = await engineManager.runTest('api', {
  url: 'https://jsonplaceholder.typicode.com/posts/1',
  method: 'GET'
});

console.log(JSON.stringify(result, null, 2));
```

### 3. 模拟WebSocket事件

```javascript
const { emitTestProgress } = require('./backend/websocket/testEvents');

// 手动触发进度事件
emitTestProgress('test-123', {
  stage: 'running',
  progress: 50,
  message: '测试中...'
});
```

## 📚 更多资源

- 📖 [完整文档](./ENGINE_INTEGRATION_SUMMARY.md)
- 🔧 [业务实现计划](./BUSINESS_IMPLEMENTATION_PLAN.md)
- 📊 [项目实现总结](./IMPLEMENTATION_COMPLETE_SUMMARY.md)
- 🧪 [测试脚本](./backend/scripts/testEngines.js)

## 💡 实用Tips

1. **测试前检查**: 使用 `GET /api/engines` 确保所需引擎可用
2. **设置testId**: 便于在WebSocket中跟踪特定测试
3. **使用断言**: API测试时添加断言验证结果正确性
4. **监控统计**: 定期查看 `/api/engines/statistics` 了解系统使用情况
5. **批量测试**: 多个相关测试可以使用 `/api/engines/batch` 批量执行

## ⚠️ 注意事项

- 压力测试会产生大量请求，请确保有权限测试目标服务器
- 避免对生产环境进行过度的压力测试
- 设置合理的超时时间避免长时间等待
- WebSocket连接失败不影响测试执行，只是无法接收实时通知

---

**最后更新**: 2025-11-14  
**版本**: 1.0
