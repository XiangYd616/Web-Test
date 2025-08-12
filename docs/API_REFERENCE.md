# API 参考文档

## 概述

Test Web App 提供了完整的 RESTful API，支持所有核心功能的程序化访问。API 采用 JSON 格式进行数据交换，使用 JWT 进行身份验证。

### 基础信息

- **基础URL**: `http://localhost:3001/api/v1`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 统一响应格式

所有API响应都遵循统一的格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {
    // 响应数据
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_1234567890",
    "version": "1.0.0"
  }
}
```

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      // 详细错误信息
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req_1234567890",
    "version": "1.0.0"
  }
}
```

## 认证 API

### 用户登录

**POST** `/auth/login`

登录用户并获取访问令牌。

#### 请求参数

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "username": "testuser",
      "email": "user@example.com",
      "role": "user",
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### 用户注册

**POST** `/auth/register`

注册新用户账户。

#### 请求参数

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123"
}
```

### 刷新令牌

**POST** `/auth/refresh`

使用刷新令牌获取新的访问令牌。

#### 请求参数

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 用户登出

**POST** `/auth/logout`

登出用户并使令牌失效。

**Headers**: `Authorization: Bearer <token>`

## 测试 API

### 创建测试

**POST** `/test/create`

创建并启动新的测试任务。

**Headers**: `Authorization: Bearer <token>`

#### 请求参数

```json
{
  "type": "stress",
  "config": {
    "url": "https://example.com",
    "duration": 60,
    "concurrency": 10,
    "rampUp": 5
  }
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "test_1234567890",
    "type": "stress",
    "status": "pending",
    "config": {
      "url": "https://example.com",
      "duration": 60,
      "concurrency": 10,
      "rampUp": 5
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 获取测试状态

**GET** `/test/{testId}/status`

获取指定测试的当前状态。

**Headers**: `Authorization: Bearer <token>`

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "test_1234567890",
    "status": "running",
    "progress": 45,
    "startedAt": "2024-01-01T00:00:00.000Z",
    "estimatedCompletion": "2024-01-01T00:01:00.000Z"
  }
}
```

### 获取测试结果

**GET** `/test/{testId}/results`

获取测试的详细结果。

**Headers**: `Authorization: Bearer <token>`

#### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "test_1234567890",
    "type": "stress",
    "status": "completed",
    "results": {
      "totalRequests": 1000,
      "successfulRequests": 955,
      "failedRequests": 45,
      "successRate": 95.5,
      "averageResponseTime": 250,
      "minResponseTime": 120,
      "maxResponseTime": 1200,
      "requestsPerSecond": 16.67,
      "throughput": "2.5 MB/s"
    },
    "metrics": {
      "cpu": [45, 50, 48, 52],
      "memory": [128, 135, 142, 138],
      "responseTime": [200, 250, 300, 280]
    },
    "completedAt": "2024-01-01T00:01:00.000Z"
  }
}
```

### 停止测试

**POST** `/test/{testId}/stop`

停止正在运行的测试。

**Headers**: `Authorization: Bearer <token>`

### 获取测试历史

**GET** `/test/history`

获取用户的测试历史记录。

**Headers**: `Authorization: Bearer <token>`

