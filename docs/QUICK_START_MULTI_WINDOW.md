# 🚀 多窗口开发快速启动指南

> 本文档为 Test-Web 项目多窗口并行开发的快速参考

---

## 📊 窗口分配表

| 窗口 | 职责 | 分支 | 端口 | 主要命令 |
|-----|------|------|------|---------|
| **窗口1** | 前端UI开发 | `feature/frontend-ui-dev` | 5174 | `npm run frontend` |
| **窗口2** | 后端API开发 | `feature/backend-api-dev` | 3001 | `npm run backend:dev` |
| **窗口3** | Electron集成 | `feature/electron-integration` | - | `npm run electron:dev` |
| **窗口4** | 测试/维护 | `test/integration-testing` | - | `npm run test:watch` |

---

## ⚡ 一键启动所有窗口

```powershell
# 从项目根目录运行
.\scripts\start-multi-window-dev.ps1
```

### 可选参数：

```powershell
# 仅启动窗口2（后端）
.\scripts\start-multi-window-dev.ps1 -Window2Only

# 仅启动窗口3（Electron）
.\scripts\start-multi-window-dev.ps1 -Window3Only

# 仅启动窗口4（测试）
.\scripts\start-multi-window-dev.ps1 -Window4Only

# 跳过自动分支切换
.\scripts\start-multi-window-dev.ps1 -SkipBranch
```

---

## 🪟 窗口1 - 前端UI开发（当前窗口）

### 分支
```bash
git checkout feature/frontend-ui-dev
```

### 启动命令
```bash
# 标准启动（端口5174）
npm run frontend

# 自定义端口
cross-env VITE_DEV_PORT=5175 npm run frontend
```

### 常用开发命令
```bash
# 代码检查
npm run lint

# 修复代码问题
npm run lint:fix

# 格式化代码
npm run format

# TypeScript检查
npm run type-check

# 组件开发（热更新）
npm run frontend  # 自动监听文件变化
```

### 开发重点
- ✅ React组件开发
- ✅ UI界面优化
- ✅ 前端路由配置
- ✅ 状态管理（Hooks）
- ✅ 样式调整（TailwindCSS）

---

## 🪟 窗口2 - 后端API开发

### 分支
```bash
git checkout feature/backend-api-dev
```

### 启动命令
```bash
# 开发模式（自动重启）
npm run backend:dev

# 标准启动
npm run backend

# 自定义端口
cross-env PORT=3002 npm run backend:dev
```

### 常用开发命令
```bash
# 数据库操作
npm run db:status      # 查看数据库状态
npm run db:migrate     # 执行数据库迁移
npm run db:backup      # 备份数据库

# 后端测试
cd backend && npm test
```

### 开发重点
- ✅ API端点开发
- ✅ 数据库操作
- ✅ 业务逻辑实现
- ✅ WebSocket服务
- ✅ 中间件配置

---

## 🪟 窗口3 - Electron集成

### 分支
```bash
git checkout feature/electron-integration
```

### 启动命令
```bash
# 开发模式（需要前端服务运行）
npm run electron:dev

# 快速全栈开发
npm run dev  # 同时启动前后端

# 构建Electron应用
npm run electron:build
```

### 常用开发命令
```bash
# 完整构建并打包
npm run electron:dist

# 仅启动Electron
npm run electron:start
```

### 开发重点
- ✅ 主进程逻辑
- ✅ 渲染进程通信
- ✅ 系统集成
- ✅ 窗口管理
- ✅ 应用打包

---

## 🪟 窗口4 - 测试与维护

### 分支
```bash
git checkout test/integration-testing
```

### 测试命令
```bash
# 单元测试
npm run test              # 运行所有测试
npm run test:watch        # 监听模式
npm run test:ui           # UI界面测试
npm run test:coverage     # 测试覆盖率

# E2E测试
npm run e2e               # 运行E2E测试
npm run e2e:ui            # UI模式
npm run e2e:headed        # 有头模式
npm run e2e:debug         # 调试模式
```

### 维护命令
```bash
# 代码质量
npm run lint              # ESLint检查
npm run lint:fix          # 自动修复
npm run type-check        # TypeScript检查

# 项目清理
npm run clean             # 清理构建文件
npm run clean:all         # 完全清理

# 依赖管理
npm run deps:update       # 更新依赖
```

### 维护重点
- ✅ 单元测试编写
- ✅ 集成测试
- ✅ 代码质量检查
- ✅ 依赖更新
- ✅ Bug修复验证

---

## 🔄 工作流程建议

### 1️⃣ 开始新功能开发

```bash
# 窗口1 - 前端
git checkout feature/frontend-ui-dev
git pull origin main
npm run frontend

# 窗口2 - 后端
git checkout feature/backend-api-dev
git pull origin main
npm run backend:dev
```

### 2️⃣ 开发中同步

```bash
# 定期拉取主分支更新
git fetch origin
git merge origin/main

# 或使用rebase保持提交历史清晰
git rebase origin/main
```

### 3️⃣ 提交代码

```bash
# 确保代码质量
npm run lint:fix
npm run type-check

# 提交
git add .
git commit -m "feat: 新功能描述"
git push origin feature/frontend-ui-dev
```

### 4️⃣ 合并到主分支

```bash
# 切换到主分支
git checkout main
git pull origin main

# 合并功能分支
git merge feature/frontend-ui-dev
git push origin main
```

---

## ⚠️ 注意事项

### 端口冲突
- 前端默认: **5174**
- 后端默认: **3001**
- 如有冲突，使用环境变量修改端口

### 数据库隔离
```sql
-- 为不同窗口创建独立数据库
CREATE DATABASE testweb_frontend_dev;
CREATE DATABASE testweb_backend_dev;
CREATE DATABASE testweb_integration_test;
```

### 依赖安装
每个窗口首次使用时需安装依赖：
```bash
npm install
```

### Git操作同步
- ❌ 避免同时在多个窗口执行git操作
- ✅ 使用 `git status` 确认当前分支
- ✅ 提交前确保在正确的分支

---

## 🛠️ 故障排查

### 前端服务无法启动
```bash
# 检查端口占用
netstat -ano | findstr :5174

# 杀死占用进程
taskkill /PID <进程ID> /F

# 或使用不同端口
cross-env VITE_DEV_PORT=5175 npm run frontend
```

### 后端服务无法连接
```bash
# 检查后端服务状态
npm run db:status

# 重启后端服务
# Ctrl+C 停止，然后重新运行
npm run backend:dev
```

### Git分支冲突
```bash
# 查看冲突文件
git status

# 解决冲突后
git add .
git rebase --continue
```

---

## 📚 相关文档

- [完整多窗口开发指南](./MULTI_WINDOW_DEVELOPMENT_GUIDE.md)
- [项目README](../README.md)
- [清理报告](./CLEANUP_REPORT.md)

---

## 🎯 快速命令速查

| 操作 | 命令 |
|-----|------|
| 启动所有窗口 | `.\scripts\start-multi-window-dev.ps1` |
| 前端开发 | `npm run frontend` |
| 后端开发 | `npm run backend:dev` |
| 全栈开发 | `npm run dev` |
| Electron开发 | `npm run electron:dev` |
| 运行测试 | `npm run test:watch` |
| 代码检查 | `npm run lint` |
| 类型检查 | `npm run type-check` |
| 查看分支 | `git branch` |
| 切换分支 | `git checkout <branch-name>` |

---

**最后更新**: 2025-10-06  
**维护者**: Test Web App Team

**提示**: 保存此文档到书签，开发时随时查阅！ 🔖

