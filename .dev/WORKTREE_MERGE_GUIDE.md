# 🔀 Git Worktree 合并工作流指南

> **重要澄清**：Worktree 不是多个仓库，而是**共享同一个 .git 的多个工作目录**！

---

## 🎯 核心概念

### Git Worktree 本质

```
一个 Git 仓库 (.git)
    ↓
多个工作目录（worktrees）
    ↓
共享相同的提交历史
```

**关键点：**
- ✅ 只有**一个** `.git` 仓库
- ✅ 多个**工作目录**（文件夹）
- ✅ 所有工作树共享相同的 Git 历史
- ✅ 提交会直接同步到共享的 .git

---

## 📊 当前结构说明

```
D:\myproject\
├── Test-Web\.git\              ← 唯一的 Git 仓库（共享）
│
├── Test-Web\                   ← 工作树1（主仓库）
│   ├── frontend/               分支: feature/frontend-ui-dev
│   ├── backend/
│   └── .git (链接到共享仓库)
│
├── Test-Web-backend\           ← 工作树2
│   ├── frontend/               分支: feature/backend-api-dev
│   ├── backend/
│   └── .git (链接到共享仓库)
│
├── Test-Web-electron\          ← 工作树3
│   └── .git (链接到共享仓库)  分支: feature/electron-integration
│
└── Test-Web-testing\           ← 工作树4
    └── .git (链接到共享仓库)  分支: test/integration-testing

```

**它们共享同一个 .git！所有 Git 操作都是同步的！**

---

## 🔄 合并工作流（标准流程）

### 场景：将各个功能分支合并到主分支

#### 方法1：在主仓库中合并（推荐）

```bash
# 步骤1: 在各个工作树中提交你的更改
# ==========================================

# 窗口1 - 前端工作树
cd D:\myproject\Test-Web
git add .
git commit -m "feat: 完成前端UI开发"
git push origin feature/frontend-ui-dev

# 窗口2 - 后端工作树
cd D:\myproject\Test-Web-backend
git add .
git commit -m "feat: 完成后端API开发"
git push origin feature/backend-api-dev

# 窗口3 - Electron工作树
cd D:\myproject\Test-Web-electron
git add .
git commit -m "feat: 完成Electron集成"
git push origin feature/electron-integration

# 步骤2: 在主仓库中切换到 main 分支并合并
# ==========================================

cd D:\myproject\Test-Web
git checkout main
git pull origin main

# 合并前端分支
git merge feature/frontend-ui-dev
# 解决冲突（如果有）
git push origin main

# 合并后端分支
git merge feature/backend-api-dev
# 解决冲突（如果有）
git push origin main

# 合并Electron分支
git merge feature/electron-integration
# 解决冲突（如果有）
git push origin main

# 步骤3: 同步其他工作树到最新的 main
# ==========================================

# 在各个工作树中
git fetch origin
git rebase origin/main
# 或
git merge origin/main
```

---

#### 方法2：使用 Pull Request（团队协作推荐）

```bash
# 步骤1: 在各工作树中提交并推送
cd D:\myproject\Test-Web
git push origin feature/frontend-ui-dev

cd D:\myproject\Test-Web-backend
git push origin feature/backend-api-dev

# 步骤2: 在 GitHub/GitLab 上创建 Pull Request
# - feature/frontend-ui-dev → main
# - feature/backend-api-dev → main

# 步骤3: 代码审查后合并 PR

# 步骤4: 在本地同步
cd D:\myproject\Test-Web
git checkout main
git pull origin main
```

---

## 🎬 实际操作演示

### 示例：前端开发完成后合并

```bash
# 1. 在前端工作树中完成开发
cd D:\myproject\Test-Web
# 编辑前端文件...
git add frontend/
git commit -m "feat: 添加新的用户界面"

# 2. 查看分支状态
git status
# On branch feature/frontend-ui-dev
# nothing to commit, working tree clean

# 3. 推送到远程（可选）
git push origin feature/frontend-ui-dev

# 4. 切换到 main 分支合并
git checkout main
git pull origin main  # 确保是最新的
git merge feature/frontend-ui-dev

# 5. 如果有冲突，解决冲突
# 编辑冲突文件...
git add .
git commit -m "merge: 合并前端开发分支"

# 6. 推送到远程
git push origin main

# 7. 回到开发分支继续工作
git checkout feature/frontend-ui-dev

# 8. （可选）同步 main 的更新到开发分支
git merge main
```

---

## 🔀 高级合并场景

### 场景1：前后端同时开发，需要集成测试

```bash
# 在主仓库中创建集成分支
cd D:\myproject\Test-Web
git checkout -b integration/frontend-backend

# 合并前端分支
git merge feature/frontend-ui-dev

# 合并后端分支
git merge feature/backend-api-dev

# 运行集成测试
npm run test

# 如果测试通过，合并到 main
git checkout main
git merge integration/frontend-backend
git push origin main
```

---

### 场景2：跨工作树查看更改

```bash
# 虽然在不同工作树，但它们共享 .git

# 在任何工作树中查看所有分支的日志
git log --oneline --graph --all

# 查看其他分支的更改（无需切换工作树）
git diff main..feature/backend-api-dev

# 查看某个分支的文件（无需切换）
git show feature/backend-api-dev:backend/src/app.js
```

