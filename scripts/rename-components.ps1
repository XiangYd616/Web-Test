# 前端组件重命名脚本
# 移除不必要的修饰词：Modern, Enhanced, Advanced, Placeholder 等

$ErrorActionPreference = "Stop"
$projectRoot = "D:\myproject\Test-Web"

Write-Host "🚀 开始重命名前端组件..." -ForegroundColor Cyan

# 定义重命名映射
$renameMappings = @{
    # Modern 系列组件 - 移动到合适的目录
    "frontend\components\modern\ModernLayout.tsx" = "frontend\components\layout\Layout.tsx"
    "frontend\components\modern\ModernSidebar.tsx" = "frontend\components\layout\Sidebar.tsx"
    "frontend\components\modern\ModernNavigation.tsx" = "frontend\components\navigation\Navigation.tsx"
    "frontend\components\modern\ModernChart.tsx" = "frontend\components\charts\Chart.tsx"
    "frontend\components\modern\ModernDashboard.tsx" = "frontend\pages\dashboard\Dashboard.tsx"
    "frontend\components\modern\UserDropdownMenu.tsx" = "frontend\components\user\UserDropdown.tsx"
    
    # Enhanced/Advanced 系列组件
    "frontend\components\charts\EnhancedCharts.tsx" = "frontend\components\charts\Charts.tsx"
    "frontend\components\common\PlaceholderComponent.tsx" = "frontend\components\common\Placeholder.tsx"
    
    # 服务文件
    "frontend\services\advancedDataService.ts" = "frontend\services\dataService.ts"
    "frontend\services\realBackgroundTestManager.ts" = "frontend\services\backgroundTestManager.ts"
    "frontend\services\realTimeMonitoringService.ts" = "frontend\services\monitoringService.ts"
    
    # 样式文件
    "frontend\styles\unified-theme-variables.css" = "frontend\styles\theme-variables.css"
    "frontend\styles\unified-design-system.css" = "frontend\styles\design-system.css"
}

# 函数：创建目录（如果不存在）
function Ensure-Directory {
    param([string]$path)
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  📁 创建目录: $dir" -ForegroundColor Yellow
    }
}

# 函数：更新文件中的导入引用
function Update-Imports {
    param(
        [string]$oldPath,
        [string]$newPath
    )
    
    $oldFileName = [System.IO.Path]::GetFileNameWithoutExtension($oldPath)
    $newFileName = [System.IO.Path]::GetFileNameWithoutExtension($newPath)
    $oldRelPath = $oldPath -replace '\\', '/'
    $newRelPath = $newPath -replace '\\', '/'
    
    # 在所有 .tsx, .ts, .js 文件中查找并替换导入
    $searchPatterns = @(
        "from ['\`"].*$oldFileName",
        "import.*$oldFileName",
        "/$oldFileName['\`"]"
    )
    
    Write-Host "  🔍 更新引用: $oldFileName -> $newFileName" -ForegroundColor Gray
    
    # 递归查找所有需要更新的文件
    Get-ChildItem -Path "$projectRoot\frontend" -Include "*.tsx","*.ts","*.jsx","*.js" -Recurse | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $modified = $false
            
            # 替换组件名称
            if ($content -match $oldFileName) {
                $content = $content -replace "\b$oldFileName\b", $newFileName
                $modified = $true
            }
            
            # 替换导入路径
            $content = $content -replace "from\s+['\`"](.*)/$oldFileName(['\`"])", "from '`$1/$newFileName`$2"
            $content = $content -replace "import\s+(.*)from\s+['\`"](.*)/$oldFileName(['\`"])", "import `$1from '`$2/$newFileName`$3"
            
            if ($modified -or $content -ne (Get-Content $_.FullName -Raw)) {
                Set-Content -Path $_.FullName -Value $content -NoNewline
                Write-Host "    ✓ 更新文件: $($_.Name)" -ForegroundColor Green
            }
        }
    }
}

# 执行重命名
$totalRenamed = 0
foreach ($mapping in $renameMappings.GetEnumerator()) {
    $oldFullPath = Join-Path $projectRoot $mapping.Key
    $newFullPath = Join-Path $projectRoot $mapping.Value
    
    if (Test-Path $oldFullPath) {
        Write-Host "`n📝 重命名: $($mapping.Key)" -ForegroundColor Yellow
        Write-Host "   -> $($mapping.Value)" -ForegroundColor Green
        
        # 确保目标目录存在
        Ensure-Directory $newFullPath
        
        # 移动文件
        Move-Item -Path $oldFullPath -Destination $newFullPath -Force
        
        # 更新所有引用
        Update-Imports -oldPath $mapping.Key -newPath $mapping.Value
        
        $totalRenamed++
    } else {
        Write-Host "⚠️  文件不存在: $($mapping.Key)" -ForegroundColor Red
    }
}

Write-Host "`n✅ 完成！共重命名 $totalRenamed 个文件" -ForegroundColor Green
Write-Host "📋 建议接下来执行: npm run type-check" -ForegroundColor Cyan
