# Project Cleanup Script
# Safely removes backup and temporary files

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   🧹 Project Cleanup Tool" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

Write-Host "⚠️  WARNING: This will delete backup and temporary files!" -ForegroundColor Red
Write-Host "Make sure you have a backup of your project before continuing.`n" -ForegroundColor Yellow

$confirmation = Read-Host "Type 'YES' to confirm cleanup"
if ($confirmation -ne "YES") {
    Write-Host "`nCleanup cancelled." -ForegroundColor Yellow
    exit
}

$projectRoot = "D:\myproject\Test-Web"
$deletedCount = 0
$freedSpace = 0

# 1. Delete damaged file backups
Write-Host "`n1. Deleting damaged file backups..." -ForegroundColor Cyan

$damagedFiles = Get-ChildItem -Path $projectRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'damaged' }

foreach ($file in $damagedFiles) {
    $size = $file.Length / 1KB
    $relPath = $file.FullName.Replace("$projectRoot\", "")
    try {
        Remove-Item $file.FullName -Force
        $deletedCount++
        $freedSpace += $size
        Write-Host "  ✓ Deleted: $relPath" -ForegroundColor Gray
    } catch {
        Write-Host "  ✗ Failed to delete: $relPath" -ForegroundColor Red
    }
}

# 2. Delete temporary fix files
Write-Host "`n2. Deleting temporary fix files..." -ForegroundColor Cyan

$tempFiles = Get-ChildItem -Path $projectRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'before-|final-fix|current-broken|pre-fix-backup' }

foreach ($file in $tempFiles) {
    $size = $file.Length / 1KB
    $relPath = $file.FullName.Replace("$projectRoot\", "")
    try {
        Remove-Item $file.FullName -Force
        $deletedCount++
        $freedSpace += $size
        Write-Host "  ✓ Deleted: $relPath" -ForegroundColor Gray
    } catch {
        Write-Host "  ✗ Failed to delete: $relPath" -ForegroundColor Red
    }
}

# 3. Delete binary backups
Write-Host "`n3. Deleting binary backups..." -ForegroundColor Cyan

$binaryBackups = Get-ChildItem -Path $projectRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'binary-backup' }

foreach ($file in $binaryBackups) {
    $size = $file.Length / 1KB
    $relPath = $file.FullName.Replace("$projectRoot\", "")
    try {
        Remove-Item $file.FullName -Force
        $deletedCount++
        $freedSpace += $size
        Write-Host "  ✓ Deleted: $relPath" -ForegroundColor Gray
    } catch {
        Write-Host "  ✗ Failed to delete: $relPath" -ForegroundColor Red
    }
}

# 4. Optionally delete phase backups
Write-Host "`n4. Delete phase backups?" -ForegroundColor Cyan
$deletePhase = Read-Host "Delete phase backup files? (yes/no)"

if ($deletePhase -eq "yes") {
    $phaseBackups = Get-ChildItem -Path $projectRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match 'phase\d+-backup' }

    foreach ($file in $phaseBackups) {
        $size = $file.Length / 1KB
        $relPath = $file.FullName.Replace("$projectRoot\", "")
        try {
            Remove-Item $file.FullName -Force
            $deletedCount++
            $freedSpace += $size
            Write-Host "  ✓ Deleted: $relPath" -ForegroundColor Gray
        } catch {
            Write-Host "  ✗ Failed to delete: $relPath" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  Skipping phase backups" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "   ✅ Cleanup Complete!" -ForegroundColor Green
Write-Host "=================================================`n" -ForegroundColor Cyan

Write-Host "Cleanup Summary:" -ForegroundColor Yellow
Write-Host "  • Files deleted: $deletedCount" -ForegroundColor White
Write-Host "  • Space freed: $([math]::Round($freedSpace / 1024, 2)) MB`n" -ForegroundColor White

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run 'git status' to see changes" -ForegroundColor White
Write-Host "  2. Review the changes" -ForegroundColor White
Write-Host "  3. Commit the cleanup: git add . && git commit -m 'chore: cleanup backup files'" -ForegroundColor White
Write-Host "`n=================================================" -ForegroundColor Cyan