#### 查询参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| page | number | 页码 | 1 |
| limit | number | 每页数量 | 20 |
| type | string | 测试类型 | - |
| status | string | 测试状态 | - |
| startDate | string | 开始日期 | - |
| endDate | string | 结束日期 | - |

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "test_1234567890",
      "type": "stress",
      "status": "completed",
      "config": {
        "url": "https://example.com",
        "duration": 60
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T00:01:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## 监控 API

### 创建监控目标

**POST** `/monitoring/targets`

创建新的监控目标。

**Headers**: `Authorization: Bearer <token>`

#### 请求参数

```json
{
  "name": "主网站",
  "url": "https://example.com",
  "checkInterval": 300,
  "timeout": 30,
  "alertConfig": {
    "enabled": true,
    "conditions": [
      {
        "metric": "responseTime",
        "operator": ">",
        "threshold": 1000,
        "duration": 300
      }
    ],
    "notifications": [
      {
        "type": "email",
        "target": "admin@example.com",
        "enabled": true
      }
    ]
  }
}
```

### 获取监控目标列表

**GET** `/monitoring/targets`

获取用户的所有监控目标。

**Headers**: `Authorization: Bearer <token>`

### 获取监控数据

**GET** `/monitoring/targets/{targetId}/data`

获取指定监控目标的历史数据。

**Headers**: `Authorization: Bearer <token>`

#### 查询参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| period | string | 时间周期 (1h, 24h, 7d, 30d) | 24h |
| metric | string | 指标类型 | - |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "targetId": "target_1234567890",
    "period": "24h",
    "metrics": {
      "responseTime": [
        { "timestamp": "2024-01-01T00:00:00.000Z", "value": 250 },
        { "timestamp": "2024-01-01T00:05:00.000Z", "value": 280 }
      ],
      "uptime": [
        { "timestamp": "2024-01-01T00:00:00.000Z", "value": 100 },
        { "timestamp": "2024-01-01T00:05:00.000Z", "value": 100 }
      ]
    }
  }
}
```

## 数据管理 API

### 导出数据

**POST** `/data/export`

导出测试数据或监控数据。

**Headers**: `Authorization: Bearer <token>`

#### 请求参数

```json
{
  "type": "test_results",
  "format": "pdf",
  "filters": {
    "testType": "stress",
    "dateRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.000Z"
    }
  },
  "options": {
    "includeCharts": true,
    "includeRawData": false
  }
}
```

#### 响应示例

```json
{
  "success": true,
  "data": {
    "exportId": "export_1234567890",
    "status": "processing",
    "estimatedCompletion": "2024-01-01T00:02:00.000Z"
  }
}
```

### 获取导出状态

**GET** `/data/export/{exportId}/status`

获取导出任务的状态。

**Headers**: `Authorization: Bearer <token>`

### 下载导出文件

**GET** `/data/export/{exportId}/download`

下载已完成的导出文件。

**Headers**: `Authorization: Bearer <token>`

## WebSocket API

### 连接

连接到WebSocket服务器以接收实时更新。

**URL**: `ws://localhost:3001/socket.io`

**认证**: 连接时发送JWT令牌

```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### 事件

#### 测试相关事件

- `test:started` - 测试开始
- `test:progress` - 测试进度更新
- `test:completed` - 测试完成
- `test:failed` - 测试失败

#### 监控相关事件

- `monitor:alert` - 监控告警
- `monitor:status` - 监控状态更新

#### 系统事件

- `system:notification` - 系统通知
- `user:message` - 用户消息

## 错误代码

| 错误代码 | HTTP状态码 | 说明 |
|----------|------------|------|
| INVALID_CREDENTIALS | 401 | 用户名或密码错误 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| RATE_LIMIT_EXCEEDED | 429 | 请求频率超限 |
| INTERNAL_SERVER_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |

## 速率限制

API 实施了速率限制以防止滥用：

- **认证API**: 每分钟最多 10 次请求
- **测试API**: 每分钟最多 30 次请求
- **监控API**: 每分钟最多 60 次请求
- **数据导出**: 每小时最多 5 次请求

## SDK 和示例

### JavaScript/Node.js

```javascript
const TestWebAPI = require('test-web-api-client');

const client = new TestWebAPI({
  baseURL: 'http://localhost:3001/api/v1',
  token: 'your-jwt-token'
});

// 创建压力测试
const test = await client.createTest({
  type: 'stress',
  config: {
    url: 'https://example.com',
    duration: 60,
    concurrency: 10
  }
});

console.log('测试ID:', test.id);
```

### Python

```python
import requests

class TestWebAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def create_test(self, test_type, config):
        response = requests.post(
            f'{self.base_url}/test/create',
            json={'type': test_type, 'config': config},
            headers=self.headers
        )
        return response.json()

# 使用示例
api = TestWebAPI('http://localhost:3001/api/v1', 'your-jwt-token')
result = api.create_test('stress', {
    'url': 'https://example.com',
    'duration': 60,
    'concurrency': 10
})
```

### cURL

```bash
# 用户登录
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# 创建测试
curl -X POST http://localhost:3001/api/v1/test/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "stress",
    "config": {
      "url": "https://example.com",
      "duration": 60,
      "concurrency": 10
    }
  }'
```

## 更新日志

### v1.0.0 (2024-01-01)
- 初始API版本发布
- 支持所有核心功能
- 完整的认证和授权系统
- WebSocket实时通信支持

---

**注意**: 本文档会随着API的更新而持续更新。建议定期查看最新版本。