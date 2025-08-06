# 测试历史主从表设计 - 最终方案

## 📋 概述

本方案采用**主从表设计**，完全符合数据库规范化原则，专门为"测试页面历史标签页"功能优化。

### 核心特点
- ✅ **符合数据库规范**：严格遵循1NF、2NF、3NF原则
- ✅ **性能优化**：针对90%的查询场景进行优化
- ✅ **类型安全**：强类型约束，数据完整性保证
- ✅ **扩展性好**：支持7种测试类型，易于扩展
- ✅ **查询简化**：通过视图简化复杂查询

## 🏗️ 架构设计

### 表结构概览
```
test_sessions (主表)
├── stress_test_details (压力测试详情)
├── security_test_details (安全测试详情)
├── api_test_details (API测试详情)
├── seo_test_details (SEO测试详情)
├── accessibility_test_details (可访问性测试详情)
├── compatibility_test_details (兼容性测试详情)
├── performance_test_details (性能测试详情)
└── test_artifacts (测试文件资源)
```

### 查询性能分布
- **90%查询**：只查主表（极快）
- **10%查询**：使用视图（快）
- **1%查询**：JOIN查询（可接受）

## 📊 表结构详情

### 1. 主表 (test_sessions)
存储所有测试类型的通用信息：
```sql
- 基础信息：id, user_id, test_name, test_type, url
- 状态时间：status, created_at, start_time, end_time, duration
- 通用评分：overall_score, grade
- 问题统计：total_issues, critical_issues, major_issues, minor_issues
- 环境配置：config, environment, tags
```

### 2. 详情表 (7个测试类型)
每个测试类型有独立的详情表，存储特定指标：

#### 压力测试详情 (stress_test_details)
```sql
- 配置：concurrent_users, test_duration, ramp_up_time
- 性能：tps_peak, tps_average, response_time_avg, response_time_p95
- 错误：error_rate, timeout_errors, connection_errors
- 资源：cpu_usage_avg, memory_usage_avg
```

#### 安全测试详情 (security_test_details)
```sql
- 评分：security_score, ssl_score, header_security_score
- 漏洞：vulnerabilities_total, sql_injection_found, xss_vulnerabilities
- 配置：https_enforced, hsts_enabled, csrf_protection
```

#### 其他测试类型详情表
- `api_test_details`：API测试特定指标
- `seo_test_details`：SEO测试特定指标
- `accessibility_test_details`：可访问性测试特定指标
- `compatibility_test_details`：兼容性测试特定指标
- `performance_test_details`：性能测试特定指标

### 3. 文件资源表 (test_artifacts)
```sql
- 文件信息：artifact_type, file_name, file_path, file_size
- 状态：upload_status, is_public
```

## 🚀 查询策略

### 策略1：基础列表查询（90%场景）
```sql
-- 只查主表，性能最佳
SELECT id, test_name, url, status, created_at, overall_score
FROM test_sessions 
WHERE user_id = ? AND test_type = 'stress' AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 20;
```

### 策略2：详细列表查询（10%场景）
```sql
-- 使用预定义视图
SELECT * FROM stress_test_history 
WHERE user_id = ? 
ORDER BY created_at DESC LIMIT 20;
```

### 策略3：完整详情查询（1%场景）
```sql
-- JOIN查询获取完整信息
SELECT ts.*, std.*
FROM test_sessions ts
JOIN stress_test_details std ON ts.id = std.session_id
WHERE ts.id = ?;
```

## 📈 索引策略

### 主表索引（覆盖90%查询）
```sql
-- 核心索引：用户+类型+时间
CREATE INDEX idx_test_sessions_user_type_time 
ON test_sessions(user_id, test_type, created_at DESC) 
WHERE deleted_at IS NULL;

-- 状态筛选索引
CREATE INDEX idx_test_sessions_user_type_status 
ON test_sessions(user_id, test_type, status) 
WHERE deleted_at IS NULL;

-- 评分排序索引
CREATE INDEX idx_test_sessions_user_type_score 
ON test_sessions(user_id, test_type, overall_score DESC) 
WHERE deleted_at IS NULL;
```

