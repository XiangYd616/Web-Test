# 项目结构分析和清理脚本
# 检查文件命名、多版本问题和结构合规性

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   🔍 项目结构分析和清理检查" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

$projectRoot = "D:\myproject\Test-Web"
$analysisResults = @{
    BackupFiles = @()
    DamagedFiles = @()
    TemporaryFiles = @()
    DuplicateFiles = @()
    BinaryBackups = @()
    PhaseBackups = @()
    NamingIssues = @()
    UnusualExtensions = @()
    EmptyDirectories = @()
    LargeFiles = @()
}

Write-Host "📁 扫描项目文件..." -ForegroundColor Yellow

# 1. 检查备份文件和临时文件
Write-Host "`n1️⃣ 检查备份和临时文件..." -ForegroundColor Cyan

$backupPatterns = @(
    "*.backup",
    "*.bak",
    "*.old",
    "*-backup",
    "*.pre-fix-backup",
    "*.before-*",
    "*.damaged*",
    "*.phase*-backup",
    "*.final-fix",
    "*.current-broken",
    "*.binary-backup"
)

foreach ($pattern in $backupPatterns) {
    $files = Get-ChildItem -Path $projectRoot -Recurse -Filter $pattern -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace($projectRoot + "\", "")
        $size = [math]::Round($file.Length / 1KB, 2)
        
        if ($file.Name -match "damaged") {
            $analysisResults.DamagedFiles += [PSCustomObject]@{
                Path = $relativePath
                Size = $size
                LastModified = $file.LastWriteTime
            }
        }
        elseif ($file.Name -match "backup|bak|old") {
            $analysisResults.BackupFiles += [PSCustomObject]@{
                Path = $relativePath
                Size = $size
                LastModified = $file.LastWriteTime
            }
        }
        elseif ($file.Name -match "phase\d+-backup") {
            $analysisResults.PhaseBackups += [PSCustomObject]@{
                Path = $relativePath
                Size = $size
                LastModified = $file.LastWriteTime
            }
        }
        elseif ($file.Name -match "binary-backup") {
            $analysisResults.BinaryBackups += [PSCustomObject]@{
                Path = $relativePath
                Size = $size
                LastModified = $file.LastWriteTime
            }
        }
        elseif ($file.Name -match "before-|final-fix|current-broken|pre-fix") {
            $analysisResults.TemporaryFiles += [PSCustomObject]@{
                Path = $relativePath
                Size = $size
                LastModified = $file.LastWriteTime
            }
        }
    }
}

# 2. 检查重复文件（多版本问题）
Write-Host "2️⃣ 检查重复文件和多版本问题..." -ForegroundColor Cyan

$sourceFiles = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "\.(backup|bak|old|damaged|phase\d+-backup|before-|final-fix|current-broken|pre-fix|binary-backup)" }

$fileGroups = $sourceFiles | Group-Object -Property Name | Where-Object { $_.Count -gt 1 }

