# Test-Web 部署指南

## 目录
- [环境要求](#环境要求)
- [部署架构](#部署架构)
- [部署步骤](#部署步骤)
- [Docker 部署](#docker-部署)
- [Kubernetes 部署](#kubernetes-部署)
- [监控和日志](#监控和日志)
- [故障排除](#故障排除)

## 环境要求

### 系统要求
- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Windows Server 2019+
- **CPU**: 最小 2 核心，推荐 4 核心
- **内存**: 最小 4GB，推荐 8GB
- **存储**: 最小 20GB SSD

### 软件要求
- **Node.js**: 18.x 或更高版本
- **PostgreSQL**: 13+ 或 MySQL 8+
- **Redis**: 6+ (可选，用于缓存)
- **Nginx**: 1.18+ (用于反向代理)

## 部署架构

```
Internet
    |
    ↓
[Load Balancer / CDN]
    |
    ↓
[Nginx Reverse Proxy]
    |
    ├── [Frontend (React)] :5174
    ├── [Backend API] :3001
    └── [WebSocket Server] :3002
         |
         ├── [PostgreSQL Database]
         ├── [Redis Cache]
         └── [File Storage]
```

## 部署步骤

### 1. 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y git curl wget build-essential

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安装 Redis (可选)
sudo apt install -y redis-server

# 安装 Nginx
sudo apt install -y nginx
```

### 2. 配置数据库

```bash
# 创建数据库用户和数据库
sudo -u postgres psql

CREATE USER testweb WITH PASSWORD 'your_secure_password';
CREATE DATABASE testweb_prod OWNER testweb;
GRANT ALL PRIVILEGES ON DATABASE testweb_prod TO testweb;
\q

# 运行数据库迁移
npm run migrate:prod
```

### 3. 配置环境变量

```bash
# 创建生产环境配置
cp .env.example .env.production

# 编辑配置文件
nano .env.production
```

必要的环境变量：
```env
NODE_ENV=production
PORT=3001
FRONTEND_PORT=5174

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_prod
DB_USER=testweb
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_very_secure_jwt_secret_at_least_32_chars
JWT_EXPIRES_IN=7d

# Redis (可选)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# 其他配置...
```

### 4. 构建和部署应用

```bash
# 克隆代码
git clone https://github.com/your-repo/test-web.git
cd test-web

# 安装依赖
npm install

# 构建前端
npm run build:frontend

# 构建后端
npm run build:backend

# 使用 PM2 启动应用
pm2 start ecosystem.config.js --env production

# 保存 PM2 配置
pm2 save
pm2 startup
```

### 5. 配置 Nginx

创建 Nginx 配置文件 `/etc/nginx/sites-available/testweb`:

```nginx
upstream backend {
    server localhost:3001;
}

upstream frontend {
    server localhost:5174;
}

server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 配置
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 前端
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 静态文件
    location /static {
        alias /var/www/testweb/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/testweb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Docker 部署

### 使用 Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5174:5174"
    environment:
      - REACT_APP_API_URL=http://backend:3001
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=testweb
      - DB_USER=testweb
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:13-alpine
    environment:
      - POSTGRES_DB=testweb
      - POSTGRES_USER=testweb
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

部署：
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## Kubernetes 部署

### 基本部署配置

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: testweb-backend
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
        image: testweb/backend:latest
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
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: testweb-backend-service
spec:
  selector:
    app: testweb-backend
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3001
  type: LoadBalancer
```

部署到 Kubernetes：
```bash
# 创建命名空间
kubectl create namespace testweb

# 创建密钥
kubectl create secret generic testweb-secrets \
  --from-literal=db-host=postgres \
  --from-literal=db-password=your_password \
  -n testweb

# 应用配置
kubectl apply -f deployment.yaml -n testweb

# 检查状态
kubectl get pods -n testweb
kubectl get services -n testweb
```

## 监控和日志

### 1. 应用监控

使用 PM2 监控：
```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs

# 监控面板
pm2 monit
```

### 2. 系统监控

安装 Prometheus 和 Grafana：
```bash
# 使用 Docker Compose
docker-compose -f monitoring-compose.yml up -d
```

### 3. 日志管理

配置集中式日志：
```javascript
// logger.js
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: 'http://localhost:9200' },
      index: 'testweb-logs'
    })
  ]
});
```

## 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接
psql -h localhost -U testweb -d testweb_prod

# 检查防火墙
sudo ufw status
```

#### 2. 端口被占用
```bash
# 查找占用端口的进程
sudo lsof -i :3001
sudo netstat -tulpn | grep :3001

# 结束进程
sudo kill -9 <PID>
```

#### 3. 内存不足
```bash
# 检查内存使用
free -h
top

# 调整 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### 4. SSL 证书问题
```bash
# 使用 Let's Encrypt 获取免费证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 性能优化

### 1. 启用 Gzip 压缩
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/x-javascript application/x-font-ttf application/x-font-opentype application/vnd.ms-fontobject font/ttf font/opentype font/otf font/woff font/woff2;
```

### 2. 配置 CDN
- 使用 Cloudflare 或 AWS CloudFront
- 缓存静态资源
- 启用图片优化

### 3. 数据库优化
```sql
-- 创建索引
CREATE INDEX idx_tests_user_id ON tests(user_id);
CREATE INDEX idx_tests_created_at ON tests(created_at);

-- 分析查询性能
EXPLAIN ANALYZE SELECT * FROM tests WHERE user_id = 1;
```

## 备份策略

### 自动备份脚本
```bash
#!/bin/bash
# backup.sh

# 数据库备份
pg_dump -U testweb testweb_prod > /backups/db_$(date +%Y%m%d).sql

# 文件备份
tar -czf /backups/files_$(date +%Y%m%d).tar.gz /var/www/testweb/uploads

# 上传到 S3
aws s3 cp /backups/ s3://testweb-backups/ --recursive

# 清理旧备份（保留30天）
find /backups -type f -mtime +30 -delete
```

添加到 cron：
```bash
crontab -e
0 2 * * * /path/to/backup.sh
```

## 安全建议

1. **使用 HTTPS**: 始终使用 SSL/TLS 加密
2. **定期更新**: 保持系统和依赖项更新
3. **限制访问**: 使用防火墙限制不必要的端口
4. **密钥管理**: 使用密钥管理服务（如 AWS KMS）
5. **监控异常**: 设置告警和入侵检测
6. **备份恢复**: 定期测试备份恢复流程

## 联系支持

如有部署问题，请联系：
- 邮箱: support@testweb.com
- 文档: https://docs.testweb.com
- GitHub Issues: https://github.com/testweb/issues
