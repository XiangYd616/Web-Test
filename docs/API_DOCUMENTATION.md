# 📚 Test-Web项目API文档

## 📋 文档概览

Test-Web项目的完整API文档，包含所有端点的详细说明、请求/响应格式、错误处理等。

**文档版本**: v3.0.0  
**API版本**: v1  
**基础URL**: `http://localhost:3001/api`  
**更新时间**: 2025-08-24

## 🔐 认证说明

### **认证方式**
所有需要认证的API都使用JWT Bearer Token认证。

```http
Authorization: Bearer <your-jwt-token>
```

### **获取Token**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "userName": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  },
  "message": "登录成功",
  "timestamp": "2025-08-24T10:00:00.000Z"
}
```

## 📊 标准响应格式

### **成功响应**
```json
{
  "success": true,
  "data": <响应数据>,
  "message": "操作成功",
  "timestamp": "2025-08-24T10:00:00.000Z"
}
```

### **错误响应**
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息",
  "statusCode": 400,
  "timestamp": "2025-08-24T10:00:00.000Z"
}
```

### **分页响应**
```json
{
  "success": true,
  "data": {
    "items": [<数据项数组>],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  },
  "message": "获取成功",
  "timestamp": "2025-08-24T10:00:00.000Z"
}
```

## 👤 用户管理API

### **用户注册**
```http
POST /api/auth/register
Content-Type: application/json
```

**请求体**:
```json
{
  "userName": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

**响应**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "1",
    "userName": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "status": "active",
    "createdAt": "2025-08-24T10:00:00.000Z"
  },
  "message": "注册成功"
}
```

### **获取用户资料**
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": "1",
    "userName": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "status": "active",
    "createdAt": "2025-08-24T10:00:00.000Z",
    "updatedAt": "2025-08-24T10:00:00.000Z",
    "lastLoginAt": "2025-08-24T09:30:00.000Z",
    "profileData": {
      "avatar": "https://example.com/avatar.jpg",
      "preferences": {
        "theme": "dark",
        "language": "zh-CN"
      }
    }
  }
}
```

### **修改密码**
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456",
  "confirmPassword": "newPassword456"
}
```

## 🧪 测试管理API

### **启动测试**
```http
POST /api/test/start
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "type": "stress",
  "target": "https://example.com",
  "config": {
    "duration": 300,
    "concurrency": 10,
    "rampUp": 30,
    "options": {
      "followRedirects": true,
      "timeout": 30000
    }
  }
}
```

**响应**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "test_123",
    "userId": "1",
    "testType": "stress",
    "targetUrl": "https://example.com",
    "status": "pending",
    "config": {
      "duration": 300,
      "concurrency": 10,
      "rampUp": 30
    },
    "createdAt": "2025-08-24T10:00:00.000Z",
    "updatedAt": "2025-08-24T10:00:00.000Z"
  },
  "message": "测试启动成功"
}
```

### **获取测试历史**
```http
GET /api/test/history?page=1&limit=20&status=completed
Authorization: Bearer <token>
```

**查询参数**:
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认20
- `status` (可选): 测试状态筛选
- `testType` (可选): 测试类型筛选

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "test_123",
        "userId": "1",
        "testType": "stress",
        "targetUrl": "https://example.com",
        "status": "completed",
        "startedAt": "2025-08-24T10:00:00.000Z",
        "completedAt": "2025-08-24T10:05:00.000Z",
        "duration": 300,
        "results": {
          "totalRequests": 1000,
          "successfulRequests": 995,
          "failedRequests": 5,
          "averageResponseTime": 150,
          "maxResponseTime": 500,
          "minResponseTime": 50
        },
        "createdAt": "2025-08-24T10:00:00.000Z",
        "updatedAt": "2025-08-24T10:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### **获取单个测试详情**
```http
GET /api/test/{testId}
Authorization: Bearer <token>
```

**路径参数**:
- `testId`: 测试ID

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": "test_123",
    "userId": "1",
    "testType": "stress",
    "targetUrl": "https://example.com",
    "status": "completed",
    "startedAt": "2025-08-24T10:00:00.000Z",
    "completedAt": "2025-08-24T10:05:00.000Z",
    "duration": 300,
    "results": {
      "summary": {
        "totalRequests": 1000,
        "successfulRequests": 995,
        "failedRequests": 5,
        "averageResponseTime": 150
      },
      "timeline": [
        {
          "timestamp": "2025-08-24T10:00:00.000Z",
          "requests": 10,
          "responseTime": 120
        }
      ],
      "errors": [
        {
          "timestamp": "2025-08-24T10:02:30.000Z",
          "error": "Connection timeout",
          "count": 3
        }
      ]
    },
    "config": {
      "duration": 300,
      "concurrency": 10,
      "rampUp": 30
    },
    "createdAt": "2025-08-24T10:00:00.000Z",
    "updatedAt": "2025-08-24T10:05:00.000Z"
  }
}
```

### **取消测试**
```http
POST /api/test/{testId}/cancel
Authorization: Bearer <token>
```

**响应**: 200 OK
```json
{
  "success": true,
  "message": "测试取消成功"
}
```

## 📊 监控管理API

### **创建监控目标**
```http
POST /api/monitoring/targets
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "name": "主站监控",
  "url": "https://example.com",
  "type": "http",
  "config": {
    "interval": 60,
    "timeout": 30,
    "expectedStatus": 200,
    "checkContent": true,
    "contentPattern": "Welcome"
  }
}
```

