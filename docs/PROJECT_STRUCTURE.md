# 📁 Test Web App - 项目结构说明

## 🎯 项目概述

Test Web App 是一个现代化的全栈网站测试平台，采用 React + TypeScript + Node.js 技术栈，提供完整的网站测试解决方案。

## 📂 项目结构

```
Test-Web/
├── 📁 src/                          # 前端源代码
│   ├── 📁 components/               # React组件
│   │   ├── 📁 ui/                   # 基础UI组件
│   │   ├── 📁 shared/               # 共享组件
│   │   ├── 📁 modern/               # 现代化UI组件
│   │   ├── 📁 testing/              # 测试相关组件
│   │   ├── 📁 auth/                 # 认证组件
│   │   ├── 📁 admin/                # 管理组件
│   │   └── 📁 routing/              # 路由组件
│   ├── 📁 pages/                    # 页面组件
│   │   ├── 📁 admin/                # 管理页面
│   │   ├── 📁 dashboard/            # 仪表板页面
│   │   ├── 📁 integration/          # 集成页面
│   │   ├── 📁 user/                 # 用户页面
│   │   ├── 📁 misc/                 # 其他页面
│   │   └── 📁 scheduling/           # 调度页面
│   ├── 📁 services/                 # API服务层
│   │   ├── 📁 analytics/            # 分析服务
│   │   ├── 📁 auth/                 # 认证服务
│   │   ├── 📁 performance/          # 性能测试服务
│   │   ├── 📁 testing/              # 测试引擎服务
│   │   ├── 📁 user/                 # 用户服务
│   │   ├── 📁 monitoring/           # 监控服务
│   │   ├── 📁 reporting/            # 报告服务
│   │   └── 📁 integration/          # 集成服务
│   ├── 📁 hooks/                    # React Hooks
│   ├── 📁 contexts/                 # React Context
│   ├── 📁 types/                    # TypeScript类型定义
│   ├── 📁 utils/                    # 工具函数
│   └── 📁 styles/                   # 样式文件
├── 📁 server/                       # 后端源代码
│   ├── 📁 routes/                   # API路由
│   ├── 📁 middleware/               # 中间件
│   ├── 📁 services/                 # 业务逻辑服务
│   ├── 📁 config/                   # 配置文件
│   ├── 📁 logs/                     # 日志文件
│   └── app.js                       # Express应用入口
├── 📁 docs/                         # 文档系统
│   ├── 📁 reports/                  # 开发报告
│   ├── API.md                       # API接口文档
│   ├── DEPLOYMENT.md                # 部署指南
│   └── 团队编码规范.md              # 编码规范
├── 📁 scripts/                      # 工具脚本
│   ├── cleanup-deprecated-files.js  # 清理废弃文件
│   ├── code-quality-optimizer.js    # 代码质量优化
│   └── dependency-analyzer.js       # 依赖关系分析
├── 📁 electron/                     # Electron桌面应用
└── 📁 public/                       # 静态资源
```

## 🏗️ 架构设计

### 前端架构 (React + TypeScript)

#### 📱 组件层次结构
- **UI组件** (`src/components/ui/`): 基础可复用组件
- **业务组件** (`src/components/`): 功能特定组件
- **页面组件** (`src/pages/`): 完整页面实现
- **布局组件** (`src/components/shared/`): 布局和导航

#### 🔧 服务层架构
- **API服务** (`src/services/`): 与后端通信
- **测试引擎** (`src/services/testing/`): 测试逻辑实现
- **数据管理** (`src/services/analytics/`): 数据分析处理
- **用户管理** (`src/services/auth/`): 认证和授权

#### 🎯 状态管理
- **React Context**: 全局状态管理
- **Custom Hooks**: 业务逻辑封装
- **Local State**: 组件内部状态

### 后端架构 (Node.js + Express)

#### 🛣️ 路由结构
- **RESTful API**: 标准REST接口设计
- **中间件链**: 认证、日志、错误处理
- **路由分组**: 按功能模块组织

#### 🗄️ 数据层
- **PostgreSQL**: 主数据库
- **连接池**: 数据库连接管理
- **事务处理**: 数据一致性保证

## 📋 文件命名规范

### React组件文件
- **格式**: PascalCase
- **扩展名**: `.tsx` (TypeScript) 或 `.jsx` (JavaScript)
- **示例**: `UserProfile.tsx`, `ModernDashboard.tsx`

### 服务文件
- **格式**: camelCase + Service后缀
- **扩展名**: `.ts`
- **示例**: `authService.ts`, `analyticsService.ts`

### 工具函数文件
- **格式**: camelCase
- **扩展名**: `.ts`
- **示例**: `urlValidator.ts`, `dateFormatter.ts`

### 样式文件
- **格式**: kebab-case
- **扩展名**: `.css`
- **示例**: `user-profile.css`, `modern-dashboard.css`

### 常量文件
- **格式**: UPPER_SNAKE_CASE
- **扩展名**: `.ts`
- **示例**: `API_CONSTANTS.ts`, `TEST_CONFIG.ts`

## 🔧 开发工具配置

### TypeScript配置
- **严格模式**: 启用类型安全检查
- **路径映射**: 支持 `@/` 别名导入
- **模块解析**: 支持现代ES模块

### ESLint配置
- **代码规范**: 统一代码风格
- **React规则**: React最佳实践
- **TypeScript规则**: 类型安全检查

### 构建工具
- **Vite**: 快速开发和构建
- **热重载**: 开发时实时更新
- **代码分割**: 优化加载性能

## 📊 测试架构

### 测试类型
- **单元测试**: 组件和函数测试
- **集成测试**: API和服务测试
- **端到端测试**: 完整流程测试

### 测试工具
- **Vitest**: 单元测试框架
- **Playwright**: 端到端测试
- **React Testing Library**: 组件测试

## 🚀 部署架构

### 开发环境
- **数据库**: `testweb_dev`
- **端口**: 前端5174, 后端3001
- **热重载**: 支持实时开发

### 生产环境
- **数据库**: `testweb_prod`
- **优化**: 代码压缩和优化
- **监控**: 性能和错误监控

## 📈 性能优化

### 前端优化
- **代码分割**: 按路由分割代码
- **懒加载**: 组件按需加载
- **缓存策略**: 静态资源缓存

### 后端优化
- **连接池**: 数据库连接复用
- **缓存层**: Redis缓存热点数据
- **负载均衡**: 多实例部署

---

*本文档会随着项目发展持续更新，确保结构说明的准确性和完整性。*
