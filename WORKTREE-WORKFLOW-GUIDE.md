# Git Worktree 工作流程指南

## 📂 当前 Worktree 结构

你的项目使用了 **Git Worktree** 多工作树架构，有4个独立的工作目录：

```
主仓库位置: D:/myproject/Test-Web

工作树分布:
├── Test-Web           (主工作树)   → feature/frontend-ui-dev
├── Test-Web-backend   (后端工作树) → feature/backend-api-dev  ⭐ 当前位置
├── Test-Web-electron  (桌面工作树) → feature/electron-integration
└── Test-Web-testing   (测试工作树) → test/integration-testing
```

## 🎯 Worktree 的优势

✅ **同时开发多个功能**：不同目录对应不同分支，无需频繁切换  
✅ **互不干扰**：各工作树独立，修改不会冲突  
✅ **共享Git历史**：所有工作树共享同一个 `.git` 仓库  
✅ **方便测试**：可以同时运行前端、后端、测试环境

## 📊 当前提交历史

```
* 99b8a3f (feature/backend-api-dev) ← 你在这里
|         docs: 添加路由重构后续待办事项清单(Issues)
|
* 64f3633 docs: 添加项目完整工作总结报告
|
* 6503768 refactor(routes): 重构路由架构，移除/api前缀
|
* 091e2fa (feature/frontend-ui-dev, feature/electron-integration, test/integration-testing)
|         feat: 添加Git Worktree多工作树支持和文档
|
* 10aa299 (main) ← 主分支
          fix: 修复95个TypeScript错误
```

## 🔄 接下来应该做什么？

### 方案 A: 合并到主分支 (推荐)

如果路由重构已完成并测试通过，将 `feature/backend-api-dev` 合并到 `main`：

```bash
# 1. 确保当前工作已提交（已完成 ✅）
git status

# 2. 切换到主工作树（Test-Web）
cd D:/myproject/Test-Web

# 3. 检查主工作树的分支
git status

# 4. 切换到 main 分支
git checkout main

# 5. 拉取最新代码（如果有远程仓库）
git pull origin main

# 6. 合并后端开发分支
git merge feature/backend-api-dev

# 7. 解决可能的冲突（如果有）

# 8. 推送到远程（如果需要）
git push origin main

# 9. 回到后端工作树继续开发
cd D:/myproject/Test-Web-backend
```

### 方案 B: 推送分支到远程（协作开发）

如果需要团队审查或创建 Pull Request：

```bash
# 在当前位置（Test-Web-backend）
git push origin feature/backend-api-dev

# 然后在 GitHub/GitLab 创建 Pull Request
# feature/backend-api-dev → main
```

### 方案 C: 继续在当前分支开发

如果还有后续工作要做：

```bash
# 直接继续开发
# 所有修改都会在 feature/backend-api-dev 分支
# 等所有工作完成后再合并
```

## 🚀 完整合并流程（建议执行）

### 第1步：验证后端分支状态

```bash
# 在 Test-Web-backend 目录
cd D:/myproject/Test-Web-backend

# 查看当前状态
git status
git log --oneline -5

# 确认所有更改已提交 ✅
```

### 第2步：切换到主工作树

```bash
cd D:/myproject/Test-Web
```

### 第3步：准备合并

```bash
# 查看当前分支
git status

# 如果不在 main，切换到 main
git checkout main

# 查看即将合并的差异
git log main..feature/backend-api-dev --oneline

# 预览会合并哪些文件
git diff main...feature/backend-api-dev --stat
```

### 第4步：执行合并

```bash
# 合并后端分支（建议使用 --no-ff 保留分支历史）
git merge --no-ff feature/backend-api-dev -m "Merge: 后端路由架构重构完成"

# 或者直接合并（快进模式）
git merge feature/backend-api-dev
```

### 第5步：验证合并结果

```bash
# 查看合并后的历史
git log --oneline --graph -10

# 查看当前分支
git branch

# 确认文件完整性
ls backend/routes/
```

### 第6步：推送到远程（可选）

```bash
# 如果有远程仓库
git push origin main

# 也可以推送开发分支（保留记录）
git push origin feature/backend-api-dev
```

