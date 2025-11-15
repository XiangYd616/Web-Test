# Test-Web 项目索引

> 最后更新: 2025-11-11  
> 版本: 1.2.0

## 📚 快速导航

### 🚀 快速开始
- [README.md](README.md) - 项目概览和快速开始
- [QUICK_START.md](QUICK_START.md) - 详细启动指南
- [VERSION_GUIDE.md](VERSION_GUIDE.md) - 版本管理指南

### 🏗️ 架构文档
- [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) - 架构指南
- [ARCHITECTURE_SUMMARY.md](ARCHITECTURE_SUMMARY.md) - 架构摘要
- [docs/architecture/DATABASE_SCHEMA.md](docs/architecture/DATABASE_SCHEMA.md) - 数据库设计
- [docs/architecture/FRONTEND_BACKEND_SEPARATION_IMPLEMENTATION.md](docs/architecture/FRONTEND_BACKEND_SEPARATION_IMPLEMENTATION.md) - 前后端分离实现

### 📖 API文档
- [docs/api/API_DOCUMENTATION.md](docs/api/API_DOCUMENTATION.md) - 完整API文档

### 📊 分析报告
- [docs/reports/BUSINESS_LOGIC_AUDIT_REPORT.md](docs/reports/BUSINESS_LOGIC_AUDIT_REPORT.md) - 业务逻辑审计报告
- [docs/CHANGELOG.md](docs/CHANGELOG.md) - 更新日志

### 🛠️ 开发指南
- 前端开发: [frontend/README.md](frontend/README.md)
- 后端开发: [backend/README.md](backend/README.md)
- 测试指南: [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)

---

## 📦 项目结构

### 核心目录

```
Test-Web/
├── 📱 frontend/              # 前端应用 (React + TypeScript)
│   ├── components/          # UI组件
│   ├── pages/              # 页面组件
│   ├── services/           # 服务层
│   ├── hooks/              # React Hooks
│   ├── utils/              # 工具函数
│   └── types/              # TypeScript类型定义
│
├── 🔧 backend/              # 后端服务 (Node.js + Express)
│   ├── routes/             # API路由
│   ├── services/           # 业务服务
│   ├── config/             # 配置文件
│   ├── utils/              # 工具函数
│   └── scripts/            # 维护脚本
│
├── 📜 scripts/              # 项目脚本
│   ├── core/               # 核心脚本
│   ├── deployment/         # 部署脚本
│   ├── maintenance/        # 维护脚本
│   └── utils/              # 工具脚本
│
├── 📚 docs/                 # 项目文档
│   ├── api/                # API文档
│   ├── architecture/       # 架构文档
│   ├── guides/             # 使用指南
│   └── reports/            # 分析报告
│
└── 🗃️ archive/             # 归档文档
```

---

## 🎯 核心功能模块

### 1. 测试引擎

#### 前端
- **压力测试**: `frontend/components/stress/` 
- **SEO测试**: `frontend/components/seo/`
- **安全测试**: `frontend/components/security/`
- **兼容性测试**: `frontend/components/compatibility/`
- **性能测试**: `frontend/components/performance/`
- **可访问性测试**: `frontend/components/accessibility/`

#### 后端
- **测试服务**: `backend/services/testing/TestBusinessService.js`
- **测试路由**: `backend/routes/test.js`
- **测试引擎**: `backend/engines/`

### 2. 用户认证

#### 前端
- **认证组件**: `frontend/components/auth/`
- **认证服务**: `frontend/services/auth/authService.ts`
- **权限管理**: `frontend/hooks/useAuth.ts`

#### 后端
- **认证路由**: `backend/routes/auth.js`
- **认证中间件**: `backend/middleware/auth.js`

### 3. 数据管理

#### 前端
- **数据服务**: `frontend/services/api/`
- **数据状态**: `frontend/hooks/useDataState.ts`

#### 后端
- **数据路由**: `backend/routes/data.js`
- **数据库配置**: `backend/config/database.js`

### 4. 系统管理

#### 前端
- **系统组件**: `frontend/components/system/`
- **监控面板**: `frontend/pages/dashboard/`

#### 后端
- **系统路由**: `backend/routes/system.js`
- **监控服务**: `backend/services/monitoring/`

---

## 🧪 测试

### 前端测试
- **单元测试**: `frontend/utils/__tests__/formValidation.test.ts`
- **组件测试**: `frontend/components/**/__tests__/`
- **测试配置**: `frontend/vitest.config.ts`

### 后端测试
- **单元测试**: `backend/services/testing/__tests__/TestBusinessService.test.js`
- **测试框架**: Jest

### 测试覆盖
- ✅ 格式验证: 100%
- ✅ 业务逻辑: 100%
- ✅ 核心服务: 100%
- 🔄 集成测试: 进行中

---

## 🔧 配置文件

### 根目录
- `package.json` - 项目依赖和脚本
- `tsconfig.json` - TypeScript配置
- `.gitignore` - Git忽略规则
- `.env.example` - 环境变量示例

### 前端
- `frontend/vite.config.ts` - Vite构建配置
- `frontend/tsconfig.json` - TypeScript配置
- `frontend/tailwind.config.js` - TailwindCSS配置
- `frontend/eslint.config.js` - ESLint配置

### 后端
- `backend/config/` - 后端配置目录
- `backend/.env` - 环境变量

---

## 📝 代码规范

### TypeScript
- 使用严格模式
- 完整的类型定义
- 统一的导入顺序

### JavaScript
- ES6+ 语法
- 模块化设计
- 统一的错误处理

### 样式
- TailwindCSS优先
- 响应式设计
- 深色模式支持

---

## 🚀 部署

### 开发环境
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

### 测试运行
```bash
npm test
```

---

## 📈 项目统计

### 代码量
- 前端TypeScript文件: 400+ 
- 后端JavaScript文件: 300+
- 测试文件: 2个测试套件 (150+用例)
- 文档文件: 100+

### 功能模块
- 测试引擎: 10+ 类型
- API端点: 50+
- UI组件: 200+
- 工具函数: 100+

---

## 🔗 外部资源

### 技术栈文档
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)

### 测试框架
- [Vitest](https://vitest.dev/)
- [Jest](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)

---

## 🤝 贡献指南

### 提交规范
- `feat:` 新功能
- `fix:` 错误修复
- `docs:` 文档更新
- `test:` 测试相关
- `chore:` 维护任务

### 分支策略
- `main` - 主分支
- `develop` - 开发分支
- `feature/*` - 功能分支
- `fix/*` - 修复分支

---

## 📞 支持

### 问题反馈
- GitHub Issues: [项目地址]
- 邮箱: 1823170057@qq.com

### 更新日志
- 查看 [CHANGELOG.md](docs/CHANGELOG.md) 了解最新变更

---

## 📄 许可证

MIT License - 详见 LICENSE 文件
