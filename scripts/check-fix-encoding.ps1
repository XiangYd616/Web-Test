# Encoding Check and Fix Script
# 检查和修复项目中的文件编码问题

param(
    [switch]$Fix = $false,
    [switch]$CheckOnly = $false
)

# 设置控制台编码为 UTF-8
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectRoot = "D:\myproject\Test-Web"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Encoding Check Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 需要检查的文件类型
$filePatterns = @(
    "*.md"
    "*.ts"
    "*.tsx"
    "*.js"
    "*.jsx"
    "*.json"
    "*.css"
)

$excludeDirs = @(
    "node_modules"
    ".git"
    "dist"
    "dist-electron"
    "coverage"
    "build"
)

Write-Host "Scanning files..." -ForegroundColor Yellow

$filesToCheck = @()
foreach ($pattern in $filePatterns) {
    $files = Get-ChildItem -Path $projectRoot -Filter $pattern -Recurse -File | Where-Object {
        $path = $_.FullName
        $exclude = $false
        foreach ($dir in $excludeDirs) {
            if ($path -match [regex]::Escape($dir)) {
                $exclude = $true
                break
            }
        }
        -not $exclude
    }
    $filesToCheck += $files
}

Write-Host "Found $($filesToCheck.Count) files to check" -ForegroundColor Gray
Write-Host ""

$issueFiles = @()
$utf8WithBom = 0
$utf8NoBom = 0
$otherEncoding = 0

foreach ($file in $filesToCheck) {
    try {
        # 读取文件的前几个字节检查 BOM
        $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
        
        if ($bytes.Length -ge 3) {
            # 检查 UTF-8 BOM
            if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
                $utf8WithBom++
                continue
            }
        }
        
        # 尝试用 UTF-8 读取
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        
        # 检查是否包含中文字符
        if ($content -match '[\u4e00-\u9fff]') {
            # 检查是否有乱码（典型的 GBK -> UTF-8 乱码模式）
            if ($content -match '[\u00c0-\u00ff]{2,}') {
                $issueFiles += [PSCustomObject]@{
                    Path = $file.FullName.Replace($projectRoot, "").TrimStart("\")
                    Issue = "Potential encoding issue (possible GBK/GB2312)"
                    HasChinese = $true
                }
                $otherEncoding++
            } else {
                $utf8NoBom++
            }
        } else {
            $utf8NoBom++
        }
        
    } catch {
        Write-Host "Error checking file: $($file.FullName)" -ForegroundColor Red
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Scan Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "UTF-8 with BOM: $utf8WithBom files" -ForegroundColor Green
Write-Host "UTF-8 (no BOM): $utf8NoBom files" -ForegroundColor Green
Write-Host "Potential Issues: $otherEncoding files" -ForegroundColor Yellow
Write-Host ""

if ($issueFiles.Count -gt 0) {
    Write-Host "Files with potential encoding issues:" -ForegroundColor Yellow
    Write-Host ""
    
    $issueFiles | ForEach-Object {
        Write-Host "  $($_.Path)" -ForegroundColor White
        Write-Host "    Issue: $($_.Issue)" -ForegroundColor Gray
    }
    
    Write-Host ""
    
    if ($Fix) {
        Write-Host "Fixing encoding issues..." -ForegroundColor Yellow
        
        $fixed = 0
        foreach ($issue in $issueFiles) {
            try {
                $fullPath = Join-Path $projectRoot $issue.Path
                
                # 备份原文件
                $backupPath = "$fullPath.backup"
                Copy-Item $fullPath $backupPath -Force
                
                # 尝试用 GB2312 读取，用 UTF-8 保存
                try {
                    $gb2312 = [System.Text.Encoding]::GetEncoding("GB2312")
                    $content = [System.IO.File]::ReadAllText($fullPath, $gb2312)
                    [System.IO.File]::WriteAllText($fullPath, $content, [System.Text.UTF8Encoding]::new($false))
                    
                    Write-Host "  Fixed: $($issue.Path)" -ForegroundColor Green
                    $fixed++
                    
                    # 删除备份
                    Remove-Item $backupPath -Force
                    
                } catch {
                    # 如果 GB2312 失败，恢复备份
                    Move-Item $backupPath $fullPath -Force
                    Write-Host "  Failed to fix: $($issue.Path)" -ForegroundColor Red
                }
                
            } catch {
                Write-Host "  Error fixing: $($issue.Path)" -ForegroundColor Red
            }
        }
        
        Write-Host ""
        Write-Host "Fixed $fixed out of $($issueFiles.Count) files" -ForegroundColor Green
        
    } elseif (-not $CheckOnly) {
        Write-Host "Run with -Fix flag to automatically fix encoding issues" -ForegroundColor Cyan
        Write-Host "Example: .\scripts\check-fix-encoding.ps1 -Fix" -ForegroundColor Gray
    }
} else {
    Write-Host "No encoding issues found! All files are properly encoded." -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Recommendations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Always save files as UTF-8 (without BOM for code files)" -ForegroundColor White
Write-Host "2. Configure your editor:" -ForegroundColor White
Write-Host "   - VS Code: 'files.encoding': 'utf8'" -ForegroundColor Gray
Write-Host "   - VS Code: 'files.autoGuessEncoding': false" -ForegroundColor Gray
Write-Host "3. For Git, ensure: git config --global core.quotepath false" -ForegroundColor White
Write-Host ""

