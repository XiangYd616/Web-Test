# Test-Web API 文档

## 概述

Test-Web API 提供了完整的网站测试服务，包括性能测试、SEO分析、安全检测等功能。

### 基础信息

- **Base URL**: `http://localhost:3001/api`
- **版本**: v1
- **认证**: Bearer Token (可选)
- **数据格式**: JSON

## 认证

### 获取访问令牌

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 使用令牌

在请求头中包含认证令牌：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 运行记录 API

### 获取运行列表

```http
GET /runs?workspaceId={workspaceId}&page=1&limit=20&status=completed
```

**查询参数**:

- `workspaceId` (string, 必需)
- `status` (string): pending/running/completed/failed/cancelled
- `collectionId` (string)
- `environmentId` (string)

### 获取运行详情

```http
GET /runs/{runId}?page=1&limit=50
```

**响应包含**: summary、aggregates、results（分页时 results 为分页后的列表）

### 获取运行报告

```http
GET /runs/{runId}/report
```

### 导出运行结果

```http
GET /runs/{runId}/export?format=json|csv
```

## 定时运行 API

### 获取定时运行列表

```http
GET /scheduled-runs?workspaceId={workspaceId}&page=1&limit=20&status=active
```

### 获取定时运行详情

```http
GET /scheduled-runs/{scheduleId}
```

### 创建定时运行

```http
POST /scheduled-runs
Content-Type: application/json

{
  "workspaceId": "xxx",
  "collectionId": "xxx",
  "environmentId": "xxx",
  "name": "每日回归",
  "cron": "0 9 * * *",
  "config": { "iterations": 1, "timeout": 30000 }
}
```

### 立即执行定时运行

```http
POST /scheduled-runs/{scheduleId}/run
```

## 测试引擎 API

### 1. 性能测试

#### 启动性能测试

```http
POST /tests/performance
Content-Type: application/json

{
  "url": "https://example.com",
  "device": "desktop",
  "throttling": "none",
  "audits": ["performance", "accessibility", "best-practices", "seo"]
}
```

**参数说明**:

- `url` (string, 必需): 测试目标URL
- `device` (string): 设备类型 (`desktop`, `mobile`)
- `throttling` (string): 网络限制 (`none`, `3g`, `4g`)
- `audits` (array): 审计类型数组

**响应**:

```json
{
  "success": true,
  "data": {
    "sessionId": "perf_1234567890",
    "status": "running",
    "estimatedTime": 30000
  }
}
```

#### 获取测试状态

```http
GET /tests/{sessionId}/status
```

**响应**:

```json
{
  "success": true,
  "data": {
    "sessionId": "perf_1234567890",
    "status": "running",
    "progress": 65,
    "estimatedTimeRemaining": 10000
  }
}
```

#### 获取测试结果

```http
GET /tests/{sessionId}/result
```

**响应**:

```json
{
  "success": true,
  "data": {
    "sessionId": "perf_1234567890",
    "status": "completed",
    "url": "https://example.com",
    "timestamp": "2023-12-01T10:00:00Z",
    "results": {
      "performance": {
        "score": 85,
        "metrics": {
          "firstContentfulPaint": 1200,
          "largestContentfulPaint": 2500,
          "firstInputDelay": 50,
          "cumulativeLayoutShift": 0.1
        }
      },
      "accessibility": {
        "score": 92,
        "issues": []
      },
      "bestPractices": {
        "score": 88,
        "issues": [
          {
            "id": "uses-https",
            "title": "Uses HTTPS",
            "description": "All origins are served securely"
          }
        ]
      },
      "seo": {
        "score": 90,
        "issues": []
      }
    }
  }
}
```

### 2. SEO测试

#### 启动SEO测试

```http
POST /tests/seo
Content-Type: application/json

{
  "url": "https://example.com",
  "checks": ["meta-tags", "headings", "images", "links", "structured-data"]
}
```

**参数说明**:

- `url` (string, 必需): 测试目标URL
- `checks` (array): 检查项目数组

**响应**:

```json
{
  "success": true,
  "data": {
    "sessionId": "seo_1234567890",
    "status": "running"
  }
}
```

### 3. 安全测试

#### 启动安全测试

```http
POST /tests/security
Content-Type: application/json

{
  "url": "https://example.com",
  "scanType": "basic",
  "includeSubdomains": false,
  "checks": ["ssl", "headers", "vulnerabilities"]
}
```

**参数说明**:

- `url` (string, 必需): 测试目标URL
- `scanType` (string): 扫描类型 (`basic`, `comprehensive`)
- `includeSubdomains` (boolean): 是否包含子域名
- `checks` (array): 检查项目数组

