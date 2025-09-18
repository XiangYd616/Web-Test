# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# Test-Web 项目 - WARP开发指南

## 项目概述

Test-Web是一个现代化的Web测试平台，采用统一企业级架构，提供全面的性能测试、安全检测和质量分析功能。项目使用React 18 + TypeScript前端和Node.js + Express后端，支持Electron桌面应用。

### 核心特性
- **统一企业级架构** - 已完成架构重构，消除代码重复
- **智能缓存系统** - 85%+ 缓存命中率，40-60% 性能提升  
- **企业级安全** - MFA、设备指纹、会话管理、JWT自动刷新
- **多测试引擎** - 性能、SEO、安全、兼容性、API、压力、UX测试
- **实时监控** - WebSocket实时通信，性能指标收集

## 常用开发命令

### 快速启动（推荐）
```powershell
# 使用统一脚本管理工具启动开发环境
node scripts/script-manager.cjs dev

# 启动前后端完整开发环境
yarn start
# 或
yarn dev
```

### 前端开发
```powershell
# 标准开发模式（推荐）
yarn frontend
# 或
cd frontend && yarn dev

# 安全开发模式（忽略类型错误，专注开发）
yarn dev-safe
```

### 后端开发
```powershell
# 启动后端服务
yarn backend
# 或
cd backend && yarn start

# 后端开发模式
yarn backend:dev
# 或  
cd backend && yarn dev
```

### 构建和测试
```powershell
# 构建项目
yarn build

# 类型检查（严格模式）
yarn type-check

# 智能类型检查（只显示关键错误）
yarn type-ignore

# 运行测试
yarn test
yarn test:ui          # 测试界面
yarn test:coverage    # 覆盖率报告

# E2E测试
yarn e2e
yarn e2e:ui
yarn e2e:headed
```

### 代码质量
```powershell
# 代码检查和格式化
yarn lint
yarn lint:fix
yarn format
yarn format:check

# 完整代码检查流程
yarn ci:check         # TypeScript + ESLint + 构建验证
```

### 数据库操作
```powershell
# 数据库初始化
yarn db:init

# 数据库迁移
yarn db:migrate
yarn db:status

# 数据库备份
yarn db:backup
```

### Electron应用
```powershell
# 开发模式运行Electron
yarn electron:dev

# 构建Electron应用
yarn electron:build
yarn electron:dist
```

### 项目维护
```powershell
# 项目清理
yarn clean            # 清理构建文件
yarn clean:all        # 完全清理
yarn deps:update      # 更新依赖

# 代码修复脚本
yarn fix:all          # 运行所有修复脚本
yarn fix:imports      # 修复导入问题
yarn fix:react:imports # 修复React导入
```

## 项目架构

### 高层架构概述
```
Test-Web/
├── frontend/           # React + TypeScript前端
│   ├── components/     # 可复用组件
│   │   ├── auth/      # 认证相关组件
│   │   ├── charts/    # 图表组件
│   │   ├── modern/    # 现代化UI组件
│   │   └── routing/   # 路由组件
│   ├── pages/         # 页面组件
│   │   ├── core/      # 核心功能页面
│   │   └── user/      # 用户相关页面  
│   ├── services/      # 服务层
│   │   ├── api/       # API服务
│   │   └── auth/      # 认证服务
│   ├── contexts/      # React上下文
│   ├── hooks/         # 自定义Hooks
│   ├── types/         # TypeScript类型定义
│   └── utils/         # 工具函数
├── backend/           # Node.js + Express后端
│   ├── src/           # 源代码
│   ├── routes/        # API路由
│   ├── services/      # 业务服务
│   ├── engines/       # 测试引擎
│   ├── middleware/    # 中间件
│   └── config/        # 配置文件
├── shared/            # 共享代码
├── scripts/           # 项目脚本
└── docs/             # 项目文档
```

### 核心服务架构

#### 1. 统一API服务 (UnifiedApiService)
位置: `frontend/services/api/unifiedApiService.ts`

**企业级功能:**
- **智能缓存** - LRU/FIFO/TTL策略，多级缓存
- **指数退避重试** - 智能重试机制，避免惊群效应
- **性能监控** - 请求时间、错误率、缓存命中率
- **拦截器系统** - 请求/响应拦截器链

