# API 接口文档

## 🎯 概述

Test Web App 提供完整的 RESTful API 接口，支持所有核心功能的程序化访问。所有API都采用JSON格式进行数据交换，并使用JWT进行身份验证。

## 🔐 认证机制

### JWT Token 认证
所有需要认证的API都需要在请求头中包含JWT token：

```http
Authorization: Bearer <your-jwt-token>
```

### 获取Token
```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "user@example.com",
  "password": "password123"
}
```

**响应示例：**
```json
{
  "message": "登录成功",
  "user": {
    "id": "uuid",
    "username": "user",
    "email": "user@example.com",
    "role": "user"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## 🧪 测试API

### 网站综合测试
```http
POST /api/tests/website
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com",
  "testName": "网站综合测试",
  "config": {
    "timeout": 30000,
    "checkSEO": true,
    "checkPerformance": true,
    "checkSecurity": true
  }
}
```

### 压力测试
```http
POST /api/tests/stress
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com",
  "testName": "压力测试",
  "config": {
    "virtualUsers": 100,
    "duration": "5m",
    "rampUpTime": "30s"
  }
}
```

### 获取测试历史
```http
GET /api/test-history?page=1&limit=20&type=website
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "tests": [
    {
      "id": "uuid",
      "testName": "网站综合测试",
      "testType": "website",
      "url": "https://example.com",
      "status": "completed",
      "overallScore": 85.5,
      "startTime": "2025-06-22T10:00:00Z",
      "endTime": "2025-06-22T10:05:00Z",
      "results": {...}
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

## 🗄️ 数据管理API

### 查询数据记录
```http
POST /api/data-management/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "test",
  "search": "example.com",
  "dateRange": {
    "start": "2025-06-01T00:00:00Z",
    "end": "2025-06-22T23:59:59Z"
  },
  "limit": 50,
  "offset": 0,
  "sortBy": "createdAt",
  "sortOrder": "desc"
}
```

### 批量操作
```http
POST /api/data-management/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "operations": [
    {
      "type": "delete",
      "id": "record-uuid-1"
    },
    {
      "type": "update",
      "id": "record-uuid-2",
      "data": {
        "status": "archived"
      }
    }
  ]
}
```

### 数据分析
```http
GET /api/data-management/analytics?start=2025-06-01&end=2025-06-22
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "totalRecords": 1500,
    "recordsByType": {
      "website": 800,
      "stress": 400,
      "security": 300
    },
    "storageUsage": {
      "total": 10737418240,
      "used": 3221225472,
      "available": 7516192768
    },
    "performance": {
      "avgQueryTime": 125.5,
      "avgWriteTime": 89.2,
      "cacheHitRate": 85.3
    }
  }
}
```

## 💾 备份管理API

### 获取备份列表
```http
GET /api/data-management/backups
Authorization: Bearer <token>
```

### 创建备份
```http
POST /api/data-management/backups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "每日备份",
  "type": "full",
  "includeTypes": ["test", "user", "config"],
  "compression": true,
  "encryption": true,
  "description": "每日自动备份",
  "tags": ["auto", "daily"]
}
```

### 恢复备份
```http
POST /api/data-management/backups/{backupId}/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "overwrite": false,
  "includeTypes": ["test"],
  "targetLocation": "current"
}
```

## 🔄 同步管理API

### 获取同步配置
```http
GET /api/data-management/sync/config
Authorization: Bearer <token>
```

### 更新同步配置
```http
PUT /api/data-management/sync/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "enabled": true,
  "interval": 3600,
  "targets": [
    {
      "id": "target-uuid",
      "name": "主数据库",
      "type": "database",
      "endpoint": "postgresql://localhost:5432/backup_db",
      "syncTypes": ["test", "user"],
      "enabled": true
    }
  ],
  "conflictResolution": "local",
  "retryAttempts": 3
}
```

### 触发同步
```http
POST /api/data-management/sync/trigger
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetId": "target-uuid"  // 可选，不提供则同步所有目标
}
```

## 📊 监控API

### 获取监控站点
```http
GET /api/monitoring/sites
Authorization: Bearer <token>
```

### 创建监控站点
```http
POST /api/monitoring/sites
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "网站监控",
  "url": "https://example.com",
  "interval": 300,
  "timeout": 10000,
  "alertsEnabled": true,
  "alertThresholds": {
    "responseTime": 5000,
    "uptime": 95
  }
}
```

### 获取监控告警
```http
GET /api/monitoring/alerts?status=active&limit=20
Authorization: Bearer <token>
```

## ⚙️ 用户偏好API

### 获取用户偏好
```http
GET /api/preferences
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "interface": {
      "theme": "dark",
      "language": "zh-CN",
      "timezone": "Asia/Shanghai"
    },
    "testing": {
      "defaultTimeout": 60,
      "autoStartTests": false
    },
    "notifications": {
      "emailTestComplete": true,
      "browserPushEnabled": false
    }
  }
}
```

### 更新用户偏好
```http
PUT /api/preferences/interface
Authorization: Bearer <token>
Content-Type: application/json

{
  "preferences": {
    "theme": "light",
    "language": "en-US",
    "enableAnimations": true
  }
}
```

## 📋 错误处理

### 标准错误响应格式
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": {
    "field": "具体错误信息"
  }
}
```

### 常见错误代码
- `401` - 未授权访问
- `403` - 权限不足
- `404` - 资源不存在
- `422` - 请求参数验证失败
- `429` - 请求频率限制
- `500` - 服务器内部错误

## 📊 响应格式

### 成功响应
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

### 分页响应
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5,
    "hasMore": true
  }
}
```

## 🔧 请求限制

### 频率限制
- 认证API: 5次/分钟
- 测试API: 10次/分钟
- 数据查询API: 100次/分钟
- 其他API: 60次/分钟

### 请求大小限制
- JSON请求体: 最大10MB
- 文件上传: 最大50MB
- 批量操作: 最大1000条记录

## 🌐 CORS配置

API支持跨域请求，允许的域名：
- `http://localhost:5174`
- `http://localhost:5174`
- `https://your-domain.com`

## 📞 技术支持

如需API技术支持，请：
1. 查看错误响应中的详细信息
2. 检查请求格式和参数
3. 验证认证token的有效性
4. 联系技术支持团队

---

**API文档版本**: v1.0.0  
**最后更新**: 2025-06-22
