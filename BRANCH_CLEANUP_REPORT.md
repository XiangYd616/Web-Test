# 分支清理报告

> **检查时间**: 2025-10-07 18:38  
> **当前分支**: feature/type-system-unification

## 📊 分支状态概览

### 本地分支 (6个)

| 分支名称 | 状态 | 提交 | 上游分支 | Worktree | 建议 |
|---------|------|------|---------|---------|------|
| **feature/type-system-unification** ⭐ | 活跃 | `8bf9529` | ✅ `origin/feature/type-system-unification` | 主仓库 | ✅ 保留 - 当前工作分支 |
| **main** | 活跃 | `d49560c` | ✅ `origin/main` (ahead 31) | - | ⚠️ 需要推送 31 个提交 |
| **feature/backend-api-dev** | 活跃 | `6b090db` | ❌ 无上游 | 后端 worktree | ⚠️ 需要设置上游并推送 |
| **feature/electron-integration** | 活跃 | `091e2fa` | ❌ 无上游 | Electron worktree | ⚠️ 需要设置上游并推送 |
| **test/integration-testing** | 活跃 | `091e2fa` | ❌ 无上游 | 测试 worktree | ⚠️ 需要设置上游并推送 |
| **feature/frontend-ui-dev** | 停滞 | `f4d5b1a` | ❌ 无上游 | - | 🗑️ 建议删除或合并 |

### 远程分支 (2个)

| 远程分支 | 本地对应 | 状态 |
|---------|---------|------|
| `origin/main` | ✅ main | 同步 (本地 ahead 31) |
| `origin/feature/type-system-unification` | ✅ feature/type-system-unification | 已同步 |

### Stash 记录

- `refs/stash` (5cd221b): "On main: 保存: worktree重建前的修改"

## 🎯 清理建议

### 优先级 1: 推送本地更改到远程

#### 1.1 推送 main 分支 (31 个领先提交)
```bash
# main 分支领先远程 31 个提交，需要推送
git checkout main
git push origin main
```

**重要性**: 🔥 高 - 这些提交包含重要的后端路由架构重构

#### 1.2 为 worktree 分支设置上游并推送

```bash
# 后端分支
git push -u origin feature/backend-api-dev

# Electron 分支
git push -u origin feature/electron-integration

# 测试分支
git push -u origin test/integration-testing
```

**重要性**: 🔥 高 - 确保所有 worktree 分支都有远程备份

### 优先级 2: 清理停滞分支

#### 2.1 feature/frontend-ui-dev 分支

**分析**:
- 最后提交: `f4d5b1a` - "docs: 添加 API 迁移和开发环境文档"
- 没有 worktree
- 没有远程上游
- 可能已被 `feature/type-system-unification` 取代

**选项**:

**选项 A: 删除** (如果工作已合并或不再需要)
```bash
git branch -D feature/frontend-ui-dev
```

**选项 B: 合并到当前分支** (如果有有用的改动)
```bash
git checkout feature/type-system-unification
git merge feature/frontend-ui-dev
git push origin feature/type-system-unification
# 然后删除旧分支
git branch -d feature/frontend-ui-dev
```

**选项 C: 推送到远程保留** (如果还需要)
```bash
git push -u origin feature/frontend-ui-dev
```

**建议**: 先检查是否有未合并的有用更改，然后决定

### 优先级 3: Stash 清理

**当前 stash**: "On main: 保存: worktree重建前的修改"

**分析**:
- 这是 worktree 重建前保存的更改
- 已经重建了 worktree，可能不再需要

**选项**:

**选项 A: 检查内容**
```bash
git stash show -p stash@{0}
```

**选项 B: 应用并删除** (如果需要这些更改)
```bash
git stash pop
```

**选项 C: 直接删除** (如果确认不需要)
```bash
git stash drop
```

**建议**: 先检查内容，确认不需要后再删除

## 🛠️ 自动化清理脚本

### 脚本 1: 推送所有本地分支到远程

```powershell
# push-all-branches.ps1

Write-Host "=== 推送所有本地分支到远程 ===" -ForegroundColor Cyan

# 保存当前分支
$currentBranch = git rev-parse --abbrev-ref HEAD

# 推送 main 分支
Write-Host "`n1. 推送 main 分支..." -ForegroundColor Yellow
git checkout main
git push origin main

# 推送 worktree 分支
Write-Host "`n2. 推送 feature/backend-api-dev..." -ForegroundColor Yellow
git push -u origin feature/backend-api-dev

Write-Host "`n3. 推送 feature/electron-integration..." -ForegroundColor Yellow
git push -u origin feature/electron-integration

Write-Host "`n4. 推送 test/integration-testing..." -ForegroundColor Yellow
git push -u origin test/integration-testing

Write-Host "`n5. 推送 feature/type-system-unification..." -ForegroundColor Yellow
git push -u origin feature/type-system-unification

# 返回原分支
Write-Host "`n6. 返回到 $currentBranch..." -ForegroundColor Yellow
git checkout $currentBranch

Write-Host "`n✅ 所有分支已推送到远程" -ForegroundColor Green
```

### 脚本 2: 交互式清理停滞分支

```powershell
# cleanup-stale-branches.ps1

Write-Host "=== 检查停滞分支 ===" -ForegroundColor Cyan

# 检查 feature/frontend-ui-dev
Write-Host "`n检查 feature/frontend-ui-dev..." -ForegroundColor Yellow
Write-Host "最后提交:" -ForegroundColor Gray
git log -1 --oneline feature/frontend-ui-dev

