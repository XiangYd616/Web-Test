# push-all-branches.ps1
# 推送所有本地分支到远程仓库

Write-Host "=== 推送所有本地分支到远程 ===" -ForegroundColor Cyan
Write-Host ""

# 保存当前分支
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "当前分支: $currentBranch" -ForegroundColor Gray
Write-Host ""

# 推送 main 分支
Write-Host "1. 推送 main 分支..." -ForegroundColor Yellow
git checkout main
if ($LASTEXITCODE -eq 0) {
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ main 分支已推送" -ForegroundColor Green
    } else {
        Write-Host "   ❌ main 分支推送失败" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ 切换到 main 分支失败" -ForegroundColor Red
}
Write-Host ""

# 推送 worktree 分支
Write-Host "2. 推送 feature/backend-api-dev..." -ForegroundColor Yellow
git push -u origin feature/backend-api-dev
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ feature/backend-api-dev 已推送" -ForegroundColor Green
} else {
    Write-Host "   ❌ feature/backend-api-dev 推送失败" -ForegroundColor Red
}
Write-Host ""

Write-Host "3. 推送 feature/electron-integration..." -ForegroundColor Yellow
git push -u origin feature/electron-integration
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ feature/electron-integration 已推送" -ForegroundColor Green
} else {
    Write-Host "   ❌ feature/electron-integration 推送失败" -ForegroundColor Red
}
Write-Host ""

Write-Host "4. 推送 test/integration-testing..." -ForegroundColor Yellow
git push -u origin test/integration-testing
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ test/integration-testing 已推送" -ForegroundColor Green
} else {
    Write-Host "   ❌ test/integration-testing 推送失败" -ForegroundColor Red
}
Write-Host ""

Write-Host "5. 推送 feature/type-system-unification..." -ForegroundColor Yellow
git push -u origin feature/type-system-unification
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ feature/type-system-unification 已推送" -ForegroundColor Green
} else {
    Write-Host "   ❌ feature/type-system-unification 推送失败" -ForegroundColor Red
}
Write-Host ""

# 返回原分支
Write-Host "6. 返回到 $currentBranch..." -ForegroundColor Yellow
git checkout $currentBranch
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ 已返回到 $currentBranch" -ForegroundColor Green
} else {
    Write-Host "   ❌ 返回到 $currentBranch 失败" -ForegroundColor Red
}
Write-Host ""

Write-Host "✅ 所有分支推送操作完成" -ForegroundColor Green
Write-Host ""
Write-Host "执行以下命令查看分支状态:" -ForegroundColor Gray
Write-Host "  git branch -vv" -ForegroundColor Gray

