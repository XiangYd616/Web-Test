# Docker 部署指南

本目录包含 Test-Web-backend 项目的 Docker 部署文件和脚本。

## 📁 文件说明

- `Dockerfile.backend` - 生产环境 Dockerfile (多阶段构建)
- `Dockerfile.dev` - 开发环境 Dockerfile (含热重载和调试工具)
- `docker-quick-start.sh` - Linux/macOS 快速启动脚本
- `docker-quick-start.ps1` - Windows PowerShell 快速启动脚本
- `../docker-compose.yml` - 生产环境 Docker Compose 配置
- `../docker-compose.dev.yml` - 开发环境 Docker Compose 配置

## 🚀 快速开始

### 前提条件

- Docker >= 20.0
- Docker Compose >= 2.0

### 方式一：使用快速启动脚本（推荐）

#### Linux/macOS

```bash
# 赋予执行权限
chmod +x deploy/docker-quick-start.sh

# 启动开发环境
./deploy/docker-quick-start.sh dev

# 查看其他命令
./deploy/docker-quick-start.sh help
```

#### Windows PowerShell

```powershell
# 启动开发环境
.\deploy\docker-quick-start.ps1 dev

# 查看其他命令
.\deploy\docker-quick-start.ps1 help
```

### 方式二：手动使用 Docker Compose

#### 开发环境

```bash
# 启动所有服务
docker compose -f docker-compose.dev.yml up -d

# 查看日志
docker compose -f docker-compose.dev.yml logs -f backend

# 停止服务
docker compose -f docker-compose.dev.yml down
```

#### 生产环境

```bash
# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f backend

# 停止服务
docker compose down
```

## 🔧 配置说明

### 环境变量

在启动前，确保 `backend/.env` 文件存在并配置正确：

```bash
# 从示例文件创建
cp backend/.env.example backend/.env

# 编辑配置
nano backend/.env
```

必需的环境变量：
- `DB_PASSWORD` - PostgreSQL 密码
- `JWT_SECRET` - JWT 密钥
- `REDIS_PASSWORD` - Redis 密码（可选）

### 端口配置

默认端口映射：
- `3001` - Backend API
- `5432` - PostgreSQL
- `6379` - Redis
- `8080` - Adminer (数据库管理)
- `8001` - RedisInsight (Redis 管理)

可通过环境变量修改：

```bash
export PORT=3002
export DB_PORT=5433
docker compose up -d
```

## 📊 服务说明

### 开发环境服务

| 服务 | 说明 | 端口 | 管理界面 |
|------|------|------|---------|
| backend | 后端 API (热重载) | 3001 | - |
| postgres | PostgreSQL 数据库 | 5432 | http://localhost:8080 |
| redis | Redis 缓存/队列 | 6379 | http://localhost:8001 |
| adminer | 数据库管理工具 | 8080 | http://localhost:8080 |
| redis-insight | Redis 管理工具 | 8001 | http://localhost:8001 |

### 生产环境服务

| 服务 | 说明 | 端口 |
|------|------|------|
| backend | 后端 API | 3001 |
| postgres | PostgreSQL 数据库 | 5432 |
| redis | Redis 缓存/队列 | 6379 |

## 🛠️ 常用命令

### 快速启动脚本命令

```bash
# 启动开发环境
./deploy/docker-quick-start.sh dev

# 启动生产环境
./deploy/docker-quick-start.sh prod

# 停止服务
./deploy/docker-quick-start.sh stop [dev]

# 重启服务
./deploy/docker-quick-start.sh restart [dev]

# 查看日志
./deploy/docker-quick-start.sh logs [service]

# 进入容器
./deploy/docker-quick-start.sh shell [service]

# 备份数据库
./deploy/docker-quick-start.sh backup

# 查看状态
./deploy/docker-quick-start.sh status

# 清理所有数据（危险！）
./deploy/docker-quick-start.sh clean [dev]
```

### Docker Compose 命令

```bash
# 查看服务状态
docker compose ps

# 查看所有日志
docker compose logs

# 查看特定服务日志
docker compose logs backend

# 实时跟踪日志
docker compose logs -f backend

# 重启特定服务
docker compose restart backend

# 重新构建并启动
docker compose up -d --build

# 停止并删除容器
docker compose down

# 停止并删除容器及数据卷
docker compose down -v

# 进入容器
docker compose exec backend sh
docker compose exec postgres psql -U postgres
```

