# 完备的数据库管理系统 v3.0

这个目录包含了**企业级完整的数据库管理工具集**，提供数据库的全生命周期管理功能。

## 🚀 系统特性

### 📊 数据库架构 (完备版)
- **37个业务表** - 完整的企业级架构
- **135个优化索引** - 高性能查询支持
- **19个触发器** - 自动化业务逻辑
- **3个视图** - 数据汇总和统计
- **5个存储函数** - 复杂业务逻辑
- **完整的约束系统** - 数据完整性保障

### 🏗️ 核心模块架构
- **用户管理** (8个表) - 用户、会话、偏好、活动日志、书签、统计、通知
- **测试系统** (16个表) - 测试结果、会话、队列、模板、报告、标签、计划、详细结果
- **监控系统** (2个表) - 站点监控、结果记录
- **系统管理** (6个表) - 配置、日志、通知、统计、引擎状态、健康监控
- **API集成** (2个表) - API密钥、使用统计
- **团队协作** (2个表) - 团队、成员管理
- **文件和邮件** (2个表) - 文件上传、邮件队列

## 🛠️ 完备工具集

### 🚀 核心管理工具

#### 1. 完备数据库初始化 (`init-database.js`)
```bash
# 标准初始化（推荐）
npm run db:init

# 强制初始化（覆盖现有数据）
npm run db:init:force

# 包含测试数据的初始化
npm run db:init:test

# 完全重置数据库
npm run db:reset
```

**功能特性:**
- ✅ 37个业务表的完整架构
- ✅ 135个优化索引
- ✅ 触发器和存储函数
- ✅ 数据完整性约束
- ✅ 初始配置和管理员用户
- ✅ 自动备份现有数据
- ✅ 完整性验证

#### 2. 完备数据库管理器 (`complete-database-manager.js`)
```bash
# 查看所有可用命令
node server/scripts/complete-database-manager.js help

# 表管理
npm run db:tables              # 列出所有表
npm run db:manager describe users  # 查看表结构

# 性能分析
npm run db:analyze             # 完整性能分析
npm run db:vacuum              # 数据库清理

# 索引管理
npm run db:indexes             # 列出所有索引

# 用户管理
npm run db:users               # 列出所有用户

# 实时监控
npm run db:monitor             # 实时数据库监控

# 备份和恢复
npm run db:manager backup --file backup.sql
npm run db:manager restore --file backup.sql
```

#### 3. 完备健康检查 (`health-check.js`)
```bash
# 标准健康检查
npm run db:health

# 详细健康检查
npm run db:health:detailed

# JSON格式输出
node server/scripts/health-check.js --json
```

**检查项目:**
- 🔌 数据库连接测试
- 📊 表结构完整性 (37个表)
- 📈 索引状态检查 (135个索引)
- 👥 用户数据验证
- ⚡ 查询性能测试
- 💾 存储空间分析

#### 4. 完备数据完整性检查 (`data-integrity-checker.js`)
```bash
# 完整完整性检查
npm run db:integrity

# 自动修复问题
npm run db:integrity:fix

# 生成详细报告
npm run db:integrity:report

# 专项检查
node server/scripts/data-integrity-checker.js --schema-only
node server/scripts/data-integrity-checker.js --performance-only
node server/scripts/data-integrity-checker.js --security-only
```

**检查项目:**
- 🏗️ 架构完整性检查 (表、索引、约束、触发器)
- 📊 数据一致性检查 (外键、重复数据、格式验证)
- ⚡ 性能问题检查 (慢查询、索引使用、连接分析)
- 🔒 安全问题检查 (权限配置、敏感数据、密码策略)

### 🔧 专用工具

#### 5. 迁移管理 (`migrate.js`, `migration-manager.js`)
```bash
# 执行迁移
npm run db:migrate

# 查看迁移状态
node server/scripts/migration-manager.js status

# 创建新迁移
node server/scripts/migration-manager.js create "add_new_feature"
```

#### 6. 备份和恢复 (`backup-database.js`, `restore-database.js`)
```bash
# 创建备份
node server/scripts/backup-database.js

# 恢复数据
node server/scripts/restore-database.js --file backup.sql
```

#### 7. Redis管理
```bash
# 检查Redis连接
node server/scripts/check-redis.js

# 监控Redis状态
node server/scripts/monitor-redis.js

# 清理缓存
node server/scripts/flush-cache.js
```

#### 8. 环境验证
```bash
# 验证环境配置
node server/scripts/validate-env.js
```

## 📋 完整的NPM脚本命令

### 🚀 核心操作
```bash
npm run db:init              # 标准数据库初始化
npm run db:init:force        # 强制初始化
npm run db:init:test         # 包含测试数据的初始化
npm run db:reset             # 完全重置数据库
npm run db:health            # 健康检查
npm run db:health:detailed   # 详细健康检查
```

