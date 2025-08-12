# 数据库架构优化迁移指南

## 📋 概述

本迁移将数据库架构从基础版本升级到支持本地化测试引擎的优化版本，主要改进包括：

- **本地化优先设计** - 支持7个本地测试引擎的数据存储
- **性能优化** - 针对高频查询和大数据量的索引优化
- **时间序列优化** - 测试结果的时间序列存储和查询优化
- **详细结果存储** - 每个测试类型的专门详细结果表
- **监控和维护** - 内置的性能监控和自动维护功能

## 🎯 迁移目标

### 新增核心表
1. **test_results** - 统一的测试结果主表
2. **seo_test_details** - SEO测试详细结果
3. **performance_test_details** - 性能测试详细结果
4. **security_test_details** - 安全测试详细结果
5. **api_test_details** - API测试详细结果
6. **compatibility_test_details** - 兼容性测试详细结果（包含可访问性功能）
7. **stress_test_details** - 压力测试详细结果（优化版）
9. **test_artifacts** - 测试文件和资源
10. **system_config** - 系统配置
11. **engine_status** - 测试引擎状态监控

### 性能优化特性
- **高级索引** - GIN、部分索引、表达式索引
- **查询优化函数** - 高效的历史查询和统计函数
- **自动维护** - 数据清理和性能监控
- **连接池优化** - 改进的连接管理和配置

## 🚀 执行迁移

### 方法1：自动迁移脚本（推荐）

```bash
# 1. 进入项目目录
cd /path/to/Test-Web

# 2. 安装依赖（如果还没有）
npm install

# 3. 执行迁移脚本
node server/scripts/migrate-database.js
```

### 方法2：手动执行SQL

```bash
# 1. 连接到数据库
psql -h localhost -U postgres -d testweb_dev

# 2. 执行优化架构脚本
\i server/scripts/optimized-database-schema.sql

# 3. 执行性能优化脚本
\i server/scripts/database-performance-optimization.sql
```

### 方法3：分步执行

```bash
# 仅检查连接
node server/scripts/migrate-database.js --dry-run

# 仅备份数据
node server/scripts/migrate-database.js --backup-only

# 仅验证架构
node server/scripts/migrate-database.js --validate
```

## 📊 迁移前检查

### 1. 环境要求
- PostgreSQL 12+ （推荐 14+）
- Node.js 16+ 
- 足够的磁盘空间（至少2倍当前数据库大小）

### 2. 备份现有数据
```bash
# 创建完整备份
pg_dump -h localhost -U postgres testweb_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# 或使用迁移脚本的备份功能
node server/scripts/migrate-database.js --backup-only
```

### 3. 检查当前表结构
```sql
-- 查看现有表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- 查看数据量
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows
FROM pg_stat_user_tables 
ORDER BY n_live_tup DESC;
```

## 🔧 迁移后验证

### 1. 验证表结构
```sql
-- 检查核心表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'users', 'test_results', 'seo_test_details', 'performance_test_details',
  'security_test_details', 'api_test_details', 'compatibility_test_details',
  -- 'accessibility_test_details', -- Removed - functionality moved to compatibility test
  'stress_test_details', 'test_artifacts',
  'system_config', 'engine_status'
) ORDER BY table_name;
```

### 2. 验证索引
```sql
-- 检查索引数量
SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';

-- 检查重要索引
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE '%test_results%'
ORDER BY tablename, indexname;
```

### 3. 验证函数和视图
```sql
-- 检查函数
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' ORDER BY routine_name;

-- 检查视图
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' ORDER BY table_name;
```

### 4. 测试核心功能
```sql
-- 测试用户测试历史查询函数
SELECT * FROM get_user_test_history('00000000-0000-0000-0000-000000000000'::uuid, 'seo', 10, 0);

-- 测试统计函数
SELECT * FROM get_test_statistics(null, null, 30);

-- 测试性能建议
SELECT * FROM get_performance_recommendations();
```

## 📈 性能优化配置

### 1. PostgreSQL配置建议
```sql
-- 查看当前配置
SELECT * FROM get_performance_recommendations();

-- 建议的配置调整（需要重启PostgreSQL）
-- shared_buffers = 256MB
-- effective_cache_size = 768MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- random_page_cost = 1.1  # for SSD
```

### 2. 连接池配置
```javascript
// 在 .env 文件中添加
DB_MAX_CONNECTIONS=20
DB_MIN_CONNECTIONS=5
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
DB_ACQUIRE_TIMEOUT=60000
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=30000
```

### 3. 定期维护
```sql
-- 手动执行维护
SELECT perform_maintenance();

-- 设置定期维护（可以通过cron或应用调度）
-- 建议每天执行一次
```

## 🔍 监控和诊断

### 1. 健康检查
```javascript
// 在应用中使用
const { healthCheck } = require('./config/database');
const health = await healthCheck();
console.log(health);
```

### 2. 性能监控
```sql
-- 查看慢查询
SELECT * FROM slow_queries LIMIT 10;

-- 查看表大小
SELECT * FROM table_sizes;

-- 查看索引使用情况
SELECT * FROM index_usage WHERE idx_scan < 100;
```

### 3. 连接监控
```javascript
// 获取数据库统计
const { getStats } = require('./config/database');
const stats = await getStats();
console.log(stats);
```

## 🚨 故障排除

### 常见问题

#### 1. 连接失败
```bash
# 检查PostgreSQL服务状态
sudo systemctl status postgresql

# 检查端口是否开放
netstat -an | grep 5432

# 检查配置文件
cat server/.env | grep DB_
```

#### 2. 权限问题
```sql
-- 检查用户权限
SELECT * FROM information_schema.role_table_grants 
WHERE grantee = 'postgres';

-- 授予必要权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

#### 3. 磁盘空间不足
```bash
# 检查磁盘空间
df -h

# 清理旧的备份文件
find . -name "*backup*" -type f -mtime +7 -delete

# 清理PostgreSQL日志
sudo find /var/log/postgresql -name "*.log" -mtime +7 -delete
```

#### 4. 迁移中断
```sql
-- 检查是否有未完成的事务
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- 如果需要，可以终止长时间运行的查询
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'active' AND query_start < NOW() - INTERVAL '1 hour';
```

### 回滚方案

如果迁移失败，可以使用备份恢复：

```bash
# 1. 删除当前数据库
dropdb -h localhost -U postgres testweb_dev

# 2. 重新创建数据库
createdb -h localhost -U postgres testweb_dev

# 3. 恢复备份
psql -h localhost -U postgres testweb_dev < backup_YYYYMMDD_HHMMSS.sql
```

## 📞 支持

如果在迁移过程中遇到问题：

1. **检查日志** - 查看迁移脚本的输出日志
2. **验证环境** - 确保PostgreSQL版本和配置正确
3. **检查权限** - 确保数据库用户有足够权限
4. **磁盘空间** - 确保有足够的磁盘空间
5. **备份恢复** - 如有问题可以回滚到备份

---

**重要提醒：** 
- 在生产环境执行迁移前，请务必在测试环境完整测试
- 确保有完整的数据备份
- 建议在低峰时段执行迁移
- 迁移完成后监控系统性能
