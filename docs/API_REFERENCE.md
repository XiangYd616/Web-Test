# API 接口文档

## 🎯 概述

Test Web App 提供完整的 RESTful API 接口，支持所有核心功能的程序化访问。包括测试引擎、数据管理、企业级集成、智能报告系统等。所有API都采用JSON格式进行数据交换，并使用JWT进行身份验证。

### 🆕 最新功能
- **企业级集成API** - 支持Webhook、Slack、Jenkins等集成
- **智能报告API** - 多格式报告生成和管理
- **统一日志API** - 前后端统一日志管理
- **增强测试API** - 支持批量测试和实时监控

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
POST /api/test/website
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com",
  "testName": "网站综合测试",
  "config": {
    "timeout": 30000,
    "checkSEO": true,
    "checkPerformance": true,
    "checkSecurity": true,
    "enableRealTimeMonitoring": true
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "testId": "test-uuid",
    "status": "running",
    "progress": 0,
    "estimatedDuration": 120,
    "realTimeUrl": "/api/test/test-uuid/realtime"
  }
}
```

### 压力测试
```http
POST /api/test/stress
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com",
  "testName": "压力测试",
  "config": {
    "virtualUsers": 100,
    "duration": "5m",
    "rampUpTime": "30s",
    "enableRealTimeCharts": true,
    "dataInterval": "1s"
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "testId": "stress-test-uuid",
    "status": "running",
    "realTimeDataUrl": "/api/test/stress-test-uuid/realtime",
    "chartDataUrl": "/api/test/stress-test-uuid/charts"
  }
}
```

### API测试 (增强版)
```http
POST /api/test/api-test
Authorization: Bearer <token>
Content-Type: application/json

{
  "baseUrl": "https://api.example.com",
  "endpoints": [
    {
      "path": "/users",
      "method": "GET",
      "headers": {"Accept": "application/json"},
      "expectedStatus": 200
    },
    {
      "path": "/users",
      "method": "POST",
      "headers": {"Content-Type": "application/json"},
      "body": {"name": "Test User", "email": "test@example.com"},
      "expectedStatus": 201
    }
  ],
  "authentication": {
    "type": "bearer",
    "token": "your-api-token"
  },
  "globalHeaders": [
    {"key": "User-Agent", "value": "TestWebApp/2.2.0"}
  ],
  "config": {
    "timeout": 30000,
    "retries": 3,
    "parallel": true
  }
}
```

### 获取实时测试数据
```http
GET /api/test/:testId/realtime
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "testId": "test-uuid",
    "status": "running",
    "progress": 45,
    "currentMetrics": {
      "responseTime": 150,
      "tps": 25,
      "errorRate": 2.5,
      "activeUsers": 20
    },
    "realtimeData": [
      {
        "timestamp": "2025-08-03T12:30:00Z",
        "responseTime": 145,
        "requests": 8,
        "errors": 0
      }
    ]
  }
}
```

### 获取测试历史
```http
GET /api/test/history?page=1&limit=20&testType=security
Authorization: Bearer <token>
```

**查询参数：**
- `page` (可选): 页码，默认为1
- `limit` (可选): 每页记录数，默认为20
- `testType` (可选): 测试类型 (stress, security, api, performance, compatibility, seo, accessibility)
- `status` (可选): 测试状态 (pending, running, completed, failed, cancelled)
- `search` (可选): 搜索关键词
- `dateFrom` (可选): 开始日期
- `dateTo` (可选): 结束日期

**响应示例：**
```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "id": "uuid",
        "testName": "安全测试 - example.com",
        "testType": "security",
        "url": "https://example.com",
        "status": "completed",
        "overallScore": 85.5,
        "grade": "B+",
        "duration": 120,
        "totalIssues": 5,
        "criticalIssues": 1,
        "majorIssues": 2,
        "minorIssues": 2,
        "environment": "production",
        "tags": ["security", "automated"],
        "description": "安全评分: 85.5/100, 等级: B+",
        "startTime": "2025-08-06T10:00:00Z",
        "endTime": "2025-08-06T10:02:00Z",
        "createdAt": "2025-08-06T10:00:00Z",
        "updatedAt": "2025-08-06T10:02:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 获取测试详情
```http
GET /api/test/{testId}
Authorization: Bearer <token>
```

