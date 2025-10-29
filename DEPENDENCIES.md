# Test-Web-backend 环境依赖文档

## 📋 概述

本文档详细说明 Test-Web-backend 项目的所有依赖项、安装步骤和配置要求。

## 🎯 依赖层级

### 🔴 核心依赖（必须）
系统无法启动或核心功能不可用

### 🟡 重要依赖（推荐）
影响部分高级功能

### 🟢 可选依赖（增强）
用于特定场景或性能优化

---

## 📦 依赖清单

### 🔴 核心依赖

#### 1. Node.js
- **版本要求**: >= 18.0.0
- **推荐版本**: 20.x LTS
- **用途**: 运行时环境
- **安装**:
  ```bash
  # Windows (使用 nvm-windows)
  nvm install 20
  nvm use 20
  
  # macOS/Linux (使用 nvm)
  nvm install 20
  nvm use 20
  
  # 或直接下载
  # https://nodejs.org/
  ```
- **验证**: `node -v` (应显示 v20.x.x)

#### 2. PostgreSQL
- **版本要求**: >= 13.0
- **推荐版本**: 15.x 或 16.x
- **用途**: 主数据库
- **安装**:
  ```bash
  # Windows
  # 下载安装器: https://www.postgresql.org/download/windows/
  
  # macOS (使用 Homebrew)
  brew install postgresql@15
  brew services start postgresql@15
  
  # Linux (Ubuntu/Debian)
  sudo apt-get update
  sudo apt-get install postgresql-15
  sudo systemctl start postgresql
  
  # Docker (推荐用于开发)
  docker run -d \
    --name testweb-postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=testweb_dev \
    -p 5432:5432 \
    postgres:15-alpine
  ```
- **配置**:
  ```sql
  -- 创建数据库
  CREATE DATABASE testweb_dev;
  CREATE DATABASE testweb_test;
  
  -- 创建用户 (可选，用于生产环境)
  CREATE USER testweb_user WITH ENCRYPTED PASSWORD 'your_password';
  GRANT ALL PRIVILEGES ON DATABASE testweb_dev TO testweb_user;
  ```
- **验证**: `psql --version`

#### 3. npm/pnpm
- **版本要求**: npm >= 9.0.0 或 pnpm >= 8.0.0
- **用途**: 包管理器
- **安装**: 随 Node.js 自动安装
- **验证**: `npm -v` 或 `pnpm -v`

---

### 🟡 重要依赖

#### 4. Redis
- **版本要求**: >= 6.0
- **推荐版本**: 7.x
- **用途**: 缓存、任务队列 (Bull)
- **影响功能**:
  - ✅ 有Redis: 分布式任务队列、高性能缓存
  - ⚠️ 无Redis: 自动降级到内存队列和缓存（单机模式）
- **安装**:
  ```bash
  # Windows (使用 WSL 或 Memurai)
  # WSL: sudo apt-get install redis-server
  # Memurai: https://www.memurai.com/
  
  # macOS
  brew install redis
  brew services start redis
  
  # Linux
  sudo apt-get install redis-server
  sudo systemctl start redis
  
  # Docker (推荐)
  docker run -d \
    --name testweb-redis \
    -p 6379:6379 \
    redis:7-alpine
  ```
- **配置**: 默认配置即可，生产环境建议启用持久化
- **验证**: `redis-cli ping` (应返回 PONG)

#### 5. Chrome/Chromium
- **版本要求**: >= 120.0
- **用途**: Puppeteer/Playwright 浏览器自动化
- **影响功能**:
  - 性能测试 (Lighthouse)
  - 截图对比
  - 浏览器兼容性测试
  - 深度安全扫描
- **安装**:
  ```bash
  # 自动安装 (推荐 - Puppeteer会自动下载)
  npm install
  
  # 手动安装 Chrome
  # Windows: https://www.google.com/chrome/
  # macOS: brew install --cask google-chrome
  # Linux: sudo apt-get install chromium-browser
  ```
- **环境变量**:
  ```bash
  # 如果使用系统Chrome
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
  ```
- **验证**: 启动后端，检查日志是否有浏览器初始化错误

---

### 🟢 可选依赖

#### 6. Playwright (多浏览器支持)
- **版本**: 自动安装
- **用途**: 跨浏览器测试 (Firefox, Safari, Edge)
- **安装**:
  ```bash
  npx playwright install
  # 或只安装特定浏览器
  npx playwright install chromium firefox
  ```
- **影响**: 仅影响跨浏览器兼容性测试的完整性

#### 7. SMTP服务器 (邮件服务)
- **用途**: 发送验证邮件、通知
- **选项**:
  - Gmail SMTP
  - SendGrid
  - Mailgun
  - 本地开发: MailHog/MailCatcher
- **配置**: 见 `.env` 中的 SMTP 配置项
- **影响**: 无SMTP则邮件功能不可用，不影响核心功能

#### 8. Docker & Docker Compose
- **版本要求**: Docker >= 20.0, Docker Compose >= 2.0
- **用途**: 容器化部署
- **安装**: https://docs.docker.com/get-docker/
- **验证**: `docker --version`, `docker compose version`

---

## 🚀 快速启动指南

### 方案 A: 最小化安装 (仅核心功能)

