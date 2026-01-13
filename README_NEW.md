# Test Web App - 重构版本

> 🚀 **全栈测试平台** - 性能测试、安全测试、SEO 分析、API 测试的统一解决方案

[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 📋 目录

- [项目概述](#项目概述)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [开发指南](#开发指南)
- [部署](#部署)
- [重构说明](#重构说明)

---

## 项目概述

Test Web App 是一个综合性的 Web 测试平台，提供多种测试能力：

- 🚀 **性能测试**: 网站性能分析、压力测试、负载测试
- 🔒 **安全测试**: 安全漏洞扫描、渗透测试
- 📊 **SEO 分析**: SEO 评分、优化建议
- 🔌 **API 测试**: RESTful API 测试、接口监控
- 🌐 **兼容性测试**: 跨浏览器、跨设备兼容性检测
- ♿ **无障碍测试**: WCAG 合规性检查

---

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14.0
- Redis >= 6.0 (可选，用于缓存)

### 安装

```bash
# 克隆项目
git clone https://github.com/your-org/test-web-app.git
cd test-web-app

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库等信息

# 初始化数据库
npm run db:migrate
npm run db:seed
```

### 启动开发服务器

```bash
# 启动前端和后端
npm run dev

# 或分别启动
npm run frontend    # 前端: http://localhost:5174
npm run backend     # 后端: http://localhost:3001
```

### 构建生产版本

```bash
# 构建所有包
npm run build

# 启动生产服务器
npm start
```

---

## 项目结构

```
test-web-app/
├── frontend/                   # React 前端应用
│   ├── components/            # React 组件
│   ├── pages/                 # 页面组件
│   ├── services/              # API 服务
│   ├── hooks/                 # 自定义 Hooks
│   ├── contexts/              # React Context
│   └── utils/                 # 工具函数
│
├── backend/                    # Node.js 后端 API
│   ├── src/
│   │   ├── modules/           # 业务模块
│   │   │   ├── auth/         # 认证模块
│   │   │   ├── test/         # 测试模块
│   │   │   ├── admin/        # 管理模块
│   │   │   └── analytics/    # 分析模块
│   │   ├── core/              # 核心功能
│   │   │   ├── database/     # 数据库
│   │   │   ├── cache/        # 缓存
│   │   │   └── logger/       # 日志
│   │   └── shared/            # 共享工具
│   │       ├── middleware/   # 中间件
│   │       └── utils/        # 工具函数
│   └── package.json
│
├── shared/                     # 前后端共享代码
│   ├── types/                 # TypeScript 类型定义
│   ├── constants/             # 常量定义
│   └── utils/                 # 共享工具函数
│
├── docs/                       # 项目文档
│   ├── README.md              # 主文档
│   ├── ARCHITECTURE.md        # 架构设计
│   ├── API.md                 # API 文档
│   ├── DEVELOPMENT.md         # 开发指南
│   └── DEPLOYMENT.md          # 部署指南
│
├── scripts/                    # 构建和工具脚本
│   ├── build/                 # 构建脚本
│   ├── deploy/                # 部署脚本
│   └── cleanup/               # 清理脚本
│
├── tests/                      # 测试文件
│   ├── unit/                  # 单元测试
│   ├── integration/           # 集成测试
│   └── e2e/                   # E2E 测试
│
└── config/                     # 配置文件
    ├── eslint.config.js       # ESLint 配置
    ├── vite.config.ts         # Vite 配置
    └── tsconfig.json          # TypeScript 配置
```

---

## 核心功能

### 1. 性能测试

- **Lighthouse 集成**: 自动化性能评分
- **压力测试**: 模拟高并发访问
- **性能监控**: 实时性能指标追踪
- **报告生成**: 详细的性能分析报告

### 2. 安全测试

- **漏洞扫描**: OWASP Top 10 检测
- **SSL/TLS 检查**: 证书和加密强度验证
- **XSS/CSRF 防护**: 跨站脚本和请求伪造检测
- **安全头检查**: HTTP 安全头配置验证

### 3. SEO 分析

- **页面优化**: Meta 标签、标题、描述分析
- **结构化数据**: Schema.org 标记验证
- **移动友好性**: 移动设备适配检查
- **性能影响**: SEO 相关性能指标

### 4. API 测试

- **接口测试**: RESTful API 自动化测试
- **性能测试**: API 响应时间和吞吐量
- **契约测试**: API 规范验证
- **监控告警**: API 可用性监控

---

## 技术栈

### 前端

- **框架**: React 18
- **构建工具**: Vite 7
- **UI 库**: Ant Design 5
- **状态管理**: React Context + Hooks
- **路由**: React Router 6
- **图表**: Recharts, Chart.js
- **HTTP 客户端**: Axios
- **样式**: TailwindCSS 3

### 后端

- **运行时**: Node.js 18+
- **框架**: Express 4
- **数据库**: PostgreSQL 14
- **ORM**: Sequelize 6
- **缓存**: Redis 6
- **认证**: JWT
- **测试引擎**: Playwright, Lighthouse, Puppeteer
- **日志**: Winston

### 开发工具

- **语言**: TypeScript 5
- **代码规范**: ESLint, Prettier
- **测试**: Vitest, Playwright
- **CI/CD**: GitHub Actions
- **容器化**: Docker, Docker Compose

---

## 开发指南

### 代码规范

```bash
# Lint 检查
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

### 测试

```bash
# 单元测试
npm test

# 测试覆盖率
npm run test:coverage

# E2E 测试
npm run e2e

# E2E UI 模式
npm run e2e:ui
```

### 类型检查

```bash
# TypeScript 类型检查
npm run type-check
```

### 提交规范

使用 Conventional Commits 规范:

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链更新
```

---

## 部署

### Docker 部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 手动部署

```bash
# 构建
npm run build

# 启动生产服务器
NODE_ENV=production npm start
```

### 环境变量

关键环境变量配置:

```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/testdb

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# API
API_PORT=3001
FRONTEND_PORT=5174
```

详细配置参见 `.env.example`

---

## 重构说明

### ⚠️ 重要提示

本项目已进行全面重构，主要改进包括:

1. **消除重复**: 删除了所有 JS/TS 重复文件
2. **统一命名**: 采用一致的命名规范
3. **模块化**: 重组了 backend 结构，按业务模块组织
4. **类型安全**: 统一使用 TypeScript
5. **文档整理**: 精简并更新了文档

### 迁移指南

如果你是从旧版本迁移，请参考:

- 📖 [快速开始重构](QUICK_START_RESTRUCTURE.md) - 5 分钟快速清理
- 📖 [完整迁移指南](MIGRATION_GUIDE.md) - 详细迁移步骤
- 📖 [重构计划](RESTRUCTURE_PLAN.md) - 完整重构计划
- 📖 [问题分析](PROJECT_RESTRUCTURE_ANALYSIS.md) - 问题分析报告

### 快速清理

```bash
# 1. 备份
git checkout -b backup/$(Get-Date -Format 'yyyyMMdd')

# 2. 分析
.\scripts\cleanup\analyze-structure.ps1

# 3. 清理（预演）
.\scripts\cleanup\cleanup-duplicates.ps1 -DryRun

# 4. 执行清理
.\scripts\cleanup\cleanup-duplicates.ps1
.\scripts\cleanup\update-imports.ps1

# 5. 验证
npm run type-check
npm test
```

---

## 文档

- 📖 [架构设计](docs/ARCHITECTURE.md)
- 📖 [API 文档](docs/API.md)
- 📖 [开发指南](docs/DEVELOPMENT.md)
- 📖 [部署指南](docs/DEPLOYMENT.md)
- 📖 [测试指南](docs/TESTING.md)
- 📖 [故障排查](docs/TROUBLESHOOTING.md)

---

## 贡献

欢迎贡献! 请查看 [贡献指南](CONTRIBUTING.md)

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 联系方式

- **项目主页**: https://github.com/your-org/test-web-app
- **问题反馈**: https://github.com/your-org/test-web-app/issues
- **邮箱**: 1823170057@qq.com

---

## 致谢

感谢所有贡献者对本项目的支持!

---

**版本**: 2.0.0 (重构版)  
**最后更新**: 2026-01-13
