# Git Worktree 管理脚本
# 用于创建和管理多个工作树
# 用法: .\scripts\manage-worktree.ps1 [action] [options]

param(
    [Parameter(Position=0)]
    [ValidateSet("create", "list", "remove", "open", "help")]
    [string]$Action = "help",
    
    [Parameter(Position=1)]
    [string]$BranchName = "",
    
    [Parameter(Position=2)]
    [string]$WorktreeName = ""
)

$ProjectRoot = "D:\myproject\Test-Web"
$WorktreeParent = "D:\myproject"

function Show-Help {
    Write-Host "Git Worktree 管理工具" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "用法:" -ForegroundColor Yellow
    Write-Host "  .\scripts\manage-worktree.ps1 create <branch-name> [worktree-name]"
    Write-Host "  .\scripts\manage-worktree.ps1 list"
    Write-Host "  .\scripts\manage-worktree.ps1 remove <worktree-name>"
    Write-Host "  .\scripts\manage-worktree.ps1 open <worktree-name>"
    Write-Host ""
    Write-Host "示例:" -ForegroundColor Green
    Write-Host "  .\scripts\manage-worktree.ps1 create feature/user-auth feature-A"
    Write-Host "  .\scripts\manage-worktree.ps1 list"
    Write-Host "  .\scripts\manage-worktree.ps1 open feature-A"
    Write-Host "  .\scripts\manage-worktree.ps1 remove feature-A"
}

function Create-Worktree {
    param(
        [string]$Branch,
        [string]$Name
    )
    
    if ([string]::IsNullOrEmpty($Branch)) {
        Write-Host "❌ 请指定分支名称" -ForegroundColor Red
        Show-Help
        return
    }
    
    if ([string]::IsNullOrEmpty($Name)) {
        # 从分支名自动生成工作树名称
        $Name = "Test-Web-" + ($Branch -replace '/', '-')
    } else {
        $Name = "Test-Web-$Name"
    }
    
    $WorktreePath = Join-Path $WorktreeParent $Name
    
    if (Test-Path $WorktreePath) {
        Write-Host "❌ 工作树已存在: $WorktreePath" -ForegroundColor Red
        return
    }
    
    Write-Host "🔧 创建工作树..." -ForegroundColor Cyan
    Write-Host "  分支: $Branch" -ForegroundColor Gray
    Write-Host "  路径: $WorktreePath" -ForegroundColor Gray
    Write-Host ""
    
    Set-Location $ProjectRoot
    
    # 检查分支是否存在
    $branchExists = git branch --list $Branch
    if ([string]::IsNullOrEmpty($branchExists)) {
        Write-Host "📌 分支不存在，将创建新分支" -ForegroundColor Yellow
        git worktree add -b $Branch $WorktreePath
    } else {
        Write-Host "📌 使用现有分支" -ForegroundColor Yellow
        git worktree add $WorktreePath $Branch
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 工作树创建成功！" -ForegroundColor Green
        Write-Host ""
        Write-Host "📂 路径: $WorktreePath" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "💡 下一步:" -ForegroundColor Yellow
        Write-Host "  1. cd $WorktreePath" -ForegroundColor Gray
        Write-Host "  2. npm install (首次需要安装依赖)" -ForegroundColor Gray
        Write-Host "  3. npm run dev (启动开发服务器)" -ForegroundColor Gray
        Write-Host ""
        
        # 询问是否立即打开
        $openNow = Read-Host "是否立即打开此工作树？(y/n)"
        if ($openNow -eq "y" -or $openNow -eq "Y") {
            Open-Worktree -Name $Name
        }
    } else {
        Write-Host "❌ 创建失败" -ForegroundColor Red
    }
}

function List-Worktrees {
    Write-Host "📋 现有工作树列表:" -ForegroundColor Cyan
    Write-Host ""
    
    Set-Location $ProjectRoot
    git worktree list
    
    Write-Host ""
}

function Remove-Worktree {
    param([string]$Name)
    
    if ([string]::IsNullOrEmpty($Name)) {
        Write-Host "❌ 请指定工作树名称" -ForegroundColor Red
        Show-Help
        return
    }
    
    if (-not $Name.StartsWith("Test-Web-")) {
        $Name = "Test-Web-$Name"
    }
    
    $WorktreePath = Join-Path $WorktreeParent $Name
    
    if (-not (Test-Path $WorktreePath)) {
        Write-Host "❌ 工作树不存在: $WorktreePath" -ForegroundColor Red
        return
    }
    
    Write-Host "⚠️  即将删除工作树: $WorktreePath" -ForegroundColor Yellow
    $confirm = Read-Host "确认删除？(y/n)"
    
    if ($confirm -eq "y" -or $confirm -eq "Y") {
        Write-Host "🗑️  删除中..." -ForegroundColor Cyan
        
        Set-Location $ProjectRoot
        git worktree remove $WorktreePath --force
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 工作树已删除" -ForegroundColor Green
        } else {
            Write-Host "❌ 删除失败" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ 已取消" -ForegroundColor Yellow
    }
}

function Open-Worktree {
    param([string]$Name)
    
    if ([string]::IsNullOrEmpty($Name)) {
        Write-Host "❌ 请指定工作树名称" -ForegroundColor Red
        Show-Help
        return
    }
    
    if (-not $Name.StartsWith("Test-Web-")) {
        $Name = "Test-Web-$Name"
    }
    
    $WorktreePath = Join-Path $WorktreeParent $Name
    
    if (-not (Test-Path $WorktreePath)) {
        Write-Host "❌ 工作树不存在: $WorktreePath" -ForegroundColor Red
        return
    }
    
    Write-Host "🚀 打开工作树: $WorktreePath" -ForegroundColor Cyan
    
    # 在 VS Code 中打开
    code $WorktreePath
    
    # 在新的 PowerShell 窗口中打开
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorktreePath'; Write-Host '工作树: $Name' -ForegroundColor Green; git status"
    
    Write-Host "✅ 已在 VS Code 和新终端中打开" -ForegroundColor Green
}

# 主逻辑
switch ($Action) {
    "create" {
        Create-Worktree -Branch $BranchName -Name $WorktreeName
    }
    "list" {
        List-Worktrees
    }
    "remove" {
        Remove-Worktree -Name $BranchName
    }
    "open" {
        Open-Worktree -Name $BranchName
    }
    "help" {
        Show-Help
    }
    default {
        Show-Help
    }
}