### 📊 数据管理
```bash
npm run db:tables            # 列出所有表
npm run db:indexes           # 列出所有索引
npm run db:users             # 列出所有用户
npm run db:analyze           # 性能分析
npm run db:vacuum            # 数据库清理
npm run db:monitor           # 实时监控
```

### 🔍 检查和验证
```bash
npm run db:integrity         # 数据完整性检查
npm run db:integrity:fix     # 自动修复问题
npm run db:integrity:report  # 生成检查报告
```

### 💾 备份和恢复
```bash
npm run db:backup            # 创建备份
npm run db:restore           # 恢复数据
```

### 🔄 迁移管理
```bash
npm run db:migrate           # 执行迁移
```

## 🎯 快速开始

### 1. 首次设置
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接信息

# 3. 初始化数据库
npm run db:init

# 4. 验证安装
npm run db:health
```

### 2. 日常维护
```bash
# 每日健康检查
npm run db:health

# 每周性能分析
npm run db:analyze

# 每月完整性检查
npm run db:integrity

# 定期备份
npm run db:backup
```

### 3. 故障排除
```bash
# 检查数据完整性
npm run db:integrity

# 自动修复问题
npm run db:integrity:fix

# 重建索引
node server/scripts/complete-database-manager.js reindex

# 清理数据库
npm run db:vacuum
```

## 📈 性能优化建议

### 索引优化
- 系统包含135个优化索引，覆盖所有常用查询
- 定期运行 `npm run db:analyze` 检查索引使用情况
- 使用 `npm run db:integrity` 发现未使用的索引

### 查询优化
- 所有查询都经过性能优化
- 支持分页和限制结果数量
- 使用JSONB字段存储复杂数据结构

### 存储优化
- 自动清理过期数据
- 支持数据归档
- 定期执行VACUUM操作

## 🔒 安全特性

### 数据安全
- 密码使用bcrypt加密 (12轮)
- 敏感数据字段加密存储
- 完整的审计日志

### 访问控制
- 基于角色的权限系统
- API密钥管理
- 会话管理和超时控制

### 数据完整性
- 外键约束保证数据一致性
- 检查约束验证数据格式
- 触发器自动维护数据状态

## 🚨 重要提醒

### 生产环境注意事项
1. **修改默认密码**: 管理员账户默认密码为 `admin123456`
2. **配置备份策略**: 建议每日自动备份
3. **监控系统状态**: 定期运行健康检查
4. **更新安全配置**: 定期检查权限和密码策略

### 危险操作警告
- `--reset` 选项会**完全删除**所有数据
- `--force` 选项会**跳过确认**提示
- 恢复操作会**覆盖现有**数据

## 📞 技术支持

### 常见问题
1. **连接失败**: 检查 `.env` 文件中的数据库配置
2. **权限错误**: 确保数据库用户有足够权限
3. **表不存在**: 运行 `npm run db:init` 初始化数据库
4. **性能问题**: 运行 `npm run db:analyze` 分析性能

### 获取帮助
```bash
# 查看工具帮助
node server/scripts/init-database.js --help
node server/scripts/complete-database-manager.js help
node server/scripts/health-check.js --help
node server/scripts/data-integrity-checker.js --help
```

---

**版本**: 3.0 - 企业级完整版
**更新时间**: 2023-12-08
**维护团队**: Test Web App Development Team

## 🚀 快速开始

### 初始化数据库

```bash
# 完整初始化（推荐）
npm run db:init

# 强制重新初始化
npm run db:force-init

# 仅创建表结构
node server/scripts/init-database.js --no-data

# 重置数据库（危险操作）
npm run db:reset
```

### 健康检查

```bash
# 基本健康检查
npm run db:health

# 详细健康检查
npm run db:health:detailed

# JSON格式输出
npm run db:health:json
```

### 数据库迁移

```bash
# 查看迁移状态
npm run db:status

# 执行所有待执行的迁移
npm run db:migrate

# 创建新的迁移文件
npm run db:create add_new_feature

# 回滚指定迁移
npm run db:rollback 20231201120000_add_new_feature
```

### 备份和恢复

```bash
# 备份数据库
npm run db:backup

# 备份到指定文件
node server/scripts/backup-database.js -o my_backup.sql

# 恢复数据库
npm run db:restore backup.sql

