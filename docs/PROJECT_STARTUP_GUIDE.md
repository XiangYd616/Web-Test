# 🚀 Test-Web项目完整启动指南

## 📋 项目概览

**项目名称**: Test-Web - 企业级网站测试平台  
**技术栈**: React + TypeScript + Node.js + PostgreSQL  
**架构**: 前后端分离 + Electron桌面应用  
**端口配置**: 前端5174，后端3001

## 🛠️ 环境准备

### **1. 系统要求**

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 12.0
- **Redis**: >= 6.0 (可选，用于缓存)
- **Git**: 最新版本

### **2. 必需软件安装**

#### **安装Node.js**

```bash
# 下载并安装Node.js 18+
# https://nodejs.org/

# 验证安装
node --version  # 应显示 v18.x.x 或更高
npm --version   # 应显示 9.x.x 或更高
```

#### **安装PostgreSQL**

```bash
# Windows (使用官方安装程序)
# https://www.postgresql.org/download/windows/

# macOS (使用Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证安装
psql --version  # 应显示 PostgreSQL 12+ 版本
```

#### **安装Redis (可选但推荐)**

```bash
# Windows (使用WSL或Docker)
docker run -d -p 6379:6379 redis:latest

# macOS (使用Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# 验证安装
redis-cli ping  # 应返回 PONG
```

## 🗄️ 数据库配置

### **1. 创建PostgreSQL数据库**

```bash
# 连接到PostgreSQL
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE testweb_dev;
CREATE USER testweb_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE testweb_dev TO testweb_user;

# 退出PostgreSQL
\q
```

### **2. 配置数据库连接**

编辑 `backend/.env` 文件中的数据库配置：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=testweb_dev
DB_USER=testweb_user
DB_PASSWORD=your_secure_password
```

## 📦 项目安装

### **1. 克隆项目**

```bash
git clone <your-repository-url>
cd Test-Web
```

### **2. 安装依赖**

```bash
# 安装根目录依赖 (前端)
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

### **3. 环境配置**

```bash
# 复制环境配置文件
cp .env.example .env                    # 前端环境配置
cp backend/.env.example backend/.env   # 后端环境配置

# 编辑配置文件，设置数据库连接等参数
```

> 如需启用 WebSocket 加密，设置环境变量：
>
> `WS_ENCRYPTION_KEY=your-strong-secret`

> 如需启用 GeoIP 位置解析，设置：
>
> `MAXMIND_CITY_DB=./data/GeoLite2-City.mmdb`
> `MAXMIND_LICENSE_KEY=your_maxmind_license_key` `GEOIP_CACHE_TTL_SECONDS=3600`

> 登录风险控制可选配置：
>
> `ALLOWED_LOGIN_REGIONS=cn,beijing` `BLOCKED_LOGIN_REGIONS=`
> `LOGIN_RISK_WINDOW_HOURS=6` `RISK_MFA_ENABLED=true`
>
> 安全事件落库可选配置：
>
> 启用后写入 security_events 表（需初始化数据库）
>
> `SECURITY_EVENT_DB_ENABLED=false`

## 🗄️ 数据库初始化

### **1. 初始化数据库结构**

```bash
# 进入后端目录
cd backend

# 初始化数据库表结构
npm run db:init

# 执行数据库迁移 (如果有)
npm run db:migrate

# 插入种子数据 (可选)
npm run db:seed

# 验证数据库结构
npm run db:validate

# 返回根目录
cd ..
```

### **2. 验证数据库连接**

```bash
# 检查数据库状态
cd backend && npm run db:status
```

## 🚀 启动项目

### **方式一: 同时启动前后端 (推荐)**

```bash
# 在项目根目录执行
npm run dev

# 这将同时启动:
# - 前端开发服务器 (http://localhost:5174)
# - 后端API服务器 (http://localhost:3001)
```

### **方式二: 分别启动前后端**

```bash
# 终端1: 启动后端服务
cd backend
npm run dev

# 终端2: 启动前端服务
npm run frontend
```

### **方式三: 生产模式启动**

```bash
# 构建前端
npm run build

# 启动生产服务
npm start
```

## 🖥️ Electron桌面应用

### **开发模式启动**

