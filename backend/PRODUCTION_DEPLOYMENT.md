# 生产环境部署指南

本文档提供Test-Web后端服务在生产环境部署的完整指南。

---

## 📋 目录

1. [环境要求](#环境要求)
2. [部署前准备](#部署前准备)
3. [部署步骤](#部署步骤)
4. [环境配置](#环境配置)
5. [数据库设置](#数据库设置)
6. [启动服务](#启动服务)
7. [健康检查](#健康检查)
8. [监控和日志](#监控和日志)
9. [备份策略](#备份策略)
10. [故障排除](#故障排除)

---

## 环境要求

### 硬件要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 硬盘 | 20GB | 50GB+ SSD |
| 网络 | 10Mbps | 100Mbps+ |

### 软件要求

- **Node.js**: ≥ 18.0.0
- **npm**: ≥ 9.0.0
- **PostgreSQL**: ≥ 13.0
- **Redis**: ≥ 6.0 (可选，用于缓存)
- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 8+ 推荐)

---

## 部署前准备

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y git curl wget build-essential

# 安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应显示 v18.x.x
npm --version   # 应显示 9.x.x
```

### 2. PostgreSQL数据库安装

```bash
# 安装PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 启动PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE DATABASE testweb_prod;
CREATE USER testweb WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE testweb_prod TO testweb;
\q
EOF
```

### 3. Redis安装（可选）

```bash
# 安装Redis
sudo apt install -y redis-server

# 启动Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 测试连接
redis-cli ping  # 应返回 PONG
```

---

## 部署步骤

### 1. 克隆代码

```bash
# 创建应用目录
sudo mkdir -p /opt/test-web
sudo chown $USER:$USER /opt/test-web

# 克隆代码
cd /opt/test-web
git clone https://github.com/your-org/test-web-app.git .

# 切换到生产分支
git checkout main
```

### 2. 安装依赖

```bash
# 进入后端目录
cd backend

# 安装生产依赖
npm ci --production

# 可选：如果需要全部依赖
npm ci
```

### 3. 构建（如果需要）

```bash
# 如果项目需要编译
npm run build
```

---

## 环境配置

### 1. 创建生产环境配置文件

```bash
cd /opt/test-web/backend
cp .env.example .env
```

### 2. 编辑 `.env` 文件

```env
# ==========================================
# 生产环境配置
# ==========================================

# 基本配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# CORS配置
CORS_ORIGIN=https://your-frontend-domain.com
CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS
CORS_ALLOW_CREDENTIALS=true

# 数据库配置
DATABASE_URL=postgres://testweb:your_secure_password@localhost:5432/testweb_prod
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=testweb_prod
DATABASE_USERNAME=testweb
DATABASE_PASSWORD=your_secure_password
DATABASE_SSL=true

# 连接池配置
DB_POOL_MAX=20
DB_POOL_MIN=5

# JWT配置 - 使用强密钥！
JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_KEY_HERE_CHANGE_THIS_IN_PRODUCTION
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# 会话配置
SESSION_SECRET=YOUR_SUPER_SECURE_SESSION_SECRET_KEY_HERE
SESSION_MAX_AGE=86400000

# 密码哈希
BCRYPT_SALT_ROUNDS=12

# Redis配置（如果使用）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# 速率限制
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# 测试引擎配置
TEST_DEFAULT_TIMEOUT=300000
MAX_CONCURRENT_TESTS=10

# 邮件配置（如果需要）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
EMAIL_FROM=noreply@yourdomain.com

# HTTPS配置（如果需要）
HTTPS_ENABLED=false
SSL_CERT_PATH=./ssl/cert.pem
SSL_KEY_PATH=./ssl/key.pem
```

### 3. 安全建议

⚠️ **重要安全提示**：

1. **更改所有默认密钥**
   ```bash
   # 生成安全的JWT密钥
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **使用环境变量**而不是硬编码敏感信息

3. **限制文件权限**
   ```bash
   chmod 600 .env
   chown root:root .env
   ```

4. **启用SSL/TLS**
   - 数据库连接使用SSL
   - API服务使用HTTPS

---

## 数据库设置

### 1. 运行数据库迁移

```bash
cd /opt/test-web/backend

# 初始化数据库
npm run db:init

# 运行迁移
npm run db:migrate

# 验证数据库结构
npm run db:status
```

### 2. 数据库优化

```sql
-- 连接到数据库
sudo -u postgres psql testweb_prod

-- 创建索引以提升性能
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_tests_user_id ON tests(user_id);
CREATE INDEX idx_tests_created_at ON tests(created_at);

-- 设置连接限制
ALTER DATABASE testweb_prod SET max_connections = 100;

-- 退出
\q
```

---

## 启动服务

### 方式1: 使用PM2（推荐）

```bash
# 全局安装PM2
sudo npm install -g pm2

# 启动应用
cd /opt/test-web/backend
pm2 start src/app.js --name test-web-api

# 查看状态
pm2 status

# 查看日志
pm2 logs test-web-api

# 设置开机自启
pm2 startup
pm2 save

# 其他常用命令
pm2 stop test-web-api      # 停止
pm2 restart test-web-api   # 重启
pm2 reload test-web-api    # 零停机重载
pm2 delete test-web-api    # 删除
```

### 方式2: 使用systemd

创建服务文件：

```bash
sudo nano /etc/systemd/system/test-web-api.service
```

内容：

```ini
[Unit]
Description=Test-Web API Server
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/test-web/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/app.js
Restart=on-failure
RestartSec=10s

# 日志
StandardOutput=journal
StandardError=journal
SyslogIdentifier=test-web-api

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
# 重新加载systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start test-web-api

# 查看状态
sudo systemctl status test-web-api

# 设置开机自启
sudo systemctl enable test-web-api

# 查看日志
sudo journalctl -u test-web-api -f
```

---

## 健康检查

### 1. API健康检查端点

```bash
# 检查服务是否运行
curl http://localhost:3001/health

# 预期响应
{
  "status": "healthy",
  "timestamp": "2025-10-15T...",
  "uptime": 123.456,
  "environment": "production",
  "version": "1.0.0"
}
```

### 2. 数据库连接检查

```bash
# 检查PostgreSQL
sudo -u postgres psql -c "SELECT version();"

# 检查Redis（如果使用）
redis-cli ping
```

### 3. 性能测试

```bash
# 运行压力测试
cd /opt/test-web/backend
node scripts/stress-test.js

# 或使用环境变量配置
TEST_BASE_URL=http://localhost:3001 \
TEST_DURATION=60 \
TEST_CONCURRENCY=20 \
node scripts/stress-test.js
```

---

## 监控和日志

### 1. 日志管理

```bash
# 日志目录
cd /opt/test-web/backend/logs

# 查看最新日志
tail -f app.log

# 查看错误日志
tail -f error.log

# 日志轮转配置
npm run logs:archive
```

### 2. PM2监控

```bash
# PM2内置监控
pm2 monit

# 生成监控报告
pm2 describe test-web-api
```

### 3. 系统监控

```bash
# 安装监控工具
sudo apt install -y htop iotop nethogs

# 监控CPU和内存
htop

# 监控磁盘I/O
sudo iotop

# 监控网络
sudo nethogs
```

---

## 备份策略

### 1. 数据库备份

```bash
# 创建备份目录
sudo mkdir -p /backup/database
sudo chown postgres:postgres /backup/database

# 手动备份
sudo -u postgres pg_dump testweb_prod > /backup/database/testweb_$(date +%Y%m%d_%H%M%S).sql

# 自动备份脚本
cat > /opt/test-web/backend/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/database"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="testweb_prod"

# 创建备份
pg_dump $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
EOF

chmod +x /opt/test-web/backend/scripts/backup-db.sh

# 添加到crontab（每天凌晨2点备份）
crontab -e
# 添加：0 2 * * * /opt/test-web/backend/scripts/backup-db.sh
```

### 2. 代码备份

```bash
# Git标签备份
cd /opt/test-web
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

---

## 故障排除

### 常见问题

#### 1. 服务无法启动

```bash
# 检查端口占用
sudo lsof -i :3001

# 检查日志
pm2 logs test-web-api --lines 100

# 检查配置
node -e "require('dotenv').config(); console.log(process.env.PORT)"
```

#### 2. 数据库连接失败

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 检查连接
psql -h localhost -U testweb -d testweb_prod

# 查看PostgreSQL日志
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

#### 3. 性能问题

```bash
# 检查系统资源
free -h          # 内存
df -h            # 磁盘
top              # CPU

# 检查Node.js进程
ps aux | grep node

# 数据库性能分析
psql testweb_prod -c "SELECT * FROM pg_stat_activity;"
```

#### 4. 内存泄漏

```bash
# 使用Node.js内置工具
node --inspect src/app.js

# PM2内存监控
pm2 monit

# 重启服务（临时解决）
pm2 restart test-web-api
```

---

## 更新和维护

### 滚动更新

```bash
# 1. 拉取最新代码
cd /opt/test-web
git pull origin main

# 2. 安装新依赖
cd backend
npm ci --production

# 3. 运行数据库迁移
npm run db:migrate

# 4. 零停机重载
pm2 reload test-web-api

# 5. 验证
curl http://localhost:3001/health
```

### 回滚

```bash
# 1. 回滚代码
git reset --hard <previous_commit_hash>

# 2. 回滚数据库（如果需要）
npm run db:migrate:rollback

# 3. 重启服务
pm2 restart test-web-api
```

---

## 安全清单

- [ ] 更改所有默认密码和密钥
- [ ] 启用HTTPS
- [ ] 配置防火墙
- [ ] 限制数据库访问
- [ ] 定期更新依赖
- [ ] 配置日志审计
- [ ] 设置备份策略
- [ ] 配置监控告警
- [ ] 限制文件权限
- [ ] 禁用不必要的服务

---

## 联系支持

如有问题，请联系：
- **Email**: support@test-web.com
- **GitHub**: https://github.com/your-org/test-web-app/issues

---

**文档版本**: 1.0.0  
**最后更新**: 2025-10-15

