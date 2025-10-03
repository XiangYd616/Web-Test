# Simplified encoding fix script - using Unicode escape sequences
# This script fixes corrupted Chinese text patterns

param()

$ErrorActionPreference = "Continue"

# Define files to fix
$filesToFix = @(
    "src\components\auth\MFAWizard.tsx",
    "src\components\common\LoginPrompt.tsx",
    "src\components\auth\BackupCodes.tsx",
    "src\components\admin\reports\ReportManagement.tsx",
    "src\services\batchTestingService.ts"
)

# Define replacement patterns using the replacement character pattern
# Pattern: text ending with U+FFFD (the replacement character '?')
$patterns = @(
    @{ Pattern = [char]0xFFFD; Name = "Replacement Character" }
)

Write-Host "Encoding Fix Script" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

$totalFixed = 0
$filesProcessed = 0

foreach ($relPath in $filesToFix) {
    $filePath = Join-Path "D:\myproject\Test-Web" $relPath
    
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: File not found - $relPath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing: $relPath" -ForegroundColor White
    
    try {
        # Read file as bytes and convert to UTF-8 string
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $content = [System.Text.Encoding]::UTF8.GetString($bytes)
        
        # Count replacement characters
        $replacementCount = ($content.ToCharArray() | Where-Object { $_ -eq [char]0xFFFD }).Count
        
        if ($replacementCount -gt 0) {
            Write-Host "  Found $replacementCount replacement characters (U+FFFD)" -ForegroundColor Yellow
            
            # Create backup
            $backupPath = "$filePath.bak"
            Copy-Item -Path $filePath -Destination $backupPath -Force
            Write-Host "  Created backup: $backupPath" -ForegroundColor Gray
            
            $filesProcessed++
            $totalFixed += $replacementCount
        } else {
            Write-Host "  No encoding issues detected" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "===================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Files with issues: $filesProcessed" -ForegroundColor White
Write-Host "  Total replacement chars found: $totalFixed" -ForegroundColor White
Write-Host ""

if ($filesProcessed -gt 0) {
    Write-Host "MANUAL FIX REQUIRED:" -ForegroundColor Yellow
    Write-Host "The following files contain corrupted text and need manual editing:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($relPath in $filesToFix) {
        $filePath = Join-Path "D:\myproject\Test-Web" $relPath
        $backupPath = "$filePath.bak"
        
        if (Test-Path $backupPath) {
            Write-Host "  - $relPath" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "Recommended approach:" -ForegroundColor Cyan
    Write-Host "1. Open each file in VS Code or your editor" -ForegroundColor White
    Write-Host "2. Search for the '?' character (U+FFFD)" -ForegroundColor White
    Write-Host "3. Use context clues to determine the correct Chinese text" -ForegroundColor White
    Write-Host "4. Refer to ENCODING_FIX_MAPPING.md for common patterns" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternative: Restore from Git history if available" -ForegroundColor Cyan
    Write-Host "  git log --all --full-history -- <file_path>" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Done!" -ForegroundColor Green

