# 数据库设置指南

## 🌍 双数据库架构

项目采用**双数据库架构**，自动环境切换：

| 环境 | 数据库名 | 用途 |
|------|----------|------|
| 开发环境 | `testweb_dev` | 日常开发、测试 |
| 生产环境 | `testweb_prod` | 正式部署、用户使用 |

## 快速开始

### 1. 环境配置
确保已正确配置 `.env` 文件中的数据库连接信息：
```env
# 数据库配置 - 开发环境
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=postgres
DB_PASSWORD=postgres
```

### 2. 创建数据库
```bash
# 创建开发数据库
psql -U postgres -c "CREATE DATABASE testweb_dev;"

# 创建生产数据库 (可选)
psql -U postgres -c "CREATE DATABASE testweb_prod;"
```

### 3. 初始化数据库
```bash
# 返回项目根目录
cd ..

# 验证环境变量
npm run validate-env

# 初始化数据库表结构
npm run init-db

# 启动应用
npm start
```

### 4. 一键设置（推荐）
```bash
# 验证环境 + 初始化数据库 + 启动应用
npm run setup
```

## 数据库脚本命令

### 基本命令
```bash
# 验证环境变量配置
npm run validate-env

# 初始化数据库（安全，不会删除现有数据）
npm run init-db

# 重置数据库（危险！会删除所有数据）
npm run reset-db

# 完整重置并初始化
npm run setup-fresh

# 检查应用健康状态
npm run check-health
```

### 手动执行脚本
```bash
# 直接运行初始化脚本
node scripts/init-database.js

# 直接运行重置脚本
node scripts/reset-database.js

# 验证环境变量
node scripts/validate-env.js
```

## 数据库表结构

### 核心表
- **users** - 用户账户信息
- **user_preferences** - 用户偏好设置
- **test_results** - 测试结果数据
- **activity_logs** - 用户活动日志

### 监控相关
- **monitoring_sites** - 监控站点配置
- **monitoring_results** - 监控检查结果

### 数据管理
- **data_tasks** - 数据导入导出任务
- **test_templates** - 测试模板
- **system_settings** - 系统配置
- **notifications** - 通知消息

## 数据库特性

### 自动功能
- ✅ UUID主键
- ✅ 自动时间戳（created_at, updated_at）
- ✅ 外键约束
- ✅ 数据完整性检查
- ✅ 性能优化索引

### 安全特性
- 🔒 密码哈希存储
- 🔒 用户数据隔离
- 🔒 SQL注入防护
- 🔒 数据验证约束

### 性能优化
- 📈 关键字段索引
- 📈 查询优化
- 📈 连接池管理
- 📈 事务支持

## 故障排除

### 常见问题

#### 1. 连接失败
```
❌ 数据库连接失败: connection refused
```
**解决方案：**
- 检查PostgreSQL服务是否运行
- 验证连接配置（主机、端口、用户名、密码）
- 检查防火墙设置

#### 2. 权限错误
```
❌ 数据库初始化失败: permission denied
```
**解决方案：**
- 确保数据库用户有创建表的权限
- 检查数据库是否存在
- 验证用户角色权限

#### 3. 表已存在
```
⚠️ 数据库表已存在，跳过初始化
```
**说明：** 这是正常行为，表示数据库已初始化

#### 4. 版本不兼容
```
❌ PostgreSQL版本不支持
```
**解决方案：**
- 确保PostgreSQL版本 >= 12
- 检查uuid-ossp扩展是否可用

### 调试步骤

1. **检查环境变量**
```bash
npm run validate-env
```

2. **测试数据库连接**
```bash
psql -h localhost -U postgres -d testweb_prod -c "SELECT version();"
```

3. **查看表结构**
```bash
psql -h localhost -U postgres -d testweb_prod -c "\dt"
```

4. **检查日志**
```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

## 数据备份与恢复

### 备份数据库
```bash
# 完整备份
pg_dump -h localhost -U postgres testweb_prod > backup.sql

# 仅数据备份
pg_dump -h localhost -U postgres --data-only testweb_prod > data_backup.sql

# 仅结构备份
pg_dump -h localhost -U postgres --schema-only testweb_prod > schema_backup.sql
```

### 恢复数据库
```bash
# 恢复完整备份
psql -h localhost -U postgres testweb_prod < backup.sql

# 恢复数据
psql -h localhost -U postgres testweb_prod < data_backup.sql
```

## 开发建议

### 数据库迁移
- 使用版本控制管理SQL脚本
- 测试迁移脚本的向前和向后兼容性
- 在生产环境前先在测试环境验证

### 性能监控
- 定期检查慢查询日志
- 监控连接池使用情况
- 优化频繁查询的索引

### 安全最佳实践
- 定期更新数据库密码
- 限制数据库用户权限
- 启用SSL连接（生产环境）
- 定期备份数据

## 生产环境部署

### 部署前检查
- [ ] 环境变量配置正确
- [ ] 数据库连接测试通过
- [ ] 备份策略已制定
- [ ] 监控系统已配置
- [ ] SSL证书已安装

### 部署步骤
1. 配置生产环境变量
2. 运行数据库初始化
3. 验证表结构和数据
4. 启动应用服务
5. 执行健康检查
6. 配置监控和告警

### 维护任务
- 定期备份数据库
- 监控性能指标
- 清理过期日志
- 更新安全配置
