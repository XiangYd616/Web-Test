# 测试平台后端API接口规范

## 基础信息
- 基础URL: `/api/v1`
- 认证方式: JWT Token 或 API Key
- 响应格式: JSON
- 错误处理: 标准HTTP状态码 + 错误详情

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 1. 认证相关接口

### POST /auth/login
用户登录
```json
{
  "username": "string",
  "password": "string"
}
```

### POST /auth/register
用户注册
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

### POST /auth/refresh
刷新Token
```json
{
  "refresh_token": "string"
}
```

## 2. 项目管理接口

### GET /projects
获取用户项目列表

### POST /projects
创建新项目
```json
{
  "name": "string",
  "description": "string",
  "target_url": "string"
}
```

### PUT /projects/{id}
更新项目信息

### DELETE /projects/{id}
删除项目

## 3. 测试配置接口

### GET /configurations
获取测试配置列表
- Query参数: `test_type`, `project_id`, `is_template`

### POST /configurations
保存测试配置
```json
{
  "test_type": "string",
  "name": "string",
  "configuration": {},
  "project_id": "number",
  "is_template": "boolean"
}
```

## 4. 测试执行接口

### POST /tests/execute
执行测试
```json
{
  "test_type": "string",
  "configuration": {},
  "project_id": "number",
  "target_url": "string"
}
```

### GET /tests/executions
获取测试执行历史
- Query参数: `test_type`, `project_id`, `status`, `limit`, `offset`

### GET /tests/executions/{id}
获取特定测试执行详情

### POST /tests/executions/{id}/stop
停止正在运行的测试

### DELETE /tests/executions/{id}
删除测试执行记录

## 5. 性能测试接口

### POST /tests/performance/execute
执行性能测试
```json
{
  "target_url": "string",
  "configuration": {
    "device": "desktop|mobile",
    "network_condition": "string",
    "lighthouse_config": {},
    "custom_metrics": []
  }
}
```

### GET /tests/performance/results/{execution_id}
获取性能测试结果

### POST /tests/performance/analyze
分析性能数据
```json
{
  "execution_ids": ["string"],
  "comparison_type": "trend|benchmark"
}
```

## 6. 安全测试接口

### POST /tests/security/execute
执行安全测试
```json
{
  "target_url": "string",
  "configuration": {
    "scan_depth": "basic|standard|comprehensive",
    "include_ssl": "boolean",
    "include_headers": "boolean",
    "custom_checks": []
  }
}
```

### GET /tests/security/results/{execution_id}
获取安全测试结果

### GET /tests/security/vulnerabilities
获取漏洞数据库信息

## 7. API测试接口

### POST /tests/api/execute
执行API测试
```json
{
  "endpoints": [
    {
      "url": "string",
      "method": "string",
      "headers": {},
      "body": "string",
      "assertions": []
    }
  ],
  "configuration": {
    "timeout": "number",
    "retry_count": "number",
    "parallel_requests": "number"
  }
}
```

### GET /tests/api/results/{execution_id}
获取API测试结果

### POST /tests/api/collections/import
导入API测试集合（支持Postman、Swagger等格式）

## 8. 压力测试接口

### POST /tests/stress/execute
执行压力测试
```json
{
  "target_url": "string",
  "configuration": {
    "concurrent_users": "number",
    "duration_seconds": "number",
    "ramp_up_time": "number",
    "test_scenarios": []
  }
}
```

### GET /tests/stress/results/{execution_id}
获取压力测试结果

### GET /tests/stress/realtime/{execution_id}
获取实时压力测试数据（WebSocket）

## 9. 兼容性测试接口

### POST /tests/compatibility/execute
执行兼容性测试
```json
{
  "target_url": "string",
  "configuration": {
    "browsers": ["chrome", "firefox", "safari", "edge"],
    "devices": ["desktop", "mobile", "tablet"],
    "features_to_test": [],
    "screenshot_comparison": "boolean"
  }
}
```

### GET /tests/compatibility/results/{execution_id}
获取兼容性测试结果

### GET /tests/compatibility/browsers
获取支持的浏览器列表

## 10. SEO测试接口

### POST /tests/seo/execute
执行SEO测试
```json
{
  "target_url": "string",
  "configuration": {
    "depth": "page|site",
    "include_technical": "boolean",
    "include_content": "boolean",
    "competitor_urls": []
  }
}
```

### GET /tests/seo/results/{execution_id}
获取SEO测试结果

### POST /tests/seo/analyze/keywords
关键词分析
```json
{
  "keywords": ["string"],
  "target_url": "string"
}
```

## 11. 用户体验测试接口

### POST /tests/ux/execute
执行用户体验测试
```json
{
  "target_url": "string",
  "configuration": {
    "accessibility_level": "A|AA|AAA",
    "include_usability": "boolean",
    "include_mobile": "boolean",
    "custom_checks": []
  }
}
```

### GET /tests/ux/results/{execution_id}
获取用户体验测试结果

## 12. 基础设施测试接口

### POST /tests/infrastructure/execute
执行基础设施测试
```json
{
  "configuration": {
    "database": {
      "enabled": "boolean",
      "connection_string": "string",
      "test_queries": []
    },
    "network": {
      "enabled": "boolean",
      "targets": ["string"],
      "test_types": []
    }
  }
}
```

### GET /tests/infrastructure/results/{execution_id}
获取基础设施测试结果

## 13. 报告生成接口

### POST /reports/generate
生成测试报告
```json
{
  "execution_ids": ["string"],
  "report_type": "comprehensive|performance|security",
  "format": "html|pdf|json",
  "include_recommendations": "boolean"
}
```

### GET /reports/{id}
获取生成的报告

### GET /reports/{id}/download
下载报告文件

## 14. 统计分析接口

### GET /analytics/dashboard
获取仪表板数据

### GET /analytics/trends
获取趋势分析数据
- Query参数: `test_type`, `time_range`, `metric`

### GET /analytics/comparisons
获取对比分析数据

## 15. 系统管理接口

### GET /system/health
系统健康检查

### GET /system/metrics
系统性能指标

### POST /system/maintenance
系统维护操作（管理员）

## WebSocket接口

### /ws/tests/{execution_id}
实时测试进度和结果推送

### /ws/stress/{execution_id}
压力测试实时数据流

## 错误代码定义

- `AUTH_001`: 认证失败
- `AUTH_002`: Token过期
- `PERM_001`: 权限不足
- `VALID_001`: 参数验证失败
- `TEST_001`: 测试执行失败
- `TEST_002`: 测试配置无效
- `SYS_001`: 系统错误
- `RATE_001`: 请求频率限制

## 限流规则

- 普通用户: 100请求/分钟
- 高级用户: 500请求/分钟
- 企业用户: 2000请求/分钟
- 测试执行: 10次/小时（普通用户）
