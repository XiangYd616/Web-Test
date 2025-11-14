# P0 功能集成使用指南

> **文件路径**: `docs/P0_INTEGRATION_GUIDE.md`  
> **创建时间**: 2025-11-14  
> **版本**: v1.0.0

本文档介绍如何使用P0优先级功能：WebSocket实时通信、数据持久化、API断言系统和HTTP路由。

---

## 📋 目录

1. [功能概览](#功能概览)
2. [WebSocket实时通信](#websocket实时通信)
3. [API路由使用](#api路由使用)
4. [断言系统](#断言系统)
5. [完整集成示例](#完整集成示例)
6. [故障排查](#故障排查)

---

## 功能概览

### 已实现的P0功能

| 功能模块 | 文件路径 | 代码行数 | 状态 |
|---------|---------|---------|-----|
| WebSocket实时通信 | `backend/websocket/testEvents.js` | 497 | ✅ |
| 压力测试数据模型 | `backend/models/StressTestResult.js` | 354 | ✅ |
| API断言系统 | `backend/engines/api/AssertionSystem.js` | 525 | ✅ |
| 压力测试路由 | `backend/routes/tests/stress.js` | 400 | ✅ |
| API测试路由 | `backend/routes/tests/api.js` | 466 | ✅ |

**总计**: 2,242行代码

---

## WebSocket实时通信

### 服务器端配置

#### 1. 初始化Socket.io

```js path=null start=null
// backend/server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const TestEventsHandler = require('./websocket/testEvents');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// 初始化测试事件处理器
const testEventsHandler = new TestEventsHandler(io);

server.listen(5000, () => {
  console.log('服务器启动: http://localhost:5000');
});
```

#### 2. WebSocket事件列表

| 事件名称 | 方向 | 数据 | 说明 |
|---------|------|------|------|
| `test:join` | 客户端→服务器 | `{ testId }` | 加入测试房间 |
| `test:leave` | 客户端→服务器 | `{ testId }` | 离开测试房间 |
| `stress:start` | 客户端→服务器 | `{ testId, config }` | 启动压力测试 |
| `stress:stop` | 客户端→服务器 | `{ testId }` | 停止压力测试 |
| `api:start` | 客户端→服务器 | `{ testId, config }` | 启动API测试 |
| `test:status` | 服务器→客户端 | `{ status, progress, result }` | 测试状态更新 |
| `test:progress` | 服务器→客户端 | `{ progress, metrics }` | 实时进度更新 |
| `test:completed` | 服务器→客户端 | `{ testId, result }` | 测试完成 |
| `test:error` | 服务器→客户端 | `{ error }` | 测试错误 |

### 前端集成

#### React示例

```tsx path=null start=null
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function StressTest() {
  const [socket, setSocket] = useState(null);
  const [testId, setTestId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');

  // 连接WebSocket
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // 监听测试进度
  useEffect(() => {
    if (!socket || !testId) return;

    // 加入测试房间
    socket.emit('test:join', { testId });

    // 监听状态更新
    socket.on('test:status', (data) => {
      setStatus(data.status);
      setProgress(data.progress || 0);
    });

    socket.on('test:completed', (data) => {
      console.log('测试完成:', data.result);
      setStatus('completed');
    });

    socket.on('test:error', (data) => {
      console.error('测试错误:', data.error);
      setStatus('error');
    });

    return () => {
      socket.emit('test:leave', { testId });
      socket.off('test:status');
      socket.off('test:completed');
      socket.off('test:error');
    };
  }, [socket, testId]);

  // 启动压力测试
  const startTest = async () => {
    // 1. 创建测试记录
    const response = await fetch('http://localhost:5000/api/test/stress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        duration: 60,
        concurrency: 10
      })
    });

    const { data } = await response.json();
    setTestId(data.testId);

    // 2. 通过WebSocket启动测试
    socket.emit('stress:start', {
      testId: data.testId,
      config: data.config
    });
  };

  return (
    <div>
      <button onClick={startTest}>启动压力测试</button>
      <p>状态: {status}</p>
      <p>进度: {progress}%</p>
    </div>
  );
}
```

---

## API路由使用

### 压力测试API

#### 创建并启动压力测试

```bash
# 1. 创建测试记录
curl -X POST http://localhost:5000/api/test/stress \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com",
    "testName": "API压力测试",
    "duration": 60,
    "concurrency": 50,
    "method": "GET",
    "pattern": "constant"
  }'

# 响应:
{
  "success": true,
  "data": {
    "testId": "uuid-here",
    "message": "压力测试已创建，请通过WebSocket连接获取实时进度",
    "websocketEvent": "stress:start",
    "config": { ... }
  }
}

# 2. 通过WebSocket启动测试
socket.emit('stress:start', {
  testId: 'uuid-here',
  config: { ... }
});
```

#### 查询测试历史

```bash
# 查询所有测试
curl "http://localhost:5000/api/test/stress?page=1&pageSize=10"

# 按状态过滤
curl "http://localhost:5000/api/test/stress?status=completed"

# 按URL过滤
curl "http://localhost:5000/api/test/stress?url=https://api.example.com"
```

#### 获取测试详情

```bash
curl http://localhost:5000/api/test/stress/[testId]
```

#### 对比测试结果

```bash
curl -X POST http://localhost:5000/api/test/stress/[testId]/compare \
  -H "Content-Type: application/json" \
  -d '{"compareWithId": "previous-test-id"}'
```

#### 获取统计数据

```bash
curl "http://localhost:5000/api/test/stress/stats/summary?startDate=2025-01-01&endDate=2025-12-31"
```

### API测试API

#### 异步执行（通过WebSocket）

```bash
# 1. 创建API测试
curl -X POST http://localhost:5000/api/test/api \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/users",
    "testName": "用户API测试",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer token"
    },
    "assertions": [
      { "type": "expectStatus", "code": 200 },
      { "type": "expectResponseTime", "maxTime": 1000 },
      { "type": "expectJsonPath", "path": "data.length", "expectedValue": 10 }
    ]
  }'

# 2. 通过WebSocket获取结果
socket.emit('api:start', { testId, config });
```

#### 同步执行（直接返回结果）

```bash
curl -X POST http://localhost:5000/api/test/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/health",
    "method": "GET",
    "assertions": [
      { "type": "expectStatus", "code": 200 }
    ]
  }'

# 响应:
{
  "success": true,
  "data": {
    "testId": "uuid",
    "duration": 234,
    "result": {
      "statusCode": 200,
      "responseTime": 234,
      "assertions": {
        "total": 1,
        "passed": 1,
        "failed": 0,
        "passRate": 100
      }
    }
  }
}
```

#### 验证断言配置

```bash
curl -X POST http://localhost:5000/api/test/api/validate \
  -H "Content-Type: application/json" \
  -d '{
    "assertions": [
      { "type": "expectStatus", "code": 200 },
      { "type": "invalidType", "param": "value" }
    ]
  }'

# 响应:
{
  "success": true,
  "data": {
    "valid": false,
    "results": [
      { "valid": true, "type": "expectStatus", "args": { "code": 200 } },
      { "valid": false, "type": "invalidType", "error": "不支持的断言类型: invalidType" }
    ],
    "totalAssertions": 2,
    "validAssertions": 1
  }
}
```

#### 获取预设断言

```bash
curl http://localhost:5000/api/test/api/presets/list

# 响应:
{
  "success": true,
  "data": [
    {
      "name": "success",
      "description": "检查200状态码和JSON响应",
      "assertions": [
        "expectStatus(200)",
        "expectContentType(\"application/json\")"
      ]
    },
    ...
  ]
}
```

---

## 断言系统

### 断言类型

#### 1. 状态码断言

```js path=null start=null
const { AssertionSystem } = require('./backend/engines/api/AssertionSystem');

const assertion = new AssertionSystem();

// 精确状态码
assertion.expectStatus(200);

// 状态码范围
assertion.expectStatusInRange(200, 299);
```

#### 2. 响应时间断言

```js path=null start=null
// 最大响应时间（毫秒）
assertion.expectResponseTime(1000);
```

#### 3. 响应头断言

```js path=null start=null
// 检查响应头存在
assertion.expectHeaderExists('Content-Type');

// 检查响应头值
assertion.expectHeader('Content-Type', 'application/json');

// 检查Content-Type
assertion.expectContentType('application/json');
```

#### 4. 响应体断言

```js path=null start=null
// 完全匹配
assertion.expectBody({ success: true });

// 包含字符串
assertion.expectBodyContains('success');
```

#### 5. JSON Path断言

```js path=null start=null
// 检查JSON路径存在
assertion.expectJsonPathExists('data.users');

// 检查JSON路径值
assertion.expectJsonPath('data.users.length', 10);

// 支持数组索引
assertion.expectJsonPath('data.users[0].name', 'John');
```

#### 6. JSON Schema断言

```js path=null start=null
const schema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        users: { type: 'array' }
      },
      required: ['users']
    }
  },
  required: ['success', 'data']
};

assertion.expectJsonSchema(schema);
```

### 预设断言

#### 快速使用预设

```js path=null start=null
const { presets } = require('./backend/engines/api/AssertionSystem');

const assertion = new AssertionSystem();

// 1. 成功响应预设
presets.success(assertion);
// 等同于:
// assertion.expectStatus(200);
// assertion.expectContentType('application/json');

// 2. JSON API预设
presets.jsonApi(assertion);
// 等同于:
// assertion.expectStatus(200);
// assertion.expectContentType('application/json');
// assertion.expectResponseTime(2000);

// 3. 快速响应预设
presets.fast(assertion);
// 等同于:
// assertion.expectResponseTime(500);

// 4. 安全响应头预设
presets.secureHeaders(assertion);
// 等同于:
// assertion.expectHeader('X-Content-Type-Options', 'nosniff');
// assertion.expectHeader('X-Frame-Options', 'DENY');
// assertion.expectHeader('X-XSS-Protection', '1; mode=block');
```

### 执行断言

```js path=null start=null
const { AssertionSystem } = require('./backend/engines/api/AssertionSystem');
const axios = require('axios');

async function testApi() {
  // 创建断言系统
  const assertion = new AssertionSystem();
  
  // 添加断言
  assertion
    .expectStatus(200)
    .expectResponseTime(1000)
    .expectJsonPath('data.users.length', 10);

  // 发送HTTP请求
  const startTime = Date.now();
  const response = await axios.get('https://api.example.com/users');
  const responseTime = Date.now() - startTime;

  // 准备断言数据
  const testData = {
    statusCode: response.status,
    headers: response.headers,
    body: response.data,
    responseTime
  };

  // 执行断言
  const results = await assertion.execute(testData);

  console.log('断言结果:', results);
  // {
  //   passed: 2,
  //   failed: 1,
  //   total: 3,
  //   passRate: 66.67,
  //   results: [
  //     { name: 'expectStatus', passed: true, message: '...' },
  //     { name: 'expectResponseTime', passed: true, message: '...' },
  //     { name: 'expectJsonPath', passed: false, message: '...' }
  //   ]
  // }
}
```

---

## 完整集成示例

### 场景：压力测试完整流程

```js path=null start=null
// backend/examples/stressTestExample.js
const io = require('socket.io-client');
const axios = require('axios');

async function runStressTest() {
  const API_BASE = 'http://localhost:5000';
  
  // 1. 连接WebSocket
  const socket = io(API_BASE);
  console.log('✅ WebSocket已连接');

  // 2. 创建压力测试
  const createResponse = await axios.post(`${API_BASE}/api/test/stress`, {
    url: 'https://api.example.com',
    testName: '示例压力测试',
    duration: 60,
    concurrency: 50,
    method: 'GET',
    pattern: 'constant'
  });

  const { testId, config } = createResponse.data.data;
  console.log(`✅ 测试已创建: ${testId}`);

  // 3. 加入测试房间
  socket.emit('test:join', { testId });
  console.log('✅ 已加入测试房间');

  // 4. 监听测试事件
  socket.on('test:status', (data) => {
    console.log(`📊 状态: ${data.status}, 进度: ${data.progress}%`);
  });

  socket.on('test:progress', (data) => {
    console.log(`⏱️  进度更新:`, data.metrics);
  });

  socket.on('test:completed', async (data) => {
    console.log('✅ 测试完成!');
    console.log('结果:', data.result);

    // 5. 获取详细结果
    const detailResponse = await axios.get(`${API_BASE}/api/test/stress/${testId}`);
    console.log('详细结果:', detailResponse.data);

    // 6. 清理
    socket.emit('test:leave', { testId });
    socket.close();
  });

  socket.on('test:error', (data) => {
    console.error('❌ 测试错误:', data.error);
    socket.close();
  });

  // 7. 启动测试
  socket.emit('stress:start', { testId, config });
  console.log('🚀 测试已启动');
}

runStressTest().catch(console.error);
```

### 场景：API测试完整流程

```js path=null start=null
// backend/examples/apiTestExample.js
const axios = require('axios');

async function runApiTest() {
  const API_BASE = 'http://localhost:5000';

  // 1. 验证断言配置
  const validationResponse = await axios.post(`${API_BASE}/api/test/api/validate`, {
    assertions: [
      { type: 'expectStatus', code: 200 },
      { type: 'expectResponseTime', maxTime: 1000 },
      { type: 'expectJsonPath', path: 'data.users.length', expectedValue: 10 }
    ]
  });

  if (!validationResponse.data.data.valid) {
    console.error('❌ 断言配置无效');
    return;
  }
  console.log('✅ 断言配置有效');

  // 2. 同步执行API测试
  const testResponse = await axios.post(`${API_BASE}/api/test/api/execute`, {
    url: 'https://jsonplaceholder.typicode.com/users',
    method: 'GET',
    assertions: [
      { type: 'expectStatus', code: 200 },
      { type: 'expectResponseTime', maxTime: 2000 },
      { type: 'expectContentType', contentType: 'application/json' }
    ]
  });

  const { testId, duration, result } = testResponse.data.data;
  console.log(`✅ 测试完成 (${duration}ms)`);
  console.log('结果:', result);

  // 3. 获取统计信息
  const statsResponse = await axios.get(`${API_BASE}/api/test/api/stats/summary`);
  console.log('统计信息:', statsResponse.data.data);
}

runApiTest().catch(console.error);
```

---

## 故障排查

### WebSocket连接失败

**问题**: 前端无法连接到WebSocket服务器

**解决方案**:
1. 检查服务器是否启用了Socket.io
2. 检查CORS配置
3. 检查防火墙端口是否开放

```js path=null start=null
// backend/server.js
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### 断言失败调试

**问题**: 断言总是失败

**解决方案**:
1. 打印响应数据检查格式
2. 使用验证端点测试断言配置
3. 检查JSON Path语法

```js path=null start=null
// 调试断言
const testData = {
  statusCode: response.status,
  headers: response.headers,
  body: response.data,
  responseTime
};

console.log('测试数据:', JSON.stringify(testData, null, 2));

const results = await assertion.execute(testData);
console.log('断言结果:', results.results);
```

### 数据库模型未加载

**问题**: 日志显示"数据库模型未加载，使用内存存储"

**解决方案**:
1. 检查数据库连接配置
2. 确认Sequelize已正确初始化
3. 检查模型文件路径

```js path=null start=null
// backend/database/index.js
const { Sequelize } = require('sequelize');
const StressTestResult = require('../models/StressTestResult');

const sequelize = new Sequelize(process.env.DATABASE_URL);

const db = {
  sequelize,
  Sequelize,
  StressTestResult: StressTestResult(sequelize, Sequelize.DataTypes)
};

module.exports = db;
```

### 测试进度不更新

**问题**: WebSocket收不到进度更新

**解决方案**:
1. 确认已加入测试房间 (`test:join`)
2. 检查测试引擎是否调用了 `onProgress` 回调
3. 检查房间名称是否正确

```js path=null start=null
// 确保测试引擎有进度回调
const config = {
  url: 'https://example.com',
  duration: 60,
  concurrency: 10,
  onProgress: (progress) => {
    console.log('进度:', progress);
    // TestEventsHandler会自动处理这个回调
  }
};
```

---

## 下一步计划

根据 `BUSINESS_IMPLEMENTATION_PLAN.md`，P0功能已100%完成。接下来的P1优先级任务包括：

1. **完善性能测试引擎** (8小时)
   - Lighthouse集成
   - 性能指标收集
   - 报告生成

2. **完善安全测试引擎** (12小时)
   - HTTPS检查
   - 响应头安全扫描
   - SQL注入检测

3. **实现定时任务系统** (6小时)
   - 计划任务调度
   - 重复执行
   - 任务管理

4. **实现报告系统** (10小时)
   - PDF报告生成
   - 图表可视化
   - 导出功能

---

## 参考资料

- [Socket.io文档](https://socket.io/docs/)
- [Sequelize文档](https://sequelize.org/)
- [Express路由指南](https://expressjs.com/en/guide/routing.html)
- [JSON Schema规范](https://json-schema.org/)

---

**版本历史**

| 版本 | 日期 | 变更说明 |
|-----|------|---------|
| v1.0.0 | 2025-11-14 | 初始版本，P0功能完成 |