**响应**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "target_123",
    "userId": "1",
    "name": "主站监控",
    "url": "https://example.com",
    "type": "http",
    "config": {
      "interval": 60,
      "timeout": 30,
      "expectedStatus": 200
    },
    "status": "active",
    "createdAt": "2025-08-24T10:00:00.000Z",
    "updatedAt": "2025-08-24T10:00:00.000Z"
  },
  "message": "监控目标创建成功"
}
```

### **获取监控目标列表**
```http
GET /api/monitoring/targets?page=1&limit=20&status=active
Authorization: Bearer <token>
```

### **检查监控目标**
```http
POST /api/monitoring/targets/{targetId}/check
Authorization: Bearer <token>
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "target": {
      "id": "target_123",
      "name": "主站监控",
      "url": "https://example.com"
    },
    "check": {
      "id": "check_456",
      "targetId": "target_123",
      "status": "success",
      "responseTime": 150,
      "checkedAt": "2025-08-24T10:00:00.000Z"
    },
    "result": {
      "status": "success",
      "responseTime": 150,
      "statusCode": 200
    }
  }
}
```

## 🚨 告警管理API

### **获取告警列表**
```http
GET /api/alerts?page=1&limit=20&status=active&severity=high
Authorization: Bearer <token>
```

**查询参数**:
- `page` (可选): 页码
- `limit` (可选): 每页数量
- `status` (可选): 告警状态 (active, acknowledged, resolved)
- `severity` (可选): 严重程度 (low, medium, high, critical)

### **确认告警**
```http
POST /api/alerts/{alertId}/acknowledge
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "acknowledgmentMessage": "已知悉此告警，正在处理中"
}
```

### **解决告警**
```http
POST /api/alerts/{alertId}/resolve
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "resolution": "问题已修复，服务恢复正常"
}
```

## 📈 系统状态API

### **获取系统资源状态**
```http
GET /api/system/resources
Authorization: Bearer <token>
```

**响应**: 200 OK
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-08-24T10:00:00.000Z",
    "system": {
      "platform": "linux",
      "arch": "x64",
      "hostname": "test-web-server",
      "uptime": 86400
    },
    "memory": {
      "total": 8589934592,
      "used": 4294967296,
      "free": 4294967296,
      "usage": 50.0
    },
    "cpu": {
      "count": 4,
      "model": "Intel(R) Core(TM) i7-8700K",
      "loadAverage": [1.2, 1.5, 1.8],
      "usage": 25.5
    },
    "database": {
      "status": "connected",
      "connections": 15
    },
    "engines": {
      "stress": {
        "type": "stress",
        "status": "active",
        "activeTests": 2,
        "totalTestsToday": 25
      }
    }
  }
}
```

### **获取测试引擎状态**
```http
GET /api/test/stress/engines
Authorization: Bearer <token>
```

## 📤 数据导出API

### **创建导出任务**
```http
POST /api/export
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "type": "test-history",
  "filters": {
    "startDate": "2025-08-01",
    "endDate": "2025-08-24",
    "testType": "stress",
    "status": "completed"
  },
  "format": "csv",
  "options": {
    "includeResults": true,
    "includeConfig": false
  }
}
```

### **获取导出任务状态**
```http
GET /api/export/{taskId}
Authorization: Bearer <token>
```

### **下载导出文件**
```http
GET /api/export/{taskId}/download
Authorization: Bearer <token>
```

## ❌ 错误代码说明

| 状态码 | 错误类型 | 说明 |
|--------|----------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或token无效 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如用户名已存在） |
| 422 | Unprocessable Entity | 数据验证失败 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |

## 📝 使用示例

### **JavaScript/TypeScript示例**
```typescript
// 用户登录
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'john_doe',
    password: 'password123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// 启动压力测试
const testResponse = await fetch('/api/test/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'stress',
    target: 'https://example.com',
    config: {
      duration: 300,
      concurrency: 10
    }
  })
});

const testData = await testResponse.json();
console.log('测试ID:', testData.data.id);
```

### **cURL示例**
```bash
# 用户登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","password":"password123"}'

# 启动测试
curl -X POST http://localhost:3001/api/test/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "stress",
    "target": "https://example.com",
    "config": {
      "duration": 300,
      "concurrency": 10
    }
  }'
```

## 🔄 API版本管理

### **版本控制策略**
- 使用语义化版本控制 (Semantic Versioning)
- 主要版本变更：不兼容的API修改
- 次要版本变更：向后兼容的功能性新增
- 修订版本变更：向后兼容的问题修正

### **版本支持策略**
- 当前版本：v1.0.0 (完全支持)
- 前一版本：v0.9.x (维护支持)
- 更早版本：不再支持

### **版本迁移指南**
详细的版本迁移指南请参考 [API_MIGRATION_GUIDE.md](./API_MIGRATION_GUIDE.md)

## 🧪 测试环境

### **开发环境**
- 基础URL: `http://localhost:3001/api`
- 数据库: PostgreSQL (开发数据)
- 认证: JWT (24小时有效期)

### **测试环境**
- 基础URL: `https://test-api.example.com/api`
- 数据库: PostgreSQL (测试数据)
- 认证: JWT (1小时有效期)

### **生产环境**
- 基础URL: `https://api.example.com/api`
- 数据库: PostgreSQL (生产数据)
- 认证: JWT (8小时有效期)

## 📊 API性能指标

### **响应时间标准**
- 简单查询: < 100ms
- 复杂查询: < 500ms
- 数据导出: < 5s
- 文件上传: < 30s

### **并发处理能力**
- 最大并发连接: 1000
- 每秒请求数: 500 QPS
- 数据库连接池: 50

### **限流策略**
- 普通用户: 100 请求/分钟
- 高级用户: 500 请求/分钟
- 管理员: 1000 请求/分钟

---

**📚 API文档已完成！**

这份文档涵盖了Test-Web项目的所有主要API端点，提供了完整的使用指南和示例代码。如需更多详细信息，请参考相关的技术文档或联系开发团队。
