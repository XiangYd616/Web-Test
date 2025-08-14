# 📚 NPM 脚本使用指南

## 🚀 快速开始

### 首次设置
```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npm run db:init

# 3. 启动开发环境
npm run dev
```

## 📋 脚本分类说明

### 🚀 主要启动命令

#### `npm start`
启动完整应用（前端 + 后端）
- 前端: http://localhost:5174
- 后端: http://localhost:3001

#### `npm run dev`
启动开发环境（带热重载）
- 前端开发服务器 + 后端开发服务器
- 文件变化时自动重启

#### `npm run frontend`
仅启动前端开发服务器
- 端口: 5174
- 支持热重载

#### `npm run backend`
仅启动后端生产服务器

#### `npm run backend:dev`
仅启动后端开发服务器（带热重载）

### 📦 构建相关

#### `npm run build`
构建前端生产版本
- 输出目录: `dist/`
- 优化和压缩代码

#### `npm run build:check`
构建前进行类型检查
- 先运行TypeScript类型检查
- 然后执行构建

#### `npm run preview`
预览构建后的应用

#### `npm run type-check`
仅运行TypeScript类型检查

### 🗄️ 数据库管理

#### `npm run db:init`
初始化数据库
- 创建数据库表结构
- 插入初始数据

#### `npm run db:migrate`
运行数据库迁移
- 应用数据库结构变更

#### `npm run db:check`
检查数据库连接和状态

#### `npm run db:backup`
备份数据库数据

### 🧪 测试相关

#### `npm test`
运行前端测试（Vitest）
- 交互式测试模式

#### `npm run test:run`
运行所有测试（一次性）

#### `npm run test:coverage`
运行测试并生成覆盖率报告

#### `npm run test:e2e`
运行端到端测试（Playwright）

### ⚡ Electron应用

#### `npm run electron:dev`
启动Electron开发环境
- 前端开发服务器 + Electron窗口

#### `npm run electron:build`
构建Electron应用
- 生成可执行文件

### 🔧 项目维护

#### `npm run lint`
代码风格检查
- 检查TypeScript/JavaScript代码

#### `npm run lint:fix`
自动修复代码风格问题

#### `npm run format`
格式化代码
- 使用Prettier格式化

#### `npm run ci:check`
CI/CD检查
- 类型检查 + 代码检查 + 构建

### 🧹 清理操作

#### `npm run clean`
清理构建缓存
- 删除dist、node_modules/.cache等

#### `npm run clean:all`
完全清理
- 删除所有构建产物和node_modules

### 🔧 实用工具

#### `npm run deps:update`
更新依赖包到最新版本

#### `npm run security:audit`
安全审计
- 检查前端和后端的安全漏洞

## 🎯 常用工作流

### 日常开发流程
```bash
# 1. 启动开发环境
npm run dev

# 2. 代码开发...

# 3. 运行测试
npm test

# 4. 代码检查和格式化
npm run lint:fix
npm run format

# 5. 提交代码前检查
npm run ci:check
```

### 数据库操作流程
```bash
# 检查数据库状态
npm run db:check

# 如果需要重新初始化
npm run db:init

# 运行迁移（如果有新的迁移文件）
npm run db:migrate

# 备份数据库（重要操作前）
npm run db:backup
```

### 构建和部署流程
```bash
# 1. 运行完整检查
npm run ci:check

# 2. 构建前端
npm run build

# 3. 预览构建结果
npm run preview

# 4. 构建Electron应用（如果需要）
npm run electron:build
```

### 问题排查流程
```bash
# 1. 检查数据库连接
npm run db:check

# 2. 检查后端健康状态
cd backend && npm run health:check

# 3. 检查Redis连接
cd backend && npm run redis:check

# 4. 查看缓存统计
cd backend && npm run cache:stats

# 5. 清理缓存（如果需要）
cd backend && npm run cache:flush
```

## 🔧 后端专用脚本

进入后端目录后可使用的脚本：

```bash
cd backend

# 启动服务
npm start          # 生产模式
npm run dev        # 开发模式

# 测试
npm test           # 运行测试
npm run test:coverage  # 测试覆盖率

# 数据库
npm run db:init    # 初始化数据库
npm run db:migrate # 运行迁移
npm run db:check   # 检查数据库
npm run db:backup  # 备份数据库

# 健康检查
npm run health:check   # 检查API健康状态

# 缓存管理
npm run cache:stats    # 查看缓存统计
npm run cache:flush    # 清空缓存

# Redis
npm run redis:check    # 检查Redis连接

# 安全
npm run security:audit # 安全审计
npm run security:fix   # 修复安全问题

# Docker
npm run docker:build   # 构建Docker镜像
npm run docker:run     # 运行Docker容器
```

## ⚠️ 注意事项

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL数据库
- Redis（可选，用于缓存）

### 端口使用
- 前端开发服务器: 5174
- 后端API服务器: 3001
- PostgreSQL: 5432（默认）
- Redis: 6379（默认）

### 常见问题

#### 数据库连接失败
```bash
# 检查数据库状态
npm run db:check

# 重新初始化数据库
npm run db:init
```

#### 端口被占用
```bash
# 查看端口使用情况
netstat -ano | findstr :5174
netstat -ano | findstr :3001

# 或者修改端口配置
# 前端: 修改 vite.config.ts 中的 server.port
# 后端: 修改 .env 中的 PORT
```

#### 缓存问题
```bash
# 清理项目缓存
npm run clean

# 清理后端缓存
cd backend && npm run cache:flush

# 完全重新安装
npm run clean:all && npm install
```

## 📝 脚本开发规范

### 命名规范
- 使用冒号分隔命名空间: `db:init`, `test:coverage`
- 使用动词开头: `start`, `build`, `test`
- 保持简洁明了

### 分类标准
- 主要命令: 日常使用的核心命令
- 构建相关: 打包、编译相关
- 测试相关: 各种测试命令
- 维护相关: 代码质量、清理等
- 工具相关: 辅助工具和实用程序

### 注释规范
- 使用emoji和中文注释分类
- 保持注释简洁明了
- 按功能分组组织

---

**使用建议**: 建议将此指南保存为书签，在开发过程中随时查阅。对于新团队成员，建议先阅读"快速开始"和"常用工作流"部分。
