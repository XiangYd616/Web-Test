# 🚀 Test-Web 项目启动指南

## 🌍 **环境架构**

项目采用**双数据库架构**，自动环境切换：

| 环境 | 数据库 | 启动方式 | 用途 |
|------|--------|----------|------|
| **开发环境** | `testweb_dev` | `npm start` | 日常开发、测试、调试 |
| **生产环境** | `testweb_prod` | `NODE_ENV=production npm start` | 正式部署、用户使用 |

## 📋 统一启动命令

### 🎯 **日常开发启动** (推荐)

#### 1. **开发环境启动** (默认)
```bash
npm start
```
**说明**:
- 自动连接 `testweb_dev` 数据库
- 同时启动前端和后端服务
- 适合日常开发、测试、调试

#### 2. **生产环境启动** (部署时)
```bash
NODE_ENV=production npm start
```
**说明**:
- 自动连接 `testweb_prod` 数据库
- 生产模式运行
- 用于正式部署

#### 3. **分别启动服务** (调试时)
```bash
# 只启动前端 (端口: 5174)
npm run frontend

# 只启动后端 (端口: 3001)
npm run backend
```
**说明**: 适合单独调试前端或后端

#### 3. **一键启动脚本** (Windows)
```bash
start-complete.bat
```
**说明**: 自动检查环境、安装依赖、启动服务

### 🔧 **开发命令**

```bash
# 前端开发服务器
npm run dev:frontend

# 后端开发服务器  
npm run dev:backend

# 同时启动前后端
npm run dev:full
```

### 🖥️ **桌面应用**

```bash
# 启动Electron桌面版
npm run desktop

# 开发模式启动桌面版
npm run electron:dev
```

## 🚫 **废弃的启动方式**

以下启动方式**不再推荐使用**：

❌ `npm run dev` (仅启动前端，容易混淆)
❌ `npm run dev:api` (命名不清晰)
❌ 在server目录下执行npm命令
❌ 直接执行 `node server/app.js`

## 📊 **服务端口说明**

| 服务 | 端口 | 环境变量 | 访问地址 | 说明 |
|------|------|----------|----------|------|
| 前端开发服务器 | 5174 | `FRONTEND_PORT` | http://localhost:5174 | React应用 |
| 后端API服务器 | 3001 | `PORT` | http://localhost:3001 | Express API |
| 开发数据库 | 5432 | `DB_PORT` | localhost:5432 | PostgreSQL (testweb_dev) |
| 生产数据库 | 5432 | `DB_PORT` | localhost:5432 | PostgreSQL (testweb_prod) |

> 💡 **智能切换**: 系统根据 `NODE_ENV` 自动选择数据库，详见 [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

## 🔍 **启动检查清单**

启动前请确保：

✅ **Node.js** >= 18.0.0
✅ **PostgreSQL** 服务正在运行
✅ **环境变量** (.env文件配置正确)
✅ **依赖安装** (npm install已执行)

## 🛠️ **故障排除**

### 端口占用问题
```bash
# 检查端口占用
netstat -ano | findstr :5174
netstat -ano | findstr :3001

# 终止占用进程
taskkill /PID <进程ID> /F
```

### 数据库连接问题
```bash
# 检查开发数据库连接
psql -h localhost -p 5432 -U postgres -d testweb_dev -c "SELECT 1;"

# 检查生产数据库连接
psql -h localhost -p 5432 -U postgres -d testweb_prod -c "SELECT 1;"

# 初始化数据库
npm run db:init
```

### 依赖问题
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

## 📝 **开发流程建议**

### 日常开发
1. 启动完整项目: `npm start`
2. 访问前端: http://localhost:5174
3. 测试API: http://localhost:3001/api

### 前端开发
1. 启动前端: `npm run start:frontend`
2. 使用模拟数据或连接现有后端

### 后端开发
1. 启动后端: `npm run start:backend`
2. 使用API测试工具 (Postman/Thunder Client)

### 桌面应用开发
1. 构建前端: `npm run build`
2. 启动桌面版: `npm run desktop`

## 🎯 **最佳实践**

1. **统一使用根目录命令**: 避免在子目录执行启动命令
2. **使用完整启动**: 优先使用 `npm start` 启动完整项目
3. **检查服务状态**: 启动后访问健康检查端点
4. **环境隔离**: 开发、测试、生产使用不同的环境配置

## 📚 **相关文档**

- [项目结构说明](./docs/项目结构说明.md)
- [数据库设置](./server/DATABASE_SETUP.md)
- [环境配置](./server/ENV_SETUP.md)
- [部署指南](./docs/部署指南.md)

---

**记住**: 现在只需要一个命令 `npm start` 就能启动完整项目！🎉
