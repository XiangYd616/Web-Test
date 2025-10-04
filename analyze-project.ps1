# Simple Project Structure Analysis Script

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   Project Structure Analysis" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

$projectRoot = "D:\myproject\Test-Web"

# 1. Count backup and temporary files
Write-Host "1. Analyzing backup and temporary files..." -ForegroundColor Cyan

$allFiles = Get-ChildItem -Path $projectRoot -Recurse -File -ErrorAction SilentlyContinue

$damagedFiles = $allFiles | Where-Object { $_.Name -match 'damaged' }
$tempFiles = $allFiles | Where-Object { $_.Name -match 'before-|final-fix|current-broken|pre-fix-backup' }
$phaseBackups = $allFiles | Where-Object { $_.Name -match 'phase\d+-backup' }
$binaryBackups = $allFiles | Where-Object { $_.Name -match 'binary-backup' }
$backupFiles = $allFiles | Where-Object { $_.Name -match '\.backup$|\.bak$' }

$allBackups = $damagedFiles + $tempFiles + $phaseBackups + $binaryBackups + $backupFiles
$totalSize = ($allBackups | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "`nBackup and Temporary Files:" -ForegroundColor Yellow
Write-Host "  Damaged file backups: $($damagedFiles.Count) files" -ForegroundColor White
Write-Host "  Temporary fix files: $($tempFiles.Count) files" -ForegroundColor White
Write-Host "  Phase backups: $($phaseBackups.Count) files" -ForegroundColor White
Write-Host "  Binary backups: $($binaryBackups.Count) files" -ForegroundColor White
Write-Host "  Regular backups: $($backupFiles.Count) files" -ForegroundColor White
Write-Host "  Total backup files: $($allBackups.Count) files" -ForegroundColor White
Write-Host "  Total space used: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Yellow

# 2. Check for duplicate files
Write-Host "`n2. Checking for duplicate source files..." -ForegroundColor Cyan

$sourceFiles = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch '\.(backup|damaged|phase)' }

$fileGroups = $sourceFiles | Group-Object -Property Name
$duplicates = $fileGroups | Where-Object { $_.Count -gt 1 }

Write-Host "`nDuplicate Files:" -ForegroundColor Yellow
if ($duplicates.Count -gt 0) {
    Write-Host "  Found $($duplicates.Count) groups of duplicate files" -ForegroundColor Red
    $duplicates | Select-Object -First 10 | ForEach-Object {
        Write-Host "`n  File: $($_.Name) - appears $($_.Count) times" -ForegroundColor White
        $_.Group | ForEach-Object {
            $relPath = $_.FullName.Replace("$projectRoot\", "")
            Write-Host "    - $relPath" -ForegroundColor Gray
        }
    }
    if ($duplicates.Count -gt 10) {
        Write-Host "`n  ... and $($duplicates.Count - 10) more duplicate groups" -ForegroundColor Gray
    }
} else {
    Write-Host "  No duplicate files found" -ForegroundColor Green
}

# 3. Check for naming issues
Write-Host "`n3. Checking naming conventions..." -ForegroundColor Cyan

$componentFiles = Get-ChildItem -Path "$projectRoot\frontend\components" -Recurse -Include "*.tsx","*.jsx" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch '\.(backup|damaged)' }

$namingIssues = @()
foreach ($file in $componentFiles) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    if ($baseName -cmatch "^[a-z]" -and $baseName -ne "index") {
        $namingIssues += [PSCustomObject]@{
            Path = $file.FullName.Replace("$projectRoot\", "")
            Issue = "Should use PascalCase"
            Current = $baseName
        }
    }
}

Write-Host "`nNaming Convention Issues:" -ForegroundColor Yellow
if ($namingIssues.Count -gt 0) {
    Write-Host "  Found $($namingIssues.Count) files with naming issues" -ForegroundColor Red
    $namingIssues | Select-Object -First 10 | ForEach-Object {
        Write-Host "    - $($_.Path)" -ForegroundColor White
        Write-Host "      Current: $($_.Current) (should start with capital letter)" -ForegroundColor Gray
    }
} else {
    Write-Host "  No naming issues found" -ForegroundColor Green
}

# 4. Check for large files
Write-Host "`n4. Checking for large files (>100KB)..." -ForegroundColor Cyan

$largeFiles = Get-ChildItem -Path "$projectRoot\frontend" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 100KB -and $_.Extension -match '\.(ts|tsx|js|jsx)$' } |
    Sort-Object Length -Descending |
    Select-Object -First 10