# 强制恢复（不询问确认）
node server/scripts/restore-database.js backup.sql --force
```

## 📁 工具文件说明

### 核心工具

- **`database-initializer.js`** - 数据库初始化器核心类
- **`init-database.js`** - 数据库初始化命令行工具
- **`migration-manager.js`** - 数据库迁移管理器
- **`migrate.js`** - 迁移命令行工具
- **`health-check.js`** - 数据库健康检查工具
- **`backup-database.js`** - 数据库备份工具
- **`restore-database.js`** - 数据库恢复工具

### 配置文件

- **`unified-optimized-database-schema.sql`** - 统一的数据库架构文件

## 🔧 配置

### 环境变量

在 `.env` 文件中配置数据库连接：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb
DB_USER=postgres
DB_PASSWORD=your_password

# 默认管理员账户
ADMIN_EMAIL=admin@testweb.com
ADMIN_PASSWORD=admin123456
```

### 命令行选项

所有工具都支持通过命令行参数覆盖环境变量：

```bash
node server/scripts/init-database.js \
  --host localhost \
  --port 5432 \
  --db testweb \
  --user postgres \
  --password mypassword
```

## 📊 数据库架构

### 核心表

- **`users`** - 用户账户
- **`user_preferences`** - 用户偏好设置
- **`user_notifications`** - 用户通知
- **`test_results`** - 测试结果
- **`monitoring_sites`** - 监控站点
- **`monitoring_results`** - 监控结果
- **`uploaded_files`** - 上传文件
- **`system_config`** - 系统配置
- **`engine_status`** - 测试引擎状态
- **`database_migrations`** - 数据库迁移记录

### 索引优化

所有表都配置了适当的索引以优化查询性能：

- 用户查询索引
- 时间范围查询索引
- 状态过滤索引
- 复合查询索引

## 🔄 迁移系统

### 创建迁移

```bash
# 创建SQL迁移
npm run db:create add_user_avatar sql

# 创建JavaScript迁移
npm run db:create update_user_schema js
```

### 迁移文件格式

**SQL迁移示例：**
```sql
-- Migration: add_user_avatar
-- Created: 2023-12-01T12:00:00.000Z

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);
CREATE INDEX idx_users_avatar ON users(avatar_url);
```

**JavaScript迁移示例：**
```javascript
module.exports = {
  async up(pool) {
    await pool.query('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255)');
    await pool.query('CREATE INDEX idx_users_avatar ON users(avatar_url)');
  },

  async down(pool) {
    await pool.query('DROP INDEX IF EXISTS idx_users_avatar');
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS avatar_url');
  }
};
```

## 🏥 健康检查

健康检查工具会验证：

- ✅ 数据库连接状态
- ✅ 表结构完整性
- ✅ 索引存在性
- ✅ 初始数据完整性
- ✅ 查询性能
- ✅ 缓存命中率
- ✅ 连接统计

### 健康检查输出示例

```
🏥 Test Web App - 数据库健康检查
==================================
🔌 连接状态: ✅ 正常
🏗️ 表结构: ✅ 正常
📈 索引: ✅ 正常
📝 数据: ✅ 正常
⚡ 响应时间: 45ms (✅ 优秀)
🎯 整体状态: ✅ 健康
```

## 💾 备份和恢复

### 备份选项

```bash
# 完整备份
npm run db:backup

# 仅备份表结构
node server/scripts/backup-database.js --schema-only

# 仅备份数据
node server/scripts/backup-database.js --data-only

# 压缩备份
node server/scripts/backup-database.js --compress
```

### 恢复选项

```bash
# 标准恢复
npm run db:restore backup.sql

# 清理后恢复
node server/scripts/restore-database.js backup.sql --clean

# 强制恢复
node server/scripts/restore-database.js backup.sql --force
```

## 🚨 故障排除

### 常见问题

1. **连接失败**
   - 检查PostgreSQL服务是否运行
   - 验证连接配置
   - 检查防火墙设置

2. **权限错误**
   - 确保数据库用户有足够权限
   - 检查数据库和表的所有权

3. **迁移失败**
   - 检查SQL语法
   - 验证表结构依赖
   - 查看详细错误信息

4. **备份/恢复失败**
   - 确保pg_dump和psql可用
   - 检查磁盘空间
   - 验证文件权限

### 调试模式

设置环境变量启用详细日志：

```bash
NODE_ENV=development npm run db:health
```

## 📝 最佳实践

1. **定期备份**
   - 设置自动备份计划
   - 测试备份恢复流程
   - 保留多个备份版本

2. **迁移管理**
   - 总是先在开发环境测试
   - 为复杂迁移编写回滚脚本
   - 记录迁移的业务目的

3. **监控健康**
   - 定期运行健康检查
   - 监控性能指标
   - 设置告警阈值

4. **安全考虑**
   - 使用强密码
   - 限制数据库访问
   - 定期更新权限

## 🔗 相关文档

- [PostgreSQL官方文档](https://www.postgresql.org/docs/)
- [Node.js pg模块文档](https://node-postgres.com/)
- [项目主要README](../../README.md)