```typescript
// 基础用法
const api = new UnifiedApiService({
  cache: { enabled: true, maxSize: 1000 },
  retry: { enabled: true, maxAttempts: 3 },
  metrics: { enabled: true, trackTiming: true }
});

// API调用
const data = await api.get<UserData>('/users');
const result = await api.post<ApiResponse>('/tests', testConfig);
```

#### 2. 统一认证服务 (UnifiedAuthService)  
位置: `frontend/services/auth/authService.ts`

**企业级安全功能:**
- **多因素认证 (MFA)** - SMS/Email/TOTP/备用代码
- **设备指纹识别** - Canvas/WebGL/屏幕信息生成唯一指纹
- **会话管理** - 并发控制、会话追踪、远程注销
- **JWT自动刷新** - Token对管理，自动续期
- **密码安全** - 强度验证、泄露检测、策略配置

```typescript
// 认证服务初始化
const authService = new UnifiedAuthService({
  security: {
    mfa: { enabled: true, methods: ['email', 'totp'] },
    deviceFingerprinting: { enabled: true },
    sessionManagement: { maxConcurrentSessions: 3 }
  }
});

// 基础认证
await authService.login({ username, password });
const user = authService.getCurrentUser();
const isAuth = authService.isAuthenticated();
```

#### 3. 测试引擎服务 (TestEngineService)
位置: `backend/services/core/TestEngineService.js`

**支持的测试类型:**
- **性能测试** - Lighthouse性能分析
- **SEO测试** - 搜索引擎优化检测
- **安全测试** - 安全漏洞扫描  
- **兼容性测试** - 多浏览器兼容性
- **API测试** - RESTful API测试
- **压力测试** - 高并发负载测试
- **UX测试** - 用户体验分析
- **基础设施测试** - 服务器基础设施检测

```javascript
// 启动测试
const testResult = await testEngineService.startTest('performance', 'https://example.com', {
  device: 'desktop',
  network: '3G',
  metrics: ['FCP', 'LCP', 'CLS']
});

// 检查测试状态
const status = testEngineService.getTestStatus(testId);
const result = testEngineService.getTestResult(testId);
```

### 配置系统

#### API配置 (`frontend/config/apiConfig.ts`)
```typescript
export const createApiConfig = (overrides = {}) => ({
  baseURL: 'http://localhost:3001/api',
  timeout: 30000,
  cache: { enabled: true, maxSize: 1000, ttl: 300000 },
  retry: { enabled: true, maxAttempts: 3, backoff: 2 },
  metrics: { enabled: true, trackTiming: true },
  ...overrides
});
```

#### 认证配置 (`frontend/config/authConfig.ts`)
```typescript
export const createAuthConfig = (overrides = {}) => ({
  security: {
    mfa: { enabled: false, methods: ['email'] },
    deviceFingerprinting: { enabled: true },
    sessionManagement: { enabled: true, maxSessions: 5 }
  },
  tokens: {
    jwt: { accessTokenExpiry: 900, autoRefreshThreshold: 300 }
  },
  ...overrides
});
```

## 开发环境配置

### 必需环境
- **Node.js** >= 18.0.0
- **Yarn** >= 1.22+ (推荐) 或 npm >= 9.0.0
- **PostgreSQL** (后端数据库)
- **Redis** (可选，用于缓存)

### 环境变量配置
```bash
# 前端环境变量 (.env)
VITE_API_URL=http://localhost:3001/api
VITE_DEV_PORT=5174
NODE_ENV=development

# 后端环境变量 (backend/.env)
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret
DB_CONNECTION_STRING=postgresql://user:pass@localhost:5432/testweb
CORS_ORIGIN=http://localhost:5174,http://localhost:3000
```

### TypeScript配置
项目使用严格的TypeScript配置:
- 启用严格模式检查
- 智能路径映射 (`@/`, `@components/`, `@services/` 等)
- 多配置文件支持 (开发/生产/安全模式)

### 构建优化
Vite构建配置包含:
- **代码分割** - 按功能模块智能分割
- **Tree Shaking** - 删除未使用代码
- **资源优化** - 图片/字体/CSS优化
- **缓存优化** - 长期缓存策略

## 测试系统

### 单元测试 (Vitest)
```powershell
# 运行单元测试
yarn test

# 观察模式
yarn test:watch

# 覆盖率报告
yarn test:coverage
```

