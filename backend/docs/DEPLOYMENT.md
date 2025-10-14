# 🚀 Test-Web Backend 部署指南

## 📋 目录

- [系统要求](#系统要求)
- [环境准备](#环境准备)
- [部署方式](#部署方式)
  - [传统部署](#传统部署)
  - [Docker部署](#docker部署)
  - [Kubernetes部署](#kubernetes部署)
- [配置管理](#配置管理)
- [数据库迁移](#数据库迁移)
- [监控与日志](#监控与日志)
- [备份与恢复](#备份与恢复)
- [故障排查](#故障排查)
- [安全加固](#安全加固)

---

## 🖥️ 系统要求

### 最低配置（开发/测试环境）
- **CPU**: 2 核心
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间
- **操作系统**: Ubuntu 20.04+, CentOS 8+, Windows Server 2019+

### 推荐配置（生产环境）
- **CPU**: 4+ 核心
- **内存**: 8GB+ RAM
- **存储**: 50GB+ SSD
- **操作系统**: Ubuntu 22.04 LTS / CentOS Stream 9

### 软件依赖
- **Node.js**: v18.x 或更高版本
- **npm/yarn**: 最新稳定版本
- **PostgreSQL**: v14+ （推荐 v15+）
- **Redis**: v6+ （推荐 v7+）
- **Nginx**: v1.20+ （可选，用作反向代理）

---

## 🔧 环境准备

### 1. 安装 Node.js

#### Ubuntu/Debian
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### CentOS/RHEL
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

#### 验证安装
```bash
node --version  # 应显示 v18.x.x
npm --version   # 应显示 9.x.x 或更高
```

### 2. 安装 PostgreSQL

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL
```bash
sudo dnf install postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 创建数据库和用户
```bash
sudo -u postgres psql

-- 在 PostgreSQL shell 中执行：
CREATE DATABASE testweb_prod;
CREATE USER testweb_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE testweb_prod TO testweb_admin;
ALTER DATABASE testweb_prod OWNER TO testweb_admin;
\q
```

### 3. 安装 Redis

#### Ubuntu/Debian
```bash
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### CentOS/RHEL
```bash
sudo dnf install redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### 配置 Redis（可选但推荐）
```bash
sudo nano /etc/redis/redis.conf

# 修改以下配置：
bind 127.0.0.1
requirepass your_redis_password
maxmemory 256mb
maxmemory-policy allkeys-lru

# 重启 Redis
sudo systemctl restart redis
```

---

## 🚀 部署方式

### 方式一：传统部署

#### 1. 克隆代码
```bash
cd /opt
sudo git clone https://github.com/yourorg/Test-Web-backend.git
cd Test-Web-backend/backend
```

#### 2. 安装依赖
```bash
npm ci --production
```

#### 3. 配置环境变量
```bash
sudo nano .env.production
```

添加以下内容（根据实际情况修改）：

```env
# 应用配置
NODE_ENV=production
PORT=3001
APP_NAME=Test-Web-Backend

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_prod
DB_USER=testweb_admin
DB_PASSWORD=your_secure_password
DB_SSL=true

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT 配置
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=30d

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/testweb/app.log

# CORS 配置
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# 邮件配置（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password
```

#### 4. 运行数据库迁移
```bash
npm run migrate:prod
```

#### 5. 使用 PM2 启动应用
```bash
# 安装 PM2
sudo npm install -g pm2

# 启动应用
pm2 start src/server.js --name test-web-backend --env production

# 配置开机自启
pm2 startup
pm2 save

# 查看应用状态
pm2 status
pm2 logs test-web-backend
```

#### 6. 配置 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/testweb-backend
```

添加以下配置：

```nginx
upstream backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # 强制 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志配置
    access_log /var/log/nginx/testweb-access.log;
    error_log /var/log/nginx/testweb-error.log;

    # 请求体大小限制
    client_max_body_size 50M;

    # 代理配置
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/testweb-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 方式二：Docker 部署

#### 1. 创建 Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖配置
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 生产镜像
FROM node:18-alpine

WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 从 builder 复制文件
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# 暴露端口
EXPOSE 3001

# 切换到非 root 用户
USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# 启动应用
CMD ["node", "src/server.js"]
```

#### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: testweb-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      REDIS_HOST: redis
    env_file:
      - ./backend/.env.production
    depends_on:
      - postgres
      - redis
    networks:
      - testweb-network
    volumes:
      - ./logs:/app/logs

  postgres:
    image: postgres:15-alpine
    container_name: testweb-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: testweb_prod
      POSTGRES_USER: testweb_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - testweb-network

  redis:
    image: redis:7-alpine
    container_name: testweb-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - testweb-network

  nginx:
    image: nginx:alpine
    container_name: testweb-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - backend
    networks:
      - testweb-network

networks:
  testweb-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
```

#### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 查看运行状态
docker-compose ps

# 停止服务
docker-compose down
```

---

### 方式三：Kubernetes 部署

#### 1. 创建 Kubernetes 配置

**deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: testweb-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: testweb-backend
  template:
    metadata:
      labels:
        app: testweb-backend
    spec:
      containers:
      - name: backend
        image: yourregistry/testweb-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: testweb-secrets
              key: db-host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: testweb-secrets
              key: db-password
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: testweb-backend-service
  namespace: production
spec:
  selector:
    app: testweb-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3001
  type: LoadBalancer
```

#### 2. 部署到集群

```bash
# 创建命名空间
kubectl create namespace production

# 创建 secrets
kubectl create secret generic testweb-secrets \
  --from-literal=db-host=postgres-service \
  --from-literal=db-password=your_password \
  --from-literal=jwt-secret=your_jwt_secret \
  -n production

# 应用部署配置
kubectl apply -f deployment.yaml

# 查看部署状态
kubectl get pods -n production
kubectl get services -n production

# 查看日志
kubectl logs -f deployment/testweb-backend -n production
```

---

## ⚙️ 配置管理

### 环境变量优先级
1. 系统环境变量（最高）
2. `.env.production` 文件
3. `.env` 文件
4. 默认配置（最低）

### 关键配置项说明

| 配置项 | 必需 | 说明 | 示例值 |
|--------|------|------|--------|
| `NODE_ENV` | ✅ | 运行环境 | `production` |
| `PORT` | ✅ | 服务端口 | `3001` |
| `DB_HOST` | ✅ | 数据库主机 | `localhost` |
| `DB_PASSWORD` | ✅ | 数据库密码 | `strongpassword` |
| `JWT_SECRET` | ✅ | JWT密钥 | `64位随机字符串` |
| `REDIS_HOST` | ✅ | Redis主机 | `localhost` |
| `CORS_ORIGIN` | ✅ | 允许的前端域名 | `https://app.com` |
| `LOG_LEVEL` | ❌ | 日志级别 | `info` |

---

## 🗄️ 数据库迁移

### 初始化数据库

```bash
# 开发环境
npm run migrate

# 生产环境
npm run migrate:prod
```

### 回滚迁移

```bash
# 回滚最后一次迁移
npm run migrate:rollback

# 回滚到特定版本
npm run migrate:rollback -- --to 20240101000000
```

### 查看迁移状态

```bash
npm run migrate:status
```

---

## 📊 监控与日志

### PM2 监控

```bash
# 查看实时监控
pm2 monit

# 查看内存使用
pm2 list

# 查看日志
pm2 logs test-web-backend --lines 100
```

### 日志管理

日志文件位置：
- **应用日志**: `/var/log/testweb/app.log`
- **错误日志**: `/var/log/testweb/error.log`
- **Nginx访问日志**: `/var/log/nginx/testweb-access.log`
- **Nginx错误日志**: `/var/log/nginx/testweb-error.log`

日志轮转配置：
```bash
sudo nano /etc/logrotate.d/testweb
```

```
/var/log/testweb/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 💾 备份与恢复

### 数据库备份

#### 自动备份脚本

```bash
#!/bin/bash
# /opt/scripts/backup-db.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="testweb_prod"

mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U testweb_admin -h localhost $DB_NAME | gzip > $BACKUP_DIR/backup_${DATE}.sql.gz

# 保留最近 7 天的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_${DATE}.sql.gz"
```

#### 配置定时任务

```bash
crontab -e

# 每天凌晨 2 点执行备份
0 2 * * * /opt/scripts/backup-db.sh >> /var/log/testweb/backup.log 2>&1
```

### 数据恢复

```bash
# 恢复数据库
gunzip < /backups/postgres/backup_20240101_020000.sql.gz | psql -U testweb_admin -h localhost testweb_prod
```

---

## 🔍 故障排查

### 常见问题

#### 1. 应用无法启动
```bash
# 检查日志
pm2 logs test-web-backend --err

# 检查端口占用
sudo lsof -i :3001

# 检查环境变量
pm2 env 0
```

#### 2. 数据库连接失败
```bash
# 测试数据库连接
psql -U testweb_admin -h localhost -d testweb_prod

# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 查看 PostgreSQL 日志
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### 3. Redis 连接失败
```bash
# 测试 Redis 连接
redis-cli ping

# 带密码连接
redis-cli -a your_redis_password ping

# 检查 Redis 状态
sudo systemctl status redis
```

#### 4. 性能问题
```bash
# 查看系统资源
htop

# 查看进程占用
pm2 monit

# 查看数据库连接数
psql -U testweb_admin -d testweb_prod -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🔐 安全加固

### 1. 防火墙配置

```bash
# 开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2. SSL/TLS 证书

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 数据库安全

```bash
# 修改 PostgreSQL 配置
sudo nano /etc/postgresql/15/main/pg_hba.conf

# 只允许本地连接
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 4. 限制文件权限

```bash
# 设置正确的文件权限
sudo chown -R nodejs:nodejs /opt/Test-Web-backend
sudo chmod -R 750 /opt/Test-Web-backend
sudo chmod 600 /opt/Test-Web-backend/backend/.env.production
```

### 5. 定期更新

```bash
# 更新系统软件包
sudo apt update && sudo apt upgrade -y

# 更新 npm 依赖
npm audit fix
npm update
```

---

## 📚 相关文档

- [API 文档](./API.md)
- [数据库架构](./DATABASE.md)
- [测试指南](../tests/README.md)
- [性能测试](../tests/performance/README.md)
- [开发指南](./DEVELOPMENT.md)

---

## 🆘 支持与反馈

如有问题或建议，请联系：
- **技术支持**: support@testweb.com
- **GitHub Issues**: https://github.com/yourorg/Test-Web-backend/issues
- **文档更新**: docs@testweb.com

---

**最后更新**: 2025-10-14  
**维护者**: Test-Web DevOps Team  
**版本**: v2.0.0

