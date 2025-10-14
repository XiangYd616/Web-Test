# 更新导入引用脚本
$ErrorActionPreference = "Continue"
$projectRoot = "D:\myproject\Test-Web\frontend"

Write-Host "=== 开始更新导入引用 ===" -ForegroundColor Cyan
Write-Host ""

# 统计变量
$totalFiles = 0
$updatedFiles = 0

# 定义替换规则
$replacements = @(
    @{
        Pattern = "from\s+['\`"](.*)\/modern\/ModernLayout['\`"]"
        Replacement = "from '`$1/layout/Layout'"
        Name = "ModernLayout -> Layout"
    },
    @{
        Pattern = "from\s+['\`"](.*)\/modern\/ModernSidebar['\`"]"
        Replacement = "from '`$1/layout/Sidebar'"
        Name = "ModernSidebar -> Sidebar"
    },
    @{
        Pattern = "from\s+['\`"](.*)\/modern\/ModernNavigation['\`"]"
        Replacement = "from '`$1/navigation/Navigation'"
        Name = "ModernNavigation -> Navigation"
    },
    @{
        Pattern = "from\s+['\`"](.*)\/modern\/ModernChart['\`"]"
        Replacement = "from '`$1/charts/Chart'"
        Name = "ModernChart -> Chart"
    },
    @{
        Pattern = "from\s+['\`"](.*)\/modern['\`"]"
        Replacement = "from '`$1/layout'"
        Name = "modern index -> layout"
    }
)

# 组件名称替换
$componentReplacements = @(
    @{ Old = "\bModernLayout\b"; New = "Layout" },
    @{ Old = "\bModernSidebar\b"; New = "Sidebar" },
    @{ Old = "\bModernNavigation\b"; New = "Navigation" },
    @{ Old = "\bModernChart\b"; New = "Chart" },
    @{ Old = "\bModernDashboard\b"; New = "Dashboard" },
    @{ Old = "\bPlaceholderComponent\b"; New = "Placeholder" },
    @{ Old = "\bEnhancedCharts\b"; New = "Charts" }
)

# 处理单个文件
function Update-FileImports {
    param(
        [string]$FilePath
    )
    
    try {
        $content = Get-Content $FilePath -Raw -ErrorAction Stop
        $originalContent = $content
        $fileModified = $false
        
        # 应用路径替换
        foreach ($rule in $replacements) {
            if ($content -match $rule.Pattern) {
                $content = $content -replace $rule.Pattern, $rule.Replacement
                $fileModified = $true
            }
        }
        
        # 应用组件名称替换
        foreach ($comp in $componentReplacements) {
            if ($content -match $comp.Old) {
                $content = $content -replace $comp.Old, $comp.New
                $fileModified = $true
            }
        }
        
        # 如果内容有变化，保存文件
        if ($fileModified -and $content -ne $originalContent) {
            Set-Content -Path $FilePath -Value $content -NoNewline -Encoding UTF8
            return $true
        }
        
        return $false
    }
    catch {
        Write-Host "  Error processing file: $FilePath" -ForegroundColor Red
        Write-Host "  $_" -ForegroundColor Red
        return $false
    }
}

# 查找并处理所有文件
Write-Host "Searching for TypeScript/TSX files..." -ForegroundColor Yellow
$files = Get-ChildItem -Path $projectRoot -Include "*.tsx","*.ts" -Recurse -File

$totalFiles = $files.Count
Write-Host "Found $totalFiles files to process" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($projectRoot.Length + 1)
    
    if (Update-FileImports -FilePath $file.FullName) {
        $updatedFiles++
        Write-Host "[UPDATED] $relativePath" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Update Complete ===" -ForegroundColor Cyan
Write-Host "Total files scanned: $totalFiles" -ForegroundColor White
Write-Host "Files updated: $updatedFiles" -ForegroundColor Green
Write-Host ""

if ($updatedFiles -gt 0) {
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. npm run type-check" -ForegroundColor White
    Write-Host "2. npm run build" -ForegroundColor White
    Write-Host "3. npm run dev (test the application)" -ForegroundColor White
}
