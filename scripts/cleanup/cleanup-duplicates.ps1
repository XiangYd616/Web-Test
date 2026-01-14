# 清理重复文件脚本
# 用途: 删除 shared 模块中的重复 JS 文件，保留 TS 版本

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  项目重复文件清理工具" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] 不会实际删除文件" -ForegroundColor Yellow
    Write-Host ""
}

# 定义要删除的重复文件
$duplicateFiles = @(
    "shared\index.js",
    "shared\types\index.js",
    "shared\constants\index.js",
    "shared\utils\index.js",
    "shared\utils\apiResponseBuilder.js"
)

# 检查对应的 TS 文件是否存在
$tsFiles = @(
    "shared\index.ts",
    "shared\types\index.ts",
    "shared\constants\index.ts",
    "shared\utils\index.ts",
    "shared\utils\apiResponseBuilder.ts"
)

Write-Host "步骤 1: 验证 TypeScript 文件存在..." -ForegroundColor Green
$allTsExist = $true
for ($i = 0; $i -lt $tsFiles.Length; $i++) {
    $tsPath = Join-Path $projectRoot $tsFiles[$i]
    if (Test-Path $tsPath) {
        Write-Host "  ✓ 找到: $($tsFiles[$i])" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ 缺失: $($tsFiles[$i])" -ForegroundColor Red
        $allTsExist = $false
    }
}

if (-not $allTsExist) {
    Write-Host ""
    Write-Host "错误: 部分 TypeScript 文件不存在，无法安全删除 JS 文件" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "步骤 2: 检查 JS 文件引用..." -ForegroundColor Green

# 搜索项目中对这些 JS 文件的引用
$references = @{}
foreach ($file in $duplicateFiles) {
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($file)
    $pattern = "$fileName\.js"
    
    # 在 backend 和 frontend 中搜索引用
    $backendRefs = Get-ChildItem -Path (Join-Path $projectRoot "backend") -Recurse -Include "*.js","*.ts" -ErrorAction SilentlyContinue | 
        Select-String -Pattern $pattern -SimpleMatch | 
        Select-Object -ExpandProperty Path -Unique
    
    $frontendRefs = Get-ChildItem -Path (Join-Path $projectRoot "frontend") -Recurse -Include "*.js","*.ts","*.tsx" -ErrorAction SilentlyContinue | 
        Select-String -Pattern $pattern -SimpleMatch | 
        Select-Object -ExpandProperty Path -Unique
    
    $allRefs = @($backendRefs) + @($frontendRefs)
    
    if ($allRefs.Count -gt 0) {
        $references[$file] = $allRefs
        Write-Host "  ⚠ $file 有 $($allRefs.Count) 个引用" -ForegroundColor Yellow
        if ($Verbose) {
            foreach ($ref in $allRefs) {
                Write-Host "    - $ref" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "  ✓ $file 无引用" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "步骤 3: 删除重复文件..." -ForegroundColor Green

$deletedCount = 0
$skippedCount = 0

foreach ($file in $duplicateFiles) {
    $filePath = Join-Path $projectRoot $file
    
    if (Test-Path $filePath) {
        if ($references.ContainsKey($file) -and $references[$file].Count -gt 0) {
            Write-Host "  ⊘ 跳过 (有引用): $file" -ForegroundColor Yellow
            $skippedCount++
        } else {
            if ($DryRun) {
                Write-Host "  [DRY RUN] 将删除: $file" -ForegroundColor Cyan
            } else {
                Remove-Item $filePath -Force
                Write-Host "  ✓ 已删除: $file" -ForegroundColor Green
            }
            $deletedCount++
        }
    } else {
        Write-Host "  - 不存在: $file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "清理完成!" -ForegroundColor Green
Write-Host "  删除: $deletedCount 个文件" -ForegroundColor Green
Write-Host "  跳过: $skippedCount 个文件 (有引用)" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

if ($skippedCount -gt 0) {
    Write-Host ""
    Write-Host "⚠ 注意: 有 $skippedCount 个文件因为存在引用而被跳过" -ForegroundColor Yellow
    Write-Host "请先更新这些引用，将 .js 改为 .ts，然后重新运行此脚本" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "建议操作:" -ForegroundColor Cyan
    Write-Host "1. 运行: npm run lint:fix" -ForegroundColor Gray
    Write-Host "2. 手动检查并更新引用" -ForegroundColor Gray
    Write-Host "3. 重新运行此脚本" -ForegroundColor Gray
}

if ($DryRun) {
    Write-Host ""
    Write-Host "这是预演模式。要实际删除文件，请运行:" -ForegroundColor Yellow
    Write-Host "  .\scripts\cleanup\cleanup-duplicates.ps1" -ForegroundColor Cyan
}