```bash
# 1. 安装 Node.js 20.x
nvm install 20 && nvm use 20

# 2. 启动 PostgreSQL (Docker)
docker run -d --name testweb-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=testweb_dev \
  -p 5432:5432 postgres:15-alpine

# 3. 安装依赖
cd backend
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env，设置数据库连接

# 5. 初始化数据库
npm run db:init

# 6. 启动服务
npm run dev
```

**功能范围**: 
- ✅ 用户认证
- ✅ SEO测试
- ✅ API测试
- ✅ 基础安全测试
- ⚠️ 性能测试降级
- ❌ 任务队列降级到内存

---

### 方案 B: 推荐配置 (完整功能)

```bash
# 1. 安装 Node.js
nvm install 20 && nvm use 20

# 2. 启动依赖服务 (Docker Compose)
docker compose up -d postgres redis

# 3. 安装依赖
cd backend
npm install

# 4. 安装浏览器
npx playwright install chromium

# 5. 配置环境
cp .env.example .env
# 编辑 .env

# 6. 初始化数据库
npm run db:init

# 7. 启动服务
npm run dev
```

**功能范围**: 
- ✅ 所有功能完整可用
- ✅ 性能测试 (Lighthouse)
- ✅ 任务队列 (Redis)
- ✅ 高性能缓存

---

### 方案 C: Docker 一键部署 (生产环境)

```bash
# 1. 确保 Docker 已安装
docker --version

# 2. 启动所有服务
docker compose up -d

# 3. 查看日志
docker compose logs -f backend

# 4. 访问服务
# Backend: http://localhost:3001
# Health Check: http://localhost:3001/health
```

---

## 🔧 环境配置检查清单

### 启动前检查

```bash
# 1. Node.js 版本
node -v  # 应该 >= 18.0.0

# 2. PostgreSQL 连接
psql -U postgres -c "SELECT version();"

# 3. Redis 连接 (可选)
redis-cli ping  # 应返回 PONG

# 4. npm 依赖
npm list --depth=0  # 检查依赖安装状态

# 5. 环境变量
cat .env  # 确认关键配置已设置
```

### 健康检查

启动后端后，访问：
```bash
curl http://localhost:3001/health
```

期望返回：
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected" (或 "not_configured"),
  "engines": {
    "chromium": "available" (或 "unavailable")
  }
}
```

---

## 🐛 常见问题

### Q1: PostgreSQL 连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**解决**:
1. 检查 PostgreSQL 是否运行: `pg_isready`
2. 检查端口占用: `netstat -an | grep 5432`
3. 验证 `.env` 中的数据库配置

### Q2: Redis 连接失败但程序仍运行
```
Redis error, using memory queue fallback
```
**说明**: 正常降级行为，不影响核心功能
**优化**: 安装 Redis 以获得更好的性能

### Q3: Puppeteer 下载 Chromium 失败
```
Error: Failed to download Chromium
```
**解决**:
```bash
# 方案 1: 使用国内镜像
export PUPPETEER_DOWNLOAD_HOST=https://npmmirror.com/mirrors
npm install

# 方案 2: 跳过下载，使用系统 Chrome
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install
```

### Q4: 数据库初始化失败
```
Error: relation "users" already exists
```
**解决**:
```bash
# 重置数据库
npm run db:reset
npm run db:init
```

### Q5: Windows 环境 node-gyp 编译错误
**解决**:
```bash
# 安装 Windows Build Tools
npm install --global windows-build-tools

# 或使用预编译版本
npm install --legacy-peer-deps
```

---

## 📊 依赖检测矩阵

| 依赖 | 必需性 | 检测方式 | 降级行为 |
|------|-------|---------|---------|
| Node.js | 🔴 必须 | 启动时检测 | 无法启动 |
| PostgreSQL | 🔴 必须 | 连接测试 | 启动失败 |
| Redis | 🟡 推荐 | 连接测试 | 内存队列 |
| Chrome | 🟡 推荐 | Puppeteer检测 | 跳过性能测试 |
| Playwright | 🟢 可选 | 模块检测 | 跳过跨浏览器测试 |
| SMTP | 🟢 可选 | 配置检测 | 邮件功能禁用 |

---

## 🔐 安全建议

1. **生产环境**:
   - 修改所有默认密码
   - 启用 PostgreSQL SSL
   - 配置 Redis 密码
   - 使用环境变量管理敏感信息

2. **网络配置**:
   - PostgreSQL: 仅允许本地或内网访问
   - Redis: 绑定到 127.0.0.1
   - 使用防火墙限制端口访问

3. **备份策略**:
   - 定期备份 PostgreSQL 数据
   - 配置 Redis AOF 持久化
   - 使用 `npm run db:backup`

---

## 📚 相关文档

- [安装指南](./docs/INSTALLATION.md)
- [Docker部署](./docs/DOCKER_DEPLOYMENT.md)
- [环境变量配置](./backend/.env.example)
- [故障排除](./docs/TROUBLESHOOTING.md)
- [API文档](http://localhost:3001/api/docs)

---

## 🆘 获取帮助

遇到问题？
1. 查看 [常见问题](#🐛-常见问题)
2. 运行健康检查: `curl http://localhost:3001/health`
3. 查看日志: `npm run logs:analyze`
4. 提交 Issue: [GitHub Issues](https://github.com/XiangYd616/Web-Test/issues)

---

**最后更新**: 2025-10-16  
**维护者**: Test-Web Team

