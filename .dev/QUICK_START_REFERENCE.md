# 🚀 快速启动参考卡

## 一键启动所有窗口

```powershell
.\scripts\start-all-worktree-windows.ps1
```

---

## 手动启动各窗口

### 窗口1 - 前端开发（当前窗口）
```powershell
# 位置: D:\myproject\Test-Web
# 分支: feature/frontend-ui-dev
npm run frontend
```

### 窗口2 - 后端开发
```powershell
# 打开新的 PowerShell
cd D:\myproject\Test-Web-backend
npm run backend:dev
```

### 窗口3 - Electron
```powershell
# 打开新的 PowerShell
cd D:\myproject\Test-Web-electron
npm run dev
```

### 窗口4 - 测试
```powershell
# 打开新的 PowerShell
cd D:\myproject\Test-Web-testing
npm run test:watch
```

---

## 常用命令速查

| 窗口 | 位置 | 启动命令 | 端口 |
|-----|------|---------|------|
| 窗口1 | Test-Web | `npm run frontend` | 5174 |
| 窗口2 | Test-Web-backend | `npm run backend:dev` | 3001 |
| 窗口3 | Test-Web-electron | `npm run dev` | - |
| 窗口4 | Test-Web-testing | `npm run test:watch` | - |

---

## 工作树管理

```bash
# 查看所有工作树
git worktree list

# 查看分支
git branch -vv

# 查看状态
git status
```

---

## 提交代码

```bash
# 在各个工作树中
git add .
git commit -m "feat: 功能描述"
git push origin <branch-name>
```

---

## 合并代码

```bash
# 在主仓库中
cd D:\myproject\Test-Web
git checkout main
git merge feature/frontend-ui-dev
git merge feature/backend-api-dev
git push origin main
```

---

快速文档链接：
- 完整指南: `docs/MULTI_WINDOW_DEVELOPMENT_GUIDE.md`
- 合并流程: `.dev/WORKTREE_MERGE_GUIDE.md`
- 设置总结: `.dev/WORKTREE_SETUP_COMPLETE.md`

