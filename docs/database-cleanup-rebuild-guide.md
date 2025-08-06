# 数据库清理和重建指南

## 📋 概述

本指南将帮你完全清理旧的数据库结构，并重建一个干净、现代的数据库架构。

## ⚠️ **重要警告**

**此操作会删除所有现有数据！仅在开发环境使用！**

如果你有重要数据需要保留，请先备份：
```bash
pg_dump -U username -h localhost database_name > backup.sql
```

## 🗑️ **第一步：全面清理旧结构**

### 1. 执行全面清理脚本
```bash
# 清理所有旧的表、视图、函数等
psql -d your_database -f server/scripts/cleanup-all-old-database-files.sql
```

这个脚本会删除：
- ❌ 所有旧的测试相关表 (`test_history`, `test_results`, 等)
- ❌ 所有监控相关表 (`monitoring_sites`, `monitoring_results`, 等)
- ❌ 所有数据管理相关表 (`data_tasks`, `export_tasks`, 等)
- ❌ 所有系统配置相关表 (`system_settings`, `app_settings`, 等)
- ❌ 所有通知相关表 (`notifications`, `user_notifications`, 等)
- ❌ 所有活动日志相关表 (`activity_logs`, `audit_logs`, 等)
- ❌ 所有报告相关表 (`reports`, `report_templates`, 等)
- ❌ 相关的视图、函数、触发器、索引

### 2. 验证清理结果
```sql
-- 检查剩余的表（应该只有users表或为空）
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 检查剩余的视图（应该为空）
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- 检查剩余的函数（应该只有系统函数）
SELECT proname FROM pg_proc WHERE pronamespace = (
    SELECT oid FROM pg_namespace WHERE nspname = 'public'
);
```

## 🏗️ **第二步：重建核心数据库结构**

### 1. 创建核心表结构
```bash
# 创建用户、偏好、会话等核心表
psql -d your_database -f server/scripts/init-database.sql
```

这会创建：
- ✅ `users` - 用户管理表
- ✅ `user_preferences` - 用户偏好设置
- ✅ `user_sessions` - 会话管理表
- ✅ `system_settings` - 系统配置表

### 2. 创建测试历史主从表结构
```bash
# 创建新的主从表设计
psql -d your_database -f server/scripts/master-detail-test-history-schema.sql
```

这会创建：
- ✅ `test_sessions` - 测试会话主表
- ✅ `stress_test_details` - 压力测试详情表
- ✅ `security_test_details` - 安全测试详情表
- ✅ `api_test_details` - API测试详情表
- ✅ `seo_test_details` - SEO测试详情表
- ✅ `accessibility_test_details` - 可访问性测试详情表
- ✅ `compatibility_test_details` - 兼容性测试详情表
- ✅ `performance_test_details` - 性能测试详情表
- ✅ `test_artifacts` - 测试文件资源表

### 3. 验证新结构
```sql
-- 检查所有表
\dt

-- 检查表结构
\d test_sessions
\d stress_test_details

-- 检查索引
\di

-- 检查视图
\dv
```

## 📁 **第三步：文件清理总结**

### 已删除的旧文件
```
❌ server/scripts/fix-database.sql (包含大量旧表结构)
❌ server/scripts/master-slave-table-design.sql
❌ server/scripts/normalized-test-history-schema.sql
❌ server/scripts/optimize-test-history-schema.sql
❌ server/scripts/enhance-test-history.sql
❌ server/scripts/safe-test-history-migration.sql
❌ server/scripts/run-test-history-migration.js
❌ server/scripts/execute-migration.js
❌ server/scripts/analyze-test-history-usage.sql
❌ server/scripts/analyze-test-status.sql
❌ server/scripts/layered-test-history-schema.sql
❌ server/scripts/practical-test-history-schema.sql
❌ server/scripts/optimized-test-history-schema.sql
❌ server/services/dataManagement/testHistoryService.js
❌ server/services/dataManagement/unifiedTestHistoryService.js
❌ docs/frontend-test-history-refactor.md
```

### 新的核心文件
```
✅ server/scripts/init-database.sql - 核心数据库初始化
✅ server/scripts/master-detail-test-history-schema.sql - 测试历史主从表
✅ server/scripts/cleanup-old-test-history.sql - 测试历史清理
✅ server/scripts/cleanup-all-old-database-files.sql - 全面清理
✅ server/services/TestHistoryService.js - 新的测试历史服务
✅ server/routes/testHistory.js - 新的测试历史API
✅ docs/test-history-master-detail-design.md - 设计文档
```

## 🔧 **第四步：应用程序配置**

### 1. 更新数据库连接配置
确保你的数据库连接配置正确：
```javascript
// server/config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'your_username',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'your_database',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

module.exports = { pool };
```

### 2. 注册新的API路由
```javascript
// 在 app.js 或 server.js 中
const testHistoryRoutes = require('./routes/testHistory');
app.use('/api/test/history', testHistoryRoutes);
```

### 3. 创建管理员用户
```sql
-- 创建管理员用户
INSERT INTO users (username, email, password, role, is_active, email_verified)
VALUES (
    'admin',
    'admin@example.com',
    '$2b$10$hashed_password_here', -- 使用bcrypt哈希
    'admin',
    true,
    true
);
```

## 🧪 **第五步：测试验证**

### 1. 数据库连接测试
```javascript
// 测试数据库连接
const { pool } = require('./server/config/database');

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('数据库连接成功:', result.rows[0]);
    client.release();
  } catch (err) {
    console.error('数据库连接失败:', err);
  }
}

testConnection();
```

### 2. API端点测试
```bash
# 测试用户注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# 测试用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 测试测试历史API
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/test/history?testType=stress&page=1&limit=10"
```

### 3. 前端功能测试
- [ ] 用户注册和登录
- [ ] 测试页面历史标签页
- [ ] 测试记录的创建和查看
- [ ] 搜索和筛选功能
- [ ] 分页功能

## 📊 **第六步：性能优化**

### 1. 分析查询性能
```sql
-- 启用查询统计（如果还没有）
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查看慢查询
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 2. 监控索引使用
```sql
-- 查看索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

## 🎉 **完成检查清单**

- [ ] 执行全面数据库清理
- [ ] 创建核心表结构
- [ ] 创建测试历史主从表
- [ ] 验证表结构和索引
- [ ] 更新应用程序配置
- [ ] 注册新的API路由
- [ ] 创建管理员用户
- [ ] 测试数据库连接
- [ ] 测试API端点
- [ ] 测试前端功能
- [ ] 监控性能指标

完成以上步骤后，你就拥有了一个全新、干净、现代的数据库架构！🚀

## 📝 **备注**

- 所有旧的表结构和数据都已被清理
- 新的主从表设计符合数据库规范化原则
- API设计支持高性能的测试历史查询
- 前端组件支持统一的测试页面历史标签页功能
