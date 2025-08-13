# 数据库管理指南

## 概述

本目录包含测试平台的完整数据库管理系统，支持PostgreSQL数据库的初始化、管理、备份和维护。

## 文件结构

```
database/
├── README.md              # 本文档
├── config.js              # 数据库连接配置
├── init.js                # 数据库初始化脚本
├── manage.js              # 数据库管理脚本
├── schema.sql             # 数据库架构定义
├── initial_data.sql       # 初始数据脚本
├── .env.example           # 环境变量模板
└── backups/               # 备份文件目录（自动创建）
```

## 快速开始

### 1. 环境准备

1. **安装PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   
   # Windows
   # 下载并安装 PostgreSQL 官方安装包
   ```

2. **配置环境变量**
   ```bash
   # 复制环境变量模板
   cp database/.env.example database/.env
   
   # 编辑配置文件
   nano database/.env
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

### 2. 数据库初始化

```bash
# 完整初始化（推荐）
npm run db:setup

# 或者分步执行
npm run db:init          # 初始化数据库结构
npm run db:create-admin  # 创建管理员用户
```

### 3. 验证安装

```bash
# 测试数据库连接
npm run db:test

# 查看数据库状态
npm run db:status
```

## 可用命令

### 基础操作

| 命令 | 描述 |
|------|------|
| `npm run db:init` | 初始化数据库结构和数据 |
| `npm run db:status` | 显示数据库状态信息 |
| `npm run db:test` | 测试数据库连接 |
| `npm run db:setup` | 完整设置（初始化+创建管理员） |

### 用户管理

| 命令 | 描述 |
|------|------|
| `npm run db:create-admin` | 创建管理员用户 |

### 数据管理

| 命令 | 描述 |
|------|------|
| `npm run db:backup` | 备份数据库 |
| `npm run db:clean` | 清理测试数据 |
| `npm run db:reset` | 重置数据库（危险操作） |

### 传统命令（兼容性）

| 命令 | 描述 |
|------|------|
| `npm run db:init:legacy` | 使用旧版初始化脚本 |
| `npm run db:backup:legacy` | 使用旧版备份脚本 |
| `npm run db:health` | 健康检查 |
| `npm run db:manager` | 数据库管理器 |

## 数据库架构

### 核心表

1. **users** - 用户信息
2. **test_projects** - 测试项目
3. **test_configurations** - 测试配置
4. **test_executions** - 测试执行记录

### 结果表

1. **performance_test_results** - 性能测试结果
2. **security_test_results** - 安全测试结果
3. **api_test_results** - API测试结果
4. **stress_test_results** - 压力测试结果
5. **compatibility_test_results** - 兼容性测试结果
6. **seo_test_results** - SEO测试结果
7. **ux_test_results** - 用户体验测试结果
8. **infrastructure_test_results** - 基础设施测试结果

### 管理表

1. **test_reports** - 测试报告
2. **user_statistics** - 用户统计
3. **system_configurations** - 系统配置

## 配置说明

### 环境变量

```bash
# 数据库连接
DB_HOST=localhost          # 数据库主机
DB_PORT=5432              # 数据库端口
DB_NAME=test_platform     # 数据库名称
DB_USER=postgres          # 数据库用户
DB_PASSWORD=your_password # 数据库密码
DB_SSL=false              # 是否启用SSL

# 连接池配置
DB_MAX_CONNECTIONS=20     # 最大连接数
DB_IDLE_TIMEOUT_MS=30000  # 空闲超时
DB_CONNECTION_TIMEOUT_MS=2000  # 连接超时

# 备份配置
BACKUP_DIR=./backups      # 备份目录
BACKUP_RETENTION_DAYS=30  # 备份保留天数
```

### 数据库权限

确保数据库用户具有以下权限：
- CREATE DATABASE
- CREATE TABLE
- INSERT, UPDATE, DELETE, SELECT
- CREATE INDEX
- CREATE FUNCTION, CREATE TRIGGER

## 故障排除

### 常见问题

1. **连接失败**
   ```bash
   # 检查PostgreSQL服务状态
   sudo systemctl status postgresql
   
   # 启动PostgreSQL服务
   sudo systemctl start postgresql
   ```

2. **权限错误**
   ```sql
   -- 授予用户权限
   GRANT ALL PRIVILEGES ON DATABASE test_platform TO your_user;
   ```

3. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep 5432
   
   # 修改配置文件中的端口
   ```

### 日志查看

```bash
# PostgreSQL日志位置
# Ubuntu/Debian: /var/log/postgresql/
# macOS: /usr/local/var/log/
# Windows: PostgreSQL安装目录/data/log/

# 查看最新日志
tail -f /var/log/postgresql/postgresql-*.log
```

## 维护建议

### 定期维护

1. **每日**
   - 检查数据库状态：`npm run db:status`
   - 监控连接数和性能

2. **每周**
   - 备份数据库：`npm run db:backup`
   - 清理过期测试数据：`npm run db:clean`

3. **每月**
   - 分析数据库性能：`npm run db:analyze`
   - 检查数据完整性：`npm run db:integrity`

### 性能优化

1. **索引优化**
   ```sql
   -- 查看索引使用情况
   SELECT * FROM pg_stat_user_indexes;
   
   -- 重建索引
   REINDEX DATABASE test_platform;
   ```

2. **清理无用数据**
   ```sql
   -- 清理90天前的测试结果
   DELETE FROM test_executions 
   WHERE completed_at < NOW() - INTERVAL '90 days';
   ```

## 安全建议

1. **密码安全**
   - 使用强密码
   - 定期更换密码
   - 不要在代码中硬编码密码

2. **网络安全**
   - 限制数据库访问IP
   - 使用SSL连接（生产环境）
   - 配置防火墙规则

3. **备份安全**
   - 加密备份文件
   - 异地存储备份
   - 定期测试恢复流程

## 支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查PostgreSQL官方文档
3. 查看项目issue或提交新issue

## 更新日志

- **v1.0.0** - 初始版本，支持完整的数据库管理功能