## 🔍 健康检查

### API 健康检查

```bash
curl http://localhost:3001/health
```

期望返回：
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "engines": {
    "chromium": "available"
  }
}
```

### 数据库连接测试

```bash
docker compose exec postgres psql -U postgres -c "SELECT version();"
```

### Redis 连接测试

```bash
docker compose exec redis redis-cli ping
```

## 📦 数据持久化

数据卷说明：
- `postgres_data` - PostgreSQL 数据
- `redis_data` - Redis 数据
- `backend_logs` - 后端日志
- `backend_uploads` - 文件上传
- `backend_reports` - 测试报告

查看数据卷：
```bash
docker volume ls | grep testweb
```

备份数据卷：
```bash
# 备份 PostgreSQL
docker compose exec postgres pg_dump -U postgres testweb_dev > backup.sql

# 恢复 PostgreSQL
docker compose exec -T postgres psql -U postgres testweb_dev < backup.sql
```

## 🐛 故障排除

### 1. 端口被占用

```bash
# 查看端口占用 (Linux/macOS)
lsof -i :3001

# 查看端口占用 (Windows)
netstat -ano | findstr :3001

# 修改端口
export PORT=3002
docker compose up -d
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker compose ps postgres

# 查看 PostgreSQL 日志
docker compose logs postgres

# 重启 PostgreSQL
docker compose restart postgres

# 验证数据库是否就绪
docker compose exec postgres pg_isready
```

### 3. Redis 连接失败

```bash
# 检查 Redis 状态
docker compose ps redis

# 查看 Redis 日志
docker compose logs redis

# 测试 Redis 连接
docker compose exec redis redis-cli ping
```

### 4. 容器无法启动

```bash
# 查看详细日志
docker compose logs --tail=100

# 清理并重新启动
docker compose down
docker compose up -d
```

### 5. 磁盘空间不足

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的数据卷
docker volume prune

# 完整清理（小心！）
docker system prune -a --volumes
```

## 🔐 安全建议

### 生产环境

1. **修改默认密码**
   ```bash
   # 在 .env 中设置强密码
   DB_PASSWORD=strong-random-password
   JWT_SECRET=strong-random-jwt-secret
   REDIS_PASSWORD=strong-random-redis-password
   ```

2. **不暴露不必要的端口**
   ```yaml
   # 在 docker-compose.yml 中注释掉不需要的端口映射
   # ports:
   #   - "5432:5432"  # 不要暴露数据库端口到外网
   ```

3. **使用非 root 用户**
   ```dockerfile
   # Dockerfile 中已包含
   USER backend
   ```

4. **启用 SSL/TLS**
   - PostgreSQL: 配置 SSL 连接
   - Redis: 启用 TLS
   - API: 使用 HTTPS (通过 Nginx 反向代理)

5. **限制资源使用**
   ```yaml
   # 在 docker-compose.yml 中添加
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

## 📈 监控和日志

### 日志管理

```bash
# 查看最近 100 行日志
docker compose logs --tail=100 backend

# 跟踪日志
docker compose logs -f backend

# 导出日志
docker compose logs backend > backend.log
```

### 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats testweb-backend
```

## 🚢 部署到生产环境

### 1. 构建生产镜像

```bash
# 构建镜像
docker compose build backend

# 或使用 Dockerfile 直接构建
docker build -f deploy/Dockerfile.backend -t testweb-backend:latest .
```

### 2. 推送到镜像仓库

```bash
# 标记镜像
docker tag testweb-backend:latest your-registry.com/testweb-backend:latest

# 推送镜像
docker push your-registry.com/testweb-backend:latest
```

### 3. 在生产服务器部署

```bash
# 拉取镜像
docker pull your-registry.com/testweb-backend:latest

# 启动服务
docker compose up -d
```

## 📚 相关文档

- [主文档](../README.md)
- [环境依赖](../DEPENDENCIES.md)
- [API 文档](http://localhost:3001/api/docs)
- [Docker 官方文档](https://docs.docker.com/)

---

**维护者**: Test-Web Team  
**最后更新**: 2025-10-16