---

### 场景3：Cherry-pick 特定提交

```bash
# 在工作树1中
cd D:\myproject\Test-Web
git log feature/backend-api-dev --oneline
# 假设找到提交 abc1234

# Cherry-pick 到当前分支
git cherry-pick abc1234
```

---

## 📋 每日工作流程

### 早上开始工作

```bash
# 在各个工作树中同步最新代码
cd D:\myproject\Test-Web
git pull origin feature/frontend-ui-dev
git fetch origin
git merge origin/main  # 同步主分支的更新

cd D:\myproject\Test-Web-backend
git pull origin feature/backend-api-dev
git merge origin/main
```

### 工作中

```bash
# 在各自的工作树中独立开发
# 不需要切换分支！
# 随时提交本地更改
git add .
git commit -m "feat: 新功能"
```

### 下班前

```bash
# 推送所有工作树的更改
cd D:\myproject\Test-Web
git push origin feature/frontend-ui-dev

cd D:\myproject\Test-Web-backend
git push origin feature/backend-api-dev
```

### 周五/里程碑

```bash
# 合并所有功能分支到 main
cd D:\myproject\Test-Web
git checkout main
git merge feature/frontend-ui-dev
git merge feature/backend-api-dev
git push origin main

# 同步所有工作树
cd D:\myproject\Test-Web-backend
git fetch origin
git rebase origin/main

cd D:\myproject\Test-Web-electron
git fetch origin
git rebase origin/main
```

---

## 🔍 验证共享仓库

### 实验：证明它们共享同一个 .git

```bash
# 在工作树1中提交
cd D:\myproject\Test-Web
echo "test" > test.txt
git add test.txt
git commit -m "test: 验证共享"

# 在工作树2中立即可见
cd D:\myproject\Test-Web-backend
git log --oneline -1
# 你会看到刚才的提交！

# 查看 .git 的实际位置
cd D:\myproject\Test-Web
cat .git
# 输出: gitdir: .git/worktrees/Test-Web (指向主仓库)

cd D:\myproject\Test-Web-backend
cat .git
# 输出: gitdir: ../Test-Web/.git/worktrees/Test-Web-backend
```

---

## ⚠️ 常见误解

### ❌ 误解1：需要分别合并每个仓库
**✅ 正确**：只有一个仓库，在任何工作树中提交都会同步到共享的 .git

### ❌ 误解2：工作树之间需要手动同步
**✅ 正确**：所有工作树共享相同的 Git 历史，提交自动同步

### ❌ 误解3：删除工作树会丢失代码
**✅ 正确**：只要已提交，代码都在共享的 .git 中，删除工作树只是删除文件副本

---

## 🛠️ 实用工具命令

### 查看所有分支的最新提交
```bash
git branch -vv
```

### 查看工作树状态
```bash
git worktree list
```

### 查看全局提交历史
```bash
git log --oneline --graph --all --decorate
```

### 比较不同分支
```bash
git diff feature/frontend-ui-dev..feature/backend-api-dev
```

---

## 🎯 完整合并示例

假设你完成了一周的开发：

```bash
# ============================================
# 周五下午 - 准备合并所有工作
# ============================================

# 1. 确保所有工作树的更改都已提交
cd D:\myproject\Test-Web
git status  # 应该是 clean

cd D:\myproject\Test-Web-backend
git status  # 应该是 clean

cd D:\myproject\Test-Web-electron
git status  # 应该是 clean

# 2. 在主仓库中执行合并
cd D:\myproject\Test-Web
git checkout main
git pull origin main

# 3. 依次合并各个功能分支
git merge feature/frontend-ui-dev --no-ff -m "merge: 前端UI开发"
git merge feature/backend-api-dev --no-ff -m "merge: 后端API开发"
git merge feature/electron-integration --no-ff -m "merge: Electron集成"

# 4. 运行完整测试
npm run test
npm run e2e

# 5. 推送到远程
git push origin main

# 6. 清理已合并的分支（可选）
git branch -d feature/frontend-ui-dev
git branch -d feature/backend-api-dev
git branch -d feature/electron-integration

# 7. 为下周创建新的功能分支
git checkout -b feature/new-feature-week2

# ============================================
# 完成！所有更改已合并到 main 分支
# ============================================
```

---

## 📚 总结

### 关键要点

1. **Worktree ≠ 多个仓库**
   - 只有一个 .git 仓库
   - 多个工作目录

2. **合并很简单**
   - 在任何工作树中都可以合并
   - 使用标准的 `git merge` 命令
   - 提交自动同步到共享仓库

3. **推荐工作流**
   - 各工作树独立开发
   - 在主仓库中统一合并
   - 使用 PR 进行代码审查

4. **优势**
   - 开发时完全隔离
   - 合并时和普通 Git 一样
   - 最佳的开发体验

---

**下一步：查看实际的 Git 历史**

```bash
cd D:\myproject\Test-Web
git log --oneline --graph --all --decorate -10
```

这会显示所有分支的提交历史，证明它们都在同一个仓库中！

---

**最后更新**: 2025-10-06  
**需要帮助？** 查看 Git Worktree 官方文档: https://git-scm.com/docs/git-worktree