```bash
# 启动Electron开发模式
npm run electron:dev
```

### **构建桌面应用**

```bash
# 构建Electron应用
npm run electron:build

# 构建并分发
npm run electron:dist
```

## 🔍 验证启动状态

### **1. 检查服务状态**

```bash
# 检查前端服务
curl http://localhost:5174

# 检查后端API
curl http://localhost:3001/health

# 检查数据库连接
curl http://localhost:3001/api/system/health
```

### **2. 访问应用**

- **前端应用**: http://localhost:5174
- **后端API**: http://localhost:3001/api
- **API文档**: http://localhost:3001/api/docs
- **健康检查**: http://localhost:3001/health

## 🧪 运行测试

### **前端测试**

```bash
# 运行单元测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行E2E测试
npm run e2e
```

### **后端测试**

```bash
cd backend

# 运行后端测试
npm test

# 运行测试覆盖率
npm run test:coverage
```

## 🔧 开发工具

### **代码质量检查**

```bash
# ESLint检查
npm run lint

# 自动修复代码风格
npm run lint:fix

# TypeScript类型检查
npm run type-check

# 代码格式化
npm run format
```

### **数据库管理**

```bash
cd backend

# 数据库迁移
npm run db:migrate

# 查看迁移状态
npm run db:migrate:status

# 创建新迁移
npm run db:migrate:create "migration_name"

# 重置数据库
npm run db:reset
```

## 🚨 常见问题排除

### **1. 端口冲突**

```bash
# 检查端口占用
netstat -ano | findstr :5174  # Windows
lsof -i :5174                 # macOS/Linux

# 修改端口配置
# 编辑 .env 文件中的 VITE_DEV_PORT
# 编辑 backend/.env 文件中的 PORT
```

### **2. 数据库连接失败**

```bash
# 检查PostgreSQL服务状态
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# 测试数据库连接
psql -h localhost -U testweb_user -d testweb_dev

# 检查防火墙设置
sudo ufw status  # Linux
```

### **3. 依赖安装失败**

```bash
# 清理缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 使用yarn替代npm
npm install -g yarn
yarn install
```

### **4. 权限问题**

```bash
# Linux/macOS权限修复
sudo chown -R $USER:$USER .
chmod -R 755 .

# Windows权限问题
# 以管理员身份运行命令提示符
```

## 📊 性能监控

### **启动性能监控**

```bash
# 后端性能分析
cd backend
npm run perf:analyze

# 日志监控
npm run logs:monitor

# 缓存状态检查
npm run cache:stats
```

## 🔒 安全配置

### **生产环境安全检查**

```bash
# 安全审计
npm audit

# 修复安全漏洞
npm audit fix

# 检查依赖更新
npm outdated
```

## 📚 开发资源

### **API文档**

- **Swagger UI**: http://localhost:3001/api/docs
- **API清单**: `docs/API.md`

### **项目文档**

- **文档索引**: `docs/DOCUMENTATION_INDEX.md`
- **数据库文档**: `docs/DATABASE_COMPLETE_GUIDE.md`
- **部署指南**: `docs/DEPLOYMENT.md`

## 🎯 快速启动检查清单

- [ ] ✅ Node.js 18+ 已安装
- [ ] ✅ PostgreSQL 12+ 已安装并运行
- [ ] ✅ 项目依赖已安装 (`npm install`)
- [ ] ✅ 环境配置已设置 (`.env` 文件)
- [ ] ✅ 数据库已创建和初始化
- [ ] ✅ 前端服务运行在 http://localhost:5174
- [ ] ✅ 后端服务运行在 http://localhost:3001
- [ ] ✅ 数据库连接正常
- [ ] ✅ API健康检查通过

## 🎉 启动成功！

当您看到以下输出时，说明项目启动成功：

```bash
✅ 前端服务启动成功: http://localhost:5174
✅ 后端服务启动成功: http://localhost:3001
✅ 数据库连接正常
✅ 所有服务运行正常

🚀 Test-Web项目已成功启动！
```

现在您可以开始使用Test-Web进行网站测试了！

---

**需要帮助？**

- 📧 联系邮箱: 1823170057@qq.com
- 📖 查看文档: `docs/` 目录
- 🐛 报告问题: GitHub Issues