Write-Host "`n与当前分支的差异:" -ForegroundColor Gray
git log feature/type-system-unification..feature/frontend-ui-dev --oneline

$choice = Read-Host "`n是否删除 feature/frontend-ui-dev? (y/n)"
if ($choice -eq 'y') {
    git branch -D feature/frontend-ui-dev
    Write-Host "✅ 已删除 feature/frontend-ui-dev" -ForegroundColor Green
} else {
    Write-Host "⏭️ 跳过删除" -ForegroundColor Yellow
}

# 检查 stash
Write-Host "`n检查 stash..." -ForegroundColor Yellow
git stash list

if ((git stash list).Length -gt 0) {
    $choice = Read-Host "`n是否查看 stash 内容? (y/n)"
    if ($choice -eq 'y') {
        git stash show -p
    }
    
    $choice = Read-Host "`n是否删除 stash? (y/n)"
    if ($choice -eq 'y') {
        git stash drop
        Write-Host "✅ 已删除 stash" -ForegroundColor Green
    } else {
        Write-Host "⏭️ 保留 stash" -ForegroundColor Yellow
    }
}
```

### 脚本 3: 完整分支健康检查

```powershell
# branch-health-check.ps1

Write-Host "=== 分支健康检查 ===" -ForegroundColor Cyan

# 检查每个分支的状态
Write-Host "`n📊 本地分支状态:" -ForegroundColor Yellow
git branch -vv

# 检查远程分支
Write-Host "`n📡 远程分支:" -ForegroundColor Yellow
git branch -r

# 检查未推送的分支
Write-Host "`n⚠️ 没有上游的本地分支:" -ForegroundColor Yellow
git branch -vv | Select-String -NotMatch "origin/" | Select-String -NotMatch "\+"

# 检查领先/落后情况
Write-Host "`n📈 分支同步状态:" -ForegroundColor Yellow
git for-each-ref --format='%(refname:short) -> %(upstream:short) %(upstream:track)' refs/heads/

# 检查 worktree 分支
Write-Host "`n🌳 Worktree 分支:" -ForegroundColor Yellow
git branch | Select-String "\+"

# 检查最近没有活动的分支
Write-Host "`n📅 超过 30 天没有更新的分支:" -ForegroundColor Yellow
$thirtyDaysAgo = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:short)' refs/heads/ | 
    ForEach-Object {
        $parts = $_.Split('|')
        $branch = $parts[0]
        $date = $parts[1]
        if ($date -lt $thirtyDaysAgo) {
            Write-Host "  $branch (最后更新: $date)" -ForegroundColor Red
        }
    }

Write-Host "`n✅ 健康检查完成" -ForegroundColor Green
```

## 📋 推荐的清理步骤

### 第一阶段: 推送和备份 (安全操作)

```bash
# 1. 推送 main 分支
git checkout main
git push origin main

# 2. 推送所有 worktree 分支
git push -u origin feature/backend-api-dev
git push -u origin feature/electron-integration
git push -u origin test/integration-testing

# 3. 确认当前分支已推送
git checkout feature/type-system-unification
git push origin feature/type-system-unification
```

### 第二阶段: 检查和决策 (需要人工判断)

```bash
# 1. 检查 feature/frontend-ui-dev 是否有未合并的更改
git log feature/type-system-unification..feature/frontend-ui-dev

# 2. 如果有有用的提交，合并它们
git merge feature/frontend-ui-dev

# 3. 检查 stash 内容
git stash show -p
```

### 第三阶段: 清理 (不可逆操作，请谨慎)

```bash
# 1. 删除已合并或不需要的分支
git branch -d feature/frontend-ui-dev  # 使用 -d 安全删除
# 或强制删除: git branch -D feature/frontend-ui-dev

# 2. 清理 stash (如果不需要)
git stash drop

# 3. 清理远程跟踪分支
git fetch --prune
git remote prune origin
```

## 🎨 分支命名规范建议

当前分支命名较为一致，建议继续保持：

- `feature/*` - 功能开发分支
- `test/*` - 测试相关分支
- `fix/*` - 问题修复分支
- `docs/*` - 文档更新分支

## 📊 清理前后对比

### 清理前
- ✅ 本地分支: 6 个
- ❌ 未推送到远程: 4 个
- ❌ 停滞分支: 1 个
- ❌ Stash 记录: 1 个

### 清理后 (预期)
- ✅ 本地分支: 5 个 (删除 1 个停滞分支)
- ✅ 未推送到远程: 0 个
- ✅ 停滞分支: 0 个
- ✅ Stash 记录: 0 个

## 🔐 安全提示

1. **在删除任何分支前**，确保已推送到远程或确认不需要
2. **main 分支的 31 个提交**必须先推送再做任何其他操作
3. **stash 中的更改**在删除前先查看内容
4. **使用 `-d` 而不是 `-D`** 删除分支，Git 会阻止删除未合并的分支

## 📞 出现问题时

### 如果误删了分支
```bash
# 查找被删除分支的最后提交
git reflog

# 恢复分支
git checkout -b <branch-name> <commit-hash>
```

### 如果推送被拒绝
```bash
# 拉取远程更新
git pull origin <branch-name>

# 或者强制推送 (谨慎使用)
git push -f origin <branch-name>
```

---

**下一步行动**: 请确认是否执行推送操作，然后决定如何处理 `feature/frontend-ui-dev` 分支