### 4. 批量测试

#### 启动批量测试

```http
POST /tests/batch
Content-Type: application/json

{
  "tests": [
    {
      "type": "performance",
      "url": "https://example1.com",
      "config": {
        "device": "desktop"
      }
    },
    {
      "type": "seo",
      "url": "https://example2.com",
      "config": {
        "checks": ["meta-tags", "headings"]
      }
    }
  ]
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "batchId": "batch_1234567890",
    "sessions": ["perf_1234567891", "seo_1234567892"],
    "status": "running"
  }
}
```

## 测试历史 API

### 获取测试历史

```http
GET /tests/history?page=1&limit=10&type=performance&status=completed
```

**查询参数**:

- `page` (number): 页码
- `limit` (number): 每页数量
- `type` (string): 测试类型过滤
- `status` (string): 状态过滤
- `url` (string): URL过滤
- `dateFrom` (string): 开始日期 (ISO 8601)
- `dateTo` (string): 结束日期 (ISO 8601)

**响应**:

```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "sessionId": "perf_1234567890",
        "type": "performance",
        "url": "https://example.com",
        "status": "completed",
        "score": 85,
        "createdAt": "2023-12-01T10:00:00Z",
        "completedAt": "2023-12-01T10:00:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

## 导出 API

### 导出测试结果

```http
POST /tests/{sessionId}/export
Content-Type: application/json

{
  "format": "pdf",
  "options": {
    "includeCharts": true,
    "includeRecommendations": true
  }
}
```

**参数说明**:

- `format` (string): 导出格式 (`pdf`, `json`, `csv`, `html`)
- `options` (object): 导出选项

**响应**:

```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/exports/perf_1234567890.pdf",
    "expiresAt": "2023-12-01T11:00:00Z"
  }
}
```

## 系统 API

### 获取系统状态

```http
GET /system/status
```

**响应**:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "testEngines": "healthy"
    },
    "stats": {
      "totalTests": 1000,
      "activeTests": 5,
      "queuedTests": 2
    }
  }
}
```

### 获取可用测试引擎

```http
GET /test-engines
```

**响应**:

```json
{
  "success": true,
  "data": {
    "engines": [
      {
        "type": "performance",
        "name": "Lighthouse Performance",
        "version": "10.4.0",
        "status": "available"
      },
      {
        "type": "seo",
        "name": "SEO Analyzer",
        "version": "1.2.0",
        "status": "available"
      }
    ]
  }
}
```

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid URL format",
    "details": {
      "field": "url",
      "value": "invalid-url"
    }
  }
}
```

### 常见错误码

| 错误码                | HTTP状态码 | 描述             |
| --------------------- | ---------- | ---------------- |
| `VALIDATION_ERROR`    | 400        | 请求参数验证失败 |
| `UNAUTHORIZED`        | 401        | 未授权访问       |
| `FORBIDDEN`           | 403        | 权限不足         |
| `NOT_FOUND`           | 404        | 资源不存在       |
| `RATE_LIMIT_EXCEEDED` | 429        | 请求频率超限     |
| `INTERNAL_ERROR`      | 500        | 服务器内部错误   |
| `SERVICE_UNAVAILABLE` | 503        | 服务不可用       |

## 限制和配额

### 请求频率限制

- **未认证用户**: 每分钟10次请求
- **认证用户**: 每分钟100次请求
- **高级用户**: 每分钟1000次请求

### 并发测试限制

- **免费用户**: 同时最多1个测试
- **基础用户**: 同时最多5个测试
- **高级用户**: 同时最多20个测试

## SDK 和示例

### JavaScript SDK

```javascript
import { TestWebClient } from 'test-web-sdk';

const client = new TestWebClient({
  baseURL: 'http://localhost:3001/api',
  token: 'your-auth-token',
});

// 启动性能测试
const result = await client.performance.test({
  url: 'https://example.com',
  device: 'desktop',
});

console.log('Session ID:', result.sessionId);

// 等待测试完成
const finalResult = await client.waitForCompletion(result.sessionId);
console.log('Test completed:', finalResult);
```

### cURL 示例

```bash
# 启动性能测试
curl -X POST http://localhost:3001/api/tests/performance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "url": "https://example.com",
    "device": "desktop"
  }'

# 获取测试结果
curl -X GET http://localhost:3001/api/tests/perf_1234567890/result \
  -H "Authorization: Bearer your-token"
```

## 更新日志

### v1.0.0 (2023-12-01)

- 初始版本发布
- 支持性能、SEO、安全测试
- 批量测试功能
- 测试历史和导出功能
