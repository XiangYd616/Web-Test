# Git Worktree 多分支并行开发配置总结

## 📊 完整的 Worktree 配置

本项目使用 Git Worktree 功能实现 5 个分支的并行开发，每个 worktree 有明确的职责分工。

### 🌳 Worktree 结构

```
D:\myproject\
├── Test-Web\              [类型系统统一] - 技术债清理
├── Test-Web-frontend\     [前端开发] - UI 和功能实现
├── Test-Web-backend\      [后端 API] - API 端点和业务逻辑
├── Test-Web-electron\     [桌面应用] - Electron 集成
└── Test-Web-testing\      [测试] - E2E 和集成测试
```

## 1️⃣ Test-Web (主目录) - 类型系统统一

### 分支
`feature/type-system-unification`

### 职责
**专注于 TypeScript 类型系统的统一和修复**

这是一个**技术债务清理专用分支**，不用于日常功能开发。

### 主要工作
- ✅ 修复 TS2322 类型不匹配错误
- ✅ 统一 `frontend/types/` 和 `shared/types/` 的类型定义
- ✅ 移除 `any` 类型，提高类型安全
- ✅ 创建可复用的类型工具函数

### 工作文件
- `frontend/types/` - 前端类型定义
- `shared/types/` - 共享类型定义
- `frontend/contexts/AppContext.tsx` - 应用上下文
- `frontend/services/api/*` - API 服务类型

### 何时使用
- 修复编译时的类型错误
- 重构类型定义结构
- 统一跨模块的类型
- 进行大规模的类型清理

### 常用命令
```bash
cd D:\myproject\Test-Web

# 检查类型错误
npm run type-check
tsc --noEmit

# 查看类型错误数量
tsc --noEmit | grep "error TS"

# 提交类型修复
git commit -m "fix(types): 修复 XX 模块的类型错误"
```

### 当前进度
- ✅ 已修复 78 个 TS2322 错误
- 🔄 继续清理剩余类型错误
- 📈 目标：实现 100% 类型安全

### 上下文文档
`WORKTREE_CONTEXT.md`

---

## 2️⃣ Test-Web-frontend - 前端功能开发

### 分支
`feature/frontend-dev`

### 职责
**日常的前端功能开发和 UI 实现**

这是**主要的前端开发分支**，用于所有用户界面相关的工作。

### 主要工作
- 🎨 创建和开发 React 组件
- 🖼️ 实现 UI 设计和交互
- 📱 响应式设计和移动端优化
- ⚡ 前端性能优化
- ♿ 可访问性改进
- 🎭 动画和过渡效果

### 工作文件
- `frontend/components/` - React 组件
- `frontend/pages/` - 页面组件
- `frontend/hooks/` - 自定义 Hooks
- `frontend/styles/` - 样式文件
- `frontend/contexts/` - React Context

### 何时使用
- 开发新的前端功能
- 实现 UI 设计稿
- 创建可复用组件
- 优化用户体验
- 处理用户交互逻辑

### 常用命令
```bash
cd D:\myproject\Test-Web-frontend

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check
```

### 技术栈
- React 18 + TypeScript
- Tailwind CSS
- Vite
- React Context API

### 上下文文档
`AI_ASSISTANT_CONTEXT.md`

---

## 3️⃣ Test-Web-backend - 后端 API 开发

### 分支
`feature/backend-api-dev`

### 职责
**后端 API 开发和业务逻辑实现**

### 主要工作
- 🔌 RESTful API 端点开发
- 💼 业务逻辑实现
- 🔄 API 客户端服务（`frontend/services/api/`）
- 🗄️ 数据处理和验证
- 🔐 API 安全和认证

### 工作文件
- `backend/` - 后端服务代码（如果存在）
- `frontend/services/api/` - API 客户端
- `frontend/components/business/` - 业务组件
- `shared/types/api.types.ts` - API 类型定义

### 何时使用
- 创建新的 API 端点
- 开发业务逻辑
- 优化 API 性能
- 实现 API 客户端
- 处理数据集成

### 常用命令
```bash
cd D:\myproject\Test-Web-backend

# 启动后端服务
npm run dev

# API 测试
npm run test:api
```

### 上下文文档
`AI_ASSISTANT_CONTEXT.md`

---

## 4️⃣ Test-Web-electron - Electron 桌面应用

### 分支
`feature/electron-integration`

### 职责
**Electron 桌面应用集成和原生功能**

### 主要工作
- 🖥️ Electron 主进程开发
- 🔗 IPC 通信实现
- 🪟 窗口管理和生命周期
- 🔔 系统托盘和原生通知
- 📦 应用打包和分发

### 工作文件
- `tools/electron/main.js` - 主进程入口
- `tools/electron/` - Electron 代码
- `package.json` - Electron 配置

### 何时使用
- 开发桌面应用功能
- 实现原生操作系统集成
- 处理主进程和渲染进程通信
- 配置应用打包

### 常用命令
```bash
cd D:\myproject\Test-Web-electron

# 启动 Electron 开发模式
npm run electron:dev

# 打包应用
npm run electron:build
```

### 上下文文档
`AI_ASSISTANT_CONTEXT.md`

---

## 5️⃣ Test-Web-testing - 集成和 E2E 测试

### 分支
`test/integration-testing`

### 职责
**测试开发和质量保证**

