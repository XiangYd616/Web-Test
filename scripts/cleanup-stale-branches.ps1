# cleanup-stale-branches.ps1
# 交互式清理停滞分支

Write-Host "=== 检查停滞分支 ===" -ForegroundColor Cyan
Write-Host ""

# 检查 feature/frontend-ui-dev
Write-Host "检查 feature/frontend-ui-dev..." -ForegroundColor Yellow
Write-Host ""

Write-Host "最后提交:" -ForegroundColor Gray
git log -1 --oneline feature/frontend-ui-dev
Write-Host ""

Write-Host "与当前分支的差异:" -ForegroundColor Gray
$uniqueCommits = git log feature/type-system-unification..feature/frontend-ui-dev --oneline
if ($uniqueCommits) {
    Write-Host $uniqueCommits
} else {
    Write-Host "  (无独特提交 - 所有提交已包含在 feature/type-system-unification 中)" -ForegroundColor Green
}
Write-Host ""

Write-Host "当前分支领先的提交:" -ForegroundColor Gray
git log feature/frontend-ui-dev..feature/type-system-unification --oneline | Select-Object -First 5
Write-Host ""

$choice = Read-Host "是否删除 feature/frontend-ui-dev? (y/n)"
if ($choice -eq 'y') {
    git branch -d feature/frontend-ui-dev
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 已删除 feature/frontend-ui-dev" -ForegroundColor Green
    } else {
        Write-Host "⚠️ 安全删除失败，可能有未合并的提交" -ForegroundColor Yellow
        $forceChoice = Read-Host "是否强制删除? (y/n)"
        if ($forceChoice -eq 'y') {
            git branch -D feature/frontend-ui-dev
            Write-Host "✅ 已强制删除 feature/frontend-ui-dev" -ForegroundColor Green
        } else {
            Write-Host "⏭️ 已取消删除" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⏭️ 跳过删除" -ForegroundColor Yellow
}
Write-Host ""

# 检查 stash
Write-Host "检查 stash..." -ForegroundColor Yellow
$stashList = git stash list
if ($stashList) {
    Write-Host $stashList
    Write-Host ""
    
    $choice = Read-Host "是否查看 stash 内容? (y/n)"
    if ($choice -eq 'y') {
        git stash show -p
        Write-Host ""
    }
    
    $choice = Read-Host "是否删除 stash? (y/n)"
    if ($choice -eq 'y') {
        git stash drop
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 已删除 stash" -ForegroundColor Green
        } else {
            Write-Host "❌ 删除 stash 失败" -ForegroundColor Red
        }
    } else {
        Write-Host "⏭️ 保留 stash" -ForegroundColor Yellow
    }
} else {
    Write-Host "  (无 stash 记录)" -ForegroundColor Green
}
Write-Host ""

Write-Host "✅ 清理检查完成" -ForegroundColor Green

