# Phase 1: 前端服务合并执行脚本
# 移除 "unified" 前缀，简化服务命名

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Phase 1: 前端服务合并" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  DRY RUN 模式 - 只显示将要执行的操作" -ForegroundColor Yellow
    Write-Host ""
}

# 检查当前分支
$currentBranch = git branch --show-current
if ($currentBranch -ne "refactor/service-consolidation-phase1") {
    Write-Host "❌ 错误: 当前不在正确的分支" -ForegroundColor Red
    Write-Host "   当前分支: $currentBranch" -ForegroundColor Red
    Write-Host "   期望分支: refactor/service-consolidation-phase1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 当前分支: $currentBranch" -ForegroundColor Green
Write-Host ""

# 检查工作区状态
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "警告: 工作区有未提交的更改" -ForegroundColor Yellow
    Write-Host "建议先提交或暂存当前更改" -ForegroundColor Yellow
    Write-Host ""
}

# 创建备份目录
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "D:\myproject\Test-Web\backup\phase1-consolidation-$timestamp"

if (-not $DryRun) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✅ 创建备份目录: $backupDir" -ForegroundColor Green
    Write-Host ""
}

# 定义要处理的文件
$serviceFiles = @(
    @{
        Wrapper = "frontend/services/api/apiService.ts"
        Main = "frontend/services/api/unifiedApiService.ts"
        Final = "frontend/services/api/apiService.ts"
        Description = "API Service"
    },
    @{
        Main = "frontend/services/unifiedExportManager.ts"
        Final = "frontend/services/exportManager.ts"
        Description = "Export Manager"
    },
    @{
        Main = "frontend/services/unifiedSecurityEngine.ts"
        Final = "frontend/services/securityEngine.ts"
        Description = "Security Engine"
    },
    @{
        Main = "frontend/services/unifiedTestHistoryService.ts"
        Final = "frontend/services/testHistoryService.ts"
        Description = "Test History Service"
    },
    @{
        Main = "frontend/services/cache/unifiedCacheService.ts"
        Final = "frontend/services/cache/cacheService.ts"
        Description = "Cache Service"
    }
)

# 步骤 1: 备份文件
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  步骤 1: 备份原始文件" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($service in $serviceFiles) {
    $mainPath = "D:\myproject\Test-Web\$($service.Main)"
    
    if (Test-Path $mainPath) {
        Write-Host "📦 备份: $($service.Description)" -ForegroundColor Yellow
        
        if (-not $DryRun) {
            $backupPath = Join-Path $backupDir (Split-Path $service.Main -Leaf)
            Copy-Item -Path $mainPath -Destination $backupPath -Force
            Write-Host "   → $backupPath" -ForegroundColor Gray
        } else {
            Write-Host "   [DRY RUN] 将备份到: $backupDir" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  文件不存在: $mainPath" -ForegroundColor Yellow
    }
}

Write-Host ""

# 步骤 2: 处理 API Service (特殊情况 - 有包装器)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  步骤 2: 处理 API Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiWrapper = "D:\myproject\Test-Web\frontend\services\api\apiService.ts"
$apiMain = "D:\myproject\Test-Web\frontend\services\api\unifiedApiService.ts"
$apiTemp = "D:\myproject\Test-Web\frontend\services\api\apiService.temp.ts"

Write-Host "1️⃣  删除包装器文件" -ForegroundColor Yellow
if ($DryRun) {
    Write-Host "   [DRY RUN] git rm $apiWrapper" -ForegroundColor Gray
} else {
    if (Test-Path $apiWrapper) {
        git rm $apiWrapper 2>$null
        Write-Host "   ✅ 已删除: apiService.ts (wrapper)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "2️⃣  重命名主实现文件" -ForegroundColor Yellow
if ($DryRun) {
    Write-Host "   [DRY RUN] git mv $apiMain → apiService.ts" -ForegroundColor Gray
} else {
    if (Test-Path $apiMain) {
        git mv $apiMain $apiWrapper
        Write-Host "   ✅ 已重命名: unifiedApiService.ts → apiService.ts" -ForegroundColor Green
    }
}

Write-Host ""

# 步骤 3: 重命名其他服务文件
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  步骤 3: 重命名其他服务文件" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$otherServices = $serviceFiles | Where-Object { $_.Description -ne "API Service" }

foreach ($service in $otherServices) {
    $mainPath = "D:\myproject\Test-Web\$($service.Main)"
    $finalPath = "D:\myproject\Test-Web\$($service.Final)"
    
    Write-Host "📝 $($service.Description)" -ForegroundColor Yellow
    
    if (Test-Path $mainPath) {
        if ($DryRun) {
            Write-Host "   [DRY RUN] git mv $($service.Main) → $($service.Final)" -ForegroundColor Gray
        } else {
            git mv $mainPath $finalPath
            Write-Host "   ✅ 已重命名" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  文件不存在: $mainPath" -ForegroundColor Yellow
    }
}

Write-Host ""

# 步骤 4: 更新导入语句
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  步骤 4: 更新导入语句" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] 将运行导入更新脚本" -ForegroundColor Gray
    Write-Host "命令: .\scripts\update-unified-imports.ps1" -ForegroundColor Gray
} else {
    & "D:\myproject\Test-Web\scripts\update-unified-imports.ps1"
}

Write-Host ""

# 步骤 5: 显示 Git 状态
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  步骤 5: Git 状态" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $DryRun) {
    git status --short
    Write-Host ""
}

# 完成总结
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Phase 1 执行完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "✅ DRY RUN 完成 - 没有文件被修改" -ForegroundColor Green
    Write-Host ""
    Write-Host "如果确认无误，请运行:" -ForegroundColor Yellow
    Write-Host "  .\scripts\execute-phase1-consolidation.ps1" -ForegroundColor White
} else {
    Write-Host "✅ 所有文件已重命名和更新" -ForegroundColor Green
    Write-Host ""
    Write-Host "📂 备份位置: $backupDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "下一步操作:" -ForegroundColor Yellow
    Write-Host "  1. 检查 Git 状态: git status" -ForegroundColor White
    Write-Host "  2. 查看更改: git diff --stat" -ForegroundColor White
    Write-Host "  3. 运行测试: npm run type-check" -ForegroundColor White
    Write-Host "  4. 提交更改: git add -A" -ForegroundColor White
    Write-Host "  5. 提交: git commit -m \"refactor: remove unified prefix from frontend services\"" -ForegroundColor White
}

Write-Host ""