### 主要工作
- 🧪 E2E 测试用例编写（Playwright）
- 🔗 集成测试开发
- 🧰 测试工具和基础设施
- 📊 测试覆盖率提升
- 🤖 CI/CD 测试集成

### 工作文件
- `e2e/` - E2E 测试
- `tests/system/` - 系统测试
- `tools/e2e/` - 测试工具
- `playwright.config.ts` - Playwright 配置
- `vitest.config.ts` - Vitest 配置

### 何时使用
- 编写 E2E 测试用例
- 创建集成测试
- 改进测试基础设施
- 调试失败的测试
- 提高测试覆盖率

### 常用命令
```bash
cd D:\myproject\Test-Web-testing

# 运行所有测试
npm test

# E2E 测试
npm run test:e2e
npx playwright test

# 单元测试
npm run test:unit
npx vitest
```

### 上下文文档
`AI_ASSISTANT_CONTEXT.md`

---

## 🎯 Worktree 分工原则

### 明确的职责边界

```
┌─────────────────────────────────────────────────┐
│           项目功能分工示意图                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  类型系统 (Test-Web)                             │
│  ├─ 修复类型错误                                 │
│  ├─ 统一类型定义                                 │
│  └─ 提供类型给其他 worktree                      │
│                                                  │
│  前端开发 (Test-Web-frontend)                    │
│  ├─ UI 组件开发                                  │
│  ├─ 用户交互实现                                 │
│  ├─ 使用 API 服务（不修改）                       │
│  └─ 使用类型定义（不修改架构）                    │
│                                                  │
│  后端开发 (Test-Web-backend)                     │
│  ├─ API 端点开发                                 │
│  ├─ API 客户端服务                               │
│  ├─ 业务逻辑实现                                 │
│  └─ 定义 API 类型                                │
│                                                  │
│  Electron (Test-Web-electron)                   │
│  ├─ 桌面应用功能                                 │
│  ├─ 主进程开发                                   │
│  └─ 原生系统集成                                 │
│                                                  │
│  测试 (Test-Web-testing)                         │
│  ├─ E2E 测试                                     │
│  ├─ 集成测试                                     │
│  └─ 测试基础设施                                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 跨 Worktree 协作规则

1. **类型定义**：由 Test-Web 统一管理
2. **API 接口**：由 Test-Web-backend 定义和实现
3. **UI 组件**：由 Test-Web-frontend 开发
4. **测试用例**：由 Test-Web-testing 编写

---

## 🚀 使用 Warp 多窗口开发

### 推荐的窗口布局

```
┌────────────────┬────────────────┐
│  Window 1      │  Window 2      │
│  类型修复       │  前端开发       │
│  Test-Web      │  Test-Web-     │
│                │  frontend      │
├────────────────┼────────────────┤
│  Window 3      │  Window 4      │
│  后端 API      │  测试开发       │
│  Test-Web-     │  Test-Web-     │
│  backend       │  testing       │
└────────────────┴────────────────┘

Window 5 (按需): Test-Web-electron
```

### 在每个窗口中

1. 切换到对应目录
2. 让 AI 读取上下文：`Read AI_ASSISTANT_CONTEXT.md`
3. AI 会用中文回复并专注于该 worktree 的职责

---

## 📝 快速参考

### 查看所有 Worktree
```bash
git worktree list
```

### 切换目录
```bash
# 类型系统
cd D:\myproject\Test-Web

# 前端开发
cd D:\myproject\Test-Web-frontend

# 后端 API
cd D:\myproject\Test-Web-backend

# Electron
cd D:\myproject\Test-Web-electron

# 测试
cd D:\myproject\Test-Web-testing
```

### 同步所有分支
```bash
# 在任意 worktree 中执行
git fetch --all

# 然后在每个 worktree 中
git pull
```

### 查看状态
```bash
# 当前分支
git branch --show-current

# 提交历史
git log --oneline -5

# 工作区状态
git status
```

---

## 💡 最佳实践

### ✅ 应该做的

1. **保持专注**：在每个 worktree 只做该职责范围内的工作
2. **频繁提交**：小步快跑，及时提交代码
3. **及时推送**：避免本地积累过多未推送的提交
4. **同步更新**：定期 `git fetch --all` 保持同步
5. **清晰命名**：使用语义化的提交消息

### ❌ 不应该做的

1. **跨界修改**：不在错误的 worktree 中修改代码
2. **长期未提交**：避免积累大量未提交的更改
3. **忽略类型**：前端开发不要绕过类型检查
4. **重复工作**：协调好，避免在不同 worktree 重复实现

---

## 🎓 Git Worktree 命令参考

### 添加新 Worktree
```bash
git worktree add <path> -b <branch-name>
```

### 删除 Worktree
```bash
git worktree remove <path>
```

### 查看 Worktree 列表
```bash
git worktree list
```

### 清理过期 Worktree
```bash
git worktree prune
```

---

## 📞 获取帮助

在任何 Warp 窗口中，告诉 AI 读取上下文文档：

```
Read AI_ASSISTANT_CONTEXT.md
```

或

```
Read WORKTREE_CONTEXT.md
```

AI 会：
- ✅ 了解当前 worktree 的职责
- ✅ 知道应该修改哪些文件
- ✅ 知道不应该修改什么
- ✅ 使用中文回复

---

**配置完成！享受高效的多分支并行开发体验！** 🎉

