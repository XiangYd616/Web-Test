# 🚀 Warp 多窗口并行开发指南

## 📋 概述

本项目使用 Git Worktree 功能实现多分支并行开发，配合 Warp 多窗口可以同时在不同分支上工作，互不干扰。

## 🌳 Worktree 结构

| 工作树目录 | 分支 | 职责 |
|-----------|------|------|
| `D:\myproject\Test-Web` | `feature/type-system-unification` | 类型系统统一 |
| `D:\myproject\Test-Web-backend` | `feature/backend-api-dev` | 后端 API 开发 |
| `D:\myproject\Test-Web-electron` | `feature/electron-integration` | Electron 集成 |
| `D:\myproject\Test-Web-testing` | `test/integration-testing` | 集成测试 |

## 🖥️ 在 Warp 中开始工作

### 步骤 1: 打开多个 Warp 窗口

打开 4 个 Warp 窗口（或标签页），每个窗口负责一个 worktree。

### 步骤 2: 在每个窗口中切换到对应目录

**窗口 1 - 类型系统**
```powershell
cd D:\myproject\Test-Web
.\show-context.ps1  # 查看当前 worktree 职责
```

**窗口 2 - 后端开发**
```powershell
cd D:\myproject\Test-Web-backend
.\show-context.ps1
```

**窗口 3 - Electron**
```powershell
cd D:\myproject\Test-Web-electron
.\show-context.ps1
```

**窗口 4 - 测试**
```powershell
cd D:\myproject\Test-Web-testing
.\show-context.ps1
```

### 步骤 3: 让 Warp AI 理解当前工作

在每个窗口中，Warp AI 助手会自动读取 `WORKTREE_CONTEXT.md` 文件，了解当前窗口的职责和工作范围。

你可以告诉 AI：
- "查看我当前的工作上下文"
- "这个 worktree 负责什么工作？"
- "帮我完成这个 worktree 的任务"

AI 会根据 `WORKTREE_CONTEXT.md` 的内容给出针对性的建议和帮助。

## 🎯 工作流程

### 类型系统窗口 (Test-Web)
```powershell
# 检查类型错误
npm run type-check

# 修复类型错误
# (编辑相关文件)

# 提交更改
git add .
git commit -m "fix(types): 描述修复内容"
git push
```

### 后端开发窗口 (Test-Web-backend)
```powershell
# 启动后端服务
npm run dev

# 开发 API 功能
# (编辑相关文件)

# 提交更改
git add .
git commit -m "feat(api): 描述新功能"
git push
```

### Electron 窗口 (Test-Web-electron)
```powershell
# 启动 Electron 应用
npm run electron:dev

# 开发桌面功能
# (编辑相关文件)

# 提交更改
git add .
git commit -m "feat(electron): 描述新功能"
git push
```

### 测试窗口 (Test-Web-testing)
```powershell
# 运行测试
npm test

# 编写/更新测试用例
# (编辑相关文件)

# 提交更改
git add .
git commit -m "test: 描述测试内容"
git push
```

## 💡 关键优势

### ✅ 完全独立
- 每个窗口在独立的目录中工作
- 不需要频繁切换分支
- 代码更改互不影响

### ✅ 同时运行
- 可以同时启动多个开发服务器
- 可以同时运行测试和开发
- 可以同时对比不同分支的实现

### ✅ AI 助手理解上下文
- 每个窗口的 AI 知道当前的工作职责
- AI 不会建议修改不相关的代码
- AI 给出的建议更加精准和聚焦

### ✅ 快速切换
- 只需要在窗口间切换，无需 git checkout
- 保留每个分支的工作状态
- 提高开发效率

## 📚 常用命令

### 查看当前工作上下文
```powershell
.\show-context.ps1
```

### 查看所有 worktree
```powershell
git worktree list
```

### 查看当前分支状态
```powershell
git status
git log --oneline -5
```

### 同步所有分支
```powershell
# 在任意 worktree 中执行
git fetch --all

# 然后在每个窗口中
git pull
```

## 🚫 注意事项

### 避免跨 Worktree 修改

❌ **不要这样做：**
- 在类型系统窗口修改后端 API 代码
- 在后端窗口修改 Electron 代码
- 在 Electron 窗口修改测试代码

✅ **应该这样做：**
- 每个窗口只修改自己职责范围内的代码
- 如需跨领域修改，切换到对应的窗口
- 保持工作边界清晰

### 及时提交和推送

- 完成一个功能点后立即提交
- 定期推送到远程仓库
- 避免长时间未提交导致冲突

### 定期同步

- 每天开始工作前 `git fetch --all`
- 及时拉取其他分支的更新
- 保持与团队同步

## 🔧 工具和脚本

### show-context.ps1
显示当前 worktree 的工作上下文，包括：
- 当前目录
- 当前分支
- 最新提交
- 工作职责说明
- 所有 worktree 列表

### WORKTREE_CONTEXT.md
每个 worktree 的上下文文档，Warp AI 会读取这个文件来理解当前窗口的工作职责。

## 🎓 最佳实践

1. **明确分工**：每个 worktree 负责特定的功能领域
2. **保持独立**：避免跨 worktree 修改代码
3. **频繁提交**：小步快跑，及时提交
4. **及时推送**：避免本地积累太多未推送的提交
5. **定期同步**：保持与团队和远程仓库同步
6. **利用 AI**：让 Warp AI 助手理解你的工作上下文

## 📞 获取帮助

在任何 worktree 窗口中，你都可以：
- 运行 `.\show-context.ps1` 查看上下文
- 查看 `WORKTREE_CONTEXT.md` 了解职责
- 询问 Warp AI 助手关于当前工作的问题

---

Happy Parallel Coding! 🚀