### 第7步：返回后端工作树

```bash
cd D:/myproject/Test-Web-backend

# 如果需要基于新的 main 继续开发
git checkout main
# 或创建新的功能分支
git checkout -b feature/next-task
```

## 🔍 常用 Worktree 命令

### 查看所有工作树
```bash
git worktree list
```

### 在任何工作树查看所有分支
```bash
git branch -a
```

### 在任何工作树查看完整历史
```bash
git log --oneline --graph --all -20
```

### 在任何工作树推送/拉取
```bash
# 所有操作都影响共享的 Git 仓库
git push origin <branch-name>
git pull origin <branch-name>
```

### 删除工作树（如果不再需要）
```bash
# 先切换到主工作树
cd D:/myproject/Test-Web

# 删除特定工作树
git worktree remove Test-Web-backend

# 查看已删除的工作树
git worktree prune
```

## 📝 最佳实践

### 1. 命名规范
- **功能开发**：`feature/功能名`
- **Bug修复**：`fix/问题描述`
- **测试**：`test/测试类型`
- **实验性**：`experiment/实验名`

### 2. 分支管理
```bash
# 每个工作树保持在自己的分支
# 定期同步 main 分支的更新

# 在任何工作树
git fetch origin
git merge origin/main  # 或 git rebase origin/main
```

### 3. 提交频率
- 每个工作树独立提交
- 小步快跑，频繁提交
- 使用有意义的提交信息

### 4. 合并时机
- 功能完成并测试通过
- 与团队沟通
- 解决所有冲突
- 更新文档

## ⚠️ 注意事项

### 1. 分支冲突
❌ **不要在多个工作树同时 checkout 同一个分支**
```bash
# 错误示例
cd D:/myproject/Test-Web
git checkout feature/backend-api-dev  # 已经在 Test-Web-backend 使用

# 会看到错误：
# fatal: 'feature/backend-api-dev' is already checked out at 'D:/myproject/Test-Web-backend'
```

### 2. 磁盘空间
- 每个工作树占用独立的磁盘空间
- 4个工作树 ≈ 4倍的代码体积
- 定期清理不需要的工作树

### 3. 依赖同步
- 每个工作树的 `node_modules` 是独立的
- 更新依赖后需要在每个工作树运行 `npm install`

### 4. Git 操作
- `git push/pull/fetch` 在任何工作树都生效
- 所有工作树共享同一个远程仓库连接

## 🎬 快速决策

### 情况 1：后端开发已完成，要合并
👉 执行 **方案 A**（完整合并流程）

### 情况 2：需要团队 Code Review
👉 执行 **方案 B**（推送并创建 PR）

### 情况 3：还有后续任务要做
👉 执行 **方案 C**（继续开发）

### 情况 4：要开始新功能
👉 先合并当前工作，然后：
```bash
cd D:/myproject/Test-Web-backend
git checkout main
git pull origin main
git checkout -b feature/新功能名
```

## 📞 需要帮助？

如果不确定当前应该做什么，运行：

```bash
# 查看当前状态
git status

# 查看所有工作树
git worktree list

# 查看分支关系
git log --oneline --graph --all -15

# 查看未合并的提交
git log main..feature/backend-api-dev --oneline
```

---

## 🎯 当前建议操作

基于你的当前情况：

✅ 后端路由重构已完成（3个提交）  
✅ 文档已完善  
✅ 所有更改已提交  

**建议：立即合并到 main 分支**

```bash
# 1. 切换到主工作树
cd D:/myproject/Test-Web

# 2. 切换到 main 分支
git checkout main

# 3. 合并后端开发
git merge --no-ff feature/backend-api-dev -m "Merge: 后端路由架构重构完成

- 重构路由架构，移除/api前缀
- 注册5个新路由模块
- 提升路由利用率至32%
- 完善项目文档和待办事项"

# 4. 推送到远程（如果有）
git push origin main

# 5. 返回后端继续开发
cd D:/myproject/Test-Web-backend
git checkout main
```

---

**文档版本**: 1.0  
**创建日期**: 2025-10-06  
**适用于**: Git Worktree 多工作树架构