foreach ($group in $fileGroups) {
    $files = $group.Group | ForEach-Object {
        [PSCustomObject]@{
            Name = $_.Name
            Path = $_.FullName.Replace($projectRoot + "\", "")
            Size = [math]::Round($_.Length / 1KB, 2)
            Directory = $_.DirectoryName.Replace($projectRoot + "\", "")
        }
    }
    
    $analysisResults.DuplicateFiles += [PSCustomObject]@{
        FileName = $group.Name
        Count = $group.Count
        Locations = $files
    }
}

# 3. 检查异常文件扩展名
Write-Host "3️⃣ 检查异常文件扩展名..." -ForegroundColor Cyan

$unusualExtensions = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { 
        $_.Extension -notin @('.ts','.tsx','.js','.jsx','.json','.md','.css','.scss','.html','.svg','.png','.jpg','.ico','') -and
        $_.Extension -notmatch "^\.(backup|bak|old)$"
    }

foreach ($file in $unusualExtensions) {
    $analysisResults.UnusualExtensions += [PSCustomObject]@{
        Path = $file.FullName.Replace($projectRoot + "\", "")
        Extension = $file.Extension
        Size = [math]::Round($file.Length / 1KB, 2)
    }
}

# 4. 检查命名规范
Write-Host "4️⃣ 检查文件命名规范..." -ForegroundColor Cyan

$namingIssues = @()

# 检查 React 组件命名（应该是 PascalCase）
$componentFiles = Get-ChildItem -Path "$projectRoot\frontend\components" -Recurse -Include "*.tsx","*.jsx" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "\.(backup|damaged)" }

foreach ($file in $componentFiles) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    
    # 检查是否是 PascalCase（首字母大写）
    if ($baseName -cmatch "^[a-z]") {
        $namingIssues += [PSCustomObject]@{
            Path = $file.FullName.Replace($projectRoot + "\", "")
            Issue = "Component should use PascalCase"
            Current = $baseName
            Suggested = (Get-Culture).TextInfo.ToTitleCase($baseName)
        }
    }
    
    # 检查是否包含特殊字符
    if ($baseName -match "[^a-zA-Z0-9_-]") {
        $namingIssues += [PSCustomObject]@{
            Path = $file.FullName.Replace($projectRoot + "\", "")
            Issue = "Contains special characters"
            Current = $baseName
            Suggested = $baseName -replace "[^a-zA-Z0-9]", ""
        }
    }
}

# 检查 hooks 命名（应该以 use 开头）
$hookFiles = Get-ChildItem -Path "$projectRoot\frontend\hooks" -Recurse -Include "*.ts","*.tsx" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "\.(backup|damaged)" }

foreach ($file in $hookFiles) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    
    if ($baseName -notmatch "^use[A-Z]" -and $baseName -ne "index" -and $baseName -notmatch "legacy|compatibility") {
        $namingIssues += [PSCustomObject]@{
            Path = $file.FullName.Replace($projectRoot + "\", "")
            Issue = "Hook should start with 'use' followed by PascalCase"
            Current = $baseName
            Suggested = "use" + (Get-Culture).TextInfo.ToTitleCase($baseName)
        }
    }
}

$analysisResults.NamingIssues = $namingIssues

# 5. 检查大文件
Write-Host "5️⃣ 检查大文件..." -ForegroundColor Cyan

$largeFiles = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 100KB -and $_.Extension -match "\.(ts|tsx|js|jsx)$" } |
    Sort-Object Length -Descending |
    Select-Object -First 20

foreach ($file in $largeFiles) {
    $analysisResults.LargeFiles += [PSCustomObject]@{
        Path = $file.FullName.Replace($projectRoot + "\", "")
        Size = [math]::Round($file.Length / 1KB, 2)
        Lines = (Get-Content $file.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
    }
}

# 6. 检查空目录
Write-Host "6️⃣ 检查空目录..." -ForegroundColor Cyan

$allDirs = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -Directory -ErrorAction SilentlyContinue
foreach ($dir in $allDirs) {
    $items = Get-ChildItem -Path $dir.FullName -Force -ErrorAction SilentlyContinue
    if ($items.Count -eq 0) {
        $analysisResults.EmptyDirectories += $dir.FullName.Replace($projectRoot + "\", "")
    }
}

# 生成报告
Write-Host "`n" -NoNewline
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   📊 分析结果报告" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan

# 备份文件统计
Write-Host "`n🗑️  备份和临时文件:" -ForegroundColor Yellow
Write-Host "  • 普通备份文件: $($analysisResults.BackupFiles.Count) 个" -ForegroundColor White
Write-Host "  • 损坏文件备份: $($analysisResults.DamagedFiles.Count) 个" -ForegroundColor Red
Write-Host "  • 阶段备份文件: $($analysisResults.PhaseBackups.Count) 个" -ForegroundColor White
Write-Host "  • 二进制备份: $($analysisResults.BinaryBackups.Count) 个" -ForegroundColor White
Write-Host "  • 临时修复文件: $($analysisResults.TemporaryFiles.Count) 个" -ForegroundColor White

$totalBackupSize = ($analysisResults.BackupFiles + $analysisResults.DamagedFiles + 
                    $analysisResults.PhaseBackups + $analysisResults.BinaryBackups + 
                    $analysisResults.TemporaryFiles | Measure-Object -Property Size -Sum).Sum
Write-Host "  • 总占用空间: $([math]::Round($totalBackupSize / 1024, 2)) MB" -ForegroundColor Yellow

# 重复文件统计
Write-Host "`n📋 重复文件（多版本问题）:" -ForegroundColor Yellow
if ($analysisResults.DuplicateFiles.Count -gt 0) {
    Write-Host "  发现 $($analysisResults.DuplicateFiles.Count) 组重复文件:" -ForegroundColor Red
    foreach ($dup in $analysisResults.DuplicateFiles | Select-Object -First 10) {
        Write-Host "    • $($dup.FileName) - 出现 $($dup.Count) 次" -ForegroundColor White
        foreach ($loc in $dup.Locations) {
            Write-Host "      └─ $($loc.Path)" -ForegroundColor Gray
        }
    }
    if ($analysisResults.DuplicateFiles.Count -gt 10) {
        Write-Host "    ... 以及 $($analysisResults.DuplicateFiles.Count - 10) 组其他重复文件" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ 未发现重复文件" -ForegroundColor Green
}

# 命名规范问题
Write-Host "`n📝 命名规范问题:" -ForegroundColor Yellow
if ($analysisResults.NamingIssues.Count -gt 0) {
    Write-Host "  发现 $($analysisResults.NamingIssues.Count) 个命名问题" -ForegroundColor Red
    $analysisResults.NamingIssues | Select-Object -First 10 | ForEach-Object {
        Write-Host "    • $($_.Issue): $($_.Current) -> $($_.Suggested)" -ForegroundColor White
        Write-Host "      └─ $($_.Path)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ 命名规范良好" -ForegroundColor Green
}

# 大文件统计
Write-Host "`n📦 大文件列表 (>100KB):" -ForegroundColor Yellow
if ($analysisResults.LargeFiles.Count -gt 0) {
    Write-Host "  发现 $($analysisResults.LargeFiles.Count) 个大文件:" -ForegroundColor White
    $analysisResults.LargeFiles | Select-Object -First 10 | ForEach-Object {
        Write-Host "    • $($_.Size) KB ($($_.Lines) 行) - $($_.Path)" -ForegroundColor White
    }
} else {
    Write-Host "  ✅ 无异常大文件" -ForegroundColor Green
}

# 空目录
Write-Host "`n📂 空目录:" -ForegroundColor Yellow
if ($analysisResults.EmptyDirectories.Count -gt 0) {
    Write-Host "  发现 $($analysisResults.EmptyDirectories.Count) 个空目录" -ForegroundColor White
    $analysisResults.EmptyDirectories | Select-Object -First 5 | ForEach-Object {
        Write-Host "    • $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✅ 无空目录" -ForegroundColor Green
}

# 异常扩展名
Write-Host "`n🔧 异常文件扩展名:" -ForegroundColor Yellow
if ($analysisResults.UnusualExtensions.Count -gt 0) {
    Write-Host "  发现 $($analysisResults.UnusualExtensions.Count) 个异常扩展名文件" -ForegroundColor White
    $analysisResults.UnusualExtensions | Group-Object Extension | ForEach-Object {
        Write-Host "    • $($_.Name): $($_.Count) 个文件" -ForegroundColor White
    }
} else {
    Write-Host "  ✅ 无异常扩展名" -ForegroundColor Green
}

# 导出详细报告
$reportPath = "$projectRoot\PROJECT_STRUCTURE_ANALYSIS.md"

$totalBackupCount = $analysisResults.BackupFiles.Count + $analysisResults.DamagedFiles.Count + $analysisResults.PhaseBackups.Count + $analysisResults.BinaryBackups.Count + $analysisResults.TemporaryFiles.Count
$totalBackupSizeMB = [math]::Round($totalBackupSize / 1024, 2)

$report = @"
# Project Structure Analysis Report

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Summary Statistics

- Total Backup Files: $totalBackupCount files
- Total Space Used: $totalBackupSizeMB MB
- Duplicate File Groups: $($analysisResults.DuplicateFiles.Count) groups
- Naming Issues: $($analysisResults.NamingIssues.Count) issues
- Large Files: $($analysisResults.LargeFiles.Count) files
- Empty Directories: $($analysisResults.EmptyDirectories.Count) directories

## Backup Files Details

### Regular Backup Files ($($analysisResults.BackupFiles.Count) files)
$(if ($analysisResults.BackupFiles.Count -gt 0) {
    $analysisResults.BackupFiles | ForEach-Object { "- $($_.Path) ($($_.Size) KB)" } | Out-String
} else { "None" })

### Damaged File Backups ($($analysisResults.DamagedFiles.Count) files)
$(if ($analysisResults.DamagedFiles.Count -gt 0) {
    $analysisResults.DamagedFiles | ForEach-Object { "- $($_.Path) ($($_.Size) KB)" } | Out-String
} else { "None" })

### Phase Backup Files ($($analysisResults.PhaseBackups.Count) files)
$(if ($analysisResults.PhaseBackups.Count -gt 0) {
    $analysisResults.PhaseBackups | ForEach-Object { "- $($_.Path) ($($_.Size) KB)" } | Out-String
} else { "None" })

### Temporary Fix Files ($($analysisResults.TemporaryFiles.Count) files)
$(if ($analysisResults.TemporaryFiles.Count -gt 0) {
    $analysisResults.TemporaryFiles | ForEach-Object { "- $($_.Path) ($($_.Size) KB)" } | Out-String
} else { "None" })

## Duplicate Files (Multi-Version Issues)

$(if ($analysisResults.DuplicateFiles.Count -gt 0) {
    $analysisResults.DuplicateFiles | ForEach-Object {
        "### $($_.FileName) (appears $($_.Count) times)`n" +
        ($_.Locations | ForEach-Object { "- $($_.Path)" } | Out-String)
    } | Out-String
} else { "No duplicate files found" })

## Naming Convention Issues

$(if ($analysisResults.NamingIssues.Count -gt 0) {
    $analysisResults.NamingIssues | ForEach-Object {
        "- **$($_.Issue)**: ``$($_.Current)`` -> ``$($_.Suggested)```n  Path: $($_.Path)`n"
    } | Out-String
} else { "Naming conventions are good" })

## Large Files List

$(if ($analysisResults.LargeFiles.Count -gt 0) {
    $analysisResults.LargeFiles | ForEach-Object {
        "- $($_.Path) - $($_.Size) KB ($($_.Lines) lines)"
    } | Out-String
} else { "No unusually large files" })

## Empty Directories

$(if ($analysisResults.EmptyDirectories.Count -gt 0) {
    $analysisResults.EmptyDirectories | ForEach-Object { "- $_" } | Out-String
} else { "No empty directories" })

## Cleanup Recommendations

### Files Safe to Delete Immediately:
1. **All .damaged* files** - Backups of corrupted files, safe to delete after fixes are confirmed
2. **All .pre-fix-backup files** - Pre-fix backups, safe to delete after successful fixes
3. **All .before-* files** - Temporary comparison files, can be deleted
4. **All .final-fix files** - Final fix backups, can be deleted
5. **All .current-broken files** - Broken versions, can be deleted
6. **All .binary-backup files** - Binary backups, can be deleted

### Files to Handle Carefully:
1. **Phase backup files (.phase*-backup)** - Delete if you're sure you don't need to rollback to specific phases
2. **Regular backup files (.backup)** - Check if still needed, delete if not

### Handling Duplicate Files:
- Review each group of duplicate files, identify correct version, delete others
- Prioritize keeping files in standard directories: frontend/components, frontend/hooks, frontend/pages

### Fixing Naming Conventions:
- React components should use PascalCase (capitalize first letter)
- Hooks should start with 'use' followed by PascalCase
- Avoid special characters in file names

## Recommended Cleanup Steps

1. **Step 1**: Delete all .damaged* and temporary fix files
2. **Step 2**: Handle duplicate files, keep correct versions
3. **Step 3**: Delete unnecessary phase backups
4. **Step 4**: Fix naming convention issues
5. **Step 5**: Clean up empty directories
6. **Step 6**: Commit cleaned code

---

**Important**: Create a complete project backup before deleting any files!
"@

$report | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "`n📄 详细报告已保存到: PROJECT_STRUCTURE_ANALYSIS.md" -ForegroundColor Green

# 生成清理脚本
$cleanupScriptPath = "$projectRoot\cleanup-project.ps1"
$cleanupScript = @"
# 项目清理脚本
# 根据分析结果自动清理不需要的文件

Write-Host "`n⚠️  警告: 此脚本将删除备份和临时文件！" -ForegroundColor Red
Write-Host "建议先创建项目备份！`n" -ForegroundColor Yellow

`$confirmation = Read-Host "确定要继续清理吗? (yes/no)"
if (`$confirmation -ne "yes") {
    Write-Host "已取消清理操作" -ForegroundColor Yellow
    exit
}

Write-Host "`n开始清理..." -ForegroundColor Green

`$projectRoot = "D:\myproject\Test-Web"
`$deletedCount = 0
`$freedSpace = 0

# 删除损坏文件备份
Write-Host "`n1️⃣ 删除损坏文件备份..." -ForegroundColor Cyan
$(if ($analysisResults.DamagedFiles.Count -gt 0) {
    $analysisResults.DamagedFiles | ForEach-Object {
        "`$file = `"$projectRoot\$($_.Path)`"`n" +
        "if (Test-Path `$file) {`n" +
        "    `$size = (Get-Item `$file).Length / 1KB`n" +
        "    Remove-Item `$file -Force`n" +
        "    `$deletedCount++`n" +
        "    `$freedSpace += `$size`n" +
        "    Write-Host `"  ✓ 已删除: $($_.Path)`" -ForegroundColor Gray`n" +
        "}`n"
    } | Out-String
} else { "Write-Host '  无需删除的文件' -ForegroundColor Green`n" })

# 删除临时修复文件
Write-Host "`n2️⃣ 删除临时修复文件..." -ForegroundColor Cyan
$(if ($analysisResults.TemporaryFiles.Count -gt 0) {
    $analysisResults.TemporaryFiles | ForEach-Object {
        "`$file = `"$projectRoot\$($_.Path)`"`n" +
        "if (Test-Path `$file) {`n" +
        "    `$size = (Get-Item `$file).Length / 1KB`n" +
        "    Remove-Item `$file -Force`n" +
        "    `$deletedCount++`n" +
        "    `$freedSpace += `$size`n" +
        "    Write-Host `"  ✓ 已删除: $($_.Path)`" -ForegroundColor Gray`n" +
        "}`n"
    } | Out-String
} else { "Write-Host '  无需删除的文件' -ForegroundColor Green`n" })

# 删除二进制备份
Write-Host "`n3️⃣ 删除二进制备份..." -ForegroundColor Cyan
$(if ($analysisResults.BinaryBackups.Count -gt 0) {
    $analysisResults.BinaryBackups | ForEach-Object {
        "`$file = `"$projectRoot\$($_.Path)`"`n" +
        "if (Test-Path `$file) {`n" +
        "    `$size = (Get-Item `$file).Length / 1KB`n" +
        "    Remove-Item `$file -Force`n" +
        "    `$deletedCount++`n" +
        "    `$freedSpace += `$size`n" +
        "    Write-Host `"  ✓ 已删除: $($_.Path)`" -ForegroundColor Gray`n" +
        "}`n"
    } | Out-String
} else { "Write-Host '  无需删除的文件' -ForegroundColor Green`n" })

# 删除阶段备份（可选）
Write-Host "`n4️⃣ 删除阶段备份文件..." -ForegroundColor Cyan
`$deletePhaseBackups = Read-Host "是否删除阶段备份文件? (yes/no)"
if (`$deletePhaseBackups -eq "yes") {
$(if ($analysisResults.PhaseBackups.Count -gt 0) {
    $analysisResults.PhaseBackups | ForEach-Object {
        "    `$file = `"$projectRoot\$($_.Path)`"`n" +
        "    if (Test-Path `$file) {`n" +
        "        `$size = (Get-Item `$file).Length / 1KB`n" +
        "        Remove-Item `$file -Force`n" +
        "        `$deletedCount++`n" +
        "        `$freedSpace += `$size`n" +
        "        Write-Host `"  ✓ 已删除: $($_.Path)`" -ForegroundColor Gray`n" +
        "    }`n"
    } | Out-String
})
}

# 删除空目录
Write-Host "`n5️⃣ 删除空目录..." -ForegroundColor Cyan
$(if ($analysisResults.EmptyDirectories.Count -gt 0) {
    $analysisResults.EmptyDirectories | ForEach-Object {
        "`$dir = `"$projectRoot\$_`"`n" +
        "if (Test-Path `$dir) {`n" +
        "    Remove-Item `$dir -Force -ErrorAction SilentlyContinue`n" +
        "    Write-Host `"  ✓ 已删除: $_`" -ForegroundColor Gray`n" +
        "}`n"
    } | Out-String
} else { "Write-Host '  无空目录' -ForegroundColor Green`n" })

Write-Host "`n" -NoNewline
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   ✅ 清理完成!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "`n📊 清理统计:" -ForegroundColor Yellow
Write-Host "  • 删除文件数: `$deletedCount 个" -ForegroundColor White
Write-Host "  • 释放空间: $([math]::Round(`$freedSpace / 1024, 2)) MB" -ForegroundColor White
Write-Host "`n💡 建议: 运行 'git status' 检查变更，然后提交清理后的代码" -ForegroundColor Yellow
"@

$cleanupScript | Out-File -FilePath $cleanupScriptPath -Encoding UTF8

Write-Host "🔧 清理脚本已生成: cleanup-project.ps1" -ForegroundColor Green

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   ✅ 分析完成!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan

Write-Host "`n📋 可执行的操作:" -ForegroundColor Yellow
Write-Host "  1. 查看详细报告: PROJECT_STRUCTURE_ANALYSIS.md" -ForegroundColor White
Write-Host "  2. 执行清理: .\cleanup-project.ps1" -ForegroundColor White
Write-Host "  3. 手动处理重复文件和命名问题" -ForegroundColor White

# 保存分析结果到 JSON
$jsonPath = "$projectRoot\structure-analysis-data.json"
$analysisResults | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding UTF8
Write-Host "`n💾 原始数据已保存: structure-analysis-data.json" -ForegroundColor Cyan

