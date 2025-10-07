# Worktree 清理和重建脚本 - 简化版

Write-Host "🔧 开始清理和重建 Worktrees..." -ForegroundColor Cyan
Write-Host ""

# 切换到主仓库
cd "D:\myproject\Test-Web"

Write-Host "📋 步骤 1: 检查当前 worktree 状态" -ForegroundColor Yellow
git worktree list
Write-Host ""

# 询问是否继续
$continue = Read-Host "是否继续清理 worktrees? (y/N)"
if ($continue -ne 'y' -and $continue -ne 'Y') {
    Write-Host "❌ 已取消操作" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "📋 步骤 2: 检查并保存后端未提交的修改" -ForegroundColor Yellow

if (Test-Path "D:\myproject\Test-Web-backend") {
    cd "D:\myproject\Test-Web-backend"
    $status = git status --short
    if ($status) {
        Write-Host "  ⚠️  检测到未提交的修改:" -ForegroundColor Yellow
        git status --short
        
        $stash = Read-Host "  是否 stash 这些修改? (y/N)"
        if ($stash -eq 'y' -or $stash -eq 'Y') {
            git stash push -m "自动保存: worktree 重建前"
            Write-Host "  ✅ 已保存修改到 stash" -ForegroundColor Green
        }
    }
    cd "D:\myproject\Test-Web"
}

Write-Host ""
Write-Host "📋 步骤 3: 移除旧的 worktrees" -ForegroundColor Yellow

if (Test-Path "D:\myproject\Test-Web-backend") {
    Write-Host "  → 移除后端 worktree..."
    git worktree remove "D:\myproject\Test-Web-backend" --force
    Write-Host "  ✅ 后端 worktree 已移除" -ForegroundColor Green
}

if (Test-Path "D:\myproject\Test-Web-electron") {
    Write-Host "  → 移除 Electron worktree..."
    git worktree remove "D:\myproject\Test-Web-electron" --force
    Write-Host "  ✅ Electron worktree 已移除" -ForegroundColor Green
}

if (Test-Path "D:\myproject\Test-Web-testing") {
    Write-Host "  → 移除测试 worktree..."
    git worktree remove "D:\myproject\Test-Web-testing" --force
    Write-Host "  ✅ 测试 worktree 已移除" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 步骤 4: 清理 worktree 元数据" -ForegroundColor Yellow
git worktree prune
Write-Host "  ✅ 元数据已清理" -ForegroundColor Green

Write-Host ""
Write-Host "📋 步骤 5: 创建新的 worktrees" -ForegroundColor Yellow

# 创建后端 worktree
Write-Host "  → 创建后端 worktree (feature/backend-api-dev)..."
git worktree add "D:\myproject\Test-Web-backend" feature/backend-api-dev
Write-Host "  ✅ 后端 worktree 创建完成" -ForegroundColor Green

# 创建 Electron worktree
Write-Host "  → 创建 Electron worktree (feature/electron-integration)..."
git worktree add "D:\myproject\Test-Web-electron" feature/electron-integration
Write-Host "  ✅ Electron worktree 创建完成" -ForegroundColor Green

# 创建测试 worktree
Write-Host "  → 创建测试 worktree (test/integration-testing)..."
git worktree add "D:\myproject\Test-Web-testing" test/integration-testing
Write-Host "  ✅ 测试 worktree 创建完成" -ForegroundColor Green

Write-Host ""
Write-Host "📋 步骤 6: 同步 shared/types 到后端" -ForegroundColor Yellow

Write-Host "  → 复制 shared/types 到后端..."
$targetDir = "D:\myproject\Test-Web-backend\shared\types"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}
Copy-Item -Path "D:\myproject\Test-Web\shared\types\*" -Destination $targetDir -Recurse -Force
Write-Host "  ✅ shared/types 已同步到后端" -ForegroundColor Green

# 创建 README
$readmeContent = @"
# Shared Types

这些类型定义是从主仓库同步过来的。

**重要**: 不要直接修改这些文件！

如需修改类型定义，请:
1. 切换到主仓库: ``cd D:\myproject\Test-Web``
2. 修改 ``shared/types`` 中的文件
3. 提交更改
4. 运行同步脚本

最后同步时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@
Set-Content -Path "$targetDir\README.md" -Value $readmeContent -Encoding UTF8
Write-Host "  📝 已创建同步说明文档" -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 步骤 7: 显示最终状态" -ForegroundColor Yellow
git worktree list

Write-Host ""
Write-Host "✅ Worktree 重建完成!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 工作树结构:" -ForegroundColor Cyan
Write-Host "  - 主仓库 (前端): D:\myproject\Test-Web"
Write-Host "    分支: $(git branch --show-current)"
Write-Host ""
Write-Host "  - 后端: D:\myproject\Test-Web-backend"
Write-Host "    分支: feature/backend-api-dev"
Write-Host ""
Write-Host "  - Electron: D:\myproject\Test-Web-electron"
Write-Host "    分支: feature/electron-integration"
Write-Host ""
Write-Host "  - 测试: D:\myproject\Test-Web-testing"
Write-Host "    分支: test/integration-testing"
Write-Host ""

Write-Host "🎯 下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 检查后端类型定义:"
Write-Host "     cd D:\myproject\Test-Web-backend"
Write-Host "     find backend -name '*.ts' -path '*/types/*'"
Write-Host ""
Write-Host "  2. 对比前后端类型:"
Write-Host "     查看 TYPE_SYSTEM_SYNC_GUIDE.md"
Write-Host ""
Write-Host "  3. 继续修复 TypeScript 错误:"
Write-Host "     cd D:\myproject\Test-Web"
Write-Host "     npm run type-check"
Write-Host ""

