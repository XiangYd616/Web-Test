# 🗄️ Test-Web数据库初始化指南

## 📋 概述

本指南详细说明Test-Web项目的数据库初始化、迁移和种子数据管理流程。

**数据库类型**: PostgreSQL 12+  
**初始化脚本**: 完全重构为PostgreSQL版本  
**管理工具**: 自定义脚本 + npm命令

## 🚀 快速开始

### **环境准备**
```bash
# 1. 确保PostgreSQL已安装并运行
sudo systemctl start postgresql

# 2. 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE testweb_dev;
CREATE USER testweb_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE testweb_dev TO testweb_user;
\q

# 3. 配置环境变量
cp .env.example .env
# 编辑.env文件，设置数据库连接参数
```

### **数据库初始化**
```bash
# 初始化数据库结构
npm run db:init

# 插入种子数据 (可选)
npm run db:seed

# 检查数据库状态
npm run db:status
```

## 🛠️ 数据库脚本详解

### **1. 初始化脚本** (`initDatabase.js`)

#### **功能特性**
- ✅ **完整的表结构创建** - 11个核心数据表
- ✅ **索引优化** - 45个高效索引，包括JSONB的GIN索引
- ✅ **初始配置数据** - 系统配置和默认模板
- ✅ **事务安全** - 全程事务保护，失败自动回滚
- ✅ **详细日志** - 完整的执行过程记录

#### **数据表结构**
```sql
-- 核心表
users              -- 用户管理 (UUID主键)
tests              -- 测试记录 (JSONB配置和结果)
config_templates   -- 配置模板 (JSONB配置)
test_history       -- 测试历史 (JSONB详情)
websites           -- 网站信息 (JSONB元数据)

-- 扩展表
api_keys           -- API密钥管理
user_preferences   -- 用户偏好设置
system_config      -- 系统配置
test_queue         -- 测试队列
test_statistics    -- 测试统计
```

#### **使用命令**
```bash
# 初始化数据库
npm run db:init

# 重置数据库 (清理后重新初始化)
npm run db:reset

# 清理数据库 (危险操作)
npm run db:clean

# 检查数据库状态
npm run db:status
```

### **2. 种子数据脚本** (`seedDatabase.js`)

#### **功能特性**
- 👥 **示例用户** - admin、testuser、developer三个角色
- 🌐 **示例网站** - Google、GitHub等知名网站
- 🧪 **示例测试** - 性能、SEO、安全测试记录
- 📝 **测试历史** - 完整的测试执行历史
- 🔐 **密码加密** - bcrypt加密用户密码

#### **种子数据内容**
```javascript
// 用户数据
admin@testweb.com     // 管理员用户
test@testweb.com      // 普通用户  
dev@testweb.com       // 开发者用户

// 网站数据
https://www.example.com  // 示例网站
https://www.google.com   // Google
https://github.com       // GitHub

// 测试数据
performance测试 (example.com)
seo测试 (google.com)
security测试 (github.com)
```

#### **使用命令**
```bash
# 插入种子数据
npm run db:seed

# 清理种子数据
npm run db:seed:clean
```

### **3. 迁移管理脚本** (`migrateDatabase.js`)

#### **功能特性**
- 📋 **版本管理** - 自动跟踪迁移版本
- 🔍 **完整性验证** - 校验和验证文件完整性
- ⏱️ **执行监控** - 记录执行时间和状态
- 🔄 **事务安全** - 每个迁移独立事务
- 📝 **模板生成** - 自动生成迁移文件模板

#### **迁移记录表**
```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) UNIQUE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true
);
```

#### **使用命令**
```bash
# 执行待执行的迁移
npm run db:migrate

# 查看迁移状态
npm run db:migrate:status

# 验证迁移文件完整性
npm run db:migrate:validate

# 创建新的迁移文件
npm run db:migrate:create "add_new_feature"
```

## 📊 数据库架构设计

### **核心设计原则**
1. **UUID主键** - 所有表使用UUID主键，便于分布式扩展
2. **JSONB存储** - 灵活的配置和结果存储
3. **索引优化** - 针对查询模式优化的索引策略
4. **外键约束** - 保证数据完整性
5. **时间戳** - 完整的创建和更新时间记录

