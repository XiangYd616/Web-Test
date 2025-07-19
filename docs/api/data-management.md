# 数据管理 API 文档

## 概述

数据管理 API 提供了统一的数据操作接口，包括测试历史管理、数据导入导出、统计分析等功能。

**基础路径**: `/api/data-management`

## 认证

所有 API 端点都需要认证。请在请求头中包含有效的 JWT token：

```
Authorization: Bearer <your-jwt-token>
```

## API 端点

### 测试历史管理

#### 获取测试历史记录

```http
GET /api/data-management/test-history
```

**查询参数**:
- `page` (number, 可选): 页码，默认为 1
- `limit` (number, 可选): 每页记录数，默认为 20，最大 100
- `search` (string, 可选): 搜索关键词，匹配测试名称或 URL
- `testType` (string[], 可选): 测试类型过滤
- `status` (string[], 可选): 状态过滤
- `dateFrom` (string, 可选): 开始日期 (ISO 8601 格式)
- `dateTo` (string, 可选): 结束日期 (ISO 8601 格式)
- `sortBy` (string, 可选): 排序字段，默认为 'created_at'
- `sortOrder` (string, 可选): 排序方向，'asc' 或 'desc'，默认为 'desc'

**响应示例**:
```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "id": "123",
        "testName": "网站性能测试",
        "testType": "performance",
        "url": "https://example.com",
        "status": "completed",
        "startTime": "2025-07-19T10:00:00Z",
        "endTime": "2025-07-19T10:05:00Z",
        "duration": 300000,
        "createdAt": "2025-07-19T10:00:00Z",
        "results": { ... }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### 批量删除测试记录

```http
DELETE /api/data-management/test-history/batch
```

**请求体**:
```json
{
  "testIds": ["123", "456", "789"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "deletedCount": 3
  },
  "message": "已删除 3 条记录"
}
```

### 统计分析

#### 获取测试历史统计

```http
GET /api/data-management/statistics
```

**查询参数**:
- `timeRange` (number, 可选): 时间范围（天数），默认为 30

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTests": 150,
      "completedTests": 140,
      "failedTests": 10,
      "averageScore": 85.5,
      "averageDuration": 45000,
      "successRate": 93.3
    },
    "typeStats": [
      {
        "type": "performance",
        "count": 50,
        "averageScore": 88.2,
        "successRate": 96.0
      }
    ],
    "trends": [
      {
        "date": "2025-07-19",
        "count": 15,
        "averageScore": 87.3
      }
    ]
  }
}
```

### 数据导出

#### 获取导出任务列表

```http
GET /api/data-management/exports
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "export_123",
      "name": "测试历史导出_2025-07-19",
      "type": "test_history",
      "format": "json",
      "status": "completed",
      "recordCount": 150,
      "fileSize": 2048576,
      "createdAt": "2025-07-19T10:00:00Z"
    }
  ]
}
```

#### 创建导出任务

```http
POST /api/data-management/export
```

**请求体**:
```json
{
  "format": "json",
  "dateFrom": "2025-07-01T00:00:00Z",
  "dateTo": "2025-07-19T23:59:59Z",
  "testTypes": ["performance", "security"],
  "includeResults": true,
  "includeConfig": true
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "export_456",
    "name": "测试历史导出_2025-07-19",
    "status": "completed",
    "recordCount": 75,
    "fileSize": 1024000,
    "downloadUrl": "/api/data-management/exports/export_456/download"
  }
}
```

### 数据导入

#### 获取导入任务列表

```http
GET /api/data-management/imports
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "import_123",
      "name": "测试数据导入_2025-07-19",
      "type": "test_history",
      "status": "completed",
      "recordsTotal": 100,
      "recordsProcessed": 95,
      "recordsSkipped": 5,
      "createdAt": "2025-07-19T10:00:00Z"
    }
  ]
}
```

## 错误处理

所有 API 端点都使用统一的错误响应格式：

```json
{
  "success": false,
  "error": "错误描述",
  "timestamp": "2025-07-19T10:00:00Z"
}
```

### 常见错误码

- `400 Bad Request`: 请求参数无效
- `401 Unauthorized`: 未认证或 token 无效
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

## 数据模型

### TestRecord

```typescript
interface TestRecord {
  id: string;
  testName: string;
  testType: 'website' | 'performance' | 'security' | 'seo' | 'stress' | 'api' | 'compatibility' | 'ux';
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  config?: object;
  results?: object;
}
```

### Statistics

```typescript
interface Statistics {
  overview: {
    totalTests: number;
    completedTests: number;
    failedTests: number;
    averageScore: number;
    averageDuration: number;
    successRate: number;
  };
  typeStats: Array<{
    type: string;
    count: number;
    averageScore: number;
    successRate: number;
  }>;
  trends: Array<{
    date: string;
    count: number;
    averageScore: number;
  }>;
}
```

## 使用示例

### JavaScript/TypeScript

```javascript
// 获取测试历史
const response = await fetch('/api/data-management/test-history?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (data.success) {
  console.log('测试记录:', data.data.tests);
  console.log('分页信息:', data.data.pagination);
}

// 批量删除测试记录
const deleteResponse = await fetch('/api/data-management/test-history/batch', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    testIds: ['123', '456']
  })
});

const deleteResult = await deleteResponse.json();
if (deleteResult.success) {
  console.log('删除成功:', deleteResult.message);
}
```

## 版本历史

### v2.0.0 (2025-07-19)
- 重构数据管理服务架构
- 统一 API 路由结构
- 改进错误处理机制
- 优化数据库查询性能
- 添加批量操作支持

### v1.0.0 (2025-06-01)
- 初始版本
- 基础测试历史管理功能
- 简单的数据导出功能
