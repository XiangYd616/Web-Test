# 📁 Test-Web 项目结构

## 🎯 目录结构概览

```
Test-Web/
├── 📁 frontend/               # 前端应用 (React + TypeScript)
│   ├── 📁 components/         # React组件库
│   │   ├── 📁 ui/            # 基础UI组件
│   │   ├── 📁 business/      # 业务组件
│   │   ├── 📁 charts/        # 图表组件
│   │   ├── 📁 auth/          # 认证相关组件
│   │   ├── 📁 common/        # 通用组件
│   │   ├── 📁 modern/        # 现代UI组件
│   │   └── 📁 routing/       # 路由组件
│   ├── 📁 pages/             # 页面组件
│   ├── 📁 services/          # API服务
│   ├── 📁 hooks/             # 自定义React Hooks
│   ├── 📁 contexts/          # React Context
│   ├── 📁 utils/             # 工具函数
│   ├── 📁 types/             # TypeScript类型定义
│   ├── 📁 styles/            # 样式文件
│   ├── 📁 assets/            # 静态资源
│   └── 📁 __tests__/         # 前端测试文件
│
├── 📁 backend/                # 后端应用 (Node.js + Express)
│   ├── 📁 src/               # 源代码
│   │   └── app.js           # 应用入口
│   ├── 📁 routes/            # API路由
│   ├── 📁 services/          # 业务服务
│   │   └── 📁 __tests__/    # 服务单元测试
│   ├── 📁 middleware/        # 中间件
│   │   └── 📁 __tests__/    # 中间件测试
│   ├── 📁 config/            # 配置文件
│   ├── 📁 database/          # 数据库相关
│   ├── 📁 engines/           # 测试引擎
│   ├── 📁 utils/             # 工具函数
│   ├── 📁 scripts/           # 脚本文件
│   └── 📁 tests/             # 后端测试
│
├── 📁 shared/                 # 前后端共享代码
│   ├── 📁 types/             # 共享类型定义
│   └── 📁 constants/         # 共享常量
│
├── 📁 docs/                   # 文档目录
│   ├── 📁 reports/           # 项目报告
│   ├── 📁 api/               # API文档
│   ├── 📁 guides/            # 使用指南
│   └── 📁 archive/           # 归档文档
│
├── 📁 config/                 # 项目配置
│   ├── 📁 testing/           # 测试配置
│   ├── 📁 deploy/            # 部署配置
│   └── 📁 docker/            # Docker配置
│
├── 📁 scripts/                # 项目脚本
│   ├── 📁 build/             # 构建脚本
│   ├── 📁 deploy/            # 部署脚本
│   └── 📁 maintenance/       # 维护脚本
│
├── 📁 tests/                  # 集成测试
│   ├── 📁 e2e/               # 端到端测试
│   ├── 📁 integration/       # 集成测试
│   └── 📁 unit/              # 单元测试
│
├── 📁 tools/                  # 工具和实用程序
│   ├── 📁 electron/          # Electron相关
│   └── 📁 cli/               # CLI工具
│
├── 📁 public/                 # 公共静态文件
├── 📁 data/                   # 数据文件（不提交到Git）
├── 📁 logs/                   # 日志文件（不提交到Git）
├── 📁 backup/                 # 备份文件（不提交到Git）
└── 📁 node_modules/           # 依赖包（不提交到Git）
```

## 📋 主要配置文件

### 根目录配置文件
- `package.json` - 项目依赖和脚本
- `tsconfig.json` - TypeScript配置
- `vite.config.ts` - Vite构建配置
- `.env.example` - 环境变量示例
- `.gitignore` - Git忽略文件
- `.eslintrc.cjs` - ESLint配置
- `.prettierrc.cjs` - Prettier配置
- `tailwind.config.js` - Tailwind CSS配置
- `postcss.config.js` - PostCSS配置

### 重要文档
- `README.md` - 项目说明
- `LICENSE` - 许可证
- `CHANGELOG.md` - 更改日志
- `PROJECT_STRUCTURE.md` - 本文档

## 🎨 前端结构详解

### components/ 组件分类
- **ui/** - 基础UI组件（Button, Input, Modal等）
- **business/** - 业务逻辑组件（TestRunner, ResultViewer等）
- **charts/** - 数据可视化组件
- **auth/** - 认证相关（LoginForm, ProtectedRoute等）
- **common/** - 通用组件（ErrorBoundary, Loading等）
- **modern/** - 现代化UI组件
- **routing/** - 路由相关组件

### pages/ 页面分类
- 测试页面（*Test.tsx）
- 管理页面（Admin, Settings等）
- 用户页面（Profile, Login等）
- 数据页面（DataCenter, Reports等）

## 🔧 后端结构详解

### routes/ API路由
- `auth.js` - 认证相关
- `test.js` - 测试执行
- `data.js` - 数据管理
- `user.js` - 用户管理
- `admin.js` - 管理功能

### services/ 服务层
- `DataManagementService.js` - 数据管理服务
- `TestEngineService.js` - 测试引擎服务
- `UnifiedErrorHandler.js` - 错误处理服务
- `RealtimeService.js` - 实时通信服务

### engines/ 测试引擎
- 各种测试类型的执行引擎
- 性能监控和分析引擎

## 🚀 开发指南

### 添加新功能
1. 前端组件放在 `frontend/components/` 相应分类下
2. 新页面放在 `frontend/pages/`
3. API路由放在 `backend/routes/`
4. 业务逻辑放在 `backend/services/`
5. 文档更新到 `docs/`

### 命名规范
- **组件**: PascalCase (如 `UserProfile.tsx`)
- **页面**: PascalCase (如 `TestHistory.tsx`)
- **服务**: PascalCase (如 `DataService.js`)
- **工具函数**: camelCase (如 `formatDate.ts`)
- **常量**: UPPER_SNAKE_CASE (如 `MAX_RETRY_COUNT`)
- **CSS类**: kebab-case (如 `user-profile`)

## 📝 文档组织

### docs/reports/
- 项目分析报告
- 功能完整性报告
- 安全审计报告
- 性能优化报告

### docs/guides/
- 用户使用指南
- 开发者指南
- API使用文档
- 部署指南

## 🔒 不提交到Git的目录
- `node_modules/` - 依赖包
- `dist/` - 构建输出
- `logs/` - 日志文件
- `data/` - 数据库文件
- `.env` - 环境变量
- `backup/` - 备份文件
- `coverage/` - 测试覆盖率报告

## 🎯 最佳实践

1. **保持结构清晰** - 文件放在正确的目录
2. **避免深层嵌套** - 目录层级不超过4层
3. **模块化组织** - 相关文件放在一起
4. **文档同步** - 代码变更同步更新文档
5. **定期清理** - 删除未使用的文件和依赖

---

**最后更新**: 2025-01-19
**维护者**: Test-Web Team