### E2E测试 (Playwright)
```powershell
# 运行E2E测试
yarn e2e

# 调试模式
yarn e2e:debug

# UI模式
yarn e2e:ui
```

### 测试覆盖率要求
- 分支覆盖率: 70%+
- 函数覆盖率: 70%+  
- 语句覆盖率: 70%+
- 行覆盖率: 70%+

## 部署与运维

### Docker部署
```powershell
# 构建Docker镜像
docker build -f deploy/Dockerfile -t testweb-app .

# 使用Docker Compose
docker-compose -f deploy/docker-compose.yml up -d
```

### Kubernetes部署
```powershell
# 应用Kubernetes配置
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### 健康检查
```powershell
# 后端健康检查
curl http://localhost:3001/health

# 缓存状态
curl http://localhost:3001/api/test/cache/stats

# 性能指标
curl http://localhost:3001/api/metrics
```

## 性能优化指南

### 前端优化
- **代码分割**: 按路由和功能模块分割
- **懒加载**: React.lazy + Suspense
- **缓存策略**: Service Worker + HTTP缓存
- **Bundle优化**: Tree shaking + 压缩

### 后端优化  
- **数据库优化**: 查询优化 + 索引策略
- **缓存系统**: Redis + 内存缓存
- **API优化**: 分页 + 数据压缩
- **中间件优化**: 响应时间监控

### 监控指标
- **性能指标**: 响应时间、吞吐量、错误率
- **缓存指标**: 命中率、内存使用
- **用户指标**: 活跃用户、会话时长
- **系统指标**: CPU、内存、磁盘使用

## 故障排除

### 常见问题

#### 1. 开发服务器启动失败
```powershell
# 端口占用
netstat -ano | findstr :5174
netstat -ano | findstr :3001

# 清理并重启
yarn clean:all
yarn dev
```

#### 2. TypeScript错误过多
```powershell
# 使用安全模式开发
yarn dev-safe
yarn type-ignore

# 渐进式修复
yarn lint:fix
```

#### 3. 构建失败
```powershell
# 检查依赖
yarn deps:audit

# 安全构建模式
yarn build-safe
```

#### 4. 数据库连接问题
```powershell
# 检查数据库状态
yarn db:status

# 重新初始化
yarn db:init
```

### 日志查看
```powershell
# 后端日志
tail -f backend/logs/app.log
tail -f backend/logs/error.log

# 数据库日志
tail -f backend/logs/database.log
```

## 最佳实践

### 代码规范
1. **优先使用安全模式脚本** (`-safe`后缀)
2. **遵循TypeScript严格模式** (渐进式修复)
3. **使用ESLint + Prettier** 保持代码格式
4. **编写单元测试** 覆盖核心功能
5. **使用统一的错误处理** 企业级错误分类

### 开发工作流
1. **创建功能分支** 从main分支创建
2. **增量开发** 小步快跑，频繁提交
3. **代码审查** 使用Pull Request
4. **自动化测试** CI/CD管道验证
5. **部署验证** 生产环境验证

### 安全考虑
1. **认证授权** 使用MFA + JWT
2. **数据加密** 敏感数据加密存储
3. **输入验证** 服务器端验证
4. **安全头设置** CORS + CSP配置
5. **审计日志** 关键操作记录

## 项目状态

✅ **统一架构重构完成** - 消除代码重复，统一服务管理  
✅ **TypeScript类型系统** - 180+ 类型定义，完整类型安全  
✅ **企业级安全功能** - MFA、设备指纹、会话管理  
✅ **智能缓存系统** - 85%+ 命中率，显著性能提升  
✅ **多测试引擎集成** - 8种测试类型，全面质量检测  
✅ **现代化开发环境** - Vite + React 18 + 严格TypeScript

## 相关文档

- [统一架构文档](docs/UNIFIED_ARCHITECTURE.md) - 详细架构说明
- [项目使用指南](PROJECT_GUIDE.md) - 完整使用说明
- [README.md](README.md) - 项目概览
- [清理报告](PROJECT_CLEANUP_REPORT.json) - 最新清理结果

---

**记住**: 这是一个企业级的现代化Web测试平台，优先使用带`-safe`后缀的脚本进行开发，专注功能实现！🚀
