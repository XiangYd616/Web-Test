# 项目使用指南

## 🎯 项目概述

这是一个完整的Web测试平台，包含前端React应用和后端服务，提供压力测试、兼容性检测、内容安全扫描等功能。

## 🚀 快速开始

### 前端开发

```bash
# 进入前端目录
cd frontend

# 安装依赖（如果还没有安装）
npm install

# 启动开发服务器（推荐）
npm run dev-safe

# 或者使用标准模式
npm run dev
```

访问：http://localhost:3000

### 后端开发

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 📋 常用npm脚本

### 🚀 开发脚本
- `npm run dev` - 标准开发模式
- `npm run dev-safe` - 安全开发模式（忽略类型错误）⭐
- `npm start` - 启动开发服务器
- `npm run start-safe` - 安全启动模式

### 🏗️ 构建脚本
- `npm run build` - 标准构建
- `npm run build-safe` - 安全构建（忽略非关键错误）⭐
- `npm run preview` - 预览构建结果
- `npm run preview-safe` - 安全预览模式

### 🔍 代码质量
- `npm run type-check` - TypeScript类型检查
- `npm run type-ignore` - 智能类型检查（只显示严重错误）⭐
- `npm run lint` - ESLint代码检查
- `npm run lint:fix` - 自动修复代码问题
- `npm run format` - Prettier代码格式化
- `npm run format:check` - 检查代码格式

### 🧪 测试脚本
- `npm test` - 运行测试
- `npm run test:ui` - 测试UI界面
- `npm run test:run` - 运行所有测试
- `npm run test:coverage` - 测试覆盖率报告

### 🧹 清理和维护
- `npm run clean` - 清理构建文件
- `npm run clean:all` - 完全清理并重新安装
- `npm run cleanup` - 项目清理和整理⭐

### 📦 依赖管理
- `npm run deps:check` - 检查依赖更新
- `npm run deps:update` - 更新依赖
- `npm run deps:audit` - 安全审计
- `npm run deps:fix` - 修复安全问题

## 📁 项目结构

```
Test-Web/
├── frontend/                 # 前端React应用
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   │   ├── core/        # 核心功能页面
│   │   │   └── user/        # 用户相关页面
│   │   ├── components/      # 可复用组件
│   │   ├── styles/          # 样式文件
│   │   └── utils/           # 工具函数
│   ├── public/              # 静态资源
│   └── package.json         # 前端依赖配置
├── backend/                 # 后端服务
├── scripts/                 # 项目脚本
│   ├── core/               # 核心脚本
│   ├── deployment/         # 部署脚本
│   ├── development/        # 开发脚本
│   ├── maintenance/        # 维护脚本
│   ├── testing/            # 测试脚本
│   └── utils/              # 工具脚本
└── docs/                   # 项目文档
```

## 🛠️ 开发工作流

### 日常开发
1. `npm run dev-safe` - 启动开发服务器
2. 编写代码
3. `npm run lint:fix` - 修复代码问题
4. `npm run format` - 格式化代码
5. `npm run type-ignore` - 检查严重错误

### 代码提交前
1. `npm run lint` - 检查代码规范
2. `npm run type-check` - 完整类型检查
3. `npm test` - 运行测试
4. `npm run build-safe` - 验证构建

### 部署准备
1. `npm run clean` - 清理旧文件
2. `npm run build` - 生产构建
3. `npm run preview` - 预览构建结果

## 🎯 功能模块

### 主要页面
- **仪表板** (`/dashboard`) - 系统概览和统计
- **压力测试** (`/stress-test`) - 网站性能压力测试
- **兼容性测试** (`/compatibility-test`) - 浏览器兼容性检测
- **内容检测** (`/content-detection`) - 安全内容扫描
- **系统设置** (`/settings`) - 配置管理

### 核心功能
- 实时测试监控
- 多浏览器兼容性检测
- 内容安全扫描
- 性能分析报告
- 可视化数据展示

## 🔧 配置文件

### TypeScript配置
- `tsconfig.json` - 标准TypeScript配置
- `tsconfig.safe.json` - 宽松开发配置
- `tsconfig.dev.json` - 开发环境配置

### 构建配置
- `vite.config.ts` - 标准Vite配置
- `vite.config.safe.ts` - 安全构建配置

### 代码质量
- `.eslintrc.js` - ESLint配置
- `.prettierrc` - Prettier配置

## 🚨 故障排除

### 开发服务器无法启动
```bash
# 清理并重新安装
npm run clean:all
npm run dev-safe
```

### 类型错误过多
```bash
# 使用安全模式
npm run dev-safe
npm run type-ignore
```

### 构建失败
```bash
# 使用安全构建
npm run build-safe
```

### 依赖问题
```bash
# 检查和修复依赖
npm run deps:audit
npm run deps:fix
```

## 💡 最佳实践

### 开发建议
1. **优先使用安全模式**：`dev-safe`、`build-safe`、`type-ignore`
2. **定期清理项目**：`npm run cleanup`
3. **保持代码质量**：`npm run lint:fix` + `npm run format`
4. **渐进式修复**：专注功能开发，逐步修复类型错误

### 代码规范
1. 使用TypeScript进行类型安全
2. 遵循ESLint规则
3. 使用Prettier格式化代码
4. 编写单元测试

### 性能优化
1. 使用React.memo优化组件渲染
2. 合理使用useCallback和useMemo
3. 代码分割和懒加载
4. 优化打包体积

## 📞 获取帮助

### 常见问题
1. **ERR_CONNECTION_REFUSED**：确保使用正确的启动命令
2. **大量TypeScript错误**：使用安全模式脚本
3. **构建失败**：检查依赖和配置文件

### 推荐资源
- [React官方文档](https://react.dev/)
- [Vite官方文档](https://vitejs.dev/)
- [Ant Design组件库](https://ant.design/)
- [TypeScript手册](https://www.typescriptlang.org/docs/)

---

**记住**：这个项目已经配置了完善的开发环境，优先使用带`-safe`后缀的脚本可以让你专注于功能开发！🚀
