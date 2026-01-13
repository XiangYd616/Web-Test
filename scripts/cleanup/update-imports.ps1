# 更新导入路径脚本
# 用途: 将所有 .js 导入更新为 .ts

param(
    [switch]$DryRun = $false,
    [string]$Path = "."
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
$targetPath = Join-Path $projectRoot $Path

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  导入路径更新工具" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] 不会实际修改文件" -ForegroundColor Yellow
    Write-Host ""
}

# 定义需要更新的导入模式
$importPatterns = @(
    @{
        Old = "from ['\`"]@shared/index.js['\`"]"
        New = "from '@shared/index'"
        Description = "@shared/index.js → @shared/index"
    },
    @{
        Old = "from ['\`"]@shared/types/index.js['\`"]"
        New = "from '@shared/types'"
        Description = "@shared/types/index.js → @shared/types"
    },
    @{
        Old = "from ['\`"]@shared/utils/apiResponseBuilder.js['\`"]"
        New = "from '@shared/utils/apiResponseBuilder'"
        Description = "apiResponseBuilder.js → apiResponseBuilder"
    },
    @{
        Old = "from ['\`"]\.\./shared/index.js['\`"]"
        New = "from '../shared/index'"
        Description = "../shared/index.js → ../shared/index"
    },
    @{
        Old = "require\(['\`"]@shared/index.js['\`"]\)"
        New = "require('@shared/index')"
        Description = "require(@shared/index.js) → require(@shared/index)"
    }
)

Write-Host "搜索需要更新的文件..." -ForegroundColor Green
Write-Host ""

# 查找所有 JS/TS 文件
$files = Get-ChildItem -Path $targetPath -Recurse -Include "*.js","*.ts","*.tsx","*.jsx" -Exclude "node_modules","dist","build" -ErrorAction SilentlyContinue

$updatedFiles = @()
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($pattern in $importPatterns) {
        if ($content -match $pattern.Old) {
            $content = $content -replace $pattern.Old, $pattern.New
            $fileReplacements++
        }
    }
    
    if ($content -ne $originalContent) {
        $relativePath = $file.FullName.Replace($projectRoot, "").TrimStart("\")
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] 将更新: $relativePath" -ForegroundColor Cyan
            Write-Host "    替换次数: $fileReplacements" -ForegroundColor Gray
        } else {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "  ✓ 已更新: $relativePath" -ForegroundColor Green
            Write-Host "    替换次数: $fileReplacements" -ForegroundColor Gray
        }
        
        $updatedFiles += $relativePath
        $totalReplacements += $fileReplacements
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "更新完成!" -ForegroundColor Green
Write-Host "  更新文件数: $($updatedFiles.Count)" -ForegroundColor Green
Write-Host "  总替换次数: $totalReplacements" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

if ($updatedFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "已更新的文件:" -ForegroundColor Cyan
    foreach ($file in $updatedFiles) {
        Write-Host "  - $file" -ForegroundColor Gray
    }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "这是预演模式。要实际更新文件，请运行:" -ForegroundColor Yellow
    Write-Host "  .\scripts\cleanup\update-imports.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "建议后续操作:" -ForegroundColor Cyan
Write-Host "1. 运行 TypeScript 检查: npm run type-check" -ForegroundColor Gray
Write-Host "2. 运行 Lint 检查: npm run lint" -ForegroundColor Gray
Write-Host "3. 运行测试: npm test" -ForegroundColor Gray
