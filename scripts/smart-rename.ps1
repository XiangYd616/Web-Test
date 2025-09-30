# 智能重命名脚本 - 处理 Modern 组件和更新所有引用
$ErrorActionPreference = "Stop"
$projectRoot = "D:\myproject\Test-Web\frontend"

Write-Host "🚀 开始智能重命名..." -ForegroundColor Cyan

# 定义重命名映射 (旧名称 -> 新名称)
$componentRenames = @{
    "PlaceholderComponent" = "Placeholder"
    "EnhancedCharts" = "Charts"
    "ModernLayout" = "Layout"
    "ModernSidebar" = "Sidebar"
    "ModernNavigation" = "Navigation"
    "ModernChart" = "Chart"
}

# 定义文件路径映射 (用于移动文件到新位置)
$fileMoveMappings = @{
    "components\modern\ModernLayout.tsx" = "components\layout\Layout.tsx"
    "components\modern\ModernSidebar.tsx" = "components\layout\Sidebar.tsx"
    "components\modern\ModernNavigation.tsx" = "components\navigation\Navigation.tsx"
    "components\modern\ModernChart.tsx" = "components\charts\Chart.tsx"
}

# 函数：在文件中替换文本
function Replace-InFile {
    param(
        [string]$FilePath,
        [string]$OldText,
        [string]$NewText
    )
    
    if (-not (Test-Path $FilePath)) {
        return $false
    }
    
    $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) {
        return $false
    }
    
    $originalContent = $content
    
    # 替换导入语句中的组件名
    $content = $content -replace "import\s+\{\s*([^}]*\b)$OldText(\b[^}]*)\}\s+from", "import { `$1$NewText`$2 } from"
    $content = $content -replace "import\s+$OldText\s+from", "import $NewText from"
    
    # 替换导出语句
    $content = $content -replace "export\s+\{\s*$OldText\s*\}", "export { $NewText }"
    $content = $content -replace "export\s+default\s+$OldText", "export default $NewText"
    
    # 替换组件使用 (JSX)
    $content = $content -replace "<$OldText(\s|>|/)", "<$NewText`$1"
    $content = $content -replace "</$OldText>", "</$NewText>"
    
    # 替换变量/常量声明
    $content = $content -replace "\b$OldText\b", $NewText
    
    if ($content -ne $originalContent) {
        Set-Content -Path $FilePath -Value $content -NoNewline
        return $true
    }
    
    return $false
}

# 步骤 1: 更新所有文件中的引用
Write-Host "`n📝 步骤 1: 更新所有文件中的组件引用..." -ForegroundColor Yellow

$updatedFiles = 0
$componentRenames.GetEnumerator() | ForEach-Object {
    $oldName = $_.Key
    $newName = $_.Value
    
    Write-Host "  🔄 替换: $oldName → $newName" -ForegroundColor Gray
    
    # 查找所有TypeScript/TSX文件
    Get-ChildItem -Path $projectRoot -Include "*.tsx","*.ts" -Recurse -File | ForEach-Object {
        if (Replace-InFile -FilePath $_.FullName -OldText $oldName -NewText $newName) {
            $updatedFiles++
            Write-Host "    ✓ $($_.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "  ✅ 已更新 $updatedFiles 个文件" -ForegroundColor Green

# 步骤 2: 重命名文件
Write-Host "`n📁 步骤 2: 重命名和移动文件..." -ForegroundColor Yellow

$fileMoveMappings.GetEnumerator() | ForEach-Object {
    $oldPath = Join-Path $projectRoot $_.Key
    $newPath = Join-Path $projectRoot $_.Value
    
    if (Test-Path $oldPath) {
        # 确保目标目录存在
        $newDir = Split-Path -Parent $newPath
        if (-not (Test-Path $newDir)) {
            New-Item -ItemType Directory -Path $newDir -Force | Out-Null
            Write-Host "  📁 创建目录: $newDir" -ForegroundColor Yellow
        }
        
        # 移动文件
        Move-Item -Path $oldPath -Destination $newPath -Force
        Write-Host "  ✓ 移动: $($_.Key) → $($_.Value)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  文件不存在: $oldPath" -ForegroundColor Red
    }
}

# 步骤 3: 更新导入路径 (从 modern 到新位置)
Write-Host "`n🔗 步骤 3: 更新导入路径..." -ForegroundColor Yellow

$pathUpdates = @{
    "from ['\`"](.*)\/modern\/ModernLayout" = "from '`$1/layout/Layout"
    "from ['\`"](.*)\/modern\/ModernSidebar" = "from '`$1/layout/Sidebar"
    "from ['\`"](.*)\/modern\/ModernNavigation" = "from '`$1/navigation/Navigation"
    "from ['\`"](.*)\/modern\/ModernChart" = "from '`$1/charts/Chart"
}

$pathUpdatedFiles = 0
Get-ChildItem -Path $projectRoot -Include "*.tsx","*.ts" -Recurse -File | ForEach-Object {
    $filePath = $_.FullName
    $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
    
    if ($null -eq $content) { return }
    
    $originalContent = $content
    
    $pathUpdates.GetEnumerator() | ForEach-Object {
        $pattern = $_.Key
        $replacement = $_.Value
        $content = $content -replace $pattern, $replacement
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $filePath -Value $content -NoNewline
        $pathUpdatedFiles++
        Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
    }
}

Write-Host "  ✅ 已更新 $pathUpdatedFiles 个文件的导入路径" -ForegroundColor Green

# 步骤 4: 更新 index.ts 文件
Write-Host "`n📦 步骤 4: 更新导出文件..." -ForegroundColor Yellow

# 更新 components/modern/index.ts
$modernIndexPath = Join-Path $projectRoot "components\modern\index.ts"
if (Test-Path $modernIndexPath) {
    $content = @"
// Modern 组件的导出已被重构
// 请从各自的新位置导入：
// - Layout 和 Sidebar: components/layout/
// - Navigation: components/navigation/
// - Chart: components/charts/

// 为了向后兼容，保留这些重新导出
export { default as Layout } from '../layout/Layout';
export { default as Sidebar } from '../layout/Sidebar';
export { default as Navigation } from '../navigation/Navigation';
export { default as Chart } from '../charts/Chart';

// 保留 modern 命名空间导出（废弃警告）
/** @deprecated 使用 Layout 代替 */
export { default as ModernLayout } from '../layout/Layout';
/** @deprecated 使用 Sidebar 代替 */
export { default as ModernSidebar } from '../layout/Sidebar';
/** @deprecated 使用 Navigation 代替 */
export { default as ModernNavigation } from '../navigation/Navigation';
/** @deprecated 使用 Chart 代替 */
export { default as ModernChart } from '../charts/Chart';
"@
    Set-Content -Path $modernIndexPath -Value $content
    Write-Host "  ✓ 更新 components/modern/index.ts" -ForegroundColor Green
}

Write-Host "`n✅ 重命名完成！" -ForegroundColor Green
Write-Host "📋 建议接下来:" -ForegroundColor Cyan
Write-Host "  1. 运行: npm run type-check" -ForegroundColor White
Write-Host "  2. 运行: npm run build" -ForegroundColor White
Write-Host "  3. 测试应用功能" -ForegroundColor White
