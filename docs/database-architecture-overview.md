# 数据库架构概览

## 🎯 概述

Test Web App 采用现代化的主从表数据库架构，专门为多种测试类型优化设计。新架构提供了更好的性能、数据完整性和扩展性。

## 🏗️ 架构特点

### 主从表设计
- **主表** (`test_sessions`)：存储所有测试类型的通用信息
- **详情表**：每种测试类型的专用详情表
- **资源表** (`test_artifacts`)：存储测试相关文件
- **视图**：简化复杂查询的历史视图

### 支持的测试类型
1. **压力测试** (`stress`) - `stress_test_details`
2. **安全测试** (`security`) - `security_test_details`
3. **API测试** (`api`) - `api_test_details`
4. **性能测试** (`performance`) - `performance_test_details`
5. **兼容性测试** (`compatibility`) - `compatibility_test_details`
6. **SEO测试** (`seo`) - `seo_test_details`
7. **可访问性测试** (`accessibility`) - `accessibility_test_details`

## 📊 数据流程

### 测试创建流程
```
1. 创建测试会话 → test_sessions
2. 执行测试 → 收集数据
3. 保存详情 → 对应的详情表
4. 保存文件 → test_artifacts (可选)
```

### 查询流程
```
1. 列表查询 → 直接查询主表 (90%的场景)
2. 详情查询 → 使用历史视图 (10%的场景)
3. 复杂查询 → JOIN查询 (1%的场景)
```

## 🔍 核心表结构

### test_sessions (主表)
```sql
- id: UUID (主键)
- user_id: UUID (外键)
- test_name: VARCHAR(255)
- test_type: VARCHAR(100)
- url: TEXT
- status: VARCHAR(50)
- overall_score: DECIMAL(5,2)
- grade: VARCHAR(5)
- total_issues: INTEGER
- critical_issues: INTEGER
- major_issues: INTEGER
- minor_issues: INTEGER
- duration: INTEGER (秒)
- created_at: TIMESTAMP
- deleted_at: TIMESTAMP (软删除)
```

### 详情表示例 (security_test_details)
```sql
- session_id: UUID (主键，外键)
- security_score: DECIMAL(5,2)
- ssl_score: DECIMAL(5,2)
- vulnerabilities_total: INTEGER
- vulnerabilities_critical: INTEGER
- https_enforced: BOOLEAN
- hsts_enabled: BOOLEAN
```

## 🚀 性能优化

### 查询优化
- **索引策略**：针对常用查询字段建立索引
- **视图优化**：预定义复杂查询视图
- **分表设计**：减少单表数据量

### 存储优化
- **数据类型**：使用合适的数据类型
- **约束检查**：数据库级别的完整性约束
- **软删除**：避免物理删除，支持数据恢复

## 🔧 开发指南

### 新增测试类型
1. 创建详情表
2. 创建历史视图
3. 更新API服务
4. 更新前端类型

### 查询最佳实践
```sql
-- ✅ 推荐：列表查询
SELECT * FROM test_sessions 
WHERE user_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC;

-- ✅ 推荐：详情查询
SELECT * FROM security_test_history 
WHERE id = ?;

-- ⚠️ 谨慎：复杂JOIN查询
SELECT ts.*, std.* 
FROM test_sessions ts
JOIN security_test_details std ON ts.id = std.session_id
WHERE ts.user_id = ?;
```

### API设计模式
```javascript
// 列表API - 只返回主表数据
GET /api/test/history
→ { tests: [{ id, testName, testType, status, score, ... }] }

// 详情API - 返回完整数据
GET /api/test/{id}
→ { ...mainData, securityDetails: {...}, performanceDetails: {...} }
```

## 📋 维护指南

### 日常维护
- 定期更新表统计信息
- 监控查询性能
- 清理过期的软删除记录

### 备份策略
- 主表和详情表一起备份
- 保持数据一致性
- 定期验证备份完整性

### 监控指标
- 查询响应时间
- 表大小增长
- 索引使用率
- 错误率统计

## 🔗 相关文档

- [数据库架构详细设计](./DATABASE_SCHEMA.md)
- [数据库迁移指南](./database-migration-guide.md)
- [API接口文档](./API_REFERENCE.md)
- [测试历史主从表设计](./test-history-master-detail-design.md)

## 📞 技术支持

如有问题，请参考：
1. 故障排除文档
2. 开发者指南
3. 技术支持团队
