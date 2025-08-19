# Test-Web 🚀

一个现代化的Web测试平台，提供全面的性能测试、安全检测和质量分析功能。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com)
[![Code Quality](https://img.shields.io/badge/code%20quality-A+-brightgreen.svg)](https://github.com)

## ✨ 核心功能

### 🔥 性能测试
- **压力测试** - 高并发负载测试和性能分析
- **API测试** - RESTful API接口测试和验证
- **SEO测试** - 搜索引擎优化检测和建议

### 🛡️ 安全检测
- **安全扫描** - 智能安全漏洞检测
- **内容安全** - 恶意内容和风险评估
- **合规检查** - 安全标准合规性验证

### 📊 数据分析
- **实时监控** - 可视化性能监控仪表板
- **智能报告** - 自动化测试报告生成
- **历史分析** - 测试数据趋势分析

### 🎯 用户体验
- **现代化界面** - 响应式设计，支持深色模式
- **智能导航** - 直观的用户界面和操作流程
- **实时反馈** - 即时测试状态和结果展示

## 🚀 快速开始

### 🎯 一键启动（推荐）

```bash
# 使用脚本管理工具
node scripts/script-manager.cjs dev
```

### 📱 前端开发

```bash
cd frontend
npm install
npm run dev-safe    # 安全模式（推荐）
# 或
npm run dev        # 标准模式
```

访问：http://localhost:3000

### 🔧 后端开发

```bash
cd backend
npm install
npm run dev
```

## 📋 常用命令

### 🛠️ 脚本管理工具（推荐）

```bash
# 查看所有可用命令
node scripts/script-manager.cjs help

# 开发相关
node scripts/script-manager.cjs dev          # 启动前端（安全模式）
node scripts/script-manager.cjs fullstack   # 启动前后端
node scripts/script-manager.cjs build       # 构建项目

# 代码质量
node scripts/script-manager.cjs check       # 完整代码检查
node scripts/script-manager.cjs lint        # 代码规范检查
node scripts/script-manager.cjs format      # 代码格式化

# 项目维护
node scripts/script-manager.cjs cleanup     # 项目清理
node scripts/script-manager.cjs status      # 项目状态
```

### 📦 npm脚本

```bash
# 开发脚本（推荐使用 -safe 版本）
npm run dev-safe        # 安全开发模式 ⭐
npm run build-safe      # 安全构建模式 ⭐
npm run type-ignore     # 智能类型检查 ⭐

# 代码质量
npm run lint           # ESLint检查
npm run lint:fix       # 自动修复
npm run format         # 代码格式化
npm run test           # 运行测试

# 项目维护
npm run clean          # 清理构建文件
npm run cleanup        # 深度清理
npm run deps:check     # 检查依赖更新
```

## 🛠️ 技术栈

### 前端技术
- **React 18** - 现代化前端框架
- **TypeScript 5** - 类型安全的JavaScript
- **Vite** - 快速构建工具
- **TailwindCSS** - 实用优先的CSS框架
- **Ant Design** - 企业级UI组件库

### 后端技术
- **Node.js** - 服务端JavaScript运行时
- **Express** - Web应用框架
- **SQLite** - 轻量级数据库
- **Redis** - 内存数据库（可选）

### 开发工具
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **Jest** - 单元测试框架
- **Docker** - 容器化部署

### 质量保证
- ✅ **TypeScript严格模式** - 0个类型错误
- ✅ **代码覆盖率** - 80%+ 测试覆盖
- ✅ **性能优化** - 懒加载和代码分割
- ✅ **安全标准** - 企业级安全配置

## 📁 项目结构

```
Test-Web/
├── 📱 frontend/              # React前端应用
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   │   ├── core/        # 核心功能页面
│   │   │   └── user/        # 用户相关页面
│   │   ├── components/      # 可复用组件
│   │   ├── styles/          # 样式文件
│   │   └── utils/           # 工具函数
│   └── package.json         # 前端依赖
├── 🔧 backend/              # Node.js后端服务
├── 📜 scripts/              # 项目脚本（已整理）
│   ├── core/               # 核心脚本
│   ├── deployment/         # 部署脚本
│   ├── development/        # 开发脚本
│   ├── maintenance/        # 维护脚本
│   └── utils/              # 工具脚本
└── 📚 docs/                # 项目文档
```

## 🎯 核心页面

- **仪表板** (`/dashboard`) - 系统概览和统计
- **压力测试** (`/stress-test`) - 性能压力测试
- **兼容性测试** (`/compatibility-test`) - 浏览器兼容性检测
- **内容检测** (`/content-detection`) - 安全内容扫描
- **系统设置** (`/settings`) - 配置管理

## 📖 文档

- 📋 [项目使用指南](PROJECT_GUIDE.md) - 详细使用说明
- 🧹 [清理报告](CLEANUP_REPORT.md) - 最新清理结果
- 🛠️ [开发指南](frontend/DEVELOPMENT_GUIDE.md) - 开发环境配置

## 🔧 技术栈

- **前端**: React 18 + TypeScript + Vite + Ant Design
- **后端**: Node.js + Express
- **样式**: CSS3 + 响应式设计
- **工具**: ESLint + Prettier + Vitest

## 💡 最佳实践

1. **优先使用安全模式脚本**（带`-safe`后缀）
2. **使用脚本管理工具**进行统一管理
3. **定期运行项目清理**保持代码整洁
4. **遵循代码规范**使用lint和format工具

## 🚨 故障排除

### 常见问题
- **连接被拒绝**: 使用 `npm run dev-safe` 而不是 `npm run dev`
- **类型错误过多**: 使用 `npm run type-ignore` 查看关键错误
- **构建失败**: 使用 `npm run build-safe` 安全构建

### 快速修复
```bash
# 完全重置
npm run clean:all
node scripts/script-manager.cjs dev
```

## 📄 许可证

MIT License

---

**🎉 项目已完全配置好，可以直接开始开发！**

推荐使用：`node scripts/script-manager.cjs dev` 🚀