Write-Host "`nLarge Files:" -ForegroundColor Yellow
if ($largeFiles.Count -gt 0) {
    Write-Host "  Found $($largeFiles.Count) large files" -ForegroundColor White
    $largeFiles | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1KB, 2)
        $relPath = $_.FullName.Replace("$projectRoot\", "")
        Write-Host "    - $relPath ($sizeMB KB)" -ForegroundColor White
    }
} else {
    Write-Host "  No unusually large files" -ForegroundColor Green
}

# 5. Summary and recommendations
Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   Summary and Recommendations" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

Write-Host "Total Issues Found:" -ForegroundColor Yellow
Write-Host "  - Backup/temp files: $($allBackups.Count) ($([math]::Round($totalSize, 2)) MB)" -ForegroundColor White
Write-Host "  - Duplicate files: $($duplicates.Count) groups" -ForegroundColor White
Write-Host "  - Naming issues: $($namingIssues.Count) files" -ForegroundColor White
Write-Host "  - Large files: $($largeFiles.Count) files" -ForegroundColor White

Write-Host "`nRecommended Actions:" -ForegroundColor Yellow
Write-Host "  1. Delete damaged file backups ($($damagedFiles.Count) files)" -ForegroundColor White
Write-Host "  2. Delete temporary fix files ($($tempFiles.Count) files)" -ForegroundColor White
Write-Host "  3. Delete binary backups ($($binaryBackups.Count) files)" -ForegroundColor White
Write-Host "  4. Review and resolve duplicate files" -ForegroundColor White
Write-Host "  5. Fix naming convention issues" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  - Review the analysis above" -ForegroundColor White
Write-Host "  - To clean backup files, create a backup first!" -ForegroundColor Yellow
Write-Host "  - Then delete unnecessary backup/temp files manually" -ForegroundColor White
Write-Host "`n=================================================" -ForegroundColor Cyan

# Save detailed list to file
$outputFile = "$projectRoot\PROJECT_CLEANUP_LIST.txt"
$output = @"
PROJECT STRUCTURE ANALYSIS REPORT
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
===============================================

BACKUP AND TEMPORARY FILES ($($allBackups.Count) files, $([math]::Round($totalSize, 2)) MB):

Damaged Files ($($damagedFiles.Count)):
$(if ($damagedFiles.Count -gt 0) { $damagedFiles | ForEach-Object { $_.FullName.Replace("$projectRoot\", "") } | Out-String } else { "None`n" })

Temporary Fix Files ($($tempFiles.Count)):
$(if ($tempFiles.Count -gt 0) { $tempFiles | ForEach-Object { $_.FullName.Replace("$projectRoot\", "") } | Out-String } else { "None`n" })

Phase Backups ($($phaseBackups.Count)):
$(if ($phaseBackups.Count -gt 0) { $phaseBackups | ForEach-Object { $_.FullName.Replace("$projectRoot\", "") } | Out-String } else { "None`n" })

Binary Backups ($($binaryBackups.Count)):
$(if ($binaryBackups.Count -gt 0) { $binaryBackups | ForEach-Object { $_.FullName.Replace("$projectRoot\", "") } | Out-String } else { "None`n" })

DUPLICATE FILES ($($duplicates.Count) groups):
$(if ($duplicates.Count -gt 0) {
    $duplicates | ForEach-Object {
        "`n$($_.Name) (appears $($_.Count) times):`n" +
        ($_.Group | ForEach-Object { "  - " + $_.FullName.Replace("$projectRoot\", "") } | Out-String)
    } | Out-String
} else { "None`n" })

NAMING CONVENTION ISSUES ($($namingIssues.Count) files):
$(if ($namingIssues.Count -gt 0) { $namingIssues | ForEach-Object { "- $($_.Path) (current: $($_.Current))" } | Out-String } else { "None`n" })

LARGE FILES (>100KB):
$(if ($largeFiles.Count -gt 0) {
    $largeFiles | ForEach-Object {
        `$sizeMB = [math]::Round(`$_.Length / 1KB, 2)
        `$relPath = `$_.FullName.Replace('$projectRoot\', '')
        "- `$relPath (`$sizeMB KB)"
    } | Out-String
} else { "None`n" })

===============================================
RECOMMENDED CLEANUP ACTIONS:

1. Safe to delete immediately:
   - All .damaged* files
   - All .pre-fix-backup files
   - All .before-* files  
   - All .final-fix files
   - All .current-broken files
   - All .binary-backup files

2. Review before deleting:
   - Phase backup files (.phase*-backup)
   - Regular backup files (.backup)

3. Duplicate files:
   - Keep files in standard directories (components, hooks, pages)
   - Delete files in non-standard locations

4. Naming conventions:
   - Rename component files to use PascalCase
   - Ensure hooks start with 'use'

===============================================
"@

$output | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`nDetailed report saved to: PROJECT_CLEANUP_LIST.txt" -ForegroundColor Green
Write-Host ""