**响应示例（安全测试）：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "testName": "安全测试 - example.com",
    "testType": "security",
    "url": "https://example.com",
    "status": "completed",
    "overallScore": 85.5,
    "grade": "B+",
    "duration": 120,
    "totalIssues": 5,
    "criticalIssues": 1,
    "majorIssues": 2,
    "minorIssues": 2,
    "environment": "production",
    "tags": ["security", "automated"],
    "description": "安全评分: 85.5/100, 等级: B+",
    "config": {
      "level": "standard",
      "timeout": 30000
    },
    "securityDetails": {
      "securityScore": 85.5,
      "sslScore": 90.0,
      "vulnerabilitiesTotal": 5,
      "vulnerabilitiesCritical": 1,
      "vulnerabilitiesHigh": 2,
      "sqlInjectionFound": 0,
      "xssVulnerabilities": 1,
      "csrfVulnerabilities": 1,
      "httpsEnforced": true,
      "hstsEnabled": true,
      "csrfProtection": true
    },
    "startTime": "2025-08-06T10:00:00Z",
    "endTime": "2025-08-06T10:02:00Z",
    "createdAt": "2025-08-06T10:00:00Z",
    "updatedAt": "2025-08-06T10:02:00Z"
  }
}
```

### 删除测试记录
```http
DELETE /api/test/{testId}
Authorization: Bearer <token>
```

**响应示例：**
```json
{
  "success": true,
  "message": "测试结果已删除"
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
  "sortBy": "created_at",
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

## 🔗 企业级集成API

### 获取集成列表
```http
GET /api/integrations
Authorization: Bearer <token>
```

**查询参数：**
- `type` - 集成类型 (webhook, slack, email, jenkins, github, gitlab, jira, teams)
- `enabled` - 启用状态 (true/false)

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Slack通知",
      "type": "slack",
      "config": {
        "webhookUrl": "https://hooks.slack.com/services/...",
        "channel": "#testing",
        "username": "TestBot"
      },
      "enabled": true,
      "createdAt": "2025-08-03T10:00:00Z",
      "lastUsed": "2025-08-03T12:30:00Z"
    }
  ],
  "total": 1,
  "supportedTypes": ["webhook", "slack", "email", "jenkins", "github", "gitlab", "jira", "teams"]
}
```

### 创建集成
```http
POST /api/integrations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jenkins CI/CD",
  "type": "jenkins",
  "config": {
    "serverUrl": "https://jenkins.example.com",
    "jobName": "website-test",
    "token": "jenkins-api-token"
  },
  "enabled": true
}
```

### 更新集成
```http
PUT /api/integrations/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "更新的集成名称",
  "config": {
    "webhookUrl": "https://new-webhook-url.com"
  },
  "enabled": false
}
```

### 删除集成
```http
DELETE /api/integrations/:id
Authorization: Bearer <token>
```

## 📋 智能报告API

### 获取报告列表
```http
GET /api/reports
Authorization: Bearer <token>
```

**查询参数：**
- `type` - 报告类型 (performance, security, seo, comprehensive, stress_test, api_test)
- `status` - 报告状态 (generating, completed, failed)
- `format` - 报告格式 (pdf, html, json, csv)
- `page` - 页码 (默认: 1)
- `limit` - 每页数量 (默认: 10)

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "网站性能报告 - 2025年8月",
      "type": "performance",
      "format": "pdf",
      "status": "completed",
      "createdAt": "2025-08-03T10:00:00Z",
      "completedAt": "2025-08-03T10:05:00Z",
      "fileSize": 2048576,
      "downloadCount": 5,
      "config": {
        "dateRange": "2025-08-01 to 2025-08-31",
        "includeCharts": true,
        "includeRecommendations": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "supportedTypes": ["performance", "security", "seo", "comprehensive", "stress_test", "api_test"],
  "supportedFormats": ["pdf", "html", "json", "csv"]
}
```

### 生成报告
```http
POST /api/reports/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "月度性能报告",
  "type": "performance",
  "format": "pdf",
  "config": {
    "dateRange": "2025-08-01 to 2025-08-31",
    "includeCharts": true,
    "includeRecommendations": true,
    "includeComparison": true
  }
}
```

### 获取报告详情
```http
GET /api/reports/:id
Authorization: Bearer <token>
```

### 下载报告
```http
GET /api/reports/:id/download
Authorization: Bearer <token>
```

**响应：** 文件下载流，Content-Type根据报告格式设置

### 删除报告
```http
DELETE /api/reports/:id
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
