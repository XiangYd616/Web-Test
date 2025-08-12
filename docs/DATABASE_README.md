# 数据库架构重构说明

## 🎯 重构目标

解决项目中数据库架构混乱的问题，建立单一权威的数据库架构。

## ❌ 之前的问题

1. **多个架构文件冲突**：
   - `unified-optimized-database-schema.sql`
   - `optimized-database-schema.sql`
   - `master-detail-test-history-schema.sql`
   - `compatible-init-database.sql`

2. **字段名不匹配**：
   - 代码中使用 `failed_login_attempts`，某些架构中是 `login_attempts`
   - 缺少 `refresh_tokens` 和 `user_sessions` 表

3. **初始化脚本混乱**：
   - 多个不同的初始化脚本
   - 不同的数据库名称配置

## ✅ 重构后的架构

### 核心文件

1. **`database-schema.sql`** - 权威数据库架构
   - 与代码完全匹配的字段名
   - 包含所有必要的表和索引
   - 统一的命名规范

2. **`init-db.js`** - 统一初始化脚本
   - 重置并创建完整架构
   - 创建测试用户
   - 验证表结构

3. **`cleanup-old-db-files.js`** - 清理旧文件
   - 移除重复的架构文件
   - 备份重要文件

### 数据库表结构

#### 用户管理
- `users` - 用户基本信息（字段名与代码匹配）
- `refresh_tokens` - JWT刷新令牌
- `user_sessions` - 用户会话管理

#### 测试管理
- `test_sessions` - 测试会话记录

## 🚀 使用方法

### 1. 清理旧文件（可选）
```bash
cd server
node cleanup-old-db-files.js
```

### 2. 初始化数据库
```bash
cd server
node init-db.js
```

### 3. 验证
- 检查表是否正确创建
- 使用测试账户登录：
  - 邮箱: test@example.com
  - 密码: 123456

## 📋 关键字段映射

### users表字段（与代码匹配）
```sql
-- 认证字段
password_hash VARCHAR(255)           -- ✓ 与代码匹配
failed_login_attempts INTEGER        -- ✓ 与代码匹配
reset_token VARCHAR(255)             -- ✓ 与代码匹配
reset_token_expires TIMESTAMP        -- ✓ 与代码匹配

-- 状态字段
is_active BOOLEAN                    -- ✓ 与代码匹配
email_verified BOOLEAN               -- ✓ 与代码匹配
```

### 新增表
```sql
-- JWT管理
refresh_tokens (id, user_id, token_hash, jti, expires_at, is_revoked)

-- 会话管理  
user_sessions (id, user_id, session_id, access_token_hash, expires_at)
```

## 🔧 维护指南

### 添加新表
1. 在 `database-schema.sql` 中添加表定义
2. 添加相应的索引
3. 更新 `init-db.js` 中的验证逻辑

### 修改现有表
1. 创建迁移文件在 `migrations/` 目录
2. 使用 `scripts/run-migrations.js` 执行迁移
3. 更新 `database-schema.sql` 以反映最新状态

### 字段命名规范
- 使用 `snake_case` 命名
- 布尔字段使用 `is_` 前缀
- 时间字段使用 `_at` 后缀
- 外键使用 `_id` 后缀

## 🚨 重要提醒

1. **不要直接修改生产数据库**
2. **始终先在开发环境测试**
3. **保持 `database-schema.sql` 为权威架构**
4. **新的数据库更改必须通过迁移系统**

## 📞 故障排除

### 登录失败
1. 检查 `users` 表是否存在
2. 验证字段名是否匹配代码
3. 确认测试用户是否创建成功

### 表不存在错误
1. 运行 `node init-db.js` 重新初始化
2. 检查数据库连接配置
3. 验证权限设置

### 字段不匹配
1. 对比 `database-schema.sql` 和代码
2. 运行数据库重置
3. 检查迁移是否正确执行
