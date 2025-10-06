# Frontend Component Diagnosis Script
# 前端组件诊断脚本

param(
    [switch]$Detailed = $false,
    [switch]$CheckImports = $true
)

$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$frontendPath = "D:\myproject\Test-Web\frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  前端组件诊断工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$issues = @{
    Critical = @()
    Warning = @()
    Info = @()
}

# 1. 检查关键目录结构
Write-Host "🔍 检查目录结构..." -ForegroundColor Yellow
$requiredDirs = @(
    "components\ui",
    "components\common",
    "components\layout",
    "components\charts",
    "components\auth",
    "components\routing",
    "pages",
    "contexts",
    "services",
    "utils"
)

foreach ($dir in $requiredDirs) {
    $fullPath = Join-Path $frontendPath $dir
    if (-not (Test-Path $fullPath)) {
        $issues.Critical += "缺少关键目录: $dir"
    }
}

# 2. 检查关键组件文件
Write-Host "🔍 检查关键组件..." -ForegroundColor Yellow
$criticalComponents = @{
    "Layout" = @("components\layout\Layout.tsx", "components\layout\index.ts")
    "ErrorBoundary" = @("components\common\ErrorBoundary.tsx")
    "LoadingSpinner" = @("components\ui\LoadingSpinner.tsx")
    "Button" = @("components\ui\Button.tsx")
    "Card" = @("components\ui\Card.tsx")
    "Modal" = @("components\ui\Modal.tsx")
    "AppRoutes" = @("components\routing\AppRoutes.tsx")
    "AuthContext" = @("contexts\AuthContext.tsx")
    "ThemeContext" = @("contexts\ThemeContext.tsx")
}

$componentStatus = @{}
foreach ($comp in $criticalComponents.Keys) {
    $found = $false
    foreach ($path in $criticalComponents[$comp]) {
        $fullPath = Join-Path $frontendPath $path
        if (Test-Path $fullPath) {
            $found = $true
            $componentStatus[$comp] = "✅ 存在"
            break
        }
    }
    if (-not $found) {
        $componentStatus[$comp] = "❌ 缺失"
        $issues.Critical += "关键组件缺失: $comp"
    }
}

# 3. 检查页面文件
Write-Host "🔍 检查页面组件..." -ForegroundColor Yellow
$requiredPages = @(
    "Login.tsx",
    "Register.tsx",
    "WebsiteTest.tsx",
    "SecurityTest.tsx",
    "PerformanceTest.tsx"
)

$pagesPath = Join-Path $frontendPath "pages"
$missingPages = @()
foreach ($page in $requiredPages) {
    $fullPath = Join-Path $pagesPath $page
    if (-not (Test-Path $fullPath)) {
        $missingPages += $page
        $issues.Warning += "页面组件缺失: $page"
    }
}

# 4. 检查导出一致性
if ($CheckImports) {
    Write-Host "🔍 检查导入导出一致性..." -ForegroundColor Yellow
    
    # 检查 components/ui/index.ts
    $uiIndexPath = Join-Path $frontendPath "components\ui\index.ts"
    if (Test-Path $uiIndexPath) {
        $content = Get-Content $uiIndexPath -Raw
        
        # 检查是否有循环导入
        if ($content -match 'from.+\.\.\/ui') {
            $issues.Warning += "可能存在循环导入: components/ui/index.ts"
        }
        
        # 检查 TestProgress 导入
        if ($content -match "TestProgress.*from.*testProgressService") {
            $issues.Warning += "UI组件导入了服务层的 TestProgress，可能导致混淆"
        }
    }
    
    # 检查 Layout 导出
    $layoutPath = Join-Path $frontendPath "components\layout\Layout.tsx"
    if (Test-Path $layoutPath) {
        $content = Get-Content $layoutPath -Raw
        if ($content -notmatch "export\s+(default\s+)?Layout") {
            $issues.Warning += "Layout.tsx 可能没有正确导出 Layout 组件"
        }
    }
}

# 5. 检查 TypeScript 配置
Write-Host "🔍 检查 TypeScript 配置..." -ForegroundColor Yellow
$tsconfigPath = Join-Path (Split-Path $frontendPath -Parent) "tsconfig.json"
if (-not (Test-Path $tsconfigPath)) {
    $issues.Warning += "未找到 tsconfig.json"
}

# 6. 检查 package.json
Write-Host "🔍 检查依赖配置..." -ForegroundColor Yellow
$packagePath = Join-Path (Split-Path $frontendPath -Parent) "package.json"
if (Test-Path $packagePath) {
    $packageJson = Get-Content $packagePath -Raw | ConvertFrom-Json
    $requiredDeps = @("react", "react-dom", "react-router-dom")
    foreach ($dep in $requiredDeps) {
        if (-not $packageJson.dependencies.$dep) {
            $issues.Critical += "缺少关键依赖: $dep"
        }
    }
} else {
    $issues.Critical += "未找到 package.json"
}

# 输出诊断报告
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  诊断报告" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 组件状态
if ($Detailed) {
    Write-Host "📦 关键组件状态:" -ForegroundColor White
    Write-Host ""
    foreach ($comp in $componentStatus.Keys | Sort-Object) {
        $status = $componentStatus[$comp]
        $color = if ($status -like "*✅*") { "Green" } else { "Red" }
        Write-Host "  $comp : $status" -ForegroundColor $color
    }
    Write-Host ""
}

# 严重问题
if ($issues.Critical.Count -gt 0) {
    Write-Host "❌ 严重问题 ($($issues.Critical.Count)):" -ForegroundColor Red
    Write-Host ""
    $issues.Critical | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "✅ 没有发现严重问题" -ForegroundColor Green
    Write-Host ""
}

# 警告
if ($issues.Warning.Count -gt 0) {
    Write-Host "⚠️  警告 ($($issues.Warning.Count)):" -ForegroundColor Yellow
    Write-Host ""
    $issues.Warning | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor Gray
    }
    Write-Host ""
}

# 信息
if ($issues.Info.Count -gt 0 -and $Detailed) {
    Write-Host "ℹ️  信息 ($($issues.Info.Count)):" -ForegroundColor Cyan
    Write-Host ""
    $issues.Info | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor Gray
    }
    Write-Host ""
}

# 总结
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  总结" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalIssues = $issues.Critical.Count + $issues.Warning.Count
if ($totalIssues -eq 0) {
    Write-Host "🎉 前端组件状态良好，没有发现问题！" -ForegroundColor Green
} else {
    Write-Host "发现 $totalIssues 个问题需要关注" -ForegroundColor Yellow
    
    if ($issues.Critical.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  建议优先修复严重问题" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  建议操作" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 如果有严重问题，请先修复关键组件和依赖" -ForegroundColor White
Write-Host "2. 检查浏览器控制台的错误信息" -ForegroundColor White
Write-Host "3. 尝试重启开发服务器: npm run dev" -ForegroundColor White
Write-Host "4. 清除构建缓存: rm -rf node_modules/.vite" -ForegroundColor White
Write-Host ""

# 返回退出码
if ($issues.Critical.Count -gt 0) {
    exit 1
} else {
    exit 0
}