### 详情表索引
```sql
-- 每个详情表的外键索引
CREATE INDEX idx_stress_test_details_session_id 
ON stress_test_details(session_id);
-- ... 其他详情表类似
```

## 🎯 API接口设计

### 基础接口
```javascript
// 获取测试历史列表（90%使用场景）
GET /api/test/history?testType=stress&page=1&limit=20

// 获取详细测试历史（10%使用场景）
GET /api/test/history/detailed?testType=stress&page=1&limit=20

// 获取测试详情（1%使用场景）
GET /api/test/history/:sessionId

// 创建测试记录
POST /api/test/history/stress
POST /api/test/history/security
// ... 其他测试类型

// 删除测试记录
DELETE /api/test/history/:sessionId
DELETE /api/test/history/batch

// 统计和导出
GET /api/test/history/statistics
GET /api/test/history/export
```

## 💻 前端集成

### 使用TestPageHistory组件
```typescript
import TestPageHistory from '../components/testHistory/TestPageHistory';

// 在压力测试页面的历史标签页中
<TestPageHistory
  testType="stress"
  onTestSelect={(test) => {
    // 处理测试选择
    console.log('选择的测试:', test);
  }}
  onTestRerun={(test) => {
    // 处理重新运行
    setTestConfig(test.config);
    switchToTestTab();
  }}
/>
```

### API调用示例
```javascript
// 获取压力测试历史
const getStressTestHistory = async (page = 1) => {
  const response = await fetch(`/api/test/history?testType=stress&page=${page}&limit=20`);
  return await response.json();
};

// 获取测试详情
const getTestDetails = async (sessionId) => {
  const response = await fetch(`/api/test/history/${sessionId}`);
  return await response.json();
};

// 创建压力测试记录
const createStressTest = async (testData) => {
  const response = await fetch('/api/test/history/stress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  return await response.json();
};
```

## 🔧 部署和维护

### 1. 数据库初始化
```bash
# 执行主从表结构创建
psql -d your_database -f server/scripts/master-detail-test-history-schema.sql
```

### 2. 数据迁移（如果从现有表迁移）
```sql
-- 从现有test_history表迁移数据
-- 需要根据实际情况编写迁移脚本
```

### 3. 性能监控
```sql
-- 监控索引使用情况
SELECT * FROM pg_stat_user_indexes 
WHERE tablename LIKE '%test%'
ORDER BY idx_scan DESC;

-- 监控查询性能
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements 
WHERE query LIKE '%test_sessions%'
ORDER BY mean_time DESC;
```

### 4. 定期维护
```sql
-- 清理软删除的记录（超过1年）
DELETE FROM test_sessions 
WHERE deleted_at IS NOT NULL 
AND deleted_at < NOW() - INTERVAL '1 year';

-- 更新表统计信息
ANALYZE test_sessions;
ANALYZE stress_test_details;
-- ... 其他表
```

## 📊 性能预期

### 查询性能
- **基础列表查询**：< 10ms（单表查询+索引）
- **详细列表查询**：< 50ms（视图查询）
- **完整详情查询**：< 100ms（JOIN查询）

### 存储效率
- **无空值浪费**：每个表只存储相关数据
- **精确类型**：强类型约束，存储效率高
- **索引优化**：针对查询模式优化的索引策略

### 扩展性
- **新增测试类型**：创建新的详情表即可
- **新增指标**：在对应详情表中添加字段
- **查询优化**：通过视图和索引持续优化

## 🎉 总结

这个主从表设计方案：

1. ✅ **完全符合数据库规范**：1NF、2NF、3NF
2. ✅ **查询性能优秀**：90%查询无需JOIN
3. ✅ **类型安全可靠**：强类型约束和外键约束
4. ✅ **扩展性良好**：支持新测试类型和指标
5. ✅ **维护成本低**：清晰的表结构和查询策略

这是一个既符合数据库理论，又满足实际性能需求的最佳方案！
