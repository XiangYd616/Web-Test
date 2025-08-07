# 数据库迁移指南

## 🎯 问题描述

压力测试完成时出现数据库错误：`关系 "test_sessions" 的 "results" 字段不存在`

## 🔧 解决方案

执行数据库迁移来添加缺失的字段。

## 📋 迁移内容

### 001_add_missing_fields_to_test_sessions.sql
- ✅ 添加 `results` 字段 (JSONB 类型)
- ✅ 修改 `grade` 字段长度为 VARCHAR(5)
- ✅ 添加 GIN 索引提高查询性能
- ✅ 包含回滚脚本

## 🚀 执行步骤

### 方法一：使用自动化脚本（推荐）

```bash
# 1. 进入项目根目录
cd /path/to/your/project

# 2. 设置数据库环境变量（如果需要）
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=test_web_app
export DB_USER=postgres
export DB_PASSWORD=your_password

# 3. 执行迁移脚本
node server/scripts/run-migrations.js
```

### 方法二：手动执行 SQL

```bash
# 1. 连接到 PostgreSQL 数据库
psql -h localhost -p 5432 -U postgres -d test_web_app

# 2. 执行迁移文件
\i server/migrations/000_create_migration_history.sql
\i server/migrations/001_add_missing_fields_to_test_sessions.sql
```

### 方法三：使用 psql 命令行

```bash
# 直接执行迁移文件
psql -h localhost -p 5432 -U postgres -d test_web_app -f server/migrations/000_create_migration_history.sql
psql -h localhost -p 5432 -U postgres -d test_web_app -f server/migrations/001_add_missing_fields_to_test_sessions.sql
```

## ✅ 验证迁移

执行以下 SQL 验证迁移是否成功：

```sql
-- 检查 results 字段是否存在
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'test_sessions' 
AND column_name = 'results';

-- 检查 grade 字段长度
SELECT column_name, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'test_sessions' 
AND column_name = 'grade';

-- 查看迁移历史
SELECT * FROM migration_history ORDER BY executed_at;
```

## 🔄 回滚（如果需要）

如果需要回滚迁移，请执行迁移文件中的回滚部分：

```sql
-- 警告：这将删除 results 字段中的所有数据！
DROP INDEX IF EXISTS idx_test_sessions_results_gin;
ALTER TABLE test_sessions DROP COLUMN IF EXISTS results;
ALTER TABLE test_sessions ALTER COLUMN grade TYPE VARCHAR(2);
```

## 📊 迁移后的表结构

迁移完成后，`test_sessions` 表将包含以下字段：

```sql
test_sessions:
├── id (UUID, PRIMARY KEY)
├── user_id (UUID, FOREIGN KEY)
├── test_name (VARCHAR(255))
├── test_type (VARCHAR(50))
├── url (VARCHAR(2048))
├── status (VARCHAR(20))
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
├── start_time (TIMESTAMP)
├── end_time (TIMESTAMP)
├── duration (INTEGER)
├── overall_score (DECIMAL(5,2))
├── grade (VARCHAR(5)) ← 已修改
├── total_issues (INTEGER)
├── critical_issues (INTEGER)
├── major_issues (INTEGER)
├── minor_issues (INTEGER)
├── warnings (INTEGER)
├── config (JSONB)
├── environment (VARCHAR(50))
├── tags (TEXT[])
├── description (TEXT)
├── notes (TEXT)
├── deleted_at (TIMESTAMP)
└── results (JSONB) ← 新增
```

## 🎉 完成

迁移完成后，压力测试应该能够正常保存结果数据，不再出现字段缺失的错误。
