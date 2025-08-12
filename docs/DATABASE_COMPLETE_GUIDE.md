# 完备的数据库管理指南

## 🎯 概述

Test Web App 使用 PostgreSQL 作为主数据库，采用**企业级完备架构设计**，支持ACID事务、复杂查询和数据完整性约束。数据库设计遵循第三范式，确保数据的一致性和完整性。

## 🏗️ 完备数据库架构 v3.0

### 📊 架构统计
- **37个业务表** - 完整的企业级架构
- **135个优化索引** - 高性能查询支持
- **19个触发器** - 自动化业务逻辑
- **3个视图** - 数据汇总和统计
- **5个存储函数** - 复杂业务逻辑
- **50+个约束** - 数据完整性保障

### 🏗️ 核心模块架构

#### 1. 用户管理模块 (8个表)
- `users` - 用户主表 (完整的用户信息、角色、状态)
- `user_sessions` - 用户会话管理
- `refresh_tokens` - 刷新令牌管理
- `user_preferences` - 用户偏好设置
- `user_activity_logs` - 用户活动日志
- `user_bookmarks` - 用户收藏管理
- `user_stats` - 用户统计数据
- `user_notifications` - 用户通知系统

#### 2. 测试系统模块 (16个表)
- `test_sessions` - 测试会话管理
- `test_results` - 测试结果主表
- `test_queue` - 测试队列管理
- `test_templates` - 测试模板系统
- `test_reports` - 测试报告管理
- `test_artifacts` - 测试文件和资源
- `test_tags` - 测试标签系统
- `test_result_tags` - 标签关联表
- `test_plans` - 测试计划管理
- `seo_test_details` - SEO测试详细结果
- `performance_test_details` - 性能测试详细结果
- `security_test_details` - 安全测试详细结果
- `api_test_details` - API测试详细结果
- `compatibility_test_details` - 兼容性测试详细结果
- `stress_test_details` - 压力测试详细结果

#### 3. 监控系统模块 (2个表)
- `monitoring_sites` - 监控站点配置
- `monitoring_results` - 监控结果记录

#### 4. 系统管理模块 (6个表)
- `system_config` - 系统配置管理
- `system_logs` - 系统日志记录
- `system_notifications` - 系统通知
- `system_stats` - 系统统计数据
- `engine_status` - 测试引擎状态
- `system_health` - 系统健康监控

#### 5. API集成模块 (2个表)
- `api_keys` - API密钥管理
- `api_usage_stats` - API使用统计

#### 6. 团队协作模块 (2个表)
- `user_teams` - 团队管理
- `team_members` - 团队成员管理

#### 7. 文件和邮件模块 (2个表)
- `uploaded_files` - 文件上传管理
- `email_queue` - 邮件队列管理

## 🌍 环境配置

### 双数据库架构
项目采用**双数据库架构**，自动环境切换：

| 环境 | 数据库名 | 用途 |
|------|----------|------|
| 开发环境 | `testweb_dev` | 日常开发、测试 |
| 生产环境 | `testweb_prod` | 正式部署、用户使用 |

### 环境变量配置
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=your_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 应用配置
NODE_ENV=development
PORT=3000
```

## 🚀 快速开始

### 1. 首次设置
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接信息

# 3. 初始化完备数据库
npm run db:init

# 4. 验证安装
npm run db:health
```

### 2. 验证完备性
```bash
# 检查表数量（应该是37+）
npm run db:tables

# 检查索引数量（应该是135+）
npm run db:indexes

# 检查用户数据
npm run db:users

# 完整性检查
npm run db:integrity
```

## 🛠️ 完备管理工具

### 核心管理命令
```bash
# 数据库初始化
npm run db:init              # 标准初始化
npm run db:init:force        # 强制初始化
npm run db:init:test         # 包含测试数据
npm run db:reset             # 完全重置

# 健康检查
npm run db:health            # 标准检查
npm run db:health:detailed   # 详细检查

# 数据管理
npm run db:tables            # 列出所有表
npm run db:indexes           # 列出所有索引
npm run db:users             # 列出所有用户
npm run db:analyze           # 性能分析
npm run db:vacuum            # 数据库清理
npm run db:monitor           # 实时监控

# 完整性检查
npm run db:integrity         # 数据完整性检查
npm run db:integrity:fix     # 自动修复问题
npm run db:integrity:report  # 生成检查报告

# 备份恢复
npm run db:backup            # 创建备份
npm run db:restore           # 恢复数据
```

### 高级管理功能
```bash
# 查询数据
node server/scripts/complete-database-manager.js query --query "SELECT * FROM users LIMIT 5"

# 表操作
node server/scripts/complete-database-manager.js describe users
node server/scripts/complete-database-manager.js count users

# 索引管理
node server/scripts/complete-database-manager.js create-index --table users --columns email
node server/scripts/complete-database-manager.js analyze-indexes

# 用户管理
node server/scripts/complete-database-manager.js create-user --username newuser
```

## 📊 性能优化

### 索引策略
- **主键索引**: 所有表都有UUID主键
- **外键索引**: 所有外键字段都有索引
- **查询索引**: 常用查询字段的复合索引
- **部分索引**: 条件索引优化特定查询
- **文本索引**: 使用pg_trgm支持模糊搜索

### 查询优化
- 所有查询都经过性能优化
- 支持分页和限制结果数量
- 使用JSONB字段存储复杂数据结构
- 预编译语句防止SQL注入

### 存储优化
- 自动清理过期数据的触发器
- 支持数据归档策略
- 定期VACUUM和ANALYZE操作
- 智能的存储空间管理

## 🔒 安全特性

### 数据安全
- 密码使用bcrypt加密 (12轮)
- 敏感数据字段加密存储
- 完整的审计日志系统
- 数据访问权限控制

### 访问控制
- 基于角色的权限系统 (admin, moderator, user)
- API密钥管理和限流
- 会话管理和自动超时
- IP白名单支持

### 数据完整性
- 外键约束保证数据一致性
- 检查约束验证数据格式
- 触发器自动维护数据状态
- 完整的事务支持

## 🔍 监控和维护

### 健康监控
- 实时连接状态监控
- 查询性能监控
- 存储空间监控
- 系统资源监控

### 自动化维护
- 自动清理过期会话
- 自动更新统计信息
- 自动备份策略
- 自动性能优化

### 告警系统
- 性能阈值告警
- 存储空间告警
- 连接数告警
- 错误率告警

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

## 📞 故障排除

### 常见问题解决
```bash
# 连接失败
npm run db:health              # 检查连接状态
node server/scripts/validate-env.js  # 验证环境配置

# 表结构问题
npm run db:integrity           # 检查完整性
npm run db:init:force          # 重新初始化

# 性能问题
npm run db:analyze             # 性能分析
npm run db:vacuum              # 清理数据库

# 数据问题
npm run db:integrity:fix       # 自动修复
npm run db:backup              # 创建备份
```

### 获取详细帮助
```bash
node server/scripts/init-database.js --help
node server/scripts/complete-database-manager.js help
node server/scripts/health-check.js --help
node server/scripts/data-integrity-checker.js --help
```

---

**版本**: 3.0 - 企业级完整版  
**更新时间**: 2023-12-08  
**状态**: ✅ 完备且可用  
**维护团队**: Test Web App Development Team