### **表关系图**
```
users (1) -----> (N) tests
users (1) -----> (N) config_templates
users (1) -----> (N) websites
users (1) -----> (N) api_keys
users (1) -----> (1) user_preferences

tests (1) -----> (N) test_history
tests (1) -----> (1) test_queue
```

### **索引策略**
```sql
-- 基础索引
用户查询: username, email, role
测试查询: type, status, user_id, created_at
配置查询: type, is_default, is_public

-- 复合索引
测试状态查询: (type, status)
时间范围查询: (user_id, created_at)

-- JSONB索引 (GIN)
配置搜索: config字段
结果搜索: results字段
详情搜索: details字段
```

## 🔧 开发工作流

### **新项目设置**
```bash
# 1. 克隆项目
git clone <repository>
cd test-web/backend

# 2. 安装依赖
npm install

# 3. 配置环境
cp .env.example .env
# 编辑数据库连接配置

# 4. 初始化数据库
npm run db:init

# 5. 插入测试数据
npm run db:seed

# 6. 启动服务
npm run dev
```

### **数据库变更流程**
```bash
# 1. 创建迁移文件
npm run db:migrate:create "add_user_avatar_field"

# 2. 编辑迁移文件
# 在 backend/migrations/ 目录下编辑生成的SQL文件

# 3. 执行迁移
npm run db:migrate

# 4. 验证迁移
npm run db:migrate:status
```

### **开发测试流程**
```bash
# 1. 重置数据库到干净状态
npm run db:reset

# 2. 插入测试数据
npm run db:seed

# 3. 运行测试
npm test

# 4. 清理测试数据
npm run db:seed:clean
```

## 🚨 故障排除

### **常见问题**

#### **连接失败**
```bash
# 检查PostgreSQL服务状态
sudo systemctl status postgresql

# 检查连接配置
npm run db:status

# 测试连接
psql -h localhost -U testweb_user -d testweb_dev
```

#### **权限问题**
```sql
-- 授予用户权限
GRANT ALL PRIVILEGES ON DATABASE testweb_dev TO testweb_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO testweb_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO testweb_user;
```

#### **迁移失败**
```bash
# 查看迁移状态
npm run db:migrate:status

# 验证迁移文件
npm run db:migrate:validate

# 手动修复后重新执行
npm run db:migrate
```

#### **数据损坏**
```bash
# 完全重置数据库
npm run db:clean
npm run db:init
npm run db:seed
```

## 📈 性能优化

### **查询优化**
```sql
-- 使用索引查询
SELECT * FROM tests WHERE type = 'performance' AND status = 'completed';

-- JSONB查询优化
SELECT * FROM tests WHERE config @> '{"device": "mobile"}';

-- 分页查询
SELECT * FROM tests ORDER BY created_at DESC LIMIT 20 OFFSET 0;
```

### **连接池配置**
```javascript
// 生产环境连接池
pool: {
  max: 50,          // 最大连接数
  min: 10,          // 最小连接数
  acquire: 60000,   // 获取连接超时
  idle: 10000       // 空闲连接超时
}
```

## 🔒 安全考虑

### **数据保护**
- ✅ 密码bcrypt加密
- ✅ API密钥哈希存储
- ✅ 敏感数据JSONB加密
- ✅ SQL注入防护

### **访问控制**
- ✅ 基于角色的权限控制
- ✅ API密钥认证
- ✅ 用户会话管理
- ✅ 数据访问审计

## 📝 最佳实践

### **开发建议**
1. **始终使用事务** - 复杂操作包装在事务中
2. **索引优化** - 为常用查询创建合适索引
3. **数据验证** - 在应用层和数据库层都进行验证
4. **备份策略** - 定期备份和恢复测试
5. **监控指标** - 监控查询性能和连接池状态

### **迁移规范**
1. **向后兼容** - 新迁移不破坏现有功能
2. **原子操作** - 每个迁移文件完成一个完整功能
3. **测试验证** - 迁移前后都要测试
4. **文档记录** - 详细记录迁移目的和影响

---

**🎯 数据库初始化指南完成！**

通过这套完整的数据库管理体系，Test-Web项目现在具备了企业级的数据库管理能力。
