# 项目结构分析脚本
# 用途: 分析项目结构，生成统计报告

param(
    [switch]$Detailed = $false,
    [string]$Output = "structure-analysis.json"
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  项目结构分析工具" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 分析函数
function Analyze-Directory {
    param(
        [string]$Path,
        [string]$Name
    )
    
    $stats = @{
        Name = $Name
        Path = $Path
        Files = @{}
        TotalFiles = 0
        TotalSize = 0
        Subdirectories = @()
    }
    
    if (-not (Test-Path $Path)) {
        return $stats
    }
    
    # 统计文件类型
    $files = Get-ChildItem -Path $Path -Recurse -File -ErrorAction SilentlyContinue
    
    foreach ($file in $files) {
        $ext = $file.Extension.ToLower()
        if (-not $stats.Files.ContainsKey($ext)) {
            $stats.Files[$ext] = @{
                Count = 0
                Size = 0
                Files = @()
            }
        }
        
        $stats.Files[$ext].Count++
        $stats.Files[$ext].Size += $file.Length
        $stats.TotalFiles++
        $stats.TotalSize += $file.Length
        
        if ($Detailed) {
            $stats.Files[$ext].Files += $file.FullName.Replace($projectRoot, "")
        }
    }
    
    return $stats
}

# 分析主要目录
Write-Host "分析项目结构..." -ForegroundColor Green
Write-Host ""

$analysis = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    ProjectRoot = $projectRoot
    Directories = @{}
    Summary = @{
        TotalFiles = 0
        TotalSize = 0
        FileTypes = @{}
    }
}

$directories = @(
    @{ Path = "frontend"; Name = "Frontend" },
    @{ Path = "backend"; Name = "Backend" },
    @{ Path = "shared"; Name = "Shared" },
    @{ Path = "docs"; Name = "Documentation" },
    @{ Path = "scripts"; Name = "Scripts" },
    @{ Path = "tests"; Name = "Tests" },
    @{ Path = "config"; Name = "Config" }
)

foreach ($dir in $directories) {
    $dirPath = Join-Path $projectRoot $dir.Path
    Write-Host "  分析 $($dir.Name)..." -ForegroundColor Gray
    
    $stats = Analyze-Directory -Path $dirPath -Name $dir.Name
    $analysis.Directories[$dir.Path] = $stats
    
    $analysis.Summary.TotalFiles += $stats.TotalFiles
    $analysis.Summary.TotalSize += $stats.TotalSize
    
    # 合并文件类型统计
    foreach ($ext in $stats.Files.Keys) {
        if (-not $analysis.Summary.FileTypes.ContainsKey($ext)) {
            $analysis.Summary.FileTypes[$ext] = @{
                Count = 0
                Size = 0
            }
        }
        $analysis.Summary.FileTypes[$ext].Count += $stats.Files[$ext].Count
        $analysis.Summary.FileTypes[$ext].Size += $stats.Files[$ext].Size
    }
}

# 检测重复文件
Write-Host ""
Write-Host "检测重复文件..." -ForegroundColor Green

$duplicates = @{
    JSandTS = @()
    SameContent = @()
}

# 检查 JS/TS 重复
$sharedPath = Join-Path $projectRoot "shared"
if (Test-Path $sharedPath) {
    $jsFiles = Get-ChildItem -Path $sharedPath -Recurse -Filter "*.js" -ErrorAction SilentlyContinue
    foreach ($jsFile in $jsFiles) {
        $tsFile = $jsFile.FullName -replace "\.js$", ".ts"
        if (Test-Path $tsFile) {
            $duplicates.JSandTS += @{
                JS = $jsFile.FullName.Replace($projectRoot, "")
                TS = $tsFile.Replace($projectRoot, "")
            }
        }
    }
}

$analysis.Duplicates = $duplicates

# 输出报告
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "分析报告" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "总体统计:" -ForegroundColor Yellow
Write-Host "  总文件数: $($analysis.Summary.TotalFiles)" -ForegroundColor White
Write-Host "  总大小: $([math]::Round($analysis.Summary.TotalSize / 1MB, 2)) MB" -ForegroundColor White
Write-Host ""

Write-Host "按目录统计:" -ForegroundColor Yellow
foreach ($dir in $analysis.Directories.Keys | Sort-Object) {
    $stats = $analysis.Directories[$dir]
    Write-Host "  $($stats.Name):" -ForegroundColor Cyan
    Write-Host "    文件数: $($stats.TotalFiles)" -ForegroundColor White
    Write-Host "    大小: $([math]::Round($stats.TotalSize / 1MB, 2)) MB" -ForegroundColor White
    
    if ($stats.Files.Count -gt 0) {
        $topTypes = $stats.Files.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending | Select-Object -First 5
        Write-Host "    主要文件类型:" -ForegroundColor Gray
        foreach ($type in $topTypes) {
            Write-Host "      $($type.Key): $($type.Value.Count) 个文件" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

Write-Host "文件类型统计:" -ForegroundColor Yellow
$sortedTypes = $analysis.Summary.FileTypes.GetEnumerator() | Sort-Object { $_.Value.Count } -Descending
foreach ($type in $sortedTypes) {
    $ext = if ($type.Key) { $type.Key } else { "(无扩展名)" }
    Write-Host "  $ext : $($type.Value.Count) 个文件 ($([math]::Round($type.Value.Size / 1KB, 2)) KB)" -ForegroundColor White
}

Write-Host ""
Write-Host "重复文件检测:" -ForegroundColor Yellow
if ($duplicates.JSandTS.Count -gt 0) {
    Write-Host "  发现 $($duplicates.JSandTS.Count) 组 JS/TS 重复文件:" -ForegroundColor Red
    foreach ($dup in $duplicates.JSandTS) {
        Write-Host "    - $($dup.JS) ↔ $($dup.TS)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✓ 未发现 JS/TS 重复文件" -ForegroundColor Green
}

# 保存 JSON 报告
$outputPath = Join-Path $projectRoot $Output
$analysis | ConvertTo-Json -Depth 10 | Set-Content $outputPath
Write-Host ""
Write-Host "详细报告已保存到: $Output" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "分析完成!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
