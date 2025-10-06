# ============================================
# Git Worktree 自动设置脚本
# 为多窗口开发创建独立的工作树
# ============================================

param(
    [switch]$Force = $false,  # 强制重新创建
    [switch]$SkipInstall = $false  # 跳过npm install
)

$ErrorActionPreference = "Stop"

$baseDir = "D:\myproject"
$mainRepo = "$baseDir\Test-Web"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Git Worktree 多工作树设置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查主仓库
if (-not (Test-Path $mainRepo)) {
    Write-Host "❌ 错误：主仓库不存在: $mainRepo" -ForegroundColor Red
    exit 1
}

# 切换到主仓库
cd $mainRepo

# 检查是否是Git仓库
if (-not (Test-Path ".git")) {
    Write-Host "❌ 错误：不是Git仓库" -ForegroundColor Red
    exit 1
}

Write-Host "📂 主仓库: $mainRepo" -ForegroundColor Green
Write-Host "📊 当前分支: $(git branch --show-current)" -ForegroundColor Gray
Write-Host ""

# 定义工作树配置
$worktrees = @(
    @{
        Name = 'Test-Web-frontend'
        Branch = 'feature/frontend-ui-dev'
        Description = 'Frontend UI Development'
        Port = '5174'
        Command = 'npm run frontend'
    },
    @{
        Name = 'Test-Web-backend'
        Branch = 'feature/backend-api-dev'
        Description = 'Backend API Development'
        Port = '3001'
        Command = 'npm run backend:dev'
    },
    @{
        Name = 'Test-Web-electron'
        Branch = 'feature/electron-integration'
        Description = 'Electron Integration'
        Port = '-'
        Command = 'npm run electron:dev'
    },
    @{
        Name = 'Test-Web-testing'
        Branch = 'test/integration-testing'
        Description = 'Testing and Maintenance'
        Port = '-'
        Command = 'npm run test:watch'
    }
)

# 显示计划
Write-Host "📋 将创建以下工作树：" -ForegroundColor Yellow
Write-Host ""
foreach ($wt in $worktrees) {
    Write-Host "  • $($wt.Name)" -ForegroundColor White
    Write-Host "    分支: $($wt.Branch)" -ForegroundColor Gray
    Write-Host "    用途: $($wt.Description)" -ForegroundColor Gray
    Write-Host "    端口: $($wt.Port)" -ForegroundColor Gray
    Write-Host ""
}

# 确认
if (-not $Force) {
    $confirm = Read-Host "是否继续？(y/n)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "❌ 已取消" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "🚀 开始创建工作树..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$skipCount = 0

foreach ($wt in $worktrees) {
    $path = "$baseDir\$($wt.Name)"
    
    Write-Host "────────────────────────────────────" -ForegroundColor Gray
    Write-Host "📁 处理: $($wt.Name)" -ForegroundColor Cyan
    
    # 检查目录是否已存在
    if (Test-Path $path) {
        if ($Force) {
            Write-Host "⚠️  工作树已存在，删除旧的..." -ForegroundColor Yellow
            try {
                # 先尝试通过git移除
                git worktree remove "..\$($wt.Name)" --force 2>$null
                # 再删除目录
                Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Host "⚠️  删除失败，跳过: $_" -ForegroundColor Yellow
                $skipCount++
                continue
            }
        } else {
            Write-Host "⚠️  工作树已存在，跳过" -ForegroundColor Yellow
            $skipCount++
            continue
        }
    }
    
    try {
        # 检查分支是否存在，不存在则创建
        $branchExists = git branch --list $wt.Branch
        if (-not $branchExists) {
            Write-Host "🌿 创建新分支: $($wt.Branch)" -ForegroundColor Green
            git branch $wt.Branch 2>&1 | Out-Null
        } else {
            Write-Host "✓ 分支已存在: $($wt.Branch)" -ForegroundColor Gray
        }
        
        # 创建工作树
        Write-Host "📦 创建工作树..." -ForegroundColor Green
        git worktree add "..\$($wt.Name)" $wt.Branch 2>&1 | Out-Null
        
        if (-not (Test-Path $path)) {
            throw "工作树创建失败"
        }
        
        Write-Host "✅ 工作树创建成功: $path" -ForegroundColor Green
        
        # 安装依赖
        if (-not $SkipInstall) {
            Write-Host "📦 安装NPM依赖（这可能需要几分钟）..." -ForegroundColor Cyan
            cd $path
            
            # 静默安装
            $installOutput = npm install 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ 依赖安装完成" -ForegroundColor Green
            } else {
                Write-Host "⚠️  依赖安装失败，请手动运行 'npm install'" -ForegroundColor Yellow
                Write-Host "错误: $installOutput" -ForegroundColor Red
            }
            
            cd $mainRepo
        } else {
            Write-Host "⏭️  跳过依赖安装（使用 -SkipInstall）" -ForegroundColor Gray
        }
        
        $successCount++
        
    } catch {
        Write-Host "❌ 创建失败: $_" -ForegroundColor Red
        # 清理失败的工作树
        if (Test-Path $path) {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ 工作树设置完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 统计：" -ForegroundColor Yellow
Write-Host "  成功创建: $successCount" -ForegroundColor Green
Write-Host "  跳过: $skipCount" -ForegroundColor Gray
Write-Host ""

# 显示所有工作树
Write-Host "📋 当前所有工作树：" -ForegroundColor Yellow
Write-Host ""
git worktree list
Write-Host ""

# 显示使用说明
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎯 使用指南" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($wt in $worktrees) {
    $path = "$baseDir\$($wt.Name)"
    if (Test-Path $path) {
        Write-Host "🪟 $($wt.Description)" -ForegroundColor White
        Write-Host "   cd $path" -ForegroundColor Gray
        Write-Host "   $($wt.Command)" -ForegroundColor Cyan
        if ($wt.Port -ne "-") {
            Write-Host "   端口: $($wt.Port)" -ForegroundColor Gray
        }
        Write-Host ""
    }
}

Write-Host "💡 提示：" -ForegroundColor Yellow
Write-Host "  - 每个工作树都是独立的工作目录" -ForegroundColor Gray
Write-Host "  - 可以同时运行不同分支的服务" -ForegroundColor Gray
Write-Host "  - 共享同一个 .git 仓库（节省空间）" -ForegroundColor Gray
Write-Host "  - 使用 'git worktree list' 查看所有工作树" -ForegroundColor Gray
Write-Host "  - 使用 'git worktree remove <path>' 删除工作树" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 快速启动脚本已更新！" -ForegroundColor Green
Write-Host "   运行 .\scripts\start-worktree-dev.ps1 启动多窗口开发" -ForegroundColor Cyan
Write-Host ""

